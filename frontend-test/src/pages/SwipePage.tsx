import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import SwipeCard from '../components/SwipeCard';

type Profile = {
  id: string;
  full_name: string | null;
  dob: string | null;
  city: string | null;
  country: string | null;
  one_liner?: string | null;
  profile_photo_url?: string | null;
};

const FREE_DAILY_LIMIT = 10;

export default function SwipePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<{ profileId: string; action: string } | null>(null);
  const [busySwipe, setBusySwipe] = useState(false);

  // Check premium status
  useEffect(() => {
    const checkPremium = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      setIsPremium(data?.subscription_status === 'premium');
    };

    checkPremium();
  }, [user]);

  // Fetch profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_discovery_feed', {
        p_limit: 50,
      });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setProfiles((data as Profile[]) || []);
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  // Get today's swipe count
  useEffect(() => {
    const getSwipeCount = async () => {
      if (!user?.id) return;

      const today = new Date().toISOString().split('T')[0];

      const { count } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`);

      setSwipeCount(count || 0);
    };

    getSwipeCount();
  }, [user]);

  const handleSwipe = useCallback(
    async (action: 'like' | 'super_like' | 'pass') => {
      const profile = profiles[currentIndex];
      if (!profile || busySwipe) return;

      // Check limits
      if (!isPremium && swipeCount >= FREE_DAILY_LIMIT) {
        setError('Daily swipe limit reached. Upgrade to Premium for unlimited swipes.');
        return;
      }

      setBusySwipe(true);
      setError(null);

      const { data, error: swipeError } = await supabase.rpc('create_interaction_v2', {
        target_user_id: profile.id,
        interaction_type: action,
      });

      if (swipeError) {
        setError(swipeError.message);
        setBusySwipe(false);
        return;
      }

      // Store for undo
      setLastSwipe({ profileId: profile.id, action });

      const result = data as any;

      // Check for mutual match
      if (result?.is_mutual && result?.match_id) {
        // Redirect to chat
        navigate(`/chat/${result.match_id}`, { replace: true });
        return;
      }

      // Move to next profile
      setSwipeCount((prev) => prev + 1);
      setCurrentIndex((prev) => prev + 1);
      setBusySwipe(false);
    },
    [profiles, currentIndex, busySwipe, isPremium, swipeCount, navigate]
  );

  const handleUndo = useCallback(async () => {
    if (!lastSwipe || !isPremium) return;

    // Delete last interaction
    const { error: deleteError } = await supabase
      .from('interactions')
      .delete()
      .eq('user_id', user?.id)
      .eq('target_user_id', lastSwipe.profileId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    // Go back one profile
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setSwipeCount((prev) => Math.max(0, prev - 1));
    setLastSwipe(null);
  }, [lastSwipe, isPremium, user]);

  const currentProfile = profiles[currentIndex];
  const hasMore = currentIndex < profiles.length;
  const remainingSwipes = isPremium ? null : FREE_DAILY_LIMIT - swipeCount;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Swipe</h1>
            {!isPremium && remainingSwipes !== null && (
              <p className="text-slate-400 text-sm mt-1">
                {remainingSwipes} swipes remaining today
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/home')}
            className="rounded-2xl px-4 py-2 text-sm text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
          >
            Home
          </button>
        </div>

        {/* Undo Button (Premium Only) */}
        {isPremium && lastSwipe && currentIndex > 0 && (
          <button
            onClick={handleUndo}
            className="w-full mb-4 rounded-2xl py-3 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30 hover:ring-amber-500/50 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            Undo Last Swipe
          </button>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 p-4">
            <p className="text-rose-200 text-sm">{error}</p>
            {error.includes('limit') && (
              <button
                onClick={() => navigate('/premium')}
                className="mt-2 text-sm text-rose-200 underline hover:text-rose-100"
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        )}

        {/* Main Content */}
        {!hasMore ? (
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-white/10 p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 ring-1 ring-white/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">No More Profiles</h2>
            <p className="text-slate-400 text-sm mb-6">
              You've reached the end. Check back later for new matches!
            </p>
            <button
              onClick={() => navigate('/matches')}
              className="w-full rounded-2xl py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition"
            >
              View Your Matches
            </button>
          </div>
        ) : (
          currentProfile && (
            <SwipeCard
              profile={currentProfile}
              onLike={() => handleSwipe('like')}
              onSuperLike={() => handleSwipe('super_like')}
              onPass={() => handleSwipe('pass')}
              disabled={busySwipe}
              isPremium={isPremium}
              currentIndex={currentIndex}
              totalCards={profiles.length}
            />
          )
        )}
      </div>
    </div>
  );
}
