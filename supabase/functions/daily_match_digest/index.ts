import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders, serveError } from "../_shared/guards.ts"
import { sendEmail, dailyDigestEmail } from "../_shared/email.ts"

/**
 * Daily Match Digest Edge Function (Scheduled)
 * 
 * Runs at 9 AM (local timezone) to send users a digest of their new matches.
 * Includes top 3 matches with compatibility info and mahr statistics.
 * 
 * Schedule: 0 9 * * * (daily at 9 AM)
 * 
 * Can also be called manually via POST for testing.
 */

interface DigestRequest {
  user_id?: string // Process specific user (for testing)
  dry_run?: boolean
  timezone_offset?: number // Hours offset from UTC (default: -8 for PST)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let specificUserId: string | undefined
    let dryRun = false
    let timezoneOffset = -8 // Default to PST

    if (req.method === 'POST') {
      try {
        const body: DigestRequest = await req.json()
        specificUserId = body.user_id
        dryRun = body.dry_run || false
        timezoneOffset = body.timezone_offset ?? -8
      } catch {
        // Empty body is fine for scheduled calls
      }
    }

    console.log(`[DailyDigest] Starting. UserId: ${specificUserId || 'all'}, DryRun: ${dryRun}`)

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get time boundaries for "today" (in user's timezone)
    const now = new Date()
    const userNow = new Date(now.getTime() + timezoneOffset * 60 * 60 * 1000)
    const todayStart = new Date(userNow)
    todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

    // Convert back to UTC for database queries
    const queryStart = new Date(yesterdayStart.getTime() - timezoneOffset * 60 * 60 * 1000)
    const queryEnd = new Date(todayStart.getTime() - timezoneOffset * 60 * 60 * 1000)

    // Find users with new matches in the past 24 hours
    const matchQuery = serviceClient
      .from('matches')
      .select(`
        id,
        user1_id,
        user2_id,
        status,
        created_at,
        user1:user1_id (id, full_name, email, dob, city, country),
        user2:user2_id (id, full_name, email, dob, city, country)
      `)
      .gte('created_at', queryStart.toISOString())
      .lt('created_at', queryEnd.toISOString())
      .eq('is_active', true)

    // Filter by specific user if provided
    if (specificUserId) {
      matchQuery.or(`user1_id.eq.${specificUserId},user2_id.eq.${specificUserId}`)
    }

    const { data: newMatches, error: matchError } = await matchQuery

    if (matchError) {
      throw new Error(`Failed to fetch matches: ${matchError.message}`)
    }

    if (!newMatches || newMatches.length === 0) {
      console.log('[DailyDigest] No new matches found for digest.')
      return new Response(
        JSON.stringify({
          success: true,
          users_processed: 0,
          digests_sent: 0,
          message: 'No new matches to report'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group matches by user
    const userMatches = new Map<string, Array<{
      matchId: string
      matchedWith: {
        id: string
        name: string
        age: number
        city: string
        country: string
      }
      status: string
    }>>()

    for (const match of newMatches) {
      const user1 = match.user1 as { id: string; full_name: string | null; email: string | null; dob: string | null; city: string | null; country: string | null } | null
      const user2 = match.user2 as { id: string; full_name: string | null; email: string | null; dob: string | null; city: string | null; country: string | null } | null

      if (!user1 || !user2) continue

      // Calculate ages
      const now = Date.now()
      const age1 = user1.dob ? Math.floor((now - new Date(user1.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0
      const age2 = user2.dob ? Math.floor((now - new Date(user2.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0

      // Add match to user1's list
      if (!userMatches.has(match.user1_id)) {
        userMatches.set(match.user1_id, [])
      }
      userMatches.get(match.user1_id)!.push({
        matchId: match.id,
        matchedWith: {
          id: user2.id,
          name: user2.full_name || 'Anonymous',
          age: age2,
          city: user2.city || user2.country || 'Unknown',
          country: user2.country || ''
        },
        status: match.status
      })

      // Add match to user2's list
      if (!userMatches.has(match.user2_id)) {
        userMatches.set(match.user2_id, [])
      }
      userMatches.get(match.user2_id)!.push({
        matchId: match.id,
        matchedWith: {
          id: user1.id,
          name: user1.full_name || 'Anonymous',
          age: age1,
          city: user1.city || user1.country || 'Unknown',
          country: user1.country || ''
        },
        status: match.status
      })
    }

    // Fetch Firasa reports for compatibility scores (optional enhancement)
    const { data: firasaReports } = await serviceClient
      .from('firasa_reports')
      .select('requester_id, subject_id, compatibility_score')
      .gte('created_at', queryStart.toISOString())

    // Create a lookup for compatibility scores
    const compatibilityScores = new Map<string, number>()
    firasaReports?.forEach(report => {
      const key1 = `${report.requester_id}:${report.subject_id}`
      const key2 = `${report.subject_id}:${report.requester_id}`
      compatibilityScores.set(key1, report.compatibility_score)
      compatibilityScores.set(key2, report.compatibility_score)
    })

    // Send digests
    const results: Array<{
      user_id: string
      email: string
      matches_count: number
      success: boolean
      error?: string
      skipped?: boolean
      reason?: string
    }> = []

    for (const [userId, matches] of userMatches) {
      // Fetch user profile for email
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      if (!userProfile?.email) {
        results.push({
          user_id: userId,
          email: 'none',
          matches_count: matches.length,
          success: true,
          skipped: true,
          reason: 'no_email'
        })
        continue
      }

      // Check if we already sent a digest today
      const { data: recentDigest } = await serviceClient
        .from('notification_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('notification_type', 'digest')
        .gte('created_at', queryStart.toISOString())
        .single()

      if (recentDigest) {
        results.push({
          user_id: userId,
          email: userProfile.email,
          matches_count: matches.length,
          success: true,
          skipped: true,
          reason: 'already_sent_today'
        })
        continue
      }

      // Prepare top matches for email
      const topMatches = matches.slice(0, 3).map(m => {
        const compatKey = `${userId}:${m.matchedWith.id}`
        return {
          name: m.matchedWith.name,
          age: m.matchedWith.age,
          city: m.matchedWith.city,
          compatibility: compatibilityScores.get(compatKey)
        }
      })

      if (dryRun) {
        results.push({
          user_id: userId,
          email: userProfile.email,
          matches_count: matches.length,
          success: true,
          skipped: true,
          reason: 'dry_run'
        })
        continue
      }

      // Send digest email
      const digestContent = dailyDigestEmail(
        userProfile.full_name || 'There',
        matches.length,
        topMatches
      )
      digestContent.to = userProfile.email

      const emailResult = await sendEmail(digestContent)

      results.push({
        user_id: userId,
        email: userProfile.email,
        matches_count: matches.length,
        success: emailResult.success,
        error: emailResult.error
      })

      // Log the notification
      await serviceClient.from('notification_logs').insert({
        user_id: userId,
        notification_type: 'digest',
        channel: 'email',
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error,
        metadata: {
          matches_count: matches.length,
          date: todayStart.toISOString().split('T')[0]
        }
      })
    }

    const sentCount = results.filter(r => r.success && !r.skipped).length
    const skippedCount = results.filter(r => r.skipped).length

    console.log(`[DailyDigest] Complete. Users: ${userMatches.size}, Sent: ${sentCount}, Skipped: ${skippedCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: userMatches.size,
        digests_sent: sentCount,
        digests_skipped: skippedCount,
        date_range: {
          start: queryStart.toISOString(),
          end: queryEnd.toISOString()
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[DailyDigest] Error:', error)
    return serveError(error as Error)
  }
})
