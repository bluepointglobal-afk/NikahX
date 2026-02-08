/**
 * NikahPlus Phase 2 - Match Request System Hook
 * Handles sending, accepting, and declining match requests
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type {
  MatchRequest,
  MatchWithDetails,
  Profile
} from '../types';

interface UseMatchRequestsOptions {
  includePending?: boolean;
  includeActive?: boolean;
  includeHistory?: boolean;
}

interface UseMatchRequestsReturn {
  // Data
  matches: MatchWithDetails[];
  pendingRequests: MatchRequest[];

  // Loading states
  loading: boolean;
  processing: boolean;

  // Error
  error: string | null;

  // Actions
  sendMatchRequest: (targetUserId: string, message?: string) => Promise<{ success: boolean; matchId?: string; error?: string }>;
  acceptMatchRequest: (matchId: string) => Promise<{ success: boolean; error?: string }>;
  declineMatchRequest: (matchId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  cancelMatchRequest: (matchId: string) => Promise<{ success: boolean; error?: string }>;
  unmatch: (matchId: string) => Promise<{ success: boolean; error?: string }>;
  refreshMatches: () => Promise<void>;

  // Stats
  unreadCount: number;
  pendingCount: number;
}

export function useMatchRequests(
  options: UseMatchRequestsOptions = {}
): UseMatchRequestsReturn {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch matches where user is involved
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          user1:profiles!matches_user1_id_fkey(id, full_name, profile_photo_url, city, country),
          user2:profiles!matches_user2_id_fkey(id, full_name, profile_photo_url, city, country)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (matchesError) throw matchesError;

      // Process matches with other user info
      const processedMatches: MatchWithDetails[] = (matchesData || [])
        .map(match => {
          const isUser1 = match.user1_id === user.id;
          const otherUser = isUser1 ? match.user2 : match.user1;
          
          // Check if wali has approved for both users
          const isWaliApproved = match.wali_approved_user1_at && match.wali_approved_user2_at;
          
          return {
            ...match,
            other_user: otherUser as Profile,
            compatibility_score: 0, // Will be calculated
            is_wali_approved: !!isWaliApproved,
          };
        })
        .filter(match => {
          // Filter based on options
          if (options.includeActive && match.status === 'active') return true;
          if (options.includePending && match.status === 'pending_wali') return true;
          if (options.includeHistory) return true;
          return true; // Default: include all
        });

      setMatches(processedMatches);

      // Fetch pending requests (where user is receiver and match is pending)
      const pendingFromMatches: MatchRequest[] = processedMatches
        .filter(m => m.status === 'pending_wali')
        .map(m => ({
          id: m.id,
          sender_id: m.user1_id === user.id ? m.user2_id : m.user1_id,
          receiver_id: user.id,
          status: 'pending' as const,
          message: null,
          created_at: m.created_at,
          updated_at: m.created_at,
          sender_profile: m.other_user,
        }));

      setPendingRequests(pendingFromMatches);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  }, [user, options.includeActive, options.includePending, options.includeHistory]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Subscribe to real-time match updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`matches:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${user.id}`,
        },
        () => fetchMatches()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user2_id=eq.${user.id}`,
        },
        () => fetchMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMatches]);

  const sendMatchRequest = useCallback(async (
    targetUserId: string,
    _message?: string
  ): Promise<{ success: boolean; matchId?: string; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    setProcessing(true);
    setError(null);

    try {
      // Use the create_interaction_v2 RPC which handles the matching logic
      const { data, error: rpcError } = await supabase.rpc('create_interaction_v2', {
        target_user_id: targetUserId,
        interaction_type: 'like',
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as {
        success: boolean;
        is_mutual: boolean;
        match_id: string | null;
        status: string | null;
      };

      // Refresh matches to get the new state
      await fetchMatches();

      return {
        success: true,
        matchId: result.match_id || undefined,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send match request';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setProcessing(false);
    }
  }, [user, fetchMatches]);

  const acceptMatchRequest = useCallback(async (
    matchId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    setProcessing(true);
    setError(null);

    try {
      // This would typically be called by a wali
      // For now, we simulate user consent
      const { error: updateError } = await supabase
        .from('matches')
        .update({ consented_at: new Date().toISOString() })
        .eq('id', matchId);

      if (updateError) throw updateError;

      await fetchMatches();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to accept match';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setProcessing(false);
    }
  }, [user, fetchMatches]);

  const declineMatchRequest = useCallback(async (
    matchId: string,
    _reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    setProcessing(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('matches')
        .update({ 
          status: 'rejected',
          is_active: false,
          unmatched_by: user.id,
        })
        .eq('id', matchId);

      if (updateError) throw updateError;

      await fetchMatches();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to decline match';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setProcessing(false);
    }
  }, [user, fetchMatches]);

  const cancelMatchRequest = useCallback(async (
    matchId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    setProcessing(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)
        .eq('status', 'pending_wali');

      if (deleteError) throw deleteError;

      await fetchMatches();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel request';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setProcessing(false);
    }
  }, [user, fetchMatches]);

  const unmatch = useCallback(async (
    matchId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    setProcessing(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('matches')
        .update({ 
          status: 'cancelled',
          is_active: false,
          unmatched_by: user.id,
        })
        .eq('id', matchId);

      if (updateError) throw updateError;

      await fetchMatches();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unmatch';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setProcessing(false);
    }
  }, [user, fetchMatches]);

  // Calculate stats
  const unreadCount = matches.reduce((sum, m) => sum + (m.unread_count || 0), 0);
  const pendingCount = pendingRequests.length;

  return {
    matches,
    pendingRequests,
    loading,
    processing,
    error,
    sendMatchRequest,
    acceptMatchRequest,
    declineMatchRequest,
    cancelMatchRequest,
    unmatch,
    refreshMatches: fetchMatches,
    unreadCount,
    pendingCount,
  };
}
