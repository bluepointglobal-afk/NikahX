import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, serveError, validateInput } from "../_shared/guards.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { return_url } = await req.json();
    validateInput({ return_url }, ["return_url"]);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
      token,
    );
    if (userError) {
      throw new Error(userError.message);
    }

    const user = userData.user;
    if (!user) {
      throw new Error("Unauthenticated");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const customer = profile?.stripe_customer_id;
    if (!customer) {
      throw new Error(
        "No Stripe customer found for this user. Please subscribe first.",
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return serveError(error as Error);
  }
});
