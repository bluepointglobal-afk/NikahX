import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe as StripeType } from '@stripe/stripe-js';
import { Card, PrimaryButton } from './Form';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

interface StripePaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function StripePaymentForm({ onSuccess, onError }: StripePaymentFormProps) {
  const [stripe, setStripe] = useState<StripeType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initStripe = async () => {
      try {
        if (!STRIPE_PUBLISHABLE_KEY) {
          onError('Stripe publishable key not configured');
          return;
        }
        const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
        setStripe(stripe);
        setLoading(false);
      } catch (error: any) {
        onError(error?.message || 'Failed to load Stripe');
      }
    };

    initStripe();
  }, [onError]);

  if (loading) {
    return (
      <Card>
        <p className="text-slate-300">Loading payment form…</p>
      </Card>
    );
  }

  if (!stripe) {
    return (
      <Card>
        <p className="text-rose-300">Failed to load payment processor. Please try again.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-white text-xl font-semibold">Payment Information</h2>
      <p className="text-slate-300 text-sm mt-2">
        Complete your subscription upgrade. Payments are securely processed by Stripe.
      </p>

      {/* Note: Using hosted checkout for simplicity and security */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-950/40 ring-1 ring-white/10">
        <p className="text-slate-200 text-sm">
          ✓ Secure, PCI-compliant checkout
        </p>
        <p className="text-slate-200 text-sm mt-2">
          ✓ Test with card: 4242 4242 4242 4242
        </p>
        <p className="text-slate-200 text-sm mt-2">
          ✓ Use any future expiry date and CVC
        </p>
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={() => onSuccess()} disabled={loading}>
          Proceed to Checkout
        </PrimaryButton>
      </div>
    </Card>
  );
}
