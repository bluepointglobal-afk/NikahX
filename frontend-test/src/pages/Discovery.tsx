import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type DiscoveryCardRow = {
  id: string;
  full_name: string | null;
  gender: string | null;
  dob: string | null; // date
  country: string | null;
  city: string | null;
  sect: string | null;
  religiosity_level: string | null;
  education_level: string | null;
};

type MatchRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  wali_approved_user1_at: string | null;
  wali_approved_user2_at: string | null;
};

function calcAge(dobIso: string | null) {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm text-slate-200 text-right">{value}</span>
    </div>
  );
}

function MatchNotification({ matchId }: { matchId: string }) {
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErr('');
      const { data, error } = await supabase
        .from('matches')
        .select('id,user1_id,user2_id,status,wali_approved_user1_at,wali_approved_user2_at')
        .eq('id', matchId)
        .maybeSingle();

      if (cancelled) return;
      if (error) setErr(error.message);
      setMatch((data as any) ?? null);
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const youAreUser1 = useMemo(() => {
    if (!user?.id || !match) return null;
    if (user.id === match.user1_id) return true;
    if (user.id === match.user2_id) return false;
    return null;
  }, [user?.id, match]);

  const yourApproved = useMemo(() => {
    if (!match || youAreUser1 === null) return null;
    return youAreUser1 ? !!match.wali_approved_user1_at : !!match.wali_approved_user2_at;
  }, [match, youAreUser1]);

  const otherApproved = useMemo(() => {
    if (!match || youAreUser1 === null) return null;
    return youAreUser1 ? !!match.wali_approved_user2_at : !!match.wali_approved_user1_at;
  }, [match, youAreUser1]);

  return (
    <div className="mt-4 rounded-3xl bg-emerald-950/30 ring-1 ring-emerald-500/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold">Match created — pending wali approval</h3>
          <p className="text-slate-300 text-sm mt-1 leading-relaxed">
            Your like was mutual. For privacy and Sharia compliance, the match remains <span className="text-white">pending</span>{' '}
            until <span className="text-white">both</span> guardians approve.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20 px-2.5 py-1 text-xs">
          pending_wali
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? <p className="text-sm text-slate-300">Loading approval status…</p> : null}
        {err ? <p className="text-sm text-rose-200">{err}</p> : null}

        {match ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
              <p className="text-xs text-slate-400">Your guardian</p>
              <p className="text-sm text-slate-200 mt-1">{yourApproved ? 'Approved' : 'Pending approval'}</p>
            </div>
            <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
              <p className="text-xs text-slate-400">Their guardian</p>
              <p className="text-sm text-slate-200 mt-1">{otherApproved ? 'Approved' : 'Pending approval'}</p>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-slate-400 leading-relaxed">
          Photos and direct contact are only unlocked after wali approval and mutual consent.
        </p>
      </div>
    </div>
  );
}

