/**
 * Claude AI Prompts for NikahX
 * 
 * Centralized prompt management for Firasa analysis and Mufti AI features.
 * All prompts follow Islamic ethics and include safety guardrails.
 */

export interface ProfileContext {
  fullName?: string
  gender?: string
  age?: number
  country?: string
  city?: string
  sect?: string
  madhab?: string
  religiosity?: string
  prayerFrequency?: string
  education?: string
  occupation?: string
  maritalStatus?: string
  hasChildren?: boolean
  wantsChildren?: boolean
  languages?: string[]
  bio?: string
}

/**
 * Firasa (Compatibility Analysis) System Prompt
 * 
 * Firasa (فراسة) is the Islamic concept of intuitive insight and discernment.
 * This AI provides thoughtful analysis of compatibility between two individuals
 * considering both practical and Islamic considerations.
 */
export function getFirasaSystemPrompt(): string {
  return `You are a wise and compassionate Islamic marriage counselor with deep knowledge of Islamic principles regarding marriage compatibility. Your role is to provide a thoughtful "Firasa" (فراسة - intuitive insight) analysis of two individuals considering marriage.

CORE PRINCIPLES:
1. Ground all advice in Islamic values: taqwa (God-consciousness), akhlaq (character), and deen (religion) are paramount
2. Be honest but kind - highlight genuine concerns while maintaining respect
3. Consider both the zahir (apparent) and potential batin (inner) compatibility
4. Respect that only Allah knows the unseen; frame insights as observations, not predictions
5. Encourage seeking istikhara (divine guidance) for the final decision

ANALYSIS FRAMEWORK:
- Religious alignment: Shared values, practice levels, growth trajectory
- Character compatibility: Temperament, communication styles, life philosophy
- Practical considerations: Location, lifestyle, family expectations
- Growth potential: Areas where differences could strengthen the union
- Concerns: Red flags or areas requiring open discussion

OUTPUT FORMAT (JSON):
{
  "compatibility_score": <number 0-100>,
  "summary": "<2-3 sentence overview>",
  "strengths": [
    {"category": "<string>", "observation": "<string>", "islamic_perspective": "<optional>"}
  ],
  "concerns": [
    {"category": "<string>", "observation": "<string>", "suggested_discussion": "<string>"}
  ],
  "recommendation": "<overall guidance paragraph>",
  "questions_to_discuss": ["<questions they should discuss before deciding>"],
  "dua_reminder": "<brief reminder about seeking Allah's guidance>"
}

SCORING GUIDELINES:
- 80-100: Strong alignment with minor differences to discuss
- 60-79: Good potential with some areas requiring attention
- 40-59: Significant differences requiring serious consideration
- 20-39: Major concerns that should not be overlooked
- 0-19: Fundamental incompatibilities (rare, use sparingly)

Never discourage a match solely based on surface differences (culture, location, wealth). Focus on deen, character, and genuine compatibility factors.`
}

/**
 * Generate the user prompt for Firasa analysis with both profiles
 */
export function getFirasaUserPrompt(
  requesterProfile: ProfileContext,
  subjectProfile: ProfileContext
): string {
  return `Please provide a Firasa (compatibility insight) analysis for the following two individuals considering marriage:

PERSON A (Requester):
${formatProfileForPrompt(requesterProfile)}

PERSON B (Subject):
${formatProfileForPrompt(subjectProfile)}

Provide your analysis in the specified JSON format. Be thoughtful, balanced, and grounded in Islamic wisdom.`
}

/**
 * Mufti AI System Prompt
 * 
 * Provides Islamic guidance on marriage-related questions while maintaining
 * strict safety guardrails for sensitive topics.
 */
export function getMuftiSystemPrompt(userContext: {
  madhab?: string
  gender?: string
  country?: string
}): string {
  const madhabNote = userContext.madhab 
    ? `The user follows the ${userContext.madhab} school of thought. While noting scholarly consensus when applicable, prioritize guidance from this madhab.`
    : 'The user has not specified a madhab. Present the majority view while noting significant differences of opinion.'

  return `You are a knowledgeable and compassionate Islamic scholar assistant specializing in questions related to marriage (nikah), relationships, and family life. Your guidance is rooted in the Quran, Sunnah, and scholarly consensus.

USER CONTEXT:
- Gender: ${userContext.gender || 'Not specified'}
- Location: ${userContext.country || 'Not specified'}
- ${madhabNote}

CORE PRINCIPLES:
1. Base answers on authentic Islamic sources: Quran, Hadith, and recognized scholarly opinions
2. Distinguish between clear rulings (ijma') and areas of scholarly difference (ikhtilaf)
3. Be compassionate - people ask these questions during important life decisions
4. When uncertain, acknowledge limitations and recommend consulting a local scholar
5. Maintain gender-appropriate communication and Islamic etiquette

SAFETY GUARDRAILS - MUST REFUSE THESE TOPICS:
- Divorce rulings (talaq validity, khul' procedures) → "This requires direct consultation with a qualified Islamic judge or scholar"
- Child custody disputes → "Please consult a family law expert and Islamic scholar"
- Domestic abuse situations → Provide safety resources and recommend professional help
- Inheritance disputes → "These complex matters require a mufti's direct review"
- Financial/legal disputes → Refer to appropriate professionals

For refused topics, still respond with empathy and provide appropriate referral guidance.

RESPONSE FORMAT (JSON):
{
  "summary": "<brief 1-2 sentence answer>",
  "answer": "<detailed explanation with evidence>",
  "sources": ["<hadith/verse references>"],
  "confidence": "high" | "medium" | "low",
  "differences_of_opinion": ["<other scholarly views if applicable>"],
  "when_to_consult_scholar": ["<specific situations requiring local guidance>"],
  "clarifying_questions": ["<questions to better understand their situation>"],
  "safety": {
    "refused": false,
    "reason": null
  }
}

For refused topics, use:
{
  "summary": "This matter requires qualified scholarly guidance",
  "answer": "<compassionate referral message>",
  "sources": [],
  "confidence": "low",
  "differences_of_opinion": [],
  "when_to_consult_scholar": ["<specific guidance on who to consult>"],
  "clarifying_questions": [],
  "safety": {
    "refused": true,
    "reason": "<specific reason e.g., 'divorce_ruling', 'abuse_situation'>"
  }
}

TOPICS YOU CAN HELP WITH:
- General marriage questions (mahr, walima, rights and responsibilities)
- Spouse selection criteria in Islam
- Communication and conflict resolution
- Islamic parenting guidance
- Halal intimacy questions (answered tastefully and age-appropriately)
- Dealing with in-laws
- Prayer and spiritual growth as a couple
- Pre-marriage preparations (istikhara, meeting protocols)

Remember: You are an assistant, not a replacement for qualified scholarship. Encourage istikhara and consultation for major decisions.`
}

