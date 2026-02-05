import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type ProfileRow = {
  id: string;
  full_name: string | null;
  onboarding_completed_at: string | null;
};

export default function Home() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

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
        .select('id,full_name,onboarding_completed_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) setStatus(error.message);
      setProfile((data as any) ?? null);
      setLoading(false);

      if (data && !data.onboarding_completed_at) {
        nav('/onboarding/profile', { replace: true });
      }
    };

    run();
  }, [user, authLoading, nav]);

  const signOut = async () => {
    await supabase.auth.signOut();
    nav('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-slate-200">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen w-full px-6 py-10">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-slate-950/40 ring-1 ring-white/10 shadow-2xl p-6 sm:p-8 backdrop-blur">
        <h1 className="text-white text-2xl font-bold tracking-tight">Home</h1>
        <p className="text-slate-300 text-sm mt-2">
          Assalamu alaikum. Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}.
        </p>

        {status ? <p className="mt-4 text-sm text-slate-200">{status}</p> : null}

        <div className="mt-6 space-y-3">
          <button
            className="w-full rounded-2xl py-3 text-white bg-emerald-600/20 ring-1 ring-emerald-500/30 hover:ring-emerald-400/50 transition"
            onClick={() => nav('/discover')}
          >
            Go to discovery feed
          </button>
          <button
            className="w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/onboarding/profile')}
          >
            Edit onboarding info
          </button>
          <button
            className="w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400 leading-relaxed">
          Matching and browsing are wali-supervised and privacy-first: opposite-gender only, no photos until wali approval
          and mutual consent.
        </p>
      </div>
    </div>
  );
}
