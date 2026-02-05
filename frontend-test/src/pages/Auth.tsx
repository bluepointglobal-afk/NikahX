import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, FieldLabel, PrimaryButton, TextInput } from '../components/Form';
import { useAuth } from '../lib/auth';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (user) navigate('/onboarding/profile', { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    try {
      if (!email || !password) throw new Error('Please enter your email and password.');

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/onboarding/profile');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth',
        },
      });
      if (error) throw error;

      // If email confirmation is enabled, session may be null.
      if (!data.session) {
        navigate('/verify-email?email=' + encodeURIComponent(email));
      } else {
        navigate('/onboarding/profile');
      }
    } catch (err: any) {
      setStatus(err.message ?? 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center py-10 px-6">
      <div className="mx-auto w-full max-w-md mb-8">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 flex items-center justify-center rounded-[22px] bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl ring-1 ring-white/10">
            <span
              className="material-symbols-outlined text-primary text-[34px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
            >
              favorite
            </span>
          </div>
          <h1 className="mt-5 font-serif text-white tracking-tight text-4xl font-bold leading-tight text-center">
            Nikah<span className="text-primary italic font-serif">X</span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm font-medium tracking-widest text-center uppercase opacity-80">
            Halal matchmaking with dignity
          </p>
        </div>
      </div>

      <Card>
        <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-900/70 ring-1 ring-white/10">
          <button
            type="button"
            className={
              'flex-1 rounded-xl py-3 text-sm font-semibold transition ' +
              (mode === 'signup'
                ? 'bg-slate-800 text-primary ring-1 ring-white/10'
                : 'text-slate-300 hover:text-white')
            }
            onClick={() => setMode('signup')}
          >
            Create account
          </button>
          <button
            type="button"
            className={
              'flex-1 rounded-xl py-3 text-sm font-semibold transition ' +
              (mode === 'signin'
                ? 'bg-slate-800 text-primary ring-1 ring-white/10'
                : 'text-slate-300 hover:text-white')
            }
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <FieldLabel>Email address</FieldLabel>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <FieldLabel>Password</FieldLabel>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {status ? <p className="text-sm text-slate-200">{status}</p> : null}

          <PrimaryButton disabled={loading} type="submit">
            {loading ? 'Please wait…' : mode === 'signup' ? 'Sign up' : 'Sign in'}
          </PrimaryButton>

          <p className="text-xs text-slate-400 leading-relaxed">
            We keep profiles modest and private. Photos and browsing are restricted until wali/guardian oversight
            is in place.
          </p>
        </form>
      </Card>
    </div>
  );
}
