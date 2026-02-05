import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, serveError } from "../_shared/guards.ts";

function randomCode(len = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes).map((b) => alphabet[b % alphabet.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { wali_contact } = await req.json();
    if (!wali_contact || typeof wali_contact !== "string") {
      return new Response(JSON.stringify({ error: "wali_contact required" }), {
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

    const invite_code = randomCode();

    const { data, error } = await supabase
      .from("wali_links")
      .insert({
        ward_id: userData.user.id,
        wali_contact,
        invite_code,
        status: "pending",
      })
      .select("id, invite_code, status")
      .single();

    if (error) throw error;

    // NOTE: Sending SMS/email is intentionally out of scope for MVP.
    // Client can deliver invite_code to the wali out-of-band.

    return new Response(JSON.stringify({ success: true, wali_link: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return serveError(e);
  }
});
