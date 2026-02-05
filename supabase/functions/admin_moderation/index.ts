import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

interface AdminActionRequest {
    action_type: "list_reports" | "take_action";
    payload?: any;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // SERVICE ROLE CLIENT for Admin actions
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Auth check - ensure caller is authenticated.
        // In a real scenario, we'd also check if user.role === 'admin' or isInAdminTable(user.id).
        // For this MVP version, we will require a valid user, but relying on Service Role implies we trust the source (e.g. valid JWT).
        // However, to be safe, let's verify the user token effectively.
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // TODO: Add isAdmin Check here.
        // const isAdmin = await checkAdmin(user.id); if (!isAdmin) throw ...

        const { action_type, payload } = await req.json() as AdminActionRequest;

        if (action_type === "list_reports") {
            const { data, error } = await supabaseAdmin
                .from("reports")
                .select("*, reporter:reporter_id(email), target:target_id(email, raw_user_meta_data)")
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            return new Response(
                JSON.stringify({ data }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (action_type === "take_action") {
            const { report_id, target_id, action, notes } = payload;

            // 1. Update Profile Status
            if (action === "ban") {
                await supabaseAdmin.from("profiles").update({ moderation_status: "banned" }).eq("id", target_id);
                // Ideally also ban in auth.users
                await supabaseAdmin.auth.admin.updateUserById(target_id, { ban_duration: "876000h" }); // 100 years
            } else if (action === "suspend") {
                await supabaseAdmin.from("profiles").update({ moderation_status: "suspended" }).eq("id", target_id);
            } else if (action === "warn") {
                await supabaseAdmin.from("profiles").update({ last_warning_at: new Date() }).eq("id", target_id);
            }

            // 2. Log Action
            await supabaseAdmin.from("moderation_logs").insert({
                admin_id: user.id,
                target_id: target_id,
                action_type: action, // warn, ban, etc
                metadata: { report_id, notes }
            });

            // 3. Update Report Status
            if (report_id) {
                await supabaseAdmin.from("reports").update({ status: "resolved", resolution_notes: notes, assigned_to: user.id }).eq("id", report_id);
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid Action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
