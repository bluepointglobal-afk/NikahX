import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, PrimaryButton } from '../components/Form';
import { supabase } from '../lib/supabase';

const PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID as string | undefined;

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/40 ring-1 ring-white/10 p-4">
      <p className="text-white font-semibold">{title}</p>
      <p className="text-slate-300 text-sm mt-1">{desc}</p>
    </div>
  );
}

export default function Premium() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const redirectUrl = useMemo(() => {
    // Stripe checkout will append ?success=true / ?canceled=true
    return `${window.location.origin}/subscription/success`;
  }, []);

  const startCheckout = async () => {
    setStatus('');

    if (!PRICE_ID) {
      setStatus('Missing VITE_STRIPE_PRICE_ID env var.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe_checkout', {
        body: {
          price_id: PRICE_ID,
          redirect_url: redirectUrl,
        },
      });

      if (error) throw error;

      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error('Stripe checkout did not return a URL.');

      window.location.assign(url);
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to start checkout.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-6 py-10">
      <Card>
        <h1 className="text-white text-2xl font-bold tracking-tight">NikahX Premium</h1>
        <p className="text-slate-300 text-sm mt-2">
          Upgrade for a better, faster matching experience — still wali-supervised and privacy-first.
        </p>

        <div className="mt-6 space-y-3">
          <Feature title="Unlimited swipes" desc="Browse without daily limits." />
          <Feature title="Photo unlock" desc="Unlock profile photos earlier (with consent rules)." />
          <Feature title="Priority matching" desc="Get surfaced sooner to compatible profiles." />
        </div>

        {status ? <p className="mt-4 text-sm text-rose-200">{status}</p> : null}

        <div className="mt-6 space-y-3">
          <PrimaryButton onClick={startCheckout} disabled={loading}>
            {loading ? 'Redirecting…' : 'Upgrade to Premium'}
          </PrimaryButton>

          <button
            className="w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/account/subscription')}
          >
            View subscription
          </button>

          <button
            className="w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/home')}
          >
            Back to home
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400 leading-relaxed">
          Payments are processed securely by Stripe. You can cancel anytime in the Stripe portal.
        </p>
      </Card>
    </div>
  );
}
