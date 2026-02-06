import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders, serveError } from "../_shared/guards.ts"
import { sendEmail, waliReminderEmail } from "../_shared/email.ts"
import { sendPushNotification, waliApprovalPush } from "../_shared/push.ts"

/**
 * Wali Approval Alert Edge Function (Scheduled)
 * 
 * Runs every 6 hours to find matches pending wali approval for 24+ hours.
 * Sends reminder emails to walis who haven't yet approved.
 * 
 * Trigger: Supabase cron job or external scheduler
 * Cron: every 6 hours
 * 
 * Can also be called manually via POST for testing.
 */

interface WaliApprovalAlertRequest {
  hours_threshold?: number // Default: 24
  dry_run?: boolean // If true, don't send emails, just return what would be sent
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse optional config
    let hoursThreshold = 24
    let dryRun = false

    if (req.method === 'POST') {
      try {
        const body: WaliApprovalAlertRequest = await req.json()
        hoursThreshold = body.hours_threshold || 24
        dryRun = body.dry_run || false
      } catch {
        // Empty body is fine for scheduled calls
      }
    }

    console.log(`[WaliApprovalAlert] Starting. Threshold: ${hoursThreshold}h, DryRun: ${dryRun}`)

    // Create service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find pending matches older than threshold
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000)

    const { data: pendingMatches, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        user1_id,
        user2_id,
        wali_approved_user1_at,
        wali_approved_user2_at,
        created_at,
        user1:user1_id (id, full_name, email),
        user2:user2_id (id, full_name, email)
      `)
      .eq('status', 'pending_wali')
      .eq('is_active', true)
      .lt('created_at', thresholdDate.toISOString())

    if (matchError) {
      throw new Error(`Failed to fetch pending matches: ${matchError.message}`)
    }

    if (!pendingMatches || pendingMatches.length === 0) {
      console.log('[WaliApprovalAlert] No pending matches found.')
      return new Response(
        JSON.stringify({
          success: true,
          pending_matches_found: 0,
          reminders_sent: 0
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    console.log(`[WaliApprovalAlert] Found ${pendingMatches.length} pending matches.`)

    const results: Array<{
      match_id: string
      wali_email: string
      ward_name: string
      success: boolean
      error?: string
      skipped?: boolean
      reason?: string
    }> = []

    // Check recent notifications to avoid spamming
    const recentNotificationCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours

    for (const match of pendingMatches) {
      const hoursWaiting = (Date.now() - new Date(match.created_at).getTime()) / (1000 * 60 * 60)
      
      // Type assertions for joined relations
      const user1 = match.user1 as { id: string; full_name: string | null; email: string | null } | null
      const user2 = match.user2 as { id: string; full_name: string | null; email: string | null } | null

      if (!user1 || !user2) continue

      // Find walis who haven't approved yet
      const walisToRemind: Array<{
        wardId: string
        wardName: string
        matchName: string
        waliUserId?: string
        waliEmail?: string
        waliName?: string
      }> = []

      // Check user1's wali (if not yet approved)
      if (!match.wali_approved_user1_at) {
        const { data: user1Wali } = await supabase
          .from('wali_links')
          .select(`
            wali_user_id,
            wali_contact,
            wali:wali_user_id (id, full_name, email)
          `)
          .eq('ward_id', match.user1_id)
          .eq('status', 'active')
          .single()

        if (user1Wali) {
          const waliProfile = user1Wali.wali as { id: string; full_name: string | null; email: string | null } | null
          walisToRemind.push({
            wardId: match.user1_id,
            wardName: user1.full_name || 'Your Ward',
            matchName: user2.full_name || 'A Potential Match',
            waliUserId: user1Wali.wali_user_id || undefined,
            waliEmail: waliProfile?.email || (user1Wali.wali_contact?.includes('@') ? user1Wali.wali_contact : undefined),
            waliName: waliProfile?.full_name || 'Wali'
          })
        }
      }

      // Check user2's wali (if not yet approved)
      if (!match.wali_approved_user2_at) {
        const { data: user2Wali } = await supabase
          .from('wali_links')
          .select(`
            wali_user_id,
            wali_contact,
            wali:wali_user_id (id, full_name, email)
          `)
          .eq('ward_id', match.user2_id)
          .eq('status', 'active')
          .single()

        if (user2Wali) {
          const waliProfile = user2Wali.wali as { id: string; full_name: string | null; email: string | null } | null
          walisToRemind.push({
            wardId: match.user2_id,
            wardName: user2.full_name || 'Your Ward',
            matchName: user1.full_name || 'A Potential Match',
            waliUserId: user2Wali.wali_user_id || undefined,
            waliEmail: waliProfile?.email || (user2Wali.wali_contact?.includes('@') ? user2Wali.wali_contact : undefined),
            waliName: waliProfile?.full_name || 'Wali'
          })
        }
      }

      // Send reminders to each wali
      for (const wali of walisToRemind) {
        if (!wali.waliEmail) {
          results.push({
            match_id: match.id,
            wali_email: 'unknown',
            ward_name: wali.wardName,
            success: true,
            skipped: true,
            reason: 'no_wali_email'
          })
          continue
        }

        // Check if we already sent a reminder recently
        const { data: recentNotif } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('notification_type', 'wali_reminder')
          .eq('reference_id', match.id)
          .eq('user_id', wali.waliUserId || wali.wardId)
          .gt('created_at', recentNotificationCutoff.toISOString())
          .single()

        if (recentNotif) {
          results.push({
            match_id: match.id,
            wali_email: wali.waliEmail,
            ward_name: wali.wardName,
            success: true,
            skipped: true,
            reason: 'recently_notified'
          })
          continue
        }

        if (dryRun) {
          results.push({
            match_id: match.id,
            wali_email: wali.waliEmail,
            ward_name: wali.wardName,
            success: true,
            skipped: true,
            reason: 'dry_run'
          })
          continue
        }

        // Send the reminder email
        const emailContent = waliReminderEmail(
          wali.waliName || 'Wali',
          wali.wardName,
          wali.matchName,
          match.id,
          hoursWaiting
        )
        emailContent.to = wali.waliEmail

        const emailResult = await sendEmail(emailContent)

        results.push({
          match_id: match.id,
          wali_email: wali.waliEmail,
          ward_name: wali.wardName,
          success: emailResult.success,
          error: emailResult.error
        })

        // Log the notification
        await supabase.from('notification_logs').insert({
          user_id: wali.waliUserId || wali.wardId,
          notification_type: 'wali_reminder',
          channel: 'email',
          reference_id: match.id,
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.error,
          metadata: {
            ward_id: wali.wardId,
            hours_waiting: Math.round(hoursWaiting)
          }
        })

        // Also send push notification if wali has a push token
        if (wali.waliUserId) {
          const { data: waliPresence } = await supabase
            .from('user_presence')
            .select('push_token, push_provider')
            .eq('user_id', wali.waliUserId)
            .single()

          if (waliPresence?.push_token && waliPresence?.push_provider) {
            const pushContent = waliApprovalPush(wali.wardName, match.id)
            await sendPushNotification(
              waliPresence.push_token,
              waliPresence.push_provider as 'onesignal' | 'fcm' | 'apns',
              pushContent
            )
          }
        }
      }
    }

    const sentCount = results.filter(r => r.success && !r.skipped).length
    const skippedCount = results.filter(r => r.skipped).length

    console.log(`[WaliApprovalAlert] Complete. Sent: ${sentCount}, Skipped: ${skippedCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        pending_matches_found: pendingMatches.length,
        reminders_sent: sentCount,
        reminders_skipped: skippedCount,
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
    console.error('[WaliApprovalAlert] Error:', error)
    return serveError(error as Error)
  }
})
