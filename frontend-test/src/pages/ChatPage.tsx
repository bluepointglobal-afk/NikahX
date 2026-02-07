/**
 * NikahPlus Phase 2 - Enhanced Chat Page
 * Real-time messaging between matched users
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessages } from '../hooks/useMessages';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, loading, error, sendMessage, markAsRead } = useMessages(matchId);
  const [inputValue, setInputValue] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [matchStatus, setMatchStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch match and other user details
  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!matchId || !user?.id) return;

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !matchData) {
        navigate('/matches');
        return;
      }

      setMatchStatus(matchData.status);

      // Check if match is active
      if (matchData.status !== 'active') {
        return;
      }

      const otherUserId = matchData.user1_id === user.id 
        ? matchData.user2_id 
        : matchData.user1_id;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();

      if (profileData) {
        setOtherUser(profileData as Profile);
      }
    };

    fetchMatchDetails();
  }, [matchId, user, navigate]);

  // Mark messages as read when viewed
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.sender_id !== user?.id && msg.status !== 'read') {
        markAsRead(msg.id);
      }
    });
  }, [messages, user, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || !matchId) return;

    const result = await sendMessage(inputValue.trim());
    
    if (!result.error) {
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, typeof messages>);

  if (loading && messages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Show pending state if match is not active
  if (matchStatus && matchStatus !== 'active') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950">
        {/* Header */}
        <header className="px-4 py-4 bg-slate-900/90 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate('/matches')}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition"
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-white font-semibold">Chat</h1>
          </div>
        </header>

        {/* Pending State */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">Chat Locked</h2>
            <p className="text-slate-400 text-sm mb-4">
              This match is still awaiting wali approval. You'll be able to chat once both walis approve.
            </p>
            <button
              onClick={() => navigate('/matches')}
              className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-xl font-medium hover:bg-emerald-400 transition"
            >
              Back to Matches
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="px-4 py-4 bg-slate-900/90 backdrop-blur-lg border-b border-white/10 flex-shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/matches')}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition"
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 ring-2 ring-emerald-500/30 overflow-hidden">
                {otherUser?.profile_photo_url ? (
                  <img
                    src={otherUser.profile_photo_url}
                    alt={otherUser.full_name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-white font-semibold text-sm">
                  {otherUser?.full_name || 'Anonymous'}
                </h1>
                <p className="text-emerald-400 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Active now
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <button className="p-2 rounded-full hover:bg-white/10 transition">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30 p-3">
              <p className="text-rose-200 text-sm text-center">{error}</p>
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">
                Start the conversation with {otherUser?.full_name?.split(' ')[0] || 'your match'}
              </p>
            </div>
          )}

          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="space-y-3">
              {/* Date Divider */}
              <div className="flex items-center justify-center">
                <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full">
                  {formatDate(dateMessages[0].created_at)}
                </span>
              </div>

              {/* Messages */}
              {dateMessages.map((msg, index) => {
                const isMine = msg.sender_id === user?.id;
                const showAvatar = !isMine && (
                  index === 0 || 
                  dateMessages[index - 1].sender_id !== msg.sender_id
                );

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar (only show for first message in group) */}
                      {!isMine && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden">
                          {otherUser?.profile_photo_url ? (
                            <img
                              src={otherUser.profile_photo_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      )}
                      {!isMine && !showAvatar && <div className="w-8" />}

                      {/* Message Bubble */}
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          isMine
                            ? 'bg-emerald-500 text-slate-950 rounded-br-md'
                            : 'bg-slate-800 text-slate-100 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                          <span className={`text-xs ${isMine ? 'text-emerald-900/70' : 'text-slate-500'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                          {isMine && (
                            <span className="text-emerald-900/70">
                              {msg.status === 'read' ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : msg.status === 'delivered' ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-slate-900/90 backdrop-blur-lg border-t border-white/10 flex-shrink-0">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button className="p-3 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-3 bg-slate-800 text-white placeholder-slate-500 rounded-full border border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-12"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-slate-950 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-center text-slate-600 text-xs mt-2">
          Messages are monitored for safety
        </p>
      </div>
    </div>
  );
}
