import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, FieldLabel, PrimaryButton, TextInput } from '../../components/Form';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

function randomCode() {
  // Not cryptographic. Fine for MVP; enforce uniqueness in DB.
  return Math.random().toString(36).slice(2, 8) + '-' + Math.random().toString(36).slice(2, 8);
}

export default function OnboardingWaliInvite() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const [waliContact, setWaliContact] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const inviteLink = useMemo(() => {
    if (!inviteCode) return '';
    return `${window.location.origin}/wali?code=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('wali_links')
        .select('wali_contact,invite_code,status')
        .eq('ward_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length) {
        setWaliContact(data[0].wali_contact ?? '');
        setInviteCode(data[0].invite_code ?? null);
      }

      setLoading(false);
    };

    run();
  }, [user]);

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setStatus('');

    try {
      if (!waliContact.trim()) throw new Error('Please enter your wali/guardian contact (email or phone).');

      const code = randomCode();
      const { error } = await supabase.from('wali_links').insert({
        ward_id: user.id,
        wali_contact: waliContact.trim(),
        invite_code: code,
        status: 'pending',
      });

      if (error) throw error;
      setInviteCode(code);
      setStatus('Invite created. Share the link with your wali/guardian.');
    } catch (e: any) {
      setStatus(e.message ?? 'Failed to create invite.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatus('Invite link copied.');
    } catch {
      setStatus('Could not copy automatically. Please copy manually.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-slate-200">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen w-full px-6 py-10">
      <Card>
        <div className="mb-6">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Step 3 of 4</p>
          <h1 className="text-white text-2xl font-bold tracking-tight mt-2">Wali / guardian invitation</h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            To keep interactions halal and dignified, discovery is enabled only after wali/guardian oversight is active.
          </p>
        </div>

        <form onSubmit={createInvite} className="space-y-5">
          <div>
            <FieldLabel>Wali/guardian contact</FieldLabel>
            <TextInput
              value={waliContact}
              onChange={(e) => setWaliContact(e.target.value)}
              placeholder="Email or phone number"
            />
            <p className="mt-2 text-xs text-slate-400">
              We will use this for the invitation context. (MVP: you share the link directly.)
            </p>
          </div>

          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Creating…' : inviteCode ? 'Create a new invite' : 'Create invite'}
          </PrimaryButton>

          {inviteCode ? (
            <div className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
              <p className="text-slate-200 text-sm font-semibold">Invite link</p>
              <p className="mt-2 text-slate-300 text-xs break-all">{inviteLink}</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => nav('/onboarding/complete')}
                  className="rounded-2xl py-3 text-slate-200 ring-1 ring-emerald-700/50 hover:ring-emerald-500 hover:text-white transition"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {status ? <p className="text-sm text-slate-200">{status}</p> : null}

          <button
            type="button"
            className="w-full rounded-2xl py-3 text-slate-300 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/onboarding/preferences')}
          >
            Back
          </button>
        </form>
      </Card>
    </div>
  );
}