export default function Discovery() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [cards, setCards] = useState<DiscoveryCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [busySwipe, setBusySwipe] = useState(false);
  const [matchId, setMatchId] = useState<string>('');

  const current = cards[currentIdx];

  const fetchFeed = useCallback(async (limit: number) => {
    setLoading(true);
    setStatus('');
    setMatchId('');

    const { data, error } = await supabase.rpc('get_discovery_feed', { p_limit: limit });

    if (error) {
      setStatus(error.message);
      setCards([]);
      setCurrentIdx(0);
      setLoading(false);
      return;
    }

    setCards(((data as any) ?? []) as DiscoveryCardRow[]);
    setCurrentIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav('/auth', { replace: true });
      return;
    }
    fetchFeed(20);
  }, [authLoading, user, nav, fetchFeed]);

  const swipe = useCallback(
    async (action: 'like' | 'pass') => {
      if (!current || busySwipe) return;
      setBusySwipe(true);
      setStatus('');

      const { data, error } = await supabase.rpc('create_interaction_v2', {
        target_user_id: current.id,
        interaction_type: action,
      });

      if (error) {
        setStatus(error.message);
        setBusySwipe(false);
        return;
      }

      const payload = (data ?? {}) as any;
      if (payload?.is_mutual && payload?.status === 'pending_wali' && payload?.match_id) {
        setMatchId(String(payload.match_id));
      }

      // advance to next card
      setCurrentIdx((i) => i + 1);
      setBusySwipe(false);
    },
    [current, busySwipe]
  );

  const emptyState = useMemo(() => {
    if (loading) return null;
    if (status) return null;
    return currentIdx >= cards.length;
  }, [loading, status, currentIdx, cards.length]);

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Discovery</h1>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              Privacy-first browsing. No photos are shown until wali approval and mutual consent.
            </p>
          </div>
          <button
            className="shrink-0 rounded-2xl px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
            onClick={() => nav('/home')}
          >
            Home
          </button>
        </div>

        {status ? (
          <div className="mt-4 rounded-3xl bg-rose-950/30 ring-1 ring-rose-500/20 p-5">
            <p className="text-rose-100 text-sm leading-relaxed">{status}</p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-2xl px-3 py-2 text-sm text-slate-200 ring-1 ring-white/10 hover:ring-white/20 transition"
                onClick={() => fetchFeed(20)}
              >
                Retry
              </button>
              <button
                className="rounded-2xl px-3 py-2 text-sm text-slate-200 ring-1 ring-white/10 hover:ring-white/20 transition"
                onClick={() => nav('/onboarding/wali')}
              >
                Wali setup
              </button>
            </div>
          </div>
        ) : null}

        {matchId ? <MatchNotification matchId={matchId} /> : null}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl bg-slate-950/40 ring-1 ring-white/10 p-6">
              <p className="text-slate-200">Loading profiles…</p>
            </div>
          ) : null}

          {emptyState ? (
            <div className="rounded-3xl bg-slate-950/40 ring-1 ring-white/10 p-6">
              <h2 className="text-white font-semibold">No more profiles right now</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                You’ve reached the end of your current feed. Please check back later.
              </p>
              <button
                className="mt-4 w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition"
                onClick={() => fetchFeed(20)}
              >
                Refresh feed
              </button>
            </div>
          ) : null}

          {current ? (
            <div className="rounded-3xl bg-slate-950/40 ring-1 ring-white/10 shadow-2xl p-6 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-white text-xl font-semibold tracking-tight">
                    {current.full_name || 'Unnamed'}
                    {typeof calcAge(current.dob) === 'number' ? (
                      <span className="text-slate-300 font-normal"> · {calcAge(current.dob)}</span>
                    ) : null}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Minimal profile card (no photos)</p>
                </div>
                <span className="rounded-full bg-slate-800/50 ring-1 ring-white/10 px-2.5 py-1 text-xs text-slate-200">
                  {currentIdx + 1}/{cards.length}
                </span>
              </div>

              <div className="mt-5 space-y-2">
                <Field label="City" value={current.city} />
                <Field label="Country" value={current.country} />
                <Field label="Education" value={current.education_level} />
                <Field label="Religiosity" value={current.religiosity_level} />
                <Field label="Sect" value={current.sect} />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  className="rounded-2xl py-3 text-slate-200 ring-1 ring-slate-800 hover:ring-slate-700 hover:text-white transition disabled:opacity-50"
                  onClick={() => swipe('pass')}
                  disabled={busySwipe}
                >
                  Pass
                </button>
                <button
                  className="rounded-2xl py-3 text-white bg-emerald-600/20 ring-1 ring-emerald-500/30 hover:ring-emerald-400/50 transition disabled:opacity-50"
                  onClick={() => swipe('like')}
                  disabled={busySwipe}
                >
                  Like
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                Reminder: interaction is supervised. Wali approval is required before matches become active.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
