# AI Guardrails & Safety Policy

## Overview
This document defines the safety protocols and output schemas for the "Ask the Mufti" and "Compatibility" AI features in NikahX.

## Refusal Conditions (Ask the Mufti)
The AI **MUST** refuse to answer queries related to high-stakes topics that require professional scholarly or legal intervention.

### High-Stakes Topics (Immediate Refusal)
- **Divorce / Talaq**: Any rulings on the validity of divorce.
- **Custody**: Child custody disputes or rulings.
- **Violence / Abuse**: Domestic violence, self-harm, or abuse.
- **Legal Disputes**: Inheritance, financial claims awaiting court judgment.

### Refusal Behavior
When a refusal is triggered:
1. `safety.refused` MUST be set to `true`.
2. `safety.reason` MUST specify the category (e.g., "High-stakes topic detected").
3. `answer` MUST be a standard refusal message directing the user to a qualified scholar or professional.
4. No fake sources or rulings should be provided.

## JSON Schema (Ask the Mufti)
The AI response must strictly adhere to the following JSON structure:

```json
{
  "summary": "string",
  "clarifying_questions": ["string"],
  "answer": "string",
  "confidence": "high" | "medium" | "low",
  "sources": ["string"],
  "differences_of_opinion": ["string"],
  "when_to_consult_scholar": ["string"],
  "safety": {
    "refused": boolean,
    "reason": "string | null"
  }
}
```

## Compatibility AI Guardrails
- **Deterministic First**: The AI must strictly base its explanation on a pre-calculated, deterministic compatibility score. It cannot "invent" a score.
- **Positive & Constructive**: Explanations should focus on alignment and constructive differences.
- **No Formatting**: Output should be clean text for the explanation.

## Logging & Auditing
All AI interactions are logged to the `ai_request` table in Supabase.
- **Flags**: Refusals are flagged with `safety_flags` array (e.g., `["high_stakes_refusal"]`).
- **Review**: Logs are periodically reviewed to ensure guardrail effectiveness.
