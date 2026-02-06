import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders, serveError } from "../_shared/guards.ts"
import { sendEmail, newMessageEmail } from "../_shared/email.ts"
import { sendPushNotification, newMessagePush } from "../_shared/push.ts"

/**
 * Message Notification Edge Function
 * 
 * Called when a new message is sent in a match conversation.
 * Checks if recipient is online:
 * - If offline: sends push notification (if push token registered)
 * - If offline >1h: also sends email notification
 * 
 * Can be triggered by:
 * - Database webhook on messages INSERT
 * - Direct POST call
 */

interface MessageWebhookRequest {
  type: 'INSERT'
  table: string
  record: {
    id: string
    match_id: string
    sender_id: string
    content: string
    created_at: string
  }
}

interface DirectCallRequest {
  message_id: string
}

// Don't send email notifications if user was seen in last hour
const EMAIL_NOTIFICATION_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

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

    let messageId: string
    let matchId: string
    let senderId: string
    let content: string

    // Handle both webhook format and direct call format
    if ('record' in body && body.type === 'INSERT') {
      const webhookData = body as MessageWebhookRequest
      messageId = webhookData.record.id
      matchId = webhookData.record.match_id
      senderId = webhookData.record.sender_id
      content = webhookData.record.content
      
      console.log(`[MessageNotification] Webhook triggered for message ${messageId}`)
    } else if ('message_id' in body) {
      const directCall = body as DirectCallRequest
      messageId = directCall.message_id
      
      // Fetch message details
      const { data: message, error } = await supabase
        .from('messages')
        .select('match_id, sender_id, content')
        .eq('id', messageId)
        .single()
      
      if (error || !message) {
        throw new Error('Message not found')
      }
      
      matchId = message.match_id
      senderId = message.sender_id
      content = message.content
      
      console.log(`[MessageNotification] Direct call for message ${messageId}`)
    } else {
      throw new Error('Invalid request format')
    }

    // Fetch match to find recipient
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      throw new Error('Match not found')
    }

    // Determine recipient (the other user)
    const recipientId = match.user1_id === senderId ? match.user2_id : match.user1_id

    // Fetch recipient and sender profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', [senderId, recipientId])

    if (profilesError || !profiles || profiles.length !== 2) {
      throw new Error('Failed to fetch profiles')
    }

    const sender = profiles.find(p => p.id === senderId)!
    const recipient = profiles.find(p => p.id === recipientId)!

    // Check recipient's online status
    const { data: presence } = await supabase
      .from('user_presence')
      .select('is_online, last_seen_at, push_token, push_provider')
      .eq('user_id', recipientId)
      .single()

    const isOnline = presence?.is_online ?? false
    const lastSeenAt = presence?.last_seen_at ? new Date(presence.last_seen_at) : null
    const msSinceLastSeen = lastSeenAt ? Date.now() - lastSeenAt.getTime() : Infinity

    const results: Array<{ 
      channel: string
      success: boolean
      error?: string
      skipped?: boolean
      reason?: string
    }> = []

    // If user is online, skip all notifications
    if (isOnline) {
      console.log(`[MessageNotification] Recipient ${recipientId} is online, skipping notifications`)
      results.push({
        channel: 'all',
        success: true,
        skipped: true,
        reason: 'recipient_online'
      })
    } else {
      // User is offline - send push notification if they have a token
      if (presence?.push_token && presence?.push_provider) {
        const pushContent = newMessagePush(
          sender.full_name || 'Someone',
          content,
          matchId
        )

        const pushResult = await sendPushNotification(
          presence.push_token,
          presence.push_provider as 'onesignal' | 'fcm' | 'apns',
          pushContent
        )

        results.push({
          channel: 'push',
          success: pushResult.success,
          error: pushResult.error
        })

        await supabase.from('notification_logs').insert({
          user_id: recipientId,
          notification_type: 'message',
          channel: 'push',
          reference_id: messageId,
          status: pushResult.success ? 'sent' : 'failed',
          error_message: pushResult.error,
          metadata: { 
            match_id: matchId,
            sender_id: senderId,
            provider: presence.push_provider
          }
        })
      } else {
        results.push({
          channel: 'push',
          success: true,
          skipped: true,
          reason: 'no_push_token'
        })
      }

      // Send email if user hasn't been seen in a while
      if (msSinceLastSeen > EMAIL_NOTIFICATION_THRESHOLD_MS && recipient.email) {
        const messagePreview = content.length > 100 
          ? content.slice(0, 100) 
          : content

        const emailContent = newMessageEmail(
          recipient.full_name || 'There',
          sender.full_name || 'Your Match',
          matchId,
          messagePreview
        )
        emailContent.to = recipient.email

        const emailResult = await sendEmail(emailContent)

        results.push({
          channel: 'email',
          success: emailResult.success,
          error: emailResult.error
        })

        await supabase.from('notification_logs').insert({
          user_id: recipientId,
          notification_type: 'message',
          channel: 'email',
          reference_id: messageId,
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.error,
          metadata: { 
            match_id: matchId,
            sender_id: senderId,
            last_seen_hours_ago: Math.round(msSinceLastSeen / (1000 * 60 * 60))
          }
        })
      } else if (msSinceLastSeen <= EMAIL_NOTIFICATION_THRESHOLD_MS) {
        results.push({
          channel: 'email',
          success: true,
          skipped: true,
          reason: 'recently_active'
        })
      } else {
        results.push({
          channel: 'email',
          success: true,
          skipped: true,
          reason: 'no_email'
        })
      }
    }

    const sentCount = results.filter(r => r.success && !r.skipped).length
    console.log(`[MessageNotification] Complete. ${sentCount} notifications sent.`)

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageId,
        recipient_id: recipientId,
        recipient_online: isOnline,
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
    console.error('[MessageNotification] Error:', error)
    return serveError(error as Error)
  }
})
