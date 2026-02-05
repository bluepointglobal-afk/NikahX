import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, serveError, validateInput } from "../_shared/guards.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { price_id, redirect_url } = await req.json();
        validateInput({ price_id, redirect_url }, ['price_id', 'redirect_url']);

        // Get the user from the auth header
        const authHeader = req.headers.get('Authorization')!;
        const token = authHeader.replace('Bearer ', '');
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: price_id,
                    quantity: 1,
                },
            ],
            mode: 'subscription', // or payment, logic would vary
            success_url: `${redirect_url}?success=true`,
            cancel_url: `${redirect_url}?canceled=true`,
            client_reference_id: user.id, // Important for matching in webhook
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return serveError(error);
    }
});

// Mock createClient import for Deno environment in this snippet
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
