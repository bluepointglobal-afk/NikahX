import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

interface ReportRequest {
    target_user_id: string;
    reason: string;
    description?: string;
    evidence?: Record<string, any>[];
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        // 1. Get User
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Parse Body
        const { target_user_id, reason, description, evidence } = await req.json() as ReportRequest;

        if (!target_user_id || !reason) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: target_user_id, reason" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 3. Insert Report
        const { error: insertError } = await supabaseClient
            .from("reports")
            .insert({
                reporter_id: user.id,
                target_id: target_user_id,
                reason,
                description,
                evidence: evidence || [],
            });

        if (insertError) {
            console.error("Error inserting report:", insertError);
            return new Response(
                JSON.stringify({ error: "Failed to create report" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, message: "Report submitted successfully" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
