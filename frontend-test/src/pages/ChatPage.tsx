import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useMessages } from '../hooks/useMessages';
import { usePresence } from '../hooks/usePresence';

type MatchInfo = {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  other_user: {
    id: string;
    full_name: string | null;
    profile_photo_url: string | null;
  };
};

function MessageBubble({
  content,
  isMine,
  status,
  timestamp,
  messageType,
  mediaUrl,
}: {
  content: string;
  isMine: boolean;
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
  messageType: 'text' | 'image' | 'voice';
  mediaUrl?: string;
}) {
  const time = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Image Message */}
        {messageType === 'image' && mediaUrl && (
          <div className={`rounded-2xl overflow-hidden mb-1 ${isMine ? 'bg-emerald-600' : 'bg-slate-700'}`}>
            <img src={mediaUrl} alt="Shared" className="max-w-full" />
          </div>
        )}

        {/* Voice Message (Placeholder) */}
        {messageType === 'voice' && (
          <div
            className={`rounded-2xl px-4 py-3 ${
              isMine ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">Voice message</span>
            </div>
          </div>
        )}

        {/* Text Message */}
        {messageType === 'text' && (
          <div
            className={`rounded-2xl px-4 py-3 ${
              isMine ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-100'
            }`}
          >
            <p className="text-sm leading-relaxed break-words">{content}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-1 mt-1 px-2">
          <span className="text-xs text-slate-400">{time}</span>
          {isMine && (
            <span className="text-xs text-slate-400">
              {status === 'sent' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {status === 'delivered' && (
                <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {status === 'read' && (
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, markAsRead } = useMessages(matchId);
  const { otherUserTyping, setTyping } = usePresence(matchId, user?.id);

  // Fetch match info
  useEffect(() => {
    const fetchMatchInfo = async () => {
      if (!matchId || !user?.id) return;

      setLoading(true);
      setError(null);

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) {
        setError(matchError.message);
        setLoading(false);
        return;
      }

      const otherUserId = matchData.user1_id === user.id ? matchData.user2_id : matchData.user1_id;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url')
        .eq('id', otherUserId)
        .single();

      setMatchInfo({
        ...matchData,
        other_user: profileData || { id: otherUserId, full_name: 'Unknown', profile_photo_url: null },
      });

      setLoading(false);
    };

    fetchMatchInfo();
  }, [matchId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!user?.id) return;

    messages.forEach((msg) => {
      if (msg.sender_id !== user.id && msg.status !== 'read') {
        markAsRead(msg.id);
      }
    });
  }, [messages, user, markAsRead]);

  // Handle typing indicator
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      // Set typing when user starts typing
      if (value.length > 0 && !otherUserTyping) {
        setTyping(true);
      } else if (value.length === 0) {
        setTyping(false);
      }
    },
    [setTyping, otherUserTyping]
  );

  // Clear typing on blur
  useEffect(() => {
    if (inputValue.length === 0) {
      setTyping(false);
    }
  }, [inputValue, setTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    setSending(true);
    setTyping(false);

    const { error: sendError } = await sendMessage(inputValue.trim());

    if (sendError) {
      setError(sendError);
    } else {
      setInputValue('');
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleImageUpload = async (file: File) => {
    if (!matchId) return;

    setSending(true);
    setError(null);

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${matchId}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file);

    if (uploadError) {
      setError(uploadError.message);
      setSending(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(uploadData.path);

    // Send message with image URL
    await sendMessage('[Image]', 'image', urlData.publicUrl);

    setSending(false);
  };

  const handleBlock = async () => {
    if (!matchId || !window.confirm('Are you sure you want to block this user?')) return;

    const { error: blockError } = await supabase
      .from('matches')
      .update({ status: 'blocked' })
      .eq('id', matchId);

    if (blockError) {
      setError(blockError.message);
    } else {
      navigate('/matches');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!matchInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-rose-200">Match not found</p>
          <button
            onClick={() => navigate('/matches')}
            className="mt-4 rounded-2xl px-6 py-3 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className="shrink-0 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate('/matches')}
              className="shrink-0 w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center transition"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0">
              {matchInfo.other_user.profile_photo_url ? (
                <img
                  src={matchInfo.other_user.profile_photo_url}
                  alt={matchInfo.other_user.full_name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold truncate">
                {matchInfo.other_user.full_name || 'Unknown User'}
              </h2>
              {otherUserTyping && <p className="text-xs text-emerald-400">typing...</p>}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center transition"
            >
              <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-800 ring-1 ring-slate-700 shadow-xl py-2 z-50">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    alert('Report functionality coming soon');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                >
                  Report User
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleBlock();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-rose-200 hover:bg-slate-700"
                >
                  Block User
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="shrink-0 bg-rose-500/10 border-b border-rose-500/30 px-4 py-2">
          <p className="text-rose-200 text-sm">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
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
            <p className="text-slate-400 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                isMine={msg.sender_id === user?.id}
                status={msg.status}
                timestamp={msg.created_at}
                messageType={msg.message_type}
                mediaUrl={msg.media_url}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 bg-slate-900/80 backdrop-blur border-t border-slate-800 px-4 py-3">
        <div className="flex items-end gap-2">
          {/* Image Upload */}
          <label className="shrink-0 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer transition">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </label>

          {/* Voice Message (Placeholder) */}
          <button className="shrink-0 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          {/* Text Input */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-slate-800 text-white rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-400"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            className="shrink-0 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
