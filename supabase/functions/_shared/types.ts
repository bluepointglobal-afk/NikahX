export interface AskMuftiRequest {
    query: string;
    context?: Record<string, any>;
}

export interface AskMuftiResponse {
    summary: string;
    clarifying_questions: string[];
    answer: string;
    confidence: 'high' | 'medium' | 'low';
    sources: string[];
    differences_of_opinion: string[];
    when_to_consult_scholar: string[];
    safety: {
        refused: boolean;
        reason: string | null;
    };
}

export interface CompatibilityRequest {
    profile_a_id: string;
    profile_b_id: string;
}

export interface AiRequestLog {
    function_name: string;
    request_body: any;
    response_body: any;
    user_id?: string;
    safety_flags?: string[];
    created_at?: string;
}
