import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface RateLimitConfig {
  feature: string
  periodType: 'daily' | 'monthly'
  freeLimit: number
  premiumLimit: number | null // null = unlimited
  alaCartePrice?: number // Price in USD for additional usage
}

export interface RateLimitResult {
  allowed: boolean
  currentUsage: number
  limit: number
  remaining: number
  isPremium: boolean
  requiresPayment: boolean
  alaCartePrice?: number
  periodKey: string
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  firasa: {
    feature: 'firasa',
    periodType: 'monthly',
    freeLimit: 1,
    premiumLimit: 5,
    alaCartePrice: 4.99
  },
  mufti: {
    feature: 'mufti',
    periodType: 'daily',
    freeLimit: 10,
    premiumLimit: null // unlimited
  }
}

/**
 * Get the current period key based on period type
 */
export function getPeriodKey(periodType: 'daily' | 'monthly'): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  
  if (periodType === 'daily') {
    return `${year}-${month}-${day}`
  }
  return `${year}-${month}`
}

/**
 * Check if a user can perform an action based on rate limits
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  featureKey: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[featureKey]
  if (!config) {
    throw new Error(`Unknown rate limit feature: ${featureKey}`)
  }
  
  const periodKey = getPeriodKey(config.periodType)
  
  // Check if user is premium
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single()
  
  const isPremium = profile?.is_premium ?? false
  const limit = isPremium 
    ? (config.premiumLimit ?? Infinity)
    : config.freeLimit
  
  // Get current usage
  const { data: usageData } = await supabase
    .from('rate_limit_tracker')
    .select('usage_count')
    .eq('user_id', userId)
    .eq('feature', config.feature)
    .eq('period_type', config.periodType)
    .eq('period_key', periodKey)
    .single()
  
  const currentUsage = usageData?.usage_count ?? 0
  const remaining = Math.max(0, limit - currentUsage)
  const allowed = remaining > 0 || limit === Infinity
  
  return {
    allowed,
    currentUsage,
    limit: limit === Infinity ? -1 : limit, // -1 indicates unlimited
    remaining: limit === Infinity ? -1 : remaining,
    isPremium,
    requiresPayment: !allowed && config.alaCartePrice !== undefined,
    alaCartePrice: config.alaCartePrice,
    periodKey
  }
}

/**
 * Increment usage for a feature (call after successful action)
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  featureKey: string
): Promise<number> {
  const config = RATE_LIMITS[featureKey]
  if (!config) {
    throw new Error(`Unknown rate limit feature: ${featureKey}`)
  }
  
  const periodKey = getPeriodKey(config.periodType)
  
  // Use the database function for atomic increment
  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_feature: config.feature,
    p_period_type: config.periodType,
    p_period_key: periodKey
  })
  
  if (error) {
    console.error('Failed to increment rate limit:', error)
    throw error
  }
  
  return data as number
}

/**
 * Format rate limit info for API response
 */
export function formatRateLimitInfo(result: RateLimitResult): Record<string, unknown> {
  return {
    usage: result.currentUsage,
    limit: result.limit === -1 ? 'unlimited' : result.limit,
    remaining: result.remaining === -1 ? 'unlimited' : result.remaining,
    is_premium: result.isPremium,
    period: result.periodKey,
    ...(result.requiresPayment && {
      upgrade_available: true,
      a_la_carte_price: result.alaCartePrice
    })
  }
}

/**
 * Create rate limit exceeded error response
 */
export function rateLimitExceededError(result: RateLimitResult): Response {
  const body: Record<string, unknown> = {
    error: 'Rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
    rate_limit: formatRateLimitInfo(result)
  }
  
  if (result.requiresPayment) {
    body.message = `You've used your ${result.limit} free uses this ${result.periodKey.includes('-') && result.periodKey.split('-').length === 2 ? 'month' : 'day'}. Upgrade to premium for more, or purchase additional uses for $${result.alaCartePrice?.toFixed(2)}.`
  } else if (!result.isPremium) {
    body.message = `You've reached your daily limit. Upgrade to premium for unlimited access.`
  } else {
    body.message = `You've reached your limit for this period.`
  }
  
  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': result.periodKey
    }
  })
}