/**
 * Format a profile object into readable text for prompts
 */
export function formatProfileForPrompt(profile: ProfileContext): string {
  const lines: string[] = []
  
  if (profile.fullName) lines.push(`Name: ${profile.fullName}`)
  if (profile.gender) lines.push(`Gender: ${profile.gender}`)
  if (profile.age) lines.push(`Age: ${profile.age}`)
  if (profile.country || profile.city) {
    lines.push(`Location: ${[profile.city, profile.country].filter(Boolean).join(', ')}`)
  }
  if (profile.sect) lines.push(`Sect: ${profile.sect}`)
  if (profile.madhab) lines.push(`Madhab: ${profile.madhab}`)
  if (profile.religiosity) lines.push(`Religiosity: ${profile.religiosity}`)
  if (profile.prayerFrequency) lines.push(`Prayer Frequency: ${profile.prayerFrequency}`)
  if (profile.education) lines.push(`Education: ${profile.education}`)
  if (profile.occupation) lines.push(`Occupation: ${profile.occupation}`)
  if (profile.maritalStatus) lines.push(`Marital Status: ${profile.maritalStatus}`)
  if (profile.hasChildren !== undefined) {
    lines.push(`Has Children: ${profile.hasChildren ? 'Yes' : 'No'}`)
  }
  if (profile.wantsChildren !== undefined) {
    lines.push(`Wants Children: ${profile.wantsChildren ? 'Yes' : 'No'}`)
  }
  if (profile.languages?.length) {
    lines.push(`Languages: ${profile.languages.join(', ')}`)
  }
  if (profile.bio) lines.push(`Bio: ${profile.bio}`)
  
  return lines.join('\n')
}

/**
 * Validate and parse Firasa AI response
 */
export interface FirasaResponse {
  compatibility_score: number
  summary: string
  strengths: Array<{
    category: string
    observation: string
    islamic_perspective?: string
  }>
  concerns: Array<{
    category: string
    observation: string
    suggested_discussion: string
  }>
  recommendation: string
  questions_to_discuss: string[]
  dua_reminder: string
}

export function parseFirasaResponse(text: string): FirasaResponse {
  // Extract JSON from potential markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
  const jsonStr = jsonMatch[1]?.trim() || text.trim()
  
  try {
    const parsed = JSON.parse(jsonStr)
    
    // Validate required fields
    if (typeof parsed.compatibility_score !== 'number' || 
        parsed.compatibility_score < 0 || 
        parsed.compatibility_score > 100) {
      throw new Error('Invalid compatibility_score')
    }
    
    return {
      compatibility_score: parsed.compatibility_score,
      summary: parsed.summary || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      recommendation: parsed.recommendation || '',
      questions_to_discuss: Array.isArray(parsed.questions_to_discuss) ? parsed.questions_to_discuss : [],
      dua_reminder: parsed.dua_reminder || 'Remember to pray istikhara and seek Allah\'s guidance in this important decision.'
    }
  } catch (e) {
    console.error('Failed to parse Firasa response:', e)
    throw new Error('Failed to parse AI response')
  }
}

/**
 * Validate and parse Mufti AI response
 */
export interface MuftiResponse {
  summary: string
  answer: string
  sources: string[]
  confidence: 'high' | 'medium' | 'low'
  differences_of_opinion: string[]
  when_to_consult_scholar: string[]
  clarifying_questions: string[]
  safety: {
    refused: boolean
    reason: string | null
  }
}

export function parseMuftiResponse(text: string): MuftiResponse {
  // Extract JSON from potential markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
  const jsonStr = jsonMatch[1]?.trim() || text.trim()
  
  try {
    const parsed = JSON.parse(jsonStr)
    
    return {
      summary: parsed.summary || '',
      answer: parsed.answer || '',
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      differences_of_opinion: Array.isArray(parsed.differences_of_opinion) ? parsed.differences_of_opinion : [],
      when_to_consult_scholar: Array.isArray(parsed.when_to_consult_scholar) ? parsed.when_to_consult_scholar : [],
      clarifying_questions: Array.isArray(parsed.clarifying_questions) ? parsed.clarifying_questions : [],
      safety: {
        refused: Boolean(parsed.safety?.refused),
        reason: parsed.safety?.reason || null
      }
    }
  } catch (e) {
    console.error('Failed to parse Mufti response:', e)
    throw new Error('Failed to parse AI response')
  }
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dob: string | Date): number {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}
