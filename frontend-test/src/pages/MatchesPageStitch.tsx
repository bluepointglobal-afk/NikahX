import { useState } from 'react';
import { colors } from '../lib/designTokens';

interface Match {
  id: string;
  name: string;
  age: number;
  location: string;
  avatar: string;
  compatibility: number;
}

export default function MatchesPage() {
  const [matches] = useState<Match[]>([
    {
      id: '1',
      name: 'Fatima',
      age: 26,
      location: 'New York, USA',
      avatar: '👩',
      compatibility: 92,
    },
    {
      id: '2',
      name: 'Aisha',
      age: 24,
      location: 'London, UK',
      avatar: '👩',
      compatibility: 88,
    },
  ]);

  return (
    <div
      className="min-h-screen w-full max-w-md mx-auto"
      style={{ backgroundColor: colors.backgroundDark }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b"
        style={{
          backgroundColor: `${colors.backgroundDark}cc`,
          backdropFilter: 'blur(12px)',
          borderColor: `${colors.borderDark}80`,
        }}
      >
        <h1
          className="text-base font-semibold tracking-wide"
          style={{ color: colors.textMainDark }}
        >
          My Matches
        </h1>
        <button>
          <span className="material-symbols-outlined">filter_list</span>
        </button>
      </header>

      {/* Matches List */}
      <main className="px-4 pt-4 pb-32 space-y-3">
        {matches.map((match) => (
          <div
            key={match.id}
            className="flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:shadow-lg"
            style={{
              backgroundColor: colors.surfaceDark,
              borderColor: colors.borderDark,
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{
                backgroundColor: colors.primary,
              }}
            >
              {match.avatar}
            </div>
            <div className="flex-1">
              <p
                className="font-semibold"
                style={{ color: colors.textMainDark }}
              >
                {match.name}
              </p>
              <p
                className="text-sm"
                style={{ color: colors.textSubDark }}
              >
                {match.age} • {match.location}
              </p>
            </div>
            <div
              className="flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold"
              style={{
                backgroundColor: `${colors.primary}20`,
                color: colors.primary,
              }}
            >
              {match.compatibility}%
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
