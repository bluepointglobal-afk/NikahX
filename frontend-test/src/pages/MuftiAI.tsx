import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

type Conversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const SYSTEM_PROMPT = `You are a knowledgeable Islamic scholar specializing in marriage and family matters. 
You provide guidance based on Quran, Hadith, and scholarly consensus across the four major madhabs.

Guidelines:
- Always cite sources (Quran ayat, hadith references, scholarly opinions)
- Acknowledge differences between madhabs when relevant
- Recommend consulting local scholars for specific rulings
- Emphasize taqwa, mercy, and wisdom in marriage matters
- Never issue definitive fatwas - guide towards scholarly resources
- Respect cultural diversity within Islamic boundaries`;

const FREE_QUESTION_LIMIT = 10;

export default function MuftiAI() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState(0);

  // Check premium status and usage
  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      const premium = profileData?.subscription_status === 'premium';
      setIsPremium(premium);

      // Get monthly usage (count messages from this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('mufti_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'user')
        .gte('created_at', startOfMonth.toISOString());

      setMonthlyUsage(count || 0);
    };

    checkAccess();
  }, [user]);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('mufti_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      setConversations((data as Conversation[]) || []);

      // Load most recent conversation if exists
      if (data && data.length > 0) {
        loadConversation(data[0].id);
      }
    };

    loadConversations();
  }, [user]);

  // Load messages for a conversation
  const loadConversation = async (conversationId: string) => {
    setLoading(true);

    const { data: convData } = await supabase
      .from('mufti_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    setCurrentConversation(convData as Conversation);

    const { data: messagesData } = await supabase
      .from('mufti_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages((messagesData as Message[]) || []);
    setLoading(false);
  };

  // Start new conversation
  const startNewConversation = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('mufti_conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation',
      })
      .select()
      .single();

    if (error) {
      alert('Failed to create conversation: ' + error.message);
      return;
    }

    const newConv = data as Conversation;
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversation(newConv);
    setMessages([]);
  };

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || sending || !currentConversation) return;

    // Check limits
    if (!isPremium && monthlyUsage >= FREE_QUESTION_LIMIT) {
      alert(`Free users can ask ${FREE_QUESTION_LIMIT} questions per month. Upgrade to Premium for unlimited access.`);
      return;
    }

    setSending(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Save user message
    await supabase.from('mufti_messages').insert({
      conversation_id: currentConversation.id,
      user_id: user?.id,
      role: 'user',
      content: userMessage.content,
    });

    // Mock AI response (in production, call OpenAI API)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const aiResponse: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Assalamu alaikum. Thank you for your question regarding "${userMessage.content.substring(0, 50)}..."

Based on Islamic teachings:

1. **From the Quran**: "And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy." (Ar-Rum 30:21)

2. **Prophetic Guidance**: The Prophet ﷺ said: "When a man marries, he has fulfilled half of his religion, so let him fear Allah regarding the remaining half." (At-Tirmidhi)

3. **Scholarly Consensus**: The four major madhabs agree that marriage should be approached with careful consideration, involving family consultation, and ensuring compatibility in religion and character.

**Recommendation**: I encourage you to:
- Consult with your local imam or scholar for specific guidance
- Make istikhara (seeking Allah's guidance)
- Involve your family in the decision-making process
- Prioritize deen (religion) and good character

May Allah guide you to what is best. If you need more specific guidance, please consult a qualified scholar in your area.

Barakallahu feekum.`,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, aiResponse]);

    // Save AI message
    await supabase.from('mufti_messages').insert({
      conversation_id: currentConversation.id,
      user_id: user?.id,
      role: 'assistant',
      content: aiResponse.content,
    });

    // Update conversation
    await supabase
      .from('mufti_conversations')
      .update({
        title: userMessage.content.substring(0, 50),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentConversation.id);

    setMonthlyUsage((prev) => prev + 1);
    setSending(false);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const remainingQuestions = isPremium ? '∞' : FREE_QUESTION_LIMIT - monthlyUsage;

  return (
    <div className="h-screen flex bg-slate-950">
      {/* Sidebar */}
      <div className="hidden sm:flex flex-col w-64 bg-slate-900/50 border-r border-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <button
            onClick={() => navigate('/home')}
            className="w-full rounded-2xl px-4 py-2 text-sm text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition mb-3"
          >
            ← Home
          </button>
          <button
            onClick={startNewConversation}
            className="w-full rounded-2xl py-2 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition text-sm font-semibold"
          >
            + New Conversation
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full rounded-xl p-3 mb-2 text-left transition ${
                currentConversation?.id === conv.id
                  ? 'bg-emerald-500/20 ring-1 ring-emerald-500/30'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <p className="text-white text-sm truncate mb-1">{conv.title}</p>
              <p className="text-slate-400 text-xs">
                {new Date(conv.updated_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>

        {/* Usage Info */}
        <div className="p-4 border-t border-slate-800">
          <div className="rounded-xl bg-slate-800/50 p-3">
            <p className="text-slate-300 text-xs mb-1">Questions Remaining</p>
            <p className="text-white text-2xl font-bold">{remainingQuestions}</p>
            {!isPremium && (
              <button
                onClick={() => navigate('/premium')}
                className="w-full mt-2 rounded-lg py-1.5 bg-amber-500/20 text-amber-200 text-xs hover:bg-amber-500/30 transition"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-semibold">Mufti AI</h2>
                <p className="text-slate-400 text-xs">Islamic guidance on marriage & family</p>
              </div>
            </div>

            <button
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="rounded-xl px-3 py-1.5 text-xs text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
            >
              {showSystemPrompt ? 'Hide' : 'Show'} Guidelines
            </button>
          </div>

          {/* System Prompt */}
          {showSystemPrompt && (
            <div className="mt-3 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30 p-4">
              <h3 className="text-blue-200 text-sm font-semibold mb-2">Mufti AI Guidelines</h3>
              <p className="text-blue-100/80 text-xs leading-relaxed whitespace-pre-line">{SYSTEM_PROMPT}</p>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!currentConversation ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">Welcome to Mufti AI</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                Ask questions about Islamic marriage, family life, and relationships. Get guidance based on Quran,
                Hadith, and scholarly consensus.
              </p>
              <button
                onClick={startNewConversation}
                className="rounded-2xl px-6 py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition font-semibold"
              >
                Start New Conversation
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 mt-4">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">Ask your first question below</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-6 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
                >
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center">
                          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                          </svg>
                        </div>
                        <span className="text-slate-400 text-xs font-semibold">Mufti AI</span>
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800/80 text-slate-100 ring-1 ring-slate-700'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    <span className="text-xs text-slate-400 mt-1 px-2">
                      {new Date(msg.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start mb-6">
                  <div className="bg-slate-800/80 rounded-2xl px-4 py-3 ring-1 ring-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-75" />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-150" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        {currentConversation && (
          <div className="shrink-0 bg-slate-900/80 backdrop-blur border-t border-slate-800 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask your question..."
                rows={1}
                className="flex-1 bg-slate-800 text-white rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-400 max-h-32"
              />

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

            <p className="text-slate-400 text-xs mt-2 text-center">
              {isPremium
                ? 'Unlimited questions with Premium'
                : `${remainingQuestions} questions remaining this month`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
