/**
 * NikahPlus Phase 2 - Enhanced Swipe Page
 * Card-based profile browsing with filters
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchingAlgorithm } from '../hooks/useMatchingAlgorithm';
import { useMatchRequests } from '../hooks/useMatchRequests';
import { usePushNotifications, createNotificationFromTemplate } from '../hooks/usePushNotifications';
import SwipeCard from '../components/SwipeCard';
import FilterPanel from '../components/FilterPanel';
import type { MatchFilters, SortOption } from '../types';

const FREE_DAILY_LIMIT = 10;

export default function SwipePage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [lastAction, setLastAction] = useState<{ profileId: string; action: 'like' | 'pass' } | null>(null);

  const {
    rankedProfiles,
    filteredProfiles,
    loading,
    error,
    filters,
    sortBy,
    setFilters,
    setSortBy,
    resetFilters,
    refreshProfiles,
    hasMore,
    loadMore,
  } = useMatchingAlgorithm({
    limit: 20,
  });

  const { sendMatchRequest, processing: matchProcessing } = useMatchRequests();
  const { showLocalNotification } = usePushNotifications();

  // Check premium status on mount
  useState(() => {
    const checkPremium = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();
      
      setIsPremium(data?.subscription_status === 'premium');
    };
    checkPremium();
  });

  const handleLike = useCallback(async () => {
    const profile = rankedProfiles[currentIndex];
    if (!profile) return;

    // Check daily limit
    if (!isPremium && swipeCount >= FREE_DAILY_LIMIT) {
      return;
    }

    const result = await sendMatchRequest(profile.id);
    
    if (result.success) {
      setLastAction({ profileId: profile.id, action: 'like' });
      setSwipeCount(prev => prev + 1);
      
      if (result.matchId) {
        // It's a mutual match!
        showLocalNotification(createNotificationFromTemplate('new_match', {
          matchName: profile.full_name || 'someone',
          matchId: result.matchId,
        }));
        navigate(`/chat/${result.matchId}`);
        return;
      }
      
      // Move to next profile
      if (currentIndex < rankedProfiles.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (hasMore) {
        await loadMore();
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [currentIndex, rankedProfiles, swipeCount, isPremium, sendMatchRequest, hasMore, loadMore, navigate, showLocalNotification]);

  const handlePass = useCallback(() => {
    const profile = rankedProfiles[currentIndex];
    if (!profile) return;

    setLastAction({ profileId: profile.id, action: 'pass' });
    setSwipeCount(prev => prev + 1);

    if (currentIndex < rankedProfiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (hasMore) {
      loadMore().then(() => setCurrentIndex(prev => prev + 1));
    }
  }, [currentIndex, rankedProfiles, hasMore, loadMore]);

  const handleUndo = useCallback(async () => {
    if (!lastAction || !isPremium) return;

    // In a real implementation, this would call an API to undo the swipe
    // For now, just go back
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSwipeCount(prev => Math.max(0, prev - 1));
      setLastAction(null);
    }
  }, [lastAction, isPremium, currentIndex]);

  const handleFilterChange = useCallback((newFilters: MatchFilters) => {
    setFilters(newFilters);
    setCurrentIndex(0);
  }, [setFilters]);

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentIndex(0);
  }, [setSortBy]);

  const currentProfile = rankedProfiles[currentIndex];
  const remainingSwipes = isPremium ? null : FREE_DAILY_LIMIT - swipeCount;
  const hasMoreProfiles = currentIndex < rankedProfiles.length || hasMore;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Discover</h1>
            {!isPremium && remainingSwipes !== null && (
              <p className="text-slate-400 text-sm mt-1">
                {remainingSwipes > 0 
                  ? `${remainingSwipes} swipes remaining today`
                  : 'Daily limit reached'
                }
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(true)}
              className="p-2 rounded-xl bg-slate-900 ring-1 ring-slate-700 hover:ring-slate-600 transition"
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/home')}
              className="p-2 rounded-xl bg-slate-900 ring-1 ring-slate-700 hover:ring-slate-600 transition"
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          </div>
        </header>

        {/* Filter Tags */}
        {(filters.location || filters.educationLevel || filters.religiosityLevel || filters.sect) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.location && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                📍 {filters.location}
              </span>
            )}
            {filters.educationLevel && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                🎓 {filters.educationLevel}
              </span>
            )}
            {filters.religiosityLevel && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                🕌 {filters.religiosityLevel}
              </span>
            )}
            {filters.sect && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                ☪️ {filters.sect}
              </span>
            )}
          </div>
        )}

        {/* Undo Button (Premium) */}
        {isPremium && lastAction && currentIndex > 0 && (
          <button
            onClick={handleUndo}
            className="w-full mb-4 py-3 bg-amber-500/10 text-amber-200 rounded-xl ring-1 ring-amber-500/30 hover:ring-amber-500/50 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo Last Swipe
          </button>
        )}

        {/* Limit Reached */}
        {!isPremium && remainingSwipes !== null && remainingSwipes <= 0 && (
          <div className="mb-4 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 p-4">
            <p className="text-amber-200 text-sm font-medium">Daily swipe limit reached</p>
            <p className="text-amber-200/70 text-xs mt-1">
              Upgrade to Premium for unlimited swipes
            </p>
            <button
              onClick={() => navigate('/premium')}
              className="mt-3 w-full py-2 bg-amber-500 text-slate-950 rounded-lg text-sm font-medium hover:bg-amber-400 transition"
            >
              Upgrade to Premium
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 p-4">
            <p className="text-rose-200 text-sm">{error}</p>
            <button
              onClick={refreshProfiles}
              className="mt-2 text-sm text-rose-200 underline hover:text-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !currentProfile ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : !hasMoreProfiles ? (
          /* No More Profiles */
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-white/10 p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 ring-1 ring-white/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">No More Profiles</h2>
            <p className="text-slate-400 text-sm mb-6">
              You've seen everyone for now. Check back later for new matches!
            </p>
            <button
              onClick={() => navigate('/matches')}
              className="w-full py-3 bg-emerald-500/20 text-emerald-200 rounded-xl ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition"
            >
              View Your Matches
            </button>
          </div>
        ) : (
          /* Swipe Card */
          currentProfile && (
            <SwipeCard
              profile={currentProfile}
              onLike={handleLike}
              onPass={handlePass}
              onSuperLike={() => {}} // Premium feature
              disabled={matchProcessing || (!isPremium && remainingSwipes !== null && remainingSwipes <= 0)}
              isPremium={isPremium}
              currentIndex={currentIndex}
              totalCards={rankedProfiles.length + (hasMore ? 1 : 0)}
            />
          )
        )}

        {/* Results Count */}
        {!loading && (
          <p className="text-center text-slate-500 text-sm mt-6">
            Showing {filteredProfiles.length} of {rankedProfiles.length} profiles
            {sortBy === 'compatibility' && currentProfile && (
              <span className="block mt-1">
                Compatibility Score: <span className="text-emerald-400">{currentProfile.score}/100</span>
              </span>
            )}
          </p>
        )}
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        sortBy={sortBy}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onReset={resetFilters}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  );
}

// Need to import supabase for the premium check
import { supabase } from '../lib/supabase';
