import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'voice';
  media_url?: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  updated_at: string;
};

export function useMessages(matchId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!matchId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchMessages = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setMessages((data as Message[]) || []);
      setLoading(false);
    };

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!matchId) return;

    let channel: RealtimeChannel;

    const setupSubscription = () => {
      channel = supabase
        .channel(`messages:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const newMessage = payload.new as Message;
            setMessages((prev) => [...prev, newMessage]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const updatedMessage = payload.new as Message;
            setMessages((prev) =>
              prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
            );
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [matchId]);

  const sendMessage = useCallback(
    async (content: string, messageType: 'text' | 'image' | 'voice' = 'text', mediaUrl?: string) => {
      if (!matchId) return { error: 'No match ID provided' };

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { error: 'Not authenticated' };

      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: userData.user.id,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          status: 'sent',
        })
        .select()
        .single();

      if (sendError) return { error: sendError.message };

      return { data: data as Message };
    },
    [matchId]
  );

  const markAsRead = useCallback(
    async (messageId: string) => {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('id', messageId);

      if (updateError) {
        console.error('Failed to mark message as read:', updateError);
      }
    },
    []
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
  };
}
