import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type WardProfile = {
  id: string;
  full_name: string | null;
  profile_photo_url: string | null;
};

type WardStats = {
  active_matches: number;
  pending_approvals: number;
  messages_this_week: number;
};

type PendingMatch = {
  id: string;
  created_at: string;
  other_user: {
    id: string;
    full_name: string | null;
    age: number | null;
    city: string | null;
    country: string | null;
  };
  firasa_score: number;
  concerns: string[];
};

export default function FamilyPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'monitoring'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ward, setWard] = useState<WardProfile | null>(null);
  const [stats, setStats] = useState<WardStats>({ active_matches: 0, pending_approvals: 0, messages_this_week: 0 });
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
  const [oversightEnabled, setOversightEnabled] = useState(false);

  // Fetch ward info
  useEffect(() => {
    const fetchWardInfo = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      // Check if user is a wali
      const { data: waliData, error: waliError } = await supabase
        .from('wali_relationships')
        .select('ward_id, oversight_enabled')
        .eq('wali_id', user.id)
        .eq('status', 'active')
        .single();

      if (waliError || !waliData) {
        setError('You are not registered as a guardian.');
        setLoading(false);
        return;
      }

      setOversightEnabled(waliData.oversight_enabled);

      // Get ward profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url')
        .eq('id', waliData.ward_id)
        .single();

      setWard(profileData);

      // Get stats
      const { count: activeCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${waliData.ward_id},user2_id.eq.${waliData.ward_id}`)
        .eq('status', 'active');

      const { count: pendingCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${waliData.ward_id},user2_id.eq.${waliData.ward_id}`)
        .eq('status', 'pending_wali');

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Count messages via RPC function (complex join query)
      const { count: messageCount } = await supabase.rpc('count_ward_messages', {
        p_ward_id: waliData.ward_id,
        p_since: weekAgo.toISOString()
      });

      setStats({
        active_matches: activeCount || 0,
        pending_approvals: pendingCount || 0,
        messages_this_week: messageCount || 0,
      });

      // Get pending matches for approval
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${waliData.ward_id},user2_id.eq.${waliData.ward_id}`)
        .eq('status', 'pending_wali');

      if (matchesData) {
        const enriched = await Promise.all(
          matchesData.map(async (match) => {
            const otherUserId = match.user1_id === waliData.ward_id ? match.user2_id : match.user1_id;

            const { data: otherProfile } = await supabase
              .from('profiles')
              .select('id, full_name, dob, city, country')
              .eq('id', otherUserId)
              .single();

            const age = otherProfile?.dob
              ? new Date().getFullYear() - new Date(otherProfile.dob).getFullYear()
              : null;

            return {
              id: match.id,
              created_at: match.created_at,
              other_user: {
                id: otherUserId,
                full_name: otherProfile?.full_name || null,
                age,
                city: otherProfile?.city || null,
                country: otherProfile?.country || null,
              },
              firasa_score: Math.floor(Math.random() * 30) + 70, // Mock score
              concerns: ['Age difference', 'Different madhab'].slice(0, Math.floor(Math.random() * 3)),
            };
          })
        );

        setPendingMatches(enriched);
      }

      setLoading(false);
    };

    fetchWardInfo();
  }, [user]);

  const handleApproval = async (matchId: string, approved: boolean) => {
    if (!ward?.id) return;

    const { error: approveError } = await supabase.rpc('wali_approve_match', {
      p_match_id: matchId,
      p_ward_id: ward.id,
      p_approved: approved,
    });

    if (approveError) {
      setError(approveError.message);
      return;
    }

    // Refresh pending matches
    setPendingMatches((prev) => prev.filter((m) => m.id !== matchId));
    setStats((prev) => ({ ...prev, pending_approvals: prev.pending_approvals - 1 }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading guardian panel...</p>
        </div>
      </div>
    );
  }

  if (error && !ward) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 ring-1 ring-rose-500/30 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/home')}
            className="rounded-2xl px-6 py-3 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Guardian Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              Monitoring {ward?.full_name || 'ward'}'s journey
            </p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="rounded-2xl px-4 py-2 text-sm text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
          >
            Home
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`rounded-2xl px-4 py-2 text-sm transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 ring-1 ring-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`rounded-2xl px-4 py-2 text-sm transition whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 ring-1 ring-slate-700'
            }`}
          >
            Approvals {stats.pending_approvals > 0 && `(${stats.pending_approvals})`}
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`rounded-2xl px-4 py-2 text-sm transition whitespace-nowrap ${
              activeTab === 'monitoring'
                ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 ring-1 ring-slate-700'
            }`}
          >
            Monitoring
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Active Matches</span>
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <p className="text-white text-3xl font-bold">{stats.active_matches}</p>
              </div>

              <div className="rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Pending Approvals</span>
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-white text-3xl font-bold">{stats.pending_approvals}</p>
              </div>

              <div className="rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Messages This Week</span>
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-white text-3xl font-bold">{stats.messages_this_week}</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/30 p-6">
              <h3 className="text-blue-200 font-semibold mb-2">Guardian Responsibilities</h3>
              <ul className="text-blue-100 text-sm space-y-1 list-disc list-inside">
                <li>Review and approve potential matches</li>
                <li>Monitor conversations for appropriateness</li>
                <li>Guide your ward through the marriage process</li>
                <li>Request meetings when matches become serious</li>
              </ul>
            </div>
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            {pendingMatches.length === 0 ? (
              <div className="rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 ring-1 ring-white/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">No Pending Approvals</h3>
                <p className="text-slate-400 text-sm">All matches have been reviewed.</p>
              </div>
            ) : (
              pendingMatches.map((match) => (
                <div key={match.id} className="rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        {match.other_user.full_name || 'Unknown User'}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {match.other_user.age ? `${match.other_user.age} years old` : 'Age unknown'}
                        {(match.other_user.city || match.other_user.country) && ' • '}
                        {[match.other_user.city, match.other_user.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">{match.firasa_score}</div>
                      <div className="text-xs text-slate-400">Firasa Score</div>
                    </div>
                  </div>

                  {match.concerns.length > 0 && (
                    <div className="mb-4 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 p-4">
                      <h4 className="text-amber-200 text-sm font-semibold mb-2">⚠️ Concerns</h4>
                      <ul className="text-amber-100 text-sm space-y-1">
                        {match.concerns.map((concern, i) => (
                          <li key={i}>• {concern}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleApproval(match.id, true)}
                      className="rounded-xl py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(match.id, false)}
                      className="rounded-xl py-3 bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/30 hover:ring-rose-500/50 transition text-sm"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => alert('Request meeting functionality coming soon')}
                      className="rounded-xl py-3 bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30 hover:ring-blue-500/50 transition text-sm"
                    >
                      Request Meeting
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="space-y-4">
            {!oversightEnabled ? (
              <div className="rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 ring-1 ring-white/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Monitoring Not Enabled</h3>
                <p className="text-slate-400 text-sm">Your ward has not enabled conversation monitoring.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 p-6">
                <h3 className="text-white font-semibold mb-4">Conversation Monitoring</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Read-only view of your ward's conversations (coming soon)
                </p>
                <div className="text-center py-8 text-slate-500 text-sm">Feature in development</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
