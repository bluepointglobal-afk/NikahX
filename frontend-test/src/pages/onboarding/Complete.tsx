import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, PrimaryButton } from '../../components/Form';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function OnboardingComplete() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    setStatus('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;

      nav('/home');
    } catch (e: any) {
      setStatus(e.message ?? 'Could not complete onboarding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-6 py-10">
      <Card>
        <div className="mb-6">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Step 4 of 4</p>
          <h1 className="text-white text-2xl font-bold tracking-tight mt-2">Onboarding complete</h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Your account is set up. Next, your wali/guardian can accept the invite.
            Discovery will remain locked until wali oversight becomes active.
          </p>
        </div>

        {status ? <p className="text-sm text-slate-200 mb-4">{status}</p> : null}

        <PrimaryButton type="button" onClick={finish} disabled={saving}>
          {saving ? 'Finishing…' : 'Go to home'}
        </PrimaryButton>

        <button
          type="button"
          className="mt-4 w-full rounded-2xl py-3 text-slate-300 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
          onClick={() => nav('/onboarding/wali')}
        >
          Back
        </button>
      </Card>
    </div>
  );
}
