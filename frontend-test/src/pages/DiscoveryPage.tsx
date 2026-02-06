import { useState } from 'react';
import { colors } from '../lib/designTokens';

export default function DiscoveryPage() {
  const [ageRange] = useState({ min: 22, max: 35 });
  const [maxDistance] = useState(50);
  const [dealbreaker, setDealbreaker] = useState(true);

  return (
    <div
      className="min-h-screen w-full max-w-md mx-auto pb-32"
      style={{ backgroundColor: colors.backgroundDark, color: colors.textMainDark }}
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
        <button className="p-2 -ml-2 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-base font-semibold tracking-wide">Refine Search</h1>
        <button
          className="text-sm font-medium transition-colors"
          style={{ color: colors.primary }}
        >
          Reset
        </button>
      </header>

      <main className="px-4 pt-6 space-y-8 max-w-md mx-auto w-full">
        {/* Age Range Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: colors.textSubDark }}
            >
              Basics
            </h2>
          </div>

          <div
            className="rounded-3xl p-5 border"
            style={{
              backgroundColor: colors.surfaceDark,
              borderColor: colors.borderDark,
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: colors.surfaceDark }}
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ color: colors.textSubDark }}
                    >
                      cake
                    </span>
                  </div>
                  <span
                    className="font-medium text-sm"
                    style={{ color: colors.textSubDark }}
                  >
                    Age Range
                  </span>
                </div>
                <p
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: colors.textMainDark }}
                >
                  {ageRange.min}{' '}
                  <span
                    style={{ color: colors.textSubDark }}
                    className="mx-1"
                  >
                    -
                  </span>{' '}
                  {ageRange.max}
                </p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none py-1 pl-2">
                <span
                  className="text-xs font-medium transition-colors"
                  style={{ color: colors.textSubDark }}
                >
                  Dealbreaker
                </span>
                <input
                  type="checkbox"
                  checked={dealbreaker}
                  onChange={(e) => setDealbreaker(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer"
                  style={{
                    accentColor: colors.primary,
                  }}
                />
              </label>
            </div>

            {/* Age Slider */}
            <div className="relative h-10 w-full select-none px-2">
              <div
                className="absolute top-1/2 left-0 right-0 h-1 mt-[-2px] rounded-full"
                style={{ backgroundColor: `${colors.borderDark}80` }}
              ></div>
              <div
                className="absolute top-1/2 h-1 mt-[-2px] rounded-full"
                style={{
                  backgroundColor: colors.primary,
                  left: `${(ageRange.min / 60) * 100}%`,
                  right: `${100 - (ageRange.max / 60) * 100}%`,
                  boxShadow: `0 0 20px ${colors.primary}40`,
                }}
              ></div>
            </div>

            <div className="flex justify-between mt-8">
              <span
                className="text-xs font-medium"
                style={{ color: colors.textSubDark }}
              >
                18
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: colors.textSubDark }}
              >
                60+
              </span>
            </div>
          </div>
        </section>

        {/* Distance Section */}
        <section className="space-y-3">
          <div
            className="rounded-3xl p-5 border overflow-hidden"
            style={{
              backgroundColor: colors.surfaceDark,
              borderColor: colors.borderDark,
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: colors.surfaceDark }}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ color: colors.textSubDark }}
                  >
                    location_on
                  </span>
                </div>
                <span
                  className="font-medium text-sm"
                  style={{ color: colors.textSubDark }}
                >
                  Max Distance
                </span>
              </div>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: `${colors.borderDark}40`,
                  borderColor: colors.borderDark,
                  color: colors.textMainDark,
                }}
              >
                {maxDistance} mi
              </span>
            </div>

            {/* Distance Slider */}
            <div className="relative h-6 w-full mb-2 select-none px-1">
              <div
                className="absolute top-1/2 left-0 right-0 h-1 mt-[-2px] rounded-full"
                style={{ backgroundColor: `${colors.borderDark}80` }}
              ></div>
              <div
                className="absolute top-1/2 left-0 h-1 mt-[-2px] rounded-full"
                style={{
                  backgroundColor: colors.primary,
                  right: `${100 - (maxDistance / 100) * 100}%`,
                  boxShadow: `0 0 20px ${colors.primary}40`,
                }}
              ></div>
            </div>

            {/* Map Placeholder */}
            <div
              className="relative w-full h-32 rounded-b-[20px] overflow-hidden mt-4"
              style={{ backgroundColor: colors.backgroundDark }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ opacity: 0.5 }}
              >
                <span className="material-symbols-outlined text-[40px]">map</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        input[type="checkbox"] {
          appearance: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
