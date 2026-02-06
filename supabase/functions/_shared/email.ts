/**
 * Email utilities for NikahX notifications
 * 
 * Uses Supabase's built-in email functionality or SendGrid if configured.
 * Falls back to logging if no email provider is available.
 */

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@nikahx.com'
const FROM_NAME = Deno.env.get('FROM_NAME') || 'NikahX'
const APP_URL = Deno.env.get('APP_URL') || 'https://nikahx.com'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  templateId?: string
  dynamicData?: Record<string, unknown>
}

/**
 * Send an email using SendGrid or log if not configured
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  // If no SendGrid key, log and return success (for development)
  if (!SENDGRID_API_KEY) {
    console.log('[Email] SendGrid not configured. Would send:', {
      to: options.to,
      subject: options.subject,
      preview: options.text?.slice(0, 100) || options.html.slice(0, 100)
    })
    return { success: true }
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: options.to }],
          dynamic_template_data: options.dynamicData
        }],
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: options.subject,
        content: [
          { type: 'text/plain', value: options.text || stripHtml(options.html) },
          { type: 'text/html', value: options.html }
        ],
        ...(options.templateId && { template_id: options.templateId })
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Email] SendGrid error:', errorText)
      return { success: false, error: errorText }
    }

    console.log('[Email] Sent successfully to:', options.to)
    return { success: true }

  } catch (error) {
    console.error('[Email] Failed to send:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============ Email Templates ============

/**
 * New match notification email
 */
export function newMatchEmail(recipientName: string, matchName: string, matchId: string): EmailOptions {
  const viewUrl = `${APP_URL}/matches/${matchId}`
  
  return {
    to: '', // Will be set by caller
    subject: '🎉 You have a new match on NikahX!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌙 Mabrook!</h1>
  </div>
  <div class="content">
    <p>Assalamu Alaikum ${recipientName},</p>
    
    <p>Great news! <strong>${matchName}</strong> has also shown interest in your profile. You're now matched!</p>
    
    <p>This match is currently pending wali approval. Once both walis have reviewed and approved, you'll be able to start a conversation.</p>
    
    <p>In the meantime, we encourage you to:</p>
    <ul>
      <li>Review their profile carefully</li>
      <li>Pray istikhara for guidance</li>
      <li>Discuss with your wali/family</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="${viewUrl}" class="button">View Your Match</a>
    </p>
    
    <p>May Allah bless this potential union. 🤲</p>
  </div>
  <div class="footer">
    <p>This email was sent by NikahX. You're receiving this because you're a registered user.</p>
    <p><a href="${APP_URL}/settings/notifications">Manage notifications</a></p>
  </div>
</body>
</html>
    `,
    text: `
Assalamu Alaikum ${recipientName},

Great news! ${matchName} has also shown interest in your profile. You're now matched!

This match is currently pending wali approval. Once both walis have reviewed and approved, you'll be able to start a conversation.

View your match: ${viewUrl}

May Allah bless this potential union.

- NikahX Team
    `
  }
}

/**
 * Wali notification for new match
 */
export function waliMatchNotificationEmail(
  waliName: string, 
  wardName: string, 
  matchName: string, 
  matchId: string
): EmailOptions {
  const reviewUrl = `${APP_URL}/wali/matches/${matchId}`
  
  return {
    to: '', // Will be set by caller
    subject: `🔔 ${wardName} has a new match - Please review`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #059669, #10B981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ Wali Review Needed</h1>
  </div>
  <div class="content">
    <p>Assalamu Alaikum ${waliName},</p>
    
    <p>As the designated wali for <strong>${wardName}</strong>, we're informing you that they have a new match with <strong>${matchName}</strong>.</p>
    
    <p>Your role as a guardian is to:</p>
    <ul>
      <li>Review the match's profile and compatibility</li>
      <li>Approve or decline the match based on your assessment</li>
      <li>Provide guidance to your ward</li>
    </ul>
    
    <p>The match will not proceed to messaging until both parties' walis have approved.</p>
    
    <p style="text-align: center;">
      <a href="${reviewUrl}" class="button">Review Match</a>
    </p>
    
    <p>JazakAllah khair for your guidance and protection.</p>
  </div>
  <div class="footer">
    <p>You're receiving this as a designated wali on NikahX.</p>
  </div>
</body>
</html>
    `,
    text: `
Assalamu Alaikum ${waliName},

As the designated wali for ${wardName}, we're informing you that they have a new match with ${matchName}.

Please review and approve or decline the match: ${reviewUrl}

The match will not proceed to messaging until both parties' walis have approved.

JazakAllah khair for your guidance and protection.

- NikahX Team
    `
  }
}

/**
 * Wali reminder email for pending approval
 */
