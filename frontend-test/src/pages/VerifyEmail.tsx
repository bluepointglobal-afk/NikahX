import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, PrimaryButton } from '../components/Form';
import { useAuth } from '../lib/auth';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function VerifyEmail() {
  const nav = useNavigate();
  const q = useQuery();
  const email = q.get('email') ?? '';
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<string>('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) nav('/onboarding/profile', { replace: true });
  }, [user, authLoading, nav]);

  const resend = async () => {
    setSending(true);
    setStatus('');
    try {
      if (!email) throw new Error('Missing email. Please return to sign up.');
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setStatus('Verification email sent. Please check your inbox.');
    } catch (e: any) {
      setStatus(e.message ?? 'Failed to resend email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-10">
      <Card>
        <h1 className="text-white text-2xl font-bold tracking-tight mb-2">Verify your email</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          For your safety and to keep interactions respectful, please verify your email address.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
          <p className="text-slate-200 text-sm">
            We sent a verification link to:{' '}
            <span className="font-semibold">{email || 'your email address'}</span>
          </p>
          <p className="text-slate-400 text-xs mt-2">
            After verifying, return here and sign in.
          </p>
        </div>

        {status ? <p className="mt-4 text-sm text-slate-200">{status}</p> : null}

        <div className="mt-6 space-y-3">
          <PrimaryButton type="button" onClick={resend} disabled={sending}>
            {sending ? 'Sending…' : 'Resend verification email'}
          </PrimaryButton>
          <button
            type="button"
            className="w-full rounded-2xl py-3 text-slate-300 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/auth')}
          >
            Back to sign in
          </button>
        </div>
      </Card>
    </div>
  );
}
