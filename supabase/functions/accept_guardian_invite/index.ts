import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, serveError } from "../_shared/guards.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { invite_code } = await req.json();
    if (!invite_code || typeof invite_code !== "string") {
      return new Response(JSON.stringify({ error: "invite_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Claim the link
    const { data: link, error: selErr } = await supabase
      .from("wali_links")
      .select("id, ward_id, wali_user_id, status")
      .eq("invite_code", invite_code)
      .single();

    if (selErr) throw selErr;

    if (link.status !== "pending") {
      return new Response(JSON.stringify({ error: "Invite not pending" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.ward_id === userData.user.id) {
      return new Response(JSON.stringify({ error: "Ward cannot be their own wali" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updated, error: updErr } = await supabase
      .from("wali_links")
      .update({ wali_user_id: userData.user.id, status: "active" })
      .eq("id", link.id)
      .select("id, ward_id, wali_user_id, status")
      .single();

    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true, wali_link: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return serveError(e);
  }
});
