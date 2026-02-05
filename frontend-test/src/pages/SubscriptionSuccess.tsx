import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/Form';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type ProfileRow = {
  id: string;
  is_premium: boolean | null;
  premium_until: string | null;
};

export default function SubscriptionSuccess() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [status, setStatus] = useState('');

  const canceled = useMemo(() => params.get('canceled') === 'true', [params]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav('/auth', { replace: true });
      return;
    }

    const run = async () => {
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

    run();
  }, [authLoading, user, nav]);

  const until = profile?.premium_until ? new Date(profile.premium_until) : null;

  return (
    <div className="min-h-screen w-full px-6 py-10">
      <Card>
        <h1 className="text-white text-2xl font-bold tracking-tight">Subscription</h1>

        {loading ? (
          <p className="text-slate-200 mt-4">Checking status…</p>
        ) : canceled ? (
          <>
            <p className="text-slate-200 mt-4">Checkout canceled. No changes were made.</p>
          </>
        ) : profile?.is_premium ? (
          <>
            <p className="text-emerald-200 mt-4 font-semibold">You’re Premium. JazakAllahu khairan!</p>
            {until ? (
              <p className="text-slate-300 text-sm mt-2">
                Active until: <span className="text-white">{until.toLocaleString()}</span>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-slate-200 mt-4">
              Payment received, but your Premium status hasn’t updated yet.
            </p>
            <p className="text-slate-400 text-sm mt-2">
              This can take a moment after Stripe confirms the checkout. Please refresh in 10–30 seconds.
            </p>
          </>
        )}

        {status ? <p className="mt-4 text-sm text-rose-200">{status}</p> : null}

        <div className="mt-6 space-y-3">
          <button
            className="w-full rounded-2xl py-3 text-white bg-emerald-600/20 ring-1 ring-emerald-500/30 hover:ring-emerald-400/50 transition"
            onClick={() => nav('/account/subscription')}
          >
            Go to subscription settings
          </button>
          <button
            className="w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/home')}
          >
            Back to home
          </button>
        </div>
      </Card>
    </div>
  );
}
