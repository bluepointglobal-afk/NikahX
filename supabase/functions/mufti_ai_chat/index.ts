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
  getMuftiSystemPrompt,
  parseMuftiResponse,
  type MuftiResponse
} from "../_shared/claude_prompts.ts"

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-sonnet-4-20250514'
const MAX_HISTORY_MESSAGES = 20 // Keep conversation context manageable

interface MuftiChatRequest {
  message: string
  conversation_id?: string | null // null to start new conversation
  madhab?: string // Optional override for user's madhab
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
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
    const body: MuftiChatRequest = await req.json()
    validateInput(body, ['message'])

    // Validate message length
    if (body.message.length > 2000) {
      throw new Error('Message too long. Maximum 2000 characters.')
    }

    if (body.message.trim().length < 3) {
      throw new Error('Message too short. Please provide a meaningful question.')
    }

    // Get authenticated user
    const supabase = getAuthenticatedSupabaseClient(req)
    const user = await getUser(supabase)

    // Create service role client for privileged operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check rate limit
    const rateLimit = await checkRateLimit(serviceClient, user.id, 'mufti')
    
    if (!rateLimit.allowed) {
      return rateLimitExceededError(rateLimit)
    }

    // Fetch user profile for context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gender, country, sect')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.warn('[Mufti] Could not fetch user profile:', profileError)
    }

    const userContext = {
      madhab: body.madhab || profile?.sect || undefined,
      gender: profile?.gender || undefined,
      country: profile?.country || undefined
    }

    // Handle conversation: get existing or create new
    let conversationId = body.conversation_id
    let conversationHistory: ConversationMessage[] = []

    if (conversationId) {
      // Fetch existing conversation and messages
      const { data: conversation, error: convError } = await supabase
        .from('mufti_conversations')
        .select('id, user_id, madhab')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (convError || !conversation) {
        throw new Error('Conversation not found or access denied')
      }

      // Update madhab context if stored in conversation
      if (conversation.madhab && !body.madhab) {
        userContext.madhab = conversation.madhab
      }

      // Fetch message history
      const { data: messages } = await supabase
        .from('mufti_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(MAX_HISTORY_MESSAGES)

      if (messages) {
        conversationHistory = messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      }
    } else {
      // Create new conversation
      const title = body.message.slice(0, 100) + (body.message.length > 100 ? '...' : '')
      
      const { data: newConv, error: createError } = await serviceClient
        .from('mufti_conversations')
        .insert({
          user_id: user.id,
          title,
          madhab: userContext.madhab,
          context: userContext
        })
        .select('id')
        .single()

      if (createError || !newConv) {
        throw new Error('Failed to create conversation')
      }

      conversationId = newConv.id
    }

    // Build messages array for Claude
    const claudeMessages: Array<{ role: 'user' | 'assistant', content: string }> = [
      ...conversationHistory,
      { role: 'user', content: body.message }
    ]

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY
    })

    console.log(`[Mufti] Processing message for user ${user.id}, conversation ${conversationId}`)

    const startTime = Date.now()
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: getMuftiSystemPrompt(userContext),
      messages: claudeMessages
    })
    const duration = Date.now() - startTime

    // Extract text content
    const textContent = message.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse the response
    let parsedResponse: MuftiResponse
    try {
      parsedResponse = parseMuftiResponse(textContent.text)
    } catch (parseError) {
      // If parsing fails, create a fallback response
      console.warn('[Mufti] Failed to parse structured response, using raw text')
      parsedResponse = {
        summary: 'See answer below',
        answer: textContent.text,
        sources: [],
        confidence: 'medium',
        differences_of_opinion: [],
        when_to_consult_scholar: [],
        clarifying_questions: [],
        safety: { refused: false, reason: null }
      }
    }

    // Calculate tokens
    const inputTokens = message.usage.input_tokens
    const outputTokens = message.usage.output_tokens
    const totalTokens = inputTokens + outputTokens

    // Save user message
    await serviceClient
      .from('mufti_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: body.message
      })

    // Save assistant response
    const { data: assistantMessage, error: msgError } = await serviceClient
      .from('mufti_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: parsedResponse.answer,
        tokens_used: totalTokens,
        model_version: MODEL,
        safety_flags: parsedResponse.safety.refused ? [parsedResponse.safety.reason || 'refused'] : [],
        sources: parsedResponse.sources,
        confidence: parsedResponse.confidence
      })
      .select('id, created_at')
      .single()

    if (msgError) {
      console.error('[Mufti] Failed to save response:', msgError)
    }

    // Update conversation message count
    await serviceClient
      .from('mufti_conversations')
      .update({ 
        message_count: conversationHistory.length + 2,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    // Increment usage
    await incrementUsage(serviceClient, user.id, 'mufti')

    // Get updated rate limit info
    const updatedRateLimit = await checkRateLimit(serviceClient, user.id, 'mufti')

    console.log(`[Mufti] Response complete. Refused: ${parsedResponse.safety.refused}, Duration: ${duration}ms, Tokens: ${totalTokens}`)

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: conversationId,
        message_id: assistantMessage?.id,
        response: {
          summary: parsedResponse.summary,
          answer: parsedResponse.answer,
          sources: parsedResponse.sources,
          confidence: parsedResponse.confidence,
          differences_of_opinion: parsedResponse.differences_of_opinion,
          when_to_consult_scholar: parsedResponse.when_to_consult_scholar,
          clarifying_questions: parsedResponse.clarifying_questions,
          safety: parsedResponse.safety
        },
        rate_limit: formatRateLimitInfo(updatedRateLimit),
        metadata: {
          model: MODEL,
          tokens_used: totalTokens,
          processing_time_ms: duration,
          created_at: assistantMessage?.created_at
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
    console.error('[Mufti] Error:', error)
    return serveError(error as Error)
  }
})
