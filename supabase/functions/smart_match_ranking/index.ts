import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders, serveError } from "../_shared/guards.ts"
import { getAuthenticatedSupabaseClient, getUser } from "../_shared/auth.ts"

/**
 * Smart Match Ranking Edge Function (Scheduled Cron)
 * 
 * Calculates compatibility scores for a user against all eligible candidates.
 * Runs every 6 hours per user (or on-demand).
 * 
 * Scoring factors (100 points max):
 * - Profile completeness (0-20 points)
 * - Preference alignment (0-25 points)
 * - Activity recency (0-15 points)
 * - Mutual dealbreaker check (0-20 points)
 * - Madhab compatibility (0-10 points)
 * - Photo quality score (0-10 points)
 * 
 * Cron: every 6 hours
 */

interface RankingRequest {
  user_id?: string // For admin/cron calls
  limit?: number // Max candidates to return (default 100)
  force_refresh?: boolean // Bypass cache
}

interface CandidateScore {
  profile_id: string
  total_score: number
  factors: {
    profile_completeness: number
    preference_alignment: number
    activity_recency: number
    dealbreaker_check: number
    madhab_compatibility: number
    photo_quality: number
  }
  profile_summary?: {
    full_name: string
    age: number
    city: string
    religiosity: string
  }
}

