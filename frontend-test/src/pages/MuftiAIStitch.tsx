import { useState } from 'react';
import { colors } from '../lib/designTokens';

interface Message {
  id: string;
  role: 'user' | 'mufti';
  content: string;
  timestamp: Date;
}

export default function MuftiAIStitch() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'mufti',
      content:
        "Assalamu alaikum wa rahmatullahi wa barakatuhu! I'm here to help answer your Islamic questions about marriage, family, and relationships. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: String(messages.length + 1),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputValue('');
    setLoading(true);

    // Simulate API response
    setTimeout(() => {
      const muftiMessage: Message = {
        id: String(messages.length + 2),
        role: 'mufti',
        content:
          'That is a great question. According to the Islamic scholars, the answer depends on your specific circumstances. Would you like me to elaborate further?',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, muftiMessage]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div
      className="flex flex-col h-screen w-full max-w-md mx-auto"
      style={{ backgroundColor: colors.backgroundDark }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 h-14 border-b"
        style={{
          backgroundColor: `${colors.backgroundDark}cc`,
          backdropFilter: 'blur(12px)',
          borderColor: colors.borderDark,
        }}
      >
        <div className="flex items-center gap-3">
          <button>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <p
              className="font-semibold text-sm"
              style={{ color: colors.textMainDark }}
            >
              Ask the Mufti
            </p>
            <p
              className="text-xs"
              style={{ color: colors.primary }}
            >
              Online
            </p>
          </div>
        </div>
        <button>
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'mufti' && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-2 shrink-0"
                style={{ backgroundColor: colors.primary, color: colors.backgroundDark }}
              >
                م
              </div>
            )}
            <div
              className="max-w-[75%] rounded-2xl px-4 py-3"
              style={{
                backgroundColor:
                  msg.role === 'user' ? colors.primary : colors.surfaceDark,
                color:
                  msg.role === 'user'
                    ? colors.backgroundDark
                    : colors.textMainDark,
              }}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <p
                className="text-xs mt-2"
                style={{
                  color:
                    msg.role === 'user'
                      ? `${colors.backgroundDark}99`
                      : colors.textSubDark,
                }}
              >
                {msg.timestamp.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: colors.surfaceDark,
                color: colors.textMainDark,
              }}
            >
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: colors.primary }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: colors.primary,
                    animationDelay: '0.2s',
                  }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: colors.primary,
                    animationDelay: '0.4s',
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="px-4 py-4 border-t"
        style={{
          backgroundColor: colors.backgroundDark,
          borderColor: colors.borderDark,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 rounded-full text-sm"
              style={{
                backgroundColor: colors.surfaceDark,
                border: `1px solid ${colors.borderDark}`,
                color: colors.textMainDark,
              }}
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim()}
            className="p-2 rounded-full transition-all"
            style={{ color: colors.primary }}
          >
            <span className="material-symbols-outlined">
              {loading ? 'hourglass_empty' : 'send'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
