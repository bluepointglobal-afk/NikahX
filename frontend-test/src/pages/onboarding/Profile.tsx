import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, FieldLabel, PrimaryButton, SelectInput, TextInput } from '../../components/Form';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

type Gender = 'male' | 'female';

const religiosityOptions = [
  { value: '', label: 'Select…' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

const prayerOptions = [
  { value: '', label: 'Select…' },
  { value: 'never', label: 'Rarely / never' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'often', label: 'Often' },
  { value: 'always', label: 'Always' },
];

const smokingOptions = [
  { value: '', label: 'Select…' },
  { value: 'no', label: 'No' },
  { value: 'occasionally', label: 'Occasionally' },
  { value: 'yes', label: 'Yes' },
];

const maritalOptions = [
  { value: '', label: 'Select…' },
  { value: 'never_married', label: 'Never married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

export default function OnboardingProfile() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [sect, setSect] = useState('');

  const [educationLevel, setEducationLevel] = useState('');
  const [educationField, setEducationField] = useState('');
  const [occupation, setOccupation] = useState('');
  const [religiosityLevel, setReligiosityLevel] = useState('');
  const [prayerFrequency, setPrayerFrequency] = useState('');
  const [halalDiet, setHalalDiet] = useState<boolean>(true);
  const [smoking, setSmoking] = useState('');
  const [languages, setLanguages] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [wantsChildren, setWantsChildren] = useState<boolean>(true);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      setStatus('');

      const resp: any = await supabase
        .from('profiles')
        .select(
          [
            'full_name',
            'gender',
            'dob',
            'country',
            'city',
            'sect',
            'education_level',
            'education_field',
            'occupation',
            'religiosity_level',
            'prayer_frequency',
            'halal_diet',
            'smoking',
            'languages',
            'marital_status',
            'wants_children',
            'onboarding_completed_at',
          ].join(',')
        )
        .eq('id', user.id)
        .maybeSingle();

      const error = resp.error as any;
      const data = resp.data as any;

      if (error) {
        setStatus(error.message);
      } else if (data) {
        setFullName(data.full_name ?? '');
        setGender((data.gender as Gender) ?? 'male');
        setDob(data.dob ?? '');
        setCountry(data.country ?? '');
        setCity(data.city ?? '');
        setSect(data.sect ?? '');

        setEducationLevel(data.education_level ?? '');
        setEducationField(data.education_field ?? '');
        setOccupation(data.occupation ?? '');
        setReligiosityLevel(data.religiosity_level ?? '');
        setPrayerFrequency(data.prayer_frequency ?? '');
        setHalalDiet(data.halal_diet ?? true);
        setSmoking(data.smoking ?? '');
        setLanguages((data.languages ?? []).join(', '));
        setMaritalStatus(data.marital_status ?? '');
        setWantsChildren(data.wants_children ?? true);

        if (data.onboarding_completed_at) {
          nav('/home', { replace: true });
        }
      }

      setLoading(false);
    };

    run();
  }, [user, nav]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatus('');

    try {
      if (!fullName.trim()) throw new Error('Please enter your full name.');
      if (!dob) throw new Error('Please enter your date of birth.');

      const langs = languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          gender,
          dob,
          country: country.trim() || null,
          city: city.trim() || null,
          sect: sect.trim() || null,
          education_level: educationLevel.trim() || null,
          education_field: educationField.trim() || null,
          occupation: occupation.trim() || null,
          religiosity_level: religiosityLevel || null,
          prayer_frequency: prayerFrequency || null,
          halal_diet: halalDiet,
          smoking: smoking || null,
          languages: langs.length ? langs : null,
          marital_status: maritalStatus || null,
          wants_children: wantsChildren,
        })
        .eq('id', user.id);

      if (error) throw error;
      nav('/onboarding/preferences');
    } catch (e: any) {
      setStatus(e.message ?? 'Failed to save.');
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
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Step 1 of 4</p>
          <h1 className="text-white text-2xl font-bold tracking-tight mt-2">Your profile</h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Share the essentials so your wali/guardian can support you and we can match responsibly.
          </p>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div>
            <FieldLabel>Full name</FieldLabel>
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Gender</FieldLabel>
              <SelectInput value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Date of birth</FieldLabel>
              <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Country</FieldLabel>
              <TextInput value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
            </div>
            <div>
              <FieldLabel>City</FieldLabel>
              <TextInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
          </div>

          <div>
            <FieldLabel>Madhhab / Sect (optional)</FieldLabel>
            <TextInput value={sect} onChange={(e) => setSect(e.target.value)} placeholder="e.g., Sunni, Shia" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Education level (optional)</FieldLabel>
              <TextInput
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                placeholder="e.g., High school, Bachelor's"
              />
            </div>
            <div>
              <FieldLabel>Field of study (optional)</FieldLabel>
              <TextInput
                value={educationField}
                onChange={(e) => setEducationField(e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Occupation (optional)</FieldLabel>
            <TextInput value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Your work" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Religiosity (optional)</FieldLabel>
              <SelectInput value={religiosityLevel} onChange={(e) => setReligiosityLevel(e.target.value)}>
                {religiosityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Prayer frequency (optional)</FieldLabel>
              <SelectInput value={prayerFrequency} onChange={(e) => setPrayerFrequency(e.target.value)}>
                {prayerOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Halal diet</FieldLabel>
              <SelectInput value={halalDiet ? 'yes' : 'no'} onChange={(e) => setHalalDiet(e.target.value === 'yes')}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Smoking (optional)</FieldLabel>
              <SelectInput value={smoking} onChange={(e) => setSmoking(e.target.value)}>
                {smokingOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            </div>
          </div>

          <div>
            <FieldLabel>Languages (comma-separated, optional)</FieldLabel>
            <TextInput value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="e.g., English, Arabic" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Marital status (optional)</FieldLabel>
              <SelectInput value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
                {maritalOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Wants children</FieldLabel>
              <SelectInput value={wantsChildren ? 'yes' : 'no'} onChange={(e) => setWantsChildren(e.target.value === 'yes')}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </SelectInput>
            </div>
          </div>

          {status ? <p className="text-sm text-slate-200">{status}</p> : null}

          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Continue'}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
}
