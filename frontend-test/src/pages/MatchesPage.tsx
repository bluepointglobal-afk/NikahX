import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  created_at: string;
  other_user: {
    id: string;
    full_name: string | null;
    profile_photo_url: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
};

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (hours < 48) {
    return 'Yesterday';
  } else if (hours < 168) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default function MatchesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      // Get matches where user is either user1 or user2 and status is active
      const { data: matchesData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (matchError) {
        setError(matchError.message);
        setLoading(false);
        return;
      }

      // For each match, get other user's profile and last message
      const enrichedMatches = await Promise.all(
        (matchesData || []).map(async (match) => {
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;

          // Get other user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, profile_photo_url')
            .eq('id', otherUserId)
            .single();

          // Get last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', match.id)
            .neq('sender_id', user.id)
            .neq('status', 'read');

          return {
            ...match,
            other_user: profileData || { id: otherUserId, full_name: 'Unknown', profile_photo_url: null },
            last_message: lastMessageData || undefined,
            unread_count: unreadCount || 0,
          };
        })
      );

      // Sort by last message time
      enrichedMatches.sort((a, b) => {
        const timeA = a.last_message?.created_at || a.created_at;
        const timeB = b.last_message?.created_at || b.created_at;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      setMatches(enrichedMatches);
      setLoading(false);
    };

    fetchMatches();

    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel('matches-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Matches</h1>
            <p className="text-slate-400 text-sm mt-1">
              {matches.length} active {matches.length === 1 ? 'conversation' : 'conversations'}
            </p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="rounded-2xl px-4 py-2 text-sm text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
          >
            Home
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 p-4">
            <p className="text-rose-200 text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {matches.length === 0 && !loading && (
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-white/10 p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 ring-1 ring-white/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">No Matches Yet</h2>
            <p className="text-slate-400 text-sm mb-6">
              Start swiping to connect with potential matches!
            </p>
            <button
              onClick={() => navigate('/swipe')}
              className="rounded-2xl px-6 py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition"
            >
              Start Swiping
            </button>
          </div>
        )}

        {/* Matches List */}
        <div className="space-y-2">
          {matches.map((match) => (
            <button
              key={match.id}
              onClick={() => navigate(`/chat/${match.id}`)}
              className="w-full rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 hover:ring-slate-600 p-4 transition group text-left"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-slate-800 ring-2 ring-slate-700 group-hover:ring-slate-600 overflow-hidden flex items-center justify-center">
                    {match.other_user.profile_photo_url ? (
                      <img
                        src={match.other_user.profile_photo_url}
                        alt={match.other_user.full_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    )}
                  </div>
                  {match.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 ring-2 ring-slate-900 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {match.unread_count > 9 ? '9+' : match.unread_count}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="text-white font-semibold truncate">
                      {match.other_user.full_name || 'Unknown User'}
                    </h3>
                    {match.last_message && (
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatTime(match.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm truncate ${
                      match.unread_count > 0 ? 'text-slate-200 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {match.last_message ? (
                      <>
                        {match.last_message.sender_id === user?.id && (
                          <span className="mr-1">You:</span>
                        )}
                        {match.last_message.content}
                      </>
                    ) : (
                      <span className="italic">No messages yet</span>
                    )}
                  </p>
                </div>

                {/* Chevron */}
                <svg
                  className="w-5 h-5 text-slate-500 group-hover:text-slate-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