// Field weights for profile completeness
const PROFILE_FIELDS = [
  { field: 'full_name', weight: 3 },
  { field: 'bio', weight: 2 },
  { field: 'education_level', weight: 2 },
  { field: 'occupation', weight: 2 },
  { field: 'religiosity_level', weight: 3 },
  { field: 'prayer_frequency', weight: 2 },
  { field: 'languages', weight: 1 },
  { field: 'country', weight: 2 },
  { field: 'city', weight: 1 },
  { field: 'sect', weight: 2 }
]
const MAX_COMPLETENESS_WEIGHT = PROFILE_FIELDS.reduce((sum, f) => sum + f.weight, 0)

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let userId: string
    let limit = 100
    let forceRefresh = false

    // Parse request
    if (req.method === 'POST') {
      const body: RankingRequest = await req.json()
      limit = body.limit || 100
      forceRefresh = body.force_refresh || false

      if (body.user_id) {
        // Admin/cron call - verify service role
        const authHeader = req.headers.get('Authorization')
        if (authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')) {
          userId = body.user_id
        } else {
          // Regular user trying to specify user_id - must be themselves
          const supabase = getAuthenticatedSupabaseClient(req)
          const user = await getUser(supabase)
          if (user.id !== body.user_id) {
            throw new Error('Cannot rank for another user')
          }
          userId = user.id
        }
      } else {
        // Regular user call
        const supabase = getAuthenticatedSupabaseClient(req)
        const user = await getUser(supabase)
        userId = user.id
      }
    } else {
      // GET request - use authenticated user
      const supabase = getAuthenticatedSupabaseClient(req)
      const user = await getUser(supabase)
      userId = user.id
    }

    console.log(`[SmartRanking] Computing for user ${userId}, limit: ${limit}, force: ${forceRefresh}`)

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await serviceClient
        .from('match_ranking_cache')
        .select('ranked_profiles, computed_at, expires_at')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (cached) {
        console.log(`[SmartRanking] Returning cached ranking from ${cached.computed_at}`)
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            computed_at: cached.computed_at,
            expires_at: cached.expires_at,
            candidates: cached.ranked_profiles
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fetch requesting user's profile and preferences
    const { data: userProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    const { data: userPrefs } = await serviceClient
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Get blocked users
    const { data: blockedUsers } = await serviceClient
      .from('swipes')
      .select('target_id')
      .eq('actor_id', userId)

    const blockedIds = new Set(blockedUsers?.map(b => b.target_id) || [])

    // Get already matched users
    const { data: existingMatches } = await serviceClient
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('is_active', true)

    const matchedIds = new Set<string>()
    existingMatches?.forEach(m => {
      matchedIds.add(m.user1_id === userId ? m.user2_id : m.user1_id)
    })

    // Fetch all eligible candidates (opposite gender, not blocked, not matched)
    const oppositeGender = userProfile.gender === 'male' ? 'female' : 'male'
    
    const { data: candidates, error: candidatesError } = await serviceClient
      .from('profiles')
      .select(`
        id, full_name, gender, dob, country, city, sect,
        religiosity_level, prayer_frequency, education_level, education_field,
        occupation, marital_status, has_children, wants_children, languages, bio,
        is_premium, verification_status, is_suspended, updated_at
      `)
      .eq('gender', oppositeGender)
      .eq('is_suspended', false)
      .neq('id', userId)
      .limit(500) // Process at most 500 candidates

    if (candidatesError) {
      throw new Error(`Failed to fetch candidates: ${candidatesError.message}`)
    }

    if (!candidates || candidates.length === 0) {
      console.log('[SmartRanking] No candidates found')
      return new Response(
        JSON.stringify({
          success: true,
          cached: false,
          candidates: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Score each candidate
    const scoredCandidates: CandidateScore[] = []
    const now = Date.now()

    for (const candidate of candidates) {
      // Skip blocked and matched users
      if (blockedIds.has(candidate.id) || matchedIds.has(candidate.id)) {
        continue
      }

      // Calculate age
      const candidateAge = candidate.dob 
        ? Math.floor((now - new Date(candidate.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      // Apply preference filters
      if (userPrefs) {
        if (candidateAge) {
          if (candidateAge < userPrefs.min_age || candidateAge > userPrefs.max_age) {
            continue
          }
        }
        if (userPrefs.preferred_sect && candidate.sect !== userPrefs.preferred_sect) {
          continue
        }
        if (userPrefs.preferred_religiosity_level && 
            candidate.religiosity_level !== userPrefs.preferred_religiosity_level) {
          continue
        }
      }

      const factors = {
        profile_completeness: 0,
        preference_alignment: 0,
        activity_recency: 0,
        dealbreaker_check: 0,
        madhab_compatibility: 0,
        photo_quality: 0
      }

      // 1. Profile Completeness (0-20 points)
      let completenessWeight = 0
      for (const { field, weight } of PROFILE_FIELDS) {
        const value = candidate[field as keyof typeof candidate]
        if (value !== null && value !== undefined && value !== '') {
          completenessWeight += weight
        }
      }
      factors.profile_completeness = Math.round((completenessWeight / MAX_COMPLETENESS_WEIGHT) * 20)

      // 2. Preference Alignment (0-25 points)
      let alignmentScore = 25 // Start with max, deduct for misalignments
      if (userPrefs) {
        // Age preference (closer to middle of range = better)
        if (candidateAge) {
          const idealAge = (userPrefs.min_age + userPrefs.max_age) / 2
          const ageDiff = Math.abs(candidateAge - idealAge)
          const ageRange = (userPrefs.max_age - userPrefs.min_age) / 2
          if (ageRange > 0) {
            alignmentScore -= Math.min(5, (ageDiff / ageRange) * 5)
          }
        }

        // Location match
        if (!userPrefs.allow_international && 
            userProfile.country && candidate.country && 
            userProfile.country !== candidate.country) {
          alignmentScore -= 10
        }
        if (userProfile.city && candidate.city && userProfile.city === candidate.city) {
          alignmentScore += 3 // Bonus for same city
        }
      }
      factors.preference_alignment = Math.max(0, Math.round(alignmentScore))

      // 3. Activity Recency (0-15 points)
      const lastUpdated = candidate.updated_at ? new Date(candidate.updated_at).getTime() : 0
      const daysSinceUpdate = (now - lastUpdated) / (24 * 60 * 60 * 1000)
      if (daysSinceUpdate <= 1) {
        factors.activity_recency = 15
      } else if (daysSinceUpdate <= 3) {
        factors.activity_recency = 12
      } else if (daysSinceUpdate <= 7) {
        factors.activity_recency = 8
      } else if (daysSinceUpdate <= 14) {
        factors.activity_recency = 4
      } else {
        factors.activity_recency = 0
      }

      // 4. Dealbreaker Check (0-20 points)
      factors.dealbreaker_check = 20 // Start with max
      
      // Check marital status compatibility
      if (userProfile.marital_status === 'never_married' && 
          candidate.marital_status !== 'never_married') {
        factors.dealbreaker_check -= 5
      }

      // Check children compatibility
      if (userProfile.wants_children === false && candidate.has_children === true) {
        factors.dealbreaker_check -= 10
      }
      if (userProfile.wants_children === true && candidate.wants_children === false) {
        factors.dealbreaker_check -= 10
      }

      // 5. Madhab/Sect Compatibility (0-10 points)
      if (userProfile.sect && candidate.sect) {
        if (userProfile.sect === candidate.sect) {
          factors.madhab_compatibility = 10
        } else {
          // Some sects are more compatible than others
          factors.madhab_compatibility = 5
        }
      } else {
        factors.madhab_compatibility = 5 // Neutral if not specified
      }

      // 6. Photo Quality Score (0-10 points)
      // For now, give verified users bonus points
      if (candidate.verification_status === 'verified') {
        factors.photo_quality = 10
      } else if (candidate.verification_status === 'pending') {
        factors.photo_quality = 5
      } else {
        factors.photo_quality = 2
      }

      // Premium users get slight boost
      if (candidate.is_premium) {
        factors.photo_quality = Math.min(10, factors.photo_quality + 2)
      }

      const totalScore = 
        factors.profile_completeness +
        factors.preference_alignment +
        factors.activity_recency +
        factors.dealbreaker_check +
        factors.madhab_compatibility +
        factors.photo_quality

      scoredCandidates.push({
        profile_id: candidate.id,
        total_score: totalScore,
        factors,
        profile_summary: {
          full_name: candidate.full_name || 'Anonymous',
          age: candidateAge || 0,
          city: candidate.city || 'Unknown',
          religiosity: candidate.religiosity_level || 'Not specified'
        }
      })
    }

    // Sort by score (highest first) and limit
    scoredCandidates.sort((a, b) => b.total_score - a.total_score)
    const topCandidates = scoredCandidates.slice(0, limit)

    // Cache the results
    const expiresAt = new Date(now + 24 * 60 * 60 * 1000) // 24 hours
    
    await serviceClient
      .from('match_ranking_cache')
      .upsert({
        user_id: userId,
        ranked_profiles: topCandidates,
        total_candidates: scoredCandidates.length,
        computed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }, { onConflict: 'user_id' })

    console.log(`[SmartRanking] Complete. Scored ${scoredCandidates.length} candidates, returning ${topCandidates.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        computed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        total_candidates: scoredCandidates.length,
        candidates: topCandidates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[SmartRanking] Error:', error)
    return serveError(error as Error)
  }
})
