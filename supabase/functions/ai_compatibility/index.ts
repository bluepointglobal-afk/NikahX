import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, serveError, validateInput } from "../_shared/guards.ts";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { profile_a, profile_b } = await req.json();
        validateInput({ profile_a, profile_b }, ['profile_a', 'profile_b']);

        // Mock AI Analysis
        const mockAnalysis = {
            summary: "These profiles share strong cultural and religious alignment.",
            strengths: ["Same City", "Shared Sect"],
            challenges: ["None detected in profile data"],
            advice: "Discuss your long-term family goals early."
        };

        return new Response(
            JSON.stringify(mockAnalysis),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return serveError(error);
    }
});
