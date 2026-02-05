export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function serveError(error: Error) {
    return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

export function validateInput(reqBody: any, requiredFields: string[]) {
    for (const field of requiredFields) {
        if (!reqBody[field]) {
            throw new Error(`Missing field: ${field}`);
        }
    }
}