export function waliReminderEmail(
  waliName: string, 
  wardName: string, 
  matchName: string, 
  matchId: string,
  hoursWaiting: number
): EmailOptions {
  const reviewUrl = `${APP_URL}/wali/matches/${matchId}`
  
  return {
    to: '', // Will be set by caller
    subject: `⏳ Reminder: ${wardName}'s match awaiting your approval`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #F59E0B; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏳ Pending Approval</h1>
  </div>
  <div class="content">
    <p>Assalamu Alaikum ${waliName},</p>
    
    <p>This is a gentle reminder that <strong>${wardName}</strong>'s match with <strong>${matchName}</strong> has been awaiting your review for ${Math.round(hoursWaiting)} hours.</p>
    
    <p>We understand you may be busy, but timely review helps both parties move forward in their search for a spouse.</p>
    
    <p style="text-align: center;">
      <a href="${reviewUrl}" class="button">Review Now</a>
    </p>
    
    <p>May Allah make this process easy for everyone involved. 🤲</p>
  </div>
  <div class="footer">
    <p>You're receiving this reminder as a designated wali on NikahX.</p>
  </div>
</body>
</html>
    `,
    text: `
Assalamu Alaikum ${waliName},

This is a gentle reminder that ${wardName}'s match with ${matchName} has been awaiting your review for ${Math.round(hoursWaiting)} hours.

Please review the match: ${reviewUrl}

May Allah make this process easy for everyone involved.

- NikahX Team
    `
  }
}

/**
 * New message notification email
 */
export function newMessageEmail(
  recipientName: string, 
  senderName: string, 
  matchId: string,
  messagePreview: string
): EmailOptions {
  const chatUrl = `${APP_URL}/chat/${matchId}`
  
  return {
    to: '', // Will be set by caller
    subject: `💬 New message from ${senderName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
    .message-preview { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>💬 New Message</h1>
  </div>
  <div class="content">
    <p>Assalamu Alaikum ${recipientName},</p>
    
    <p><strong>${senderName}</strong> sent you a message:</p>
    
    <div class="message-preview">
      "${messagePreview}..."
    </div>
    
    <p style="text-align: center;">
      <a href="${chatUrl}" class="button">Reply Now</a>
    </p>
  </div>
  <div class="footer">
    <p><a href="${APP_URL}/settings/notifications">Manage notifications</a></p>
  </div>
</body>
</html>
    `,
    text: `
Assalamu Alaikum ${recipientName},

${senderName} sent you a message:

"${messagePreview}..."

Reply now: ${chatUrl}

- NikahX Team
    `
  }
}

/**
 * Daily match digest email
 */
export function dailyDigestEmail(
  recipientName: string,
  newMatchesCount: number,
  topMatches: Array<{ name: string; age: number; city: string; compatibility?: number }>,
  mahrStats?: { minUsd: number; avgUsd: number; maxUsd: number }
): EmailOptions {
  const matchesUrl = `${APP_URL}/matches`
  
  const matchCards = topMatches.map(m => `
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 10px 0;">
      <strong>${m.name}</strong> • ${m.age} years • ${m.city}
      ${m.compatibility ? `<br><span style="color: #059669;">Compatibility: ${m.compatibility}%</span>` : ''}
    </div>
  `).join('')

  const mahrSection = mahrStats ? `
    <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <strong>📊 Mahr Insights</strong><br>
      Range: $${mahrStats.minUsd.toLocaleString()} - $${mahrStats.maxUsd.toLocaleString()}<br>
      Average: $${mahrStats.avgUsd.toLocaleString()}
    </div>
  ` : ''
  
  return {
    to: '', // Will be set by caller
    subject: `🌅 Your Daily NikahX Digest - ${newMatchesCount} new ${newMatchesCount === 1 ? 'match' : 'matches'}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌅 Your Daily Digest</h1>
    <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
  </div>
  <div class="content">
    <p>Assalamu Alaikum ${recipientName},</p>
    
    <h2>🎉 ${newMatchesCount} New ${newMatchesCount === 1 ? 'Match' : 'Matches'}!</h2>
    
    ${matchCards || '<p>Check out your latest matches on the app.</p>'}
    
    ${mahrSection}
    
    <p style="text-align: center;">
      <a href="${matchesUrl}" class="button">View All Matches</a>
    </p>
    
    <p>May Allah guide you to your perfect match. 🤲</p>
  </div>
  <div class="footer">
    <p><a href="${APP_URL}/settings/notifications">Unsubscribe from digest</a></p>
  </div>
</body>
</html>
    `,
    text: `
Assalamu Alaikum ${recipientName},

You have ${newMatchesCount} new ${newMatchesCount === 1 ? 'match' : 'matches'}!

${topMatches.map(m => `• ${m.name}, ${m.age} years, ${m.city}`).join('\n')}

View all matches: ${matchesUrl}

May Allah guide you to your perfect match.

- NikahX Team
    `
  }
}
