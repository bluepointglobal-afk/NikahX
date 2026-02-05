import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, PrimaryButton } from '../components/Form';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type ProfileRow = {
  id: string;
  is_premium: boolean | null;
  premium_until: string | null;
};

export default function Subscription() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busyPortal, setBusyPortal] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [status, setStatus] = useState('');

  const returnUrl = useMemo(() => `${window.location.origin}/account/subscription`, []);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    setStatus('');

    const { data, error } = await supabase
      .from('profiles')
      .select('id,is_premium,premium_until')
      .eq('id', user.id)
      .maybeSingle();

    if (error) setStatus(error.message);
    setProfile((data as any) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav('/auth', { replace: true });
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, nav]);

  const openStripePortal = async () => {
    setStatus('');
    setBusyPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe_portal', {
        body: { return_url: returnUrl },
      });
      if (error) throw error;

      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error('Stripe portal did not return a URL.');

      window.location.assign(url);
    } catch (e: any) {
      setStatus(e?.message ?? 'Unable to open Stripe customer portal.');
      setBusyPortal(false);
    }
  };

  const until = profile?.premium_until ? new Date(profile.premium_until) : null;

  return (
    <div className="min-h-screen w-full px-6 py-10">
      <Card>
        <h1 className="text-white text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-slate-300 text-sm mt-2">Manage your Premium status and billing.</p>

        {loading ? (
          <p className="text-slate-200 mt-4">Loading…</p>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-950/40 ring-1 ring-white/10 p-4">
            <p className="text-slate-200">
              Status:{' '}
              {profile?.is_premium ? (
                <span className="text-emerald-200 font-semibold">Premium</span>
              ) : (
                <span className="text-slate-300">Free</span>
              )}
            </p>

            {profile?.is_premium && until ? (
              <p className="text-slate-300 text-sm mt-2">
                Premium until: <span className="text-white">{until.toLocaleString()}</span>
              </p>
            ) : null}
          </div>
        )}

        {status ? <p className="mt-4 text-sm text-rose-200">{status}</p> : null}

        <div className="mt-6 space-y-3">
          {profile?.is_premium ? (
            <PrimaryButton onClick={openStripePortal} disabled={busyPortal || loading}>
              {busyPortal ? 'Opening…' : 'Manage billing in Stripe'}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => nav('/premium')}>Upgrade to Premium</PrimaryButton>
          )}

          <button
            className="w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={refresh}
            disabled={loading}
          >
            Refresh status
          </button>

          <button
            className="w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/home')}
          >
            Back to home
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400 leading-relaxed">
          Note: the Stripe customer portal requires a server-side session creation (edge function). If the portal button
          fails, the backend may not have a stripe_portal function deployed yet.
        </p>
      </Card>
    </div>
  );
}
