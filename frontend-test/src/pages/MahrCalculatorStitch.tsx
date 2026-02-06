import { useState } from 'react';
import { colors } from '../lib/designTokens';

type Madhab = 'hanafi' | 'maliki' | 'shafii' | 'hanbali';
type Currency = 'SAR' | 'USD' | 'AED' | 'GBP';

const MADHABS = [
  { value: 'hanafi', label: 'Hanafi', description: 'Most widely followed globally' },
  { value: 'maliki', label: 'Maliki', description: 'Predominant in North Africa' },
  { value: 'shafii', label: "Shafi'i", description: 'Common in Southeast Asia' },
  { value: 'hanbali', label: 'Hanbali', description: 'Followed in Arabian Peninsula' },
];

const CURRENCIES = [
  { value: 'SAR', label: 'Saudi Riyal', symbol: 'ر.س' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
];

export default function MahrCalculatorStitch() {
  const [madhab, setMadhab] = useState<Madhab>('hanafi');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [immediateAmount, setImmediateAmount] = useState(5000);
  const [deferredAmount, setDeferredAmount] = useState(10000);

  const totalMahr = immediateAmount + deferredAmount;
  const goldGrams = Math.round(totalMahr / 60); // Mock: $60/gram
  const silverGrams = Math.round(totalMahr / 0.8); // Mock: $0.80/gram

  return (
    <div
      className="w-full max-w-md mx-auto min-h-screen pb-20"
      style={{ backgroundColor: colors.backgroundDark }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b"
        style={{
          backgroundColor: `${colors.backgroundDark}cc`,
          backdropFilter: 'blur(12px)',
          borderColor: colors.borderDark,
        }}
      >
        <h1
          className="font-semibold"
          style={{ color: colors.textMainDark }}
        >
          Mahr Calculator
        </h1>
        <button>
          <span className="material-symbols-outlined">info</span>
        </button>
      </header>

      <main className="px-4 pt-6 space-y-6">
        {/* Madhab Selection */}
        <section className="space-y-3">
          <label
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: colors.textSubDark }}
          >
            Select Madhab
          </label>
          <div className="space-y-2">
            {MADHABS.map((m) => (
              <label
                key={m.value}
                className="flex items-center p-3 rounded-2xl cursor-pointer border transition-all"
                style={{
                  backgroundColor:
                    madhab === m.value ? `${colors.primary}0d` : colors.surfaceDark,
                  borderColor:
                    madhab === m.value ? colors.primary : colors.borderDark,
                }}
              >
                <input
                  type="radio"
                  name="madhab"
                  value={m.value}
                  checked={madhab === m.value}
                  onChange={(e) => setMadhab(e.target.value as Madhab)}
                  className="sr-only peer"
                />
                <div className="flex-1">
                  <p
                    className="font-medium text-sm"
                    style={{
                      color:
                        madhab === m.value
                          ? colors.primary
                          : colors.textMainDark,
                    }}
                  >
                    {m.label}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: colors.textSubDark }}
                  >
                    {m.description}
                  </p>
                </div>
                {madhab === m.value && (
                  <span
                    className="material-symbols-outlined"
                    style={{ color: colors.primary }}
                  >
                    check_circle
                  </span>
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Currency Selection */}
        <section className="space-y-3">
          <label
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: colors.textSubDark }}
          >
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="w-full px-4 py-3 rounded-2xl text-sm"
            style={{
              backgroundColor: colors.surfaceDark,
              border: `1px solid ${colors.borderDark}`,
              color: colors.textMainDark,
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} ({c.symbol})
              </option>
            ))}
          </select>
        </section>

        {/* Amounts */}
        <section className="space-y-6">
          <div className="space-y-2">
            <label
              className="text-sm font-semibold block"
              style={{ color: colors.textMainDark }}
            >
              Immediate Mahr: {currency} {immediateAmount}
            </label>
            <input
              type="range"
              min="0"
              max="50000"
              step="100"
              value={immediateAmount}
              onChange={(e) => setImmediateAmount(parseInt(e.target.value))}
              style={{ accentColor: colors.primary }}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-semibold block"
              style={{ color: colors.textMainDark }}
            >
              Deferred Mahr: {currency} {deferredAmount}
            </label>
            <input
              type="range"
              min="0"
              max="50000"
              step="100"
              value={deferredAmount}
              onChange={(e) => setDeferredAmount(parseInt(e.target.value))}
              style={{ accentColor: colors.primary }}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </section>

        {/* Results */}
        <section
          className="rounded-3xl p-6 border space-y-4"
          style={{
            backgroundColor: colors.surfaceDark,
            borderColor: colors.borderDark,
          }}
        >
          <h3
            className="font-semibold text-sm"
            style={{ color: colors.textMainDark }}
          >
            Mahr Summary
          </h3>

          <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: colors.borderDark }}>
            <p style={{ color: colors.textSubDark }}>Total Mahr:</p>
            <p className="font-bold" style={{ color: colors.primary }}>
              {currency} {totalMahr}
            </p>
          </div>

          <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: colors.borderDark }}>
            <p style={{ color: colors.textSubDark }}>Gold Equivalent:</p>
            <p style={{ color: colors.textMainDark }}>{goldGrams}g</p>
          </div>

          <div className="flex justify-between items-center py-3">
            <p style={{ color: colors.textSubDark }}>Silver Equivalent:</p>
            <p style={{ color: colors.textMainDark }}>{silverGrams}g</p>
          </div>
        </section>

        {/* Action Button */}
        <button
          className="w-full py-4 rounded-2xl font-semibold transition-all"
          style={{
            backgroundColor: colors.primary,
            color: colors.backgroundDark,
          }}
        >
          Save Mahr Details
        </button>
      </main>
    </div>
  );
}
