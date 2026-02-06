import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders, serveError, validateInput } from "../_shared/guards.ts"
import { 
  sendEmail, 
  newMatchEmail, 
  waliMatchNotificationEmail 
} from "../_shared/email.ts"

/**
 * Match Notification Edge Function
 * 
 * Called when a new match is created (via database webhook or direct call).
 * Sends notifications to:
 * 1. Both matched users
 * 2. Both users' walis (if assigned)
 * 
 * Can be triggered by:
 * - Database webhook on matches INSERT
 * - Direct POST call with match_id
 */

interface MatchNotificationRequest {
  type: 'INSERT' | 'UPDATE'
  table: string
  record: {
    id: string
    user1_id: string
    user2_id: string
    status: string
    created_at: string
  }
  old_record?: Record<string, unknown>
}

interface DirectCallRequest {
  match_id: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // Create service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let matchId: string
    let user1Id: string
    let user2Id: string

    // Handle both webhook format and direct call format
    if ('record' in body && body.type === 'INSERT') {
      // Database webhook format
      const webhookData = body as MatchNotificationRequest
      matchId = webhookData.record.id
      user1Id = webhookData.record.user1_id
      user2Id = webhookData.record.user2_id
      
      console.log(`[MatchNotification] Webhook triggered for match ${matchId}`)
    } else if ('match_id' in body) {
      // Direct call format
      const directCall = body as DirectCallRequest
      matchId = directCall.match_id
      
      // Fetch match details
      const { data: match, error } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .eq('id', matchId)
        .single()
      
      if (error || !match) {
        throw new Error('Match not found')
      }
      
      user1Id = match.user1_id
      user2Id = match.user2_id
      
      console.log(`[MatchNotification] Direct call for match ${matchId}`)
    } else {
      throw new Error('Invalid request format')
    }

    // Fetch both users' profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', [user1Id, user2Id])

    if (profilesError || !profiles || profiles.length !== 2) {
      throw new Error('Failed to fetch user profiles')
    }

    const user1 = profiles.find(p => p.id === user1Id)!
    const user2 = profiles.find(p => p.id === user2Id)!

    const results: Array<{ type: string; recipient: string; success: boolean; error?: string }> = []

    // Send notification to User 1
    if (user1.email) {
      const email1 = newMatchEmail(
        user1.full_name || 'Seeker',
        user2.full_name || 'Your Match',
        matchId
      )
      email1.to = user1.email
      
      const result = await sendEmail(email1)
      results.push({
        type: 'user_notification',
        recipient: user1.email,
        success: result.success,
        error: result.error
      })

      // Log the notification
      await supabase.from('notification_logs').insert({
        user_id: user1Id,
        notification_type: 'match',
        channel: 'email',
        reference_id: matchId,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error,
        metadata: { recipient_type: 'user' }
      })
    }

    // Send notification to User 2
    if (user2.email) {
      const email2 = newMatchEmail(
        user2.full_name || 'Seeker',
        user1.full_name || 'Your Match',
        matchId
      )
      email2.to = user2.email
      
      const result = await sendEmail(email2)
      results.push({
        type: 'user_notification',
        recipient: user2.email,
        success: result.success,
        error: result.error
      })

      await supabase.from('notification_logs').insert({
        user_id: user2Id,
        notification_type: 'match',
        channel: 'email',
        reference_id: matchId,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error,
        metadata: { recipient_type: 'user' }
      })
    }

    // Fetch walis for both users
    const { data: waliLinks, error: waliError } = await supabase
      .from('wali_links')
      .select(`
        ward_id,
        wali_user_id,
        wali_contact,
        status,
        wali:wali_user_id (
          id,
          full_name,
          email
        )
      `)
      .in('ward_id', [user1Id, user2Id])
      .eq('status', 'active')

    if (waliLinks && waliLinks.length > 0) {
      for (const link of waliLinks) {
        // Determine which user is the ward and which is the match
        const isWardUser1 = link.ward_id === user1Id
        const ward = isWardUser1 ? user1 : user2
        const matchUser = isWardUser1 ? user2 : user1

        // Get wali email - either from linked user or contact field
        let waliEmail: string | undefined
        let waliName = 'Wali'
        
        if (link.wali && typeof link.wali === 'object' && 'email' in link.wali) {
          const waliProfile = link.wali as { id: string; full_name: string | null; email: string | null }
          waliEmail = waliProfile.email || undefined
          waliName = waliProfile.full_name || 'Wali'
        } else if (link.wali_contact?.includes('@')) {
          // If wali_contact looks like an email
          waliEmail = link.wali_contact
        }

        if (waliEmail) {
          const waliEmailContent = waliMatchNotificationEmail(
            waliName,
            ward.full_name || 'Your Ward',
            matchUser.full_name || 'A Potential Match',
            matchId
          )
          waliEmailContent.to = waliEmail

          const result = await sendEmail(waliEmailContent)
          results.push({
            type: 'wali_notification',
            recipient: waliEmail,
            success: result.success,
            error: result.error
          })

          await supabase.from('notification_logs').insert({
            user_id: link.wali_user_id || link.ward_id,
            notification_type: 'match',
            channel: 'email',
            reference_id: matchId,
            status: result.success ? 'sent' : 'failed',
            error_message: result.error,
            metadata: { 
              recipient_type: 'wali',
              ward_id: link.ward_id
            }
          })
        }
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    console.log(`[MatchNotification] Complete. ${successCount}/${totalCount} notifications sent.`)

    return new Response(
      JSON.stringify({
        success: true,
        match_id: matchId,
        notifications_sent: successCount,
        notifications_total: totalCount,
        results
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('[MatchNotification] Error:', error)
    return serveError(error as Error)
  }
})
