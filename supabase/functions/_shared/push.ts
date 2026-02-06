/**
 * Push notification utilities for NikahX
 * 
 * Supports OneSignal and Firebase Cloud Messaging (FCM).
 * Falls back to logging if no provider is configured.
 */

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

export interface PushNotificationOptions {
  title: string
  body: string
  data?: Record<string, unknown>
  badge?: number
  sound?: string
  icon?: string
}

export interface PushResult {
  success: boolean
  provider?: 'onesignal' | 'fcm'
  error?: string
  notification_id?: string
}

/**
 * Send push notification via OneSignal
 */
export async function sendOneSignalPush(
  playerId: string,
  options: PushNotificationOptions
): Promise<PushResult> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.log('[Push] OneSignal not configured. Would send:', { playerId, ...options })
    return { success: true, provider: 'onesignal' }
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: { en: options.title },
        contents: { en: options.body },
        data: options.data,
        ios_badgeType: 'Increase',
        ios_badgeCount: options.badge || 1,
        ios_sound: options.sound || 'default',
        android_sound: options.sound || 'default',
        small_icon: options.icon,
        large_icon: options.icon
      })
    })

    const result = await response.json()

    if (!response.ok || result.errors) {
      console.error('[Push] OneSignal error:', result)
      return { 
        success: false, 
        provider: 'onesignal',
        error: result.errors?.[0] || 'Unknown error'
      }
    }

    console.log('[Push] OneSignal notification sent:', result.id)
    return { 
      success: true, 
      provider: 'onesignal',
      notification_id: result.id
    }

  } catch (error) {
    console.error('[Push] OneSignal failed:', error)
    return { 
      success: false, 
      provider: 'onesignal',
      error: (error as Error).message
    }
  }
}

/**
 * Send push notification via Firebase Cloud Messaging
 */
export async function sendFCMPush(
  token: string,
  options: PushNotificationOptions
): Promise<PushResult> {
  if (!FCM_SERVER_KEY) {
    console.log('[Push] FCM not configured. Would send:', { token: token.slice(0, 20) + '...', ...options })
    return { success: true, provider: 'fcm' }
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: options.title,
          body: options.body,
          icon: options.icon || 'ic_notification',
          sound: options.sound || 'default',
          badge: options.badge
        },
        data: options.data,
        priority: 'high',
        content_available: true
      })
    })

    const result = await response.json()

    if (!response.ok || result.failure) {
      console.error('[Push] FCM error:', result)
      return { 
        success: false, 
        provider: 'fcm',
        error: result.results?.[0]?.error || 'Unknown error'
      }
    }

    console.log('[Push] FCM notification sent:', result.message_id)
    return { 
      success: true, 
      provider: 'fcm',
      notification_id: result.message_id
    }

  } catch (error) {
    console.error('[Push] FCM failed:', error)
    return { 
      success: false, 
      provider: 'fcm',
      error: (error as Error).message
    }
  }
}

/**
 * Send push notification using the user's registered provider
 */
export async function sendPushNotification(
  token: string,
  provider: 'onesignal' | 'fcm' | 'apns',
  options: PushNotificationOptions
): Promise<PushResult> {
  switch (provider) {
    case 'onesignal':
      return sendOneSignalPush(token, options)
    case 'fcm':
      return sendFCMPush(token, options)
    case 'apns':
      // APNS is typically handled via FCM or OneSignal
      console.log('[Push] APNS direct not implemented, falling back to FCM')
      return sendFCMPush(token, options)
    default:
      console.warn('[Push] Unknown provider:', provider)
      return { success: false, error: `Unknown provider: ${provider}` }
  }
}

// ============ Push Templates ============

/**
 * New message push notification
 */
export function newMessagePush(senderName: string, messagePreview: string, matchId: string): PushNotificationOptions {
  return {
    title: `💬 ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.slice(0, 97) + '...' : messagePreview,
    data: {
      type: 'new_message',
      match_id: matchId,
      action: 'open_chat'
    },
    sound: 'message.wav'
  }
}

/**
 * New match push notification
 */
export function newMatchPush(matchName: string, matchId: string): PushNotificationOptions {
  return {
    title: '🎉 New Match!',
    body: `You and ${matchName} have matched! Your walis will be notified.`,
    data: {
      type: 'new_match',
      match_id: matchId,
      action: 'open_match'
    },
    sound: 'match.wav'
  }
}

/**
 * Wali approval needed push notification
 */
export function waliApprovalPush(wardName: string, matchId: string): PushNotificationOptions {
  return {
    title: '🛡️ Approval Needed',
    body: `${wardName} has a new match awaiting your review.`,
    data: {
      type: 'wali_approval',
      match_id: matchId,
      action: 'open_wali_review'
    },
    sound: 'default'
  }
}

/**
 * Match approved push notification
 */
export function matchApprovedPush(matchName: string, matchId: string): PushNotificationOptions {
  return {
    title: '✅ Match Approved!',
    body: `Your match with ${matchName} has been approved by the walis. You can now message each other!`,
    data: {
      type: 'match_approved',
      match_id: matchId,
      action: 'open_chat'
    },
    sound: 'success.wav'
  }
}
