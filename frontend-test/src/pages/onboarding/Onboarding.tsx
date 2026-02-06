import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, borderRadius } from '../../lib/designTokens';

type Gender = 'male' | 'female';

export default function OnboardingAccountBasics() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      setStatus('');

      const resp: any = await supabase
        .from('profiles')
        .select(['full_name', 'gender', 'dob', 'country', 'city', 'onboarding_completed_at'].join(','))
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
        const loc = [data.city, data.country].filter(Boolean).join(', ');
        setLocation(loc ?? '');

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

      const [city, country] = location.split(',').map(s => s.trim());

      // Use upsert to create profile if it doesn't exist
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName.trim(),
          gender,
          dob,
          country: country || null,
          city: city || null,
        }, {
          onConflict: 'id'
        });

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
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: colors.backgroundDark }}>
        <div style={{ color: colors.textMainDark }}>Loading…</div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full min-h-screen w-full max-w-md mx-auto flex-col overflow-hidden"
      style={{ backgroundColor: colors.backgroundDark, fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background blur effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-[20%] -right-[20%] w-[70%] h-[50%] rounded-full blur-[100px]"
          style={{ background: `${colors.primary}0d` }}
        ></div>
        <div
          className="absolute top-[30%] -left-[20%] w-[50%] h-[50%] rounded-full blur-[80px]"
          style={{ background: `${colors.primary}0d` }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 pt-8 pb-4 z-10">
        <button
          className="group flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-300"
          style={{
            backgroundColor: colors.surfaceDark,
            border: `1px solid ${colors.borderDark}`,
            color: colors.textMainDark,
          }}
          onClick={() => nav(-1)}
        >
          <span className="material-symbols-outlined transition-transform group-hover:-translate-x-0.5 text-[20px]">
            arrow_back
          </span>
        </button>
        <div className="flex flex-col items-end gap-2">
          <span
            className="text-[10px] uppercase tracking-[0.2em] font-bold"
            style={{ color: colors.primary }}
          >
            Step 1 of 4
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className="h-1 w-8 rounded-full"
              style={{
                backgroundColor: colors.primary,
                boxShadow: `0_0_10px_${colors.primary}80`,
              }}
            ></div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1 w-2 rounded-full transition-colors duration-300"
                style={{ backgroundColor: `${colors.borderDark}80` }}
              ></div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col px-6 pt-4 pb-32 overflow-y-auto z-10">
        <div className="mb-8" style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          <h1
            className="text-[32px] font-bold leading-[1.15] mb-3 tracking-tight"
            style={{ color: colors.textMainDark }}
          >
            Tell us about <br />
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: `linear-gradient(to right, ${colors.primary}, #4ade80)`,
              }}
            >
              yourself
            </span>
          </h1>
          <p
            className="text-sm font-normal leading-relaxed"
            style={{ color: colors.textSubDark }}
          >
            We need a few details to verify your identity and ensure a safe, halal community environment.
          </p>
        </div>

        <form
          className="flex flex-col gap-6"
          onSubmit={save}
          style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards 100ms' }}
        >
          {/* Full Name */}
          <div className="group">
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-primary"
              style={{ color: colors.textSubDark }}
            >
              Full Name
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                className="peer w-full py-4 pl-5 pr-12 text-base font-medium placeholder:text-gray-600 transition-all duration-300"
                style={{
                  backgroundColor: `${colors.surfaceDark}99`,
                  border: `1px solid ${colors.borderDark}`,
                  borderRadius: borderRadius['2xl'],
                  color: colors.textMainDark,
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 30px -4px rgba(0, 0, 0, 0.05)',
                }}
                placeholder="e.g. Zayd Ali"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <span
                className="material-symbols-outlined absolute right-4 pointer-events-none transition-colors duration-300"
                style={{ color: colors.textSubDark }}
              >
                person
              </span>
            </div>
          </div>

          {/* Gender Selection */}
          <div className="flex flex-col gap-2">
            <label
              className="block text-xs font-semibold uppercase tracking-wider ml-1"
              style={{ color: colors.textSubDark }}
            >
              Gender
            </label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'male' as const, label: 'Brother', icon: 'man' },
                { value: 'female' as const, label: 'Sister', icon: 'woman' },
              ].map((opt) => (
                <label key={opt.value} className="cursor-pointer group relative">
                  <input
                    type="radio"
                    name="gender"
                    value={opt.value}
                    checked={gender === opt.value}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="sr-only peer"
                  />
                  <div
                    className="relative h-32 flex flex-col items-center justify-center gap-2 p-4 transition-all duration-300"
                    style={{
                      backgroundColor: gender === opt.value ? `${colors.primary}0d` : colors.surfaceDark,
                      border:
                        gender === opt.value
                          ? `1px solid ${colors.primary}`
                          : `1px solid ${colors.borderDark}`,
                      borderRadius: borderRadius['2xl'],
                      boxShadow:
                        gender === opt.value
                          ? `0 0 25px ${colors.primary}26`
                          : '0 4px 30px -4px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    {gender === opt.value && (
                      <div
                        className="absolute top-3 right-3 scale-100 transition-all duration-300"
                        style={{ opacity: 1 }}
                      >
                        <span
                          className="material-symbols-outlined fill-current"
                          style={{
                            color: colors.primary,
                            fontSize: '20px',
                          }}
                        >
                          check_circle
                        </span>
                      </div>
                    )}
                    <div
                      className="rounded-full p-3 flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: gender === opt.value ? colors.primary : 'rgba(255, 255, 255, 0.05)',
                        color: gender === opt.value ? colors.backgroundDark : colors.textSubDark,
                        transform: gender === opt.value ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[28px]">{opt.icon}</span>
                    </div>
                    <span
                      className="font-medium transition-colors duration-300"
                      style={{
                        color: gender === opt.value ? colors.primary : colors.textMainDark,
                      }}
                    >
                      {opt.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date of Birth */}
          <div className="group">
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-primary"
              style={{ color: colors.textSubDark }}
            >
              Date of Birth
            </label>
            <div className="relative flex items-center">
              <input
                type="date"
                className="peer w-full py-4 pl-5 pr-12 text-base font-medium placeholder:text-gray-600 transition-all duration-300 appearance-none min-h-[58px]"
                style={{
                  backgroundColor: `${colors.surfaceDark}99`,
                  border: `1px solid ${colors.borderDark}`,
                  borderRadius: borderRadius['2xl'],
                  color: colors.textMainDark,
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 30px -4px rgba(0, 0, 0, 0.05)',
                }}
                placeholder="DD / MM / YYYY"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
              <span
                className="material-symbols-outlined absolute right-4 pointer-events-none transition-colors duration-300"
                style={{ color: colors.textSubDark }}
              >
                calendar_today
              </span>
            </div>
            <div
              className="flex gap-2 items-center mt-3 ml-1 px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: `${colors.surfaceDark}66`,
                borderColor: `${colors.borderDark}80`,
              }}
            >
              <span
                className="material-symbols-outlined shrink-0 text-[16px]"
                style={{ color: colors.primary }}
              >
                lock
              </span>
              <p
                className="text-[11px] font-medium leading-tight"
                style={{ color: colors.textSubDark }}
              >
                Only your age will be publicly visible. Your exact birthdate remains private.
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="group">
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-primary"
              style={{ color: colors.textSubDark }}
            >
              Location
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                className="peer w-full py-4 pl-5 pr-14 text-base font-medium placeholder:text-gray-600 transition-all duration-300"
                style={{
                  backgroundColor: `${colors.surfaceDark}99`,
                  border: `1px solid ${colors.borderDark}`,
                  borderRadius: borderRadius['2xl'],
                  color: colors.textMainDark,
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 30px -4px rgba(0, 0, 0, 0.05)',
                }}
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <button
                className="absolute right-2 p-2 rounded-xl transition-all duration-300"
                style={{
                  color: colors.textSubDark,
                }}
                type="button"
              >
                <span className="material-symbols-outlined block text-[22px]">my_location</span>
              </button>
            </div>
          </div>

          {status && (
            <p style={{ color: colors.textSubDark }} className="text-sm">
              {status}
            </p>
          )}
        </form>
      </main>

      {/* Bottom Action */}
      <div className="absolute bottom-0 left-0 right-0 z-20 w-full pointer-events-none">
        <div
          className="h-24 w-full"
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent, ${colors.backgroundDark})`,
          }}
        ></div>
        <div
          className="px-6 pb-8 pt-2 pointer-events-auto"
          style={{ backgroundColor: colors.backgroundDark }}
        >
          <button
            onClick={(e) => save(e as any)}
            className="group w-full relative overflow-hidden p-[1px] shadow-lg active:scale-[0.99] transition-all duration-300"
            style={{
              backgroundColor: colors.textMainDark,
              borderRadius: borderRadius['2xl'],
            }}
            disabled={saving}
          >
            <div
              className="relative flex items-center justify-between px-6 py-4 rounded-2xl transition-all"
              style={{ backgroundColor: colors.textMainDark }}
            >
              <span
                className="text-lg font-bold tracking-wide"
                style={{ color: colors.backgroundDark }}
              >
                {saving ? 'Continuing…' : 'Continue'}
              </span>
              <div
                className="size-8 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(25,230,43,0.4)] group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: colors.primary }}
              >
                <span
                  className="material-symbols-outlined font-bold text-[20px]"
                  style={{ color: colors.backgroundDark }}
                >
                  arrow_forward
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
