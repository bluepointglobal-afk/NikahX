import { useState } from 'react';
import { colors } from '../lib/designTokens';

interface Message {
  id: string;
  content: string;
  isMine: boolean;
  timestamp: Date;
  type: 'text' | 'image' | 'voice';
}

export default function ChatPageStitch() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Assalamu alaikum! How are you?',
      isMine: false,
      timestamp: new Date(Date.now() - 60000),
      type: 'text',
    },
    {
      id: '2',
      content: 'Walaikum assalam! I\'m doing well, alhamdulillah. How about you?',
      isMine: true,
      timestamp: new Date(Date.now() - 30000),
      type: 'text',
    },
  ]);

  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: String(messages.length + 1),
        content: inputValue,
        isMine: true,
        timestamp: new Date(),
        type: 'text',
      };
      setMessages([...messages, newMessage]);
      setInputValue('');
    }
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
          borderColor: `${colors.borderDark}80`,
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
              Fatima
            </p>
            <p
              className="text-xs"
              style={{ color: colors.textSubDark }}
            >
              Active now
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
            className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[75%] rounded-2xl px-4 py-3"
              style={{
                backgroundColor: msg.isMine ? colors.primary : colors.surfaceDark,
                color: msg.isMine ? colors.backgroundDark : colors.textMainDark,
              }}
            >
              <p className="text-sm">{msg.content}</p>
              <p
                className="text-xs mt-1"
                style={{
                  color: msg.isMine
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
          <button className="p-2 rounded-full" style={{ color: colors.primary }}>
            <span className="material-symbols-outlined">add</span>
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message..."
            className="flex-1 px-4 py-2 rounded-full"
            style={{
              backgroundColor: colors.surfaceDark,
              border: `1px solid ${colors.borderDark}`,
              color: colors.textMainDark,
            }}
          />
          <button
            onClick={handleSend}
            className="p-2 rounded-full transition-all"
            style={{ color: colors.primary }}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
