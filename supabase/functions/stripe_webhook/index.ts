import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature") ?? "";

  try {
    if (!endpointSecret) {
      return json(500, { error: "Missing STRIPE_WEBHOOK_SECRET" });
    }
    if (!signature) {
      return json(400, { error: "Missing stripe-signature header" });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;

        // subscription checkout
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              is_premium: true,
              stripe_customer_id: customerId ?? null,
              stripe_subscription_id: subscriptionId ?? null,
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const isActive = ["trialing", "active"].includes(sub.status);
        const premiumUntil = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: isActive,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            premium_until: premiumUntil,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.paid": {
        // Best-effort: ensure premium stays enabled when invoices are paid
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (customerId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              is_premium: true,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId ?? null,
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        // ignore
        break;
    }

    return json(200, { received: true });
  } catch (err) {
    return json(400, { error: `Webhook Error: ${err?.message ?? String(err)}` });
  }
});
