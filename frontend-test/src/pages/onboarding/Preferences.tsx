import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, FieldLabel, PrimaryButton, SelectInput, TextInput } from '../../components/Form';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function OnboardingPreferences() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(35);
  const [distanceKm, setDistanceKm] = useState(50);
  const [preferredSect, setPreferredSect] = useState('');
  const [preferredReligiosity, setPreferredReligiosity] = useState('');
  const [educationMinLevel, setEducationMinLevel] = useState('');
  const [allowInternational, setAllowInternational] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('preferences')
        .select('min_age,max_age,distance_km,preferred_sect,preferred_religiosity_level,education_min_level,allow_international')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setMinAge(data.min_age);
        setMaxAge(data.max_age);
        setDistanceKm(data.distance_km);
        setPreferredSect(data.preferred_sect ?? '');
        setPreferredReligiosity(data.preferred_religiosity_level ?? '');
        setEducationMinLevel(data.education_min_level ?? '');
        setAllowInternational(!!data.allow_international);
      }

      setLoading(false);
    };

    run();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus('');

    try {
      if (!user) throw new Error('Not signed in.');
      if (minAge < 18) throw new Error('Minimum age must be 18 or older.');
      if (maxAge < minAge) throw new Error('Maximum age must be greater than or equal to minimum age.');

      const { error } = await supabase.rpc('upsert_preferences', {
        p_min_age: minAge,
        p_max_age: maxAge,
        p_distance_km: distanceKm,
        p_preferred_sect: preferredSect || null,
        p_preferred_religiosity_level: preferredReligiosity || null,
        p_education_min_level: educationMinLevel || null,
        p_allow_international: allowInternational,
      });

      if (error) throw error;
      nav('/onboarding/wali');
    } catch (e: any) {
      setStatus(e.message ?? 'Failed to save preferences.');
    } finally {
      setSaving(false);
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
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Step 2 of 4</p>
          <h1 className="text-white text-2xl font-bold tracking-tight mt-2">Matching preferences</h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Preferences help us suggest suitable matches. Browsing remains restricted until wali/guardian oversight is active.
          </p>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Minimum age</FieldLabel>
              <TextInput
                type="number"
                min={18}
                value={minAge}
                onChange={(e) => setMinAge(parseInt(e.target.value || '18', 10))}
              />
            </div>
            <div>
              <FieldLabel>Maximum age</FieldLabel>
              <TextInput
                type="number"
                min={18}
                value={maxAge}
                onChange={(e) => setMaxAge(parseInt(e.target.value || '18', 10))}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Distance (km)</FieldLabel>
            <TextInput
              type="number"
              min={1}
              value={distanceKm}
              onChange={(e) => setDistanceKm(parseInt(e.target.value || '50', 10))}
            />
          </div>

          <div>
            <FieldLabel>Preferred sect (optional)</FieldLabel>
            <TextInput value={preferredSect} onChange={(e) => setPreferredSect(e.target.value)} placeholder="e.g., Sunni" />
          </div>

          <div>
            <FieldLabel>Preferred religiosity (optional)</FieldLabel>
            <SelectInput value={preferredReligiosity} onChange={(e) => setPreferredReligiosity(e.target.value)}>
              <option value="">Select…</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </SelectInput>
          </div>

          <div>
            <FieldLabel>Minimum education level (optional)</FieldLabel>
            <TextInput
              value={educationMinLevel}
              onChange={(e) => setEducationMinLevel(e.target.value)}
              placeholder="e.g., Bachelor's"
            />
          </div>

          <div>
            <FieldLabel>Allow international (optional)</FieldLabel>
            <SelectInput value={allowInternational ? 'yes' : 'no'} onChange={(e) => setAllowInternational(e.target.value === 'yes')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </SelectInput>
          </div>

          {status ? <p className="text-sm text-slate-200">{status}</p> : null}

          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Continue'}
          </PrimaryButton>

          <button
            type="button"
            className="w-full rounded-2xl py-3 text-slate-300 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/onboarding/profile')}
          >
            Back
          </button>
        </form>
      </Card>
    </div>
  );
}
