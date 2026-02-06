import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type PresenceState = {
  [key: string]: {
    user_id: string;
    typing: boolean;
    online_at: string;
  }[];
};

export function usePresence(matchId: string | undefined, userId: string | undefined) {
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!matchId || !userId) {
      setOtherUserTyping(false);
      return;
    }

    const presenceChannel = supabase.channel(`presence:${matchId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state: PresenceState = presenceChannel.presenceState();
        
        // Check if any other user is typing
        const otherUsers = Object.values(state)
          .flat()
          .filter((user) => user.user_id !== userId);

        const someoneTyping = otherUsers.some((user) => user.typing);
        setOtherUserTyping(someoneTyping);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: userId,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [matchId, userId]);

  const setTyping = async (typing: boolean) => {
    if (!channel || !userId) return;

    setIsTyping(typing);

    await channel.track({
      user_id: userId,
      typing,
      online_at: new Date().toISOString(),
    });
  };

  return {
    isTyping,
    otherUserTyping,
    setTyping,
  };
}
