/**
 * NikahPlus Phase 2 - Enhanced Matches Page
 * Displays matches and handles match requests
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchRequests } from '../hooks/useMatchRequests';
import { usePushNotifications, createNotificationFromTemplate } from '../hooks/usePushNotifications';
import type { MatchWithDetails } from '../types';

export default function MatchesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [selectedMatch, setSelectedMatch] = useState<MatchWithDetails | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  
  const {
    matches,
    loading,
    processing,
    error,
    acceptMatchRequest,
    declineMatchRequest,
    unmatch,
    unreadCount,
    pendingCount,
    refreshMatches,
  } = useMatchRequests({
    includeActive: true,
    includePending: true,
  });

  const { showLocalNotification } = usePushNotifications();

  const activeMatches = matches.filter(m => m.status === 'active');
  const pendingMatches = matches.filter(m => m.status === 'pending_wali');

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleAcceptMatch = async (matchId: string) => {
    const result = await acceptMatchRequest(matchId);
    if (result.success) {
      showLocalNotification(createNotificationFromTemplate('match_approved', {
        matchName: selectedMatch?.other_user.full_name || 'someone',
        matchId,
      }));
      setShowActionModal(false);
      setSelectedMatch(null);
    }
  };

  const handleDeclineMatch = async (matchId: string) => {
    const result = await declineMatchRequest(matchId);
    if (result.success) {
      showLocalNotification(createNotificationFromTemplate('match_declined', {
        matchId,
      }));
      setShowActionModal(false);
      setSelectedMatch(null);
    }
  };

  const handleUnmatch = async (matchId: string) => {
    if (confirm('Are you sure you want to unmatch? This action cannot be undone.')) {
      await unmatch(matchId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-4 bg-slate-900/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">My Matches</h1>
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
              activeTab === 'active'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-rose-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500 text-slate-950 text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30 p-4">
            <p className="text-rose-200 text-sm">{error}</p>
            <button
              onClick={refreshMatches}
              className="mt-2 text-sm text-rose-200 underline hover:text-rose-100"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        {activeTab === 'active' ? (
          <>
            {activeMatches.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">No Active Matches Yet</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Start swiping to find your perfect match!
                </p>
                <button
                  onClick={() => navigate('/swipe')}
                  className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-xl font-medium hover:bg-emerald-400 transition"
                >
                  Start Swiping
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-4 p-4 bg-slate-900 rounded-2xl ring-1 ring-white/5 hover:ring-emerald-500/30 transition cursor-pointer"
                    onClick={() => navigate(`/chat/${match.id}`)}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-slate-800 ring-2 ring-slate-700 overflow-hidden">
                        {match.other_user?.profile_photo_url ? (
                          <img
                            src={match.other_user.profile_photo_url}
                            alt={match.other_user.full_name || 'Profile'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {match.unread_count && match.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-slate-950 text-xs font-bold rounded-full flex items-center justify-center">
                          {match.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {match.other_user?.full_name || 'Anonymous'}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {match.other_user?.dob && calculateAge(match.other_user.dob)} • 
                        {match.other_user?.city || 'Unknown'}
                      </p>
                      {match.last_message && (
                        <p className="text-slate-500 text-sm truncate mt-1">
                          {match.last_message.content}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/chat/${match.id}`);
                        }}
                        className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnmatch(match.id);
                        }}
                        className="p-2 rounded-full bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {pendingMatches.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">No Pending Matches</h3>
                <p className="text-slate-400 text-sm">
                  Pending matches are awaiting wali approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-4 p-4 bg-slate-900 rounded-2xl ring-1 ring-amber-500/30"
                  >
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-slate-800 ring-2 ring-amber-500/50 overflow-hidden">
                      {match.other_user?.profile_photo_url ? (
                        <img
                          src={match.other_user.profile_photo_url}
                          alt={match.other_user.full_name || 'Profile'}
                          className="w-full h-full object-cover opacity-50"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {match.other_user?.full_name || 'Anonymous'}
                      </h3>
                      <p className="text-amber-400 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Awaiting wali approval
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedMatch(match);
                          setShowActionModal(true);
                        }}
                        disabled={processing}
                        className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-sm font-medium hover:bg-amber-400 transition disabled:opacity-50"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Action Modal */}
      {showActionModal && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowActionModal(false)}
          />
          <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl p-6 ring-1 ring-white/10">
            <h3 className="text-white text-lg font-semibold mb-2">Match Request</h3>
            <p className="text-slate-400 text-sm mb-6">
              Review your match with <span className="text-white">{selectedMatch.other_user?.full_name}</span>.
              Both walis must approve before you can message.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleAcceptMatch(selectedMatch.id)}
                disabled={processing}
                className="w-full py-3 bg-emerald-500 text-slate-950 rounded-xl font-medium hover:bg-emerald-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {processing ? 'Processing...' : 'Approve Match'}
              </button>
              
              <button
                onClick={() => handleDeclineMatch(selectedMatch.id)}
                disabled={processing}
                className="w-full py-3 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Decline
              </button>
              
              <button
                onClick={() => setShowActionModal(false)}
                className="w-full py-3 text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
