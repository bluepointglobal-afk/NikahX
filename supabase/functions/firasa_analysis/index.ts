import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.20.1"
import { corsHeaders, serveError, validateInput } from "../_shared/guards.ts"
import { getAuthenticatedSupabaseClient, getUser } from "../_shared/auth.ts"
import { 
  checkRateLimit, 
  incrementUsage, 
  rateLimitExceededError,
  formatRateLimitInfo 
} from "../_shared/rate_limiter.ts"
import {
  getFirasaSystemPrompt,
  getFirasaUserPrompt,
  parseFirasaResponse,
  calculateAge,
  type ProfileContext
} from "../_shared/claude_prompts.ts"

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-sonnet-4-20250514'

interface FirasaRequest {
  requester_id?: string // Optional, defaults to authenticated user
  subject_id: string
  match_id?: string // Optional, if analyzing within a match context
  bypass_rate_limit?: boolean // For a la carte purchases
  payment_intent_id?: string // Stripe payment for a la carte
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API key
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    // Parse request
    const body: FirasaRequest = await req.json()
    validateInput(body, ['subject_id'])

    // Get authenticated user
    const supabase = getAuthenticatedSupabaseClient(req)
    const user = await getUser(supabase)
    const requesterId = body.requester_id || user.id

    // Security: Only allow analyzing yourself or if you have a match
    if (requesterId !== user.id) {
      // Check if user is admin/moderator
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        throw new Error('Not authorized to request analysis for another user')
      }
    }

    // Create service role client for rate limit operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check rate limit (unless bypassed with payment)
    if (!body.bypass_rate_limit) {
      const rateLimit = await checkRateLimit(serviceClient, requesterId, 'firasa')
      
      if (!rateLimit.allowed) {
        return rateLimitExceededError(rateLimit)
      }
    }

    // Validate match exists if match_id provided
    if (body.match_id) {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, status')
        .eq('id', body.match_id)
        .single()

      if (matchError || !match) {
        throw new Error('Match not found')
      }

      // Verify both users are in the match
      const matchUsers = [match.user1_id, match.user2_id]
      if (!matchUsers.includes(requesterId) || !matchUsers.includes(body.subject_id)) {
        throw new Error('Users not part of this match')
      }
    }

    // Fetch both profiles
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select(`
        id, full_name, gender, dob, country, city, sect,
        religiosity_level, prayer_frequency, education_level, education_field,
        occupation, marital_status, has_children, wants_children, languages, bio
      `)
      .in('id', [requesterId, body.subject_id])

    if (profilesError || !profiles || profiles.length !== 2) {
      throw new Error('Failed to fetch profiles')
    }

    // Map profiles to context objects
    const requesterData = profiles.find(p => p.id === requesterId)!
    const subjectData = profiles.find(p => p.id === body.subject_id)!

    const toProfileContext = (p: typeof requesterData): ProfileContext => ({
      fullName: p.full_name || undefined,
      gender: p.gender || undefined,
      age: p.dob ? calculateAge(p.dob) : undefined,
      country: p.country || undefined,
      city: p.city || undefined,
      sect: p.sect || undefined,
      religiosity: p.religiosity_level || undefined,
      prayerFrequency: p.prayer_frequency || undefined,
      education: p.education_level || undefined,
      occupation: p.occupation || undefined,
      maritalStatus: p.marital_status || undefined,
      hasChildren: p.has_children ?? undefined,
      wantsChildren: p.wants_children ?? undefined,
      languages: p.languages || undefined,
      bio: p.bio || undefined
    })

    const requesterContext = toProfileContext(requesterData)
    const subjectContext = toProfileContext(subjectData)

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY
    })

    console.log(`[Firasa] Analyzing compatibility: ${requesterId} <-> ${body.subject_id}`)

    const startTime = Date.now()
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: getFirasaSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: getFirasaUserPrompt(requesterContext, subjectContext)
        }
      ]
    })
    const duration = Date.now() - startTime

    // Extract text content
    const textContent = message.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse the response
    const analysis = parseFirasaResponse(textContent.text)

    // Calculate cost (approximate)
    const inputTokens = message.usage.input_tokens
    const outputTokens = message.usage.output_tokens
    const costUsd = (inputTokens * 0.003 + outputTokens * 0.015) / 1000 // Claude Sonnet 4 pricing

    // Store the report
    const { data: report, error: insertError } = await serviceClient
      .from('firasa_reports')
      .insert({
        requester_id: requesterId,
        subject_id: body.subject_id,
        match_id: body.match_id || null,
        compatibility_score: analysis.compatibility_score,
        strengths: analysis.strengths,
        concerns: analysis.concerns,
        recommendation: analysis.recommendation,
        full_analysis: {
          summary: analysis.summary,
          questions_to_discuss: analysis.questions_to_discuss,
          dua_reminder: analysis.dua_reminder
        },
        model_version: MODEL,
        tokens_used: inputTokens + outputTokens,
        cost_usd: costUsd,
        is_paid: body.bypass_rate_limit || false
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Firasa] Failed to save report:', insertError)
      // Don't fail the request, still return the analysis
    }

    // Increment usage (only if not a paid bypass)
    if (!body.bypass_rate_limit) {
      await incrementUsage(serviceClient, requesterId, 'firasa')
    }

    // Get updated rate limit info for response
    const rateLimit = await checkRateLimit(serviceClient, requesterId, 'firasa')

    console.log(`[Firasa] Analysis complete. Score: ${analysis.compatibility_score}, Duration: ${duration}ms, Tokens: ${inputTokens + outputTokens}`)

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report?.id,
        analysis: {
          compatibility_score: analysis.compatibility_score,
          summary: analysis.summary,
          strengths: analysis.strengths,
          concerns: analysis.concerns,
          recommendation: analysis.recommendation,
          questions_to_discuss: analysis.questions_to_discuss,
          dua_reminder: analysis.dua_reminder
        },
        rate_limit: formatRateLimitInfo(rateLimit),
        metadata: {
          model: MODEL,
          tokens_used: inputTokens + outputTokens,
          processing_time_ms: duration
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('[Firasa] Error:', error)
    return serveError(error as Error)
  }
})
