import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type Madhab = 'hanafi' | 'maliki' | 'shafii' | 'hanbali';
type Currency = 'SAR' | 'AED' | 'USD' | 'EUR' | 'GBP' | 'PKR' | 'EGP';

const MADHABS: { value: Madhab; label: string; description: string }[] = [
  { value: 'hanafi', label: 'Hanafi', description: 'Most widely followed madhab globally' },
  { value: 'maliki', label: 'Maliki', description: 'Predominant in North Africa' },
  { value: 'shafii', label: "Shafi'i", description: 'Common in Southeast Asia and East Africa' },
  { value: 'hanbali', label: 'Hanbali', description: 'Followed in the Arabian Peninsula' },
];

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'SAR', label: 'Saudi Riyal', symbol: 'ر.س' },
  { value: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'PKR', label: 'Pakistani Rupee', symbol: '₨' },
  { value: 'EGP', label: 'Egyptian Pound', symbol: 'E£' },
];

export default function MahrCalculator() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [isPremium, setIsPremium] = useState(false);

  // Form data
  const [madhab, setMadhab] = useState<Madhab>('hanafi');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [immediateAmount, setImmediateAmount] = useState(5000);
  const [deferredAmount, setDeferredAmount] = useState(10000);

  // Regional data (mock)
  const [regionalAverage, setRegionalAverage] = useState<number>(0);
  const [goldEquivalent, setGoldEquivalent] = useState<number>(0);
  const [silverEquivalent, setSilverEquivalent] = useState<number>(0);

  // Check premium status
  useEffect(() => {
    const checkPremium = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      setIsPremium(data?.subscription_status === 'premium');
    };

    checkPremium();
  }, [user]);

  // Calculate equivalents when amounts change
  useEffect(() => {
    // Mock gold price: $60/gram
    const goldPricePerGram = 60;
    const totalMahr = immediateAmount + deferredAmount;
    setGoldEquivalent(Math.round(totalMahr / goldPricePerGram));

    // Mock silver price: $0.80/gram
    const silverPricePerGram = 0.8;
    setSilverEquivalent(Math.round(totalMahr / silverPricePerGram));

    // Mock regional average
    setRegionalAverage(12000);
  }, [immediateAmount, deferredAmount]);

  const nextStep = () => setStep(Math.min(6, step + 1));
  const prevStep = () => setStep(Math.max(1, step - 1));

  const handleSave = async () => {
    if (!isPremium) {
      alert('Saving is a premium feature. Upgrade to save your calculations!');
      navigate('/premium');
      return;
    }

    const { error } = await supabase.from('mahr_calculations').insert({
      user_id: user?.id,
      madhab,
      currency,
      immediate_amount: immediateAmount,
      deferred_amount: deferredAmount,
      total_amount: immediateAmount + deferredAmount,
    });

    if (error) {
      alert('Failed to save: ' + error.message);
    } else {
      alert('Calculation saved successfully!');
    }
  };

  const handleExportPDF = () => {
    if (!isPremium) {
      alert('PDF export is a premium feature. Upgrade to export your calculations!');
      navigate('/premium');
      return;
    }

    alert('PDF export feature coming soon!');
  };

  const currencySymbol = CURRENCIES.find((c) => c.value === currency)?.symbol || '$';
  const totalMahr = immediateAmount + deferredAmount;

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Mahr Calculator</h1>
            <p className="text-slate-400 text-sm mt-1">Calculate and track mahr negotiations</p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="rounded-2xl px-4 py-2 text-sm text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
          >
            Home
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Step {step} of 6</span>
            <span className="text-slate-400 text-sm">{Math.round((step / 6) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Madhab Selector */}
        {step === 1 && (
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-slate-700 p-8">
            <h2 className="text-white text-xl font-semibold mb-2">Select Your Madhab</h2>
            <p className="text-slate-400 text-sm mb-6">
              Different schools of thought have varying rulings on mahr minimums
            </p>

            <div className="space-y-3">
              {MADHABS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMadhab(m.value)}
                  className={`w-full rounded-2xl p-4 text-left transition ${
                    madhab === m.value
                      ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50'
                      : 'bg-slate-800/50 ring-1 ring-slate-700 hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{m.label}</h3>
                      <p className="text-slate-400 text-sm mt-1">{m.description}</p>
                    </div>
                    {madhab === m.value && (
                      <svg className="w-6 h-6 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={nextStep}
              className="w-full mt-6 rounded-2xl py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition font-semibold"
            >
              Next: Select Currency
            </button>
          </div>
        )}

        {/* Step 2: Currency Selector */}
        {step === 2 && (
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-slate-700 p-8">
            <h2 className="text-white text-xl font-semibold mb-2">Select Currency</h2>
            <p className="text-slate-400 text-sm mb-6">Choose the currency for your calculation</p>

            <div className="grid grid-cols-2 gap-3">
              {CURRENCIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCurrency(c.value)}
                  className={`rounded-2xl p-4 text-left transition ${
                    currency === c.value
                      ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50'
                      : 'bg-slate-800/50 ring-1 ring-slate-700 hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{c.symbol}</div>
                      <div className="text-slate-400 text-xs mt-1">{c.label}</div>
                    </div>
                    {currency === c.value && (
                      <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={prevStep}
                className="flex-1 rounded-2xl py-3 text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 rounded-2xl py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition font-semibold"
              >
                Next: Set Amounts
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Mahr Components */}
        {step === 3 && (
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-slate-700 p-8">
            <h2 className="text-white text-xl font-semibold mb-2">Mahr Components</h2>
            <p className="text-slate-400 text-sm mb-6">Set immediate and deferred amounts</p>

            {/* Immediate Mahr */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Immediate Mahr (Muqaddam)
              </label>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-slate-400 text-sm">{currencySymbol}</span>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="100"
                  value={immediateAmount}
                  onChange={(e) => setImmediateAmount(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-semibold w-24 text-right">
                  {immediateAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-slate-400 text-xs">Paid at the time of marriage</p>
            </div>

            {/* Deferred Mahr */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Deferred Mahr (Mu'akhkhar)
              </label>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-slate-400 text-sm">{currencySymbol}</span>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="100"
                  value={deferredAmount}
                  onChange={(e) => setDeferredAmount(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-semibold w-24 text-right">
                  {deferredAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-slate-400 text-xs">Paid upon divorce or death</p>
            </div>

            {/* Total */}
            <div className="rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-emerald-200 font-semibold">Total Mahr</span>
                <span className="text-emerald-200 text-2xl font-bold">
                  {currencySymbol} {totalMahr.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={prevStep}
                className="flex-1 rounded-2xl py-3 text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 rounded-2xl py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition font-semibold"
              >
                Next: Regional Data
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Regional Averages */}
        {step === 4 && (
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-slate-700 p-8">
            <h2 className="text-white text-xl font-semibold mb-2">Regional Averages</h2>
            <p className="text-slate-400 text-sm mb-6">Crowdsourced data from your region</p>

            <div className="space-y-4 mb-6">
              <div className="rounded-2xl bg-slate-800/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm">Average in your region</span>
                  <span className="text-white font-semibold">
                    {currencySymbol} {regionalAverage.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.min((regionalAverage / 50000) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-800/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm">Your calculation</span>
                  <span className="text-white font-semibold">
                    {currencySymbol} {totalMahr.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min((totalMahr / 50000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30 p-4 mb-6">
              <p className="text-blue-200 text-sm">
                💡 Your mahr is{' '}
                {totalMahr > regionalAverage ? 'above' : 'below'} the regional average by{' '}
                {Math.abs(((totalMahr - regionalAverage) / regionalAverage) * 100).toFixed(0)}%
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={prevStep}
                className="flex-1 rounded-2xl py-3 text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 rounded-2xl py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition font-semibold"
              >
                Next: Gold/Silver
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Gold/Silver Equivalency */}
        {step === 5 && (
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-slate-700 p-8">
            <h2 className="text-white text-xl font-semibold mb-2">Gold & Silver Equivalency</h2>
            <p className="text-slate-400 text-sm mb-6">
              Islamic scholars often reference mahr in terms of precious metals
            </p>

            <div className="space-y-4 mb-6">
              <div className="rounded-2xl bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 ring-1 ring-yellow-500/30 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-yellow-200 font-semibold text-lg">Gold Equivalent</h3>
                    <p className="text-yellow-100/70 text-sm">Based on current market rates</p>
                  </div>
                </div>
                <div className="text-yellow-200 text-3xl font-bold mt-4">
                  {goldEquivalent.toLocaleString()} grams
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-slate-500/20 to-slate-600/20 ring-1 ring-slate-400/30 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-slate-400/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-slate-200 font-semibold text-lg">Silver Equivalent</h3>
                    <p className="text-slate-300/70 text-sm">Based on current market rates</p>
                  </div>
                </div>
                <div className="text-slate-200 text-3xl font-bold mt-4">
                  {silverEquivalent.toLocaleString()} grams
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={prevStep}
                className="flex-1 rounded-2xl py-3 text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 rounded-2xl py-3 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition font-semibold"
              >
                Next: Save & Share
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Save & Share */}
        {step === 6 && (
          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-slate-700 p-8">
            <h2 className="text-white text-xl font-semibold mb-2">Summary</h2>
            <p className="text-slate-400 text-sm mb-6">Review and save your calculation</p>

            {/* Summary Card */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-900/30 to-emerald-950/30 ring-1 ring-emerald-500/30 p-6 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-300">Madhab</span>
                  <span className="text-white font-semibold">
                    {MADHABS.find((m) => m.value === madhab)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Currency</span>
                  <span className="text-white font-semibold">{currency}</span>
                </div>
                <div className="h-px bg-slate-700" />
                <div className="flex justify-between">
                  <span className="text-slate-300">Immediate Mahr</span>
                  <span className="text-white font-semibold">
                    {currencySymbol} {immediateAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Deferred Mahr</span>
                  <span className="text-white font-semibold">
                    {currencySymbol} {deferredAmount.toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-slate-700" />
                <div className="flex justify-between items-center">
                  <span className="text-emerald-200 font-semibold text-lg">Total Mahr</span>
                  <span className="text-emerald-200 font-bold text-2xl">
                    {currencySymbol} {totalMahr.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Premium Features Notice */}
            {!isPremium && (
              <div className="rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-amber-200 text-sm font-semibold">Premium Features Locked</p>
                    <p className="text-amber-100/70 text-xs mt-1">
                      Save calculations, export PDF, and share with family
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleSave}
                className={`w-full rounded-2xl py-3 transition font-semibold ${
                  isPremium
                    ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50'
                    : 'bg-slate-700/50 text-slate-400 ring-1 ring-slate-600 cursor-not-allowed'
                }`}
              >
                {isPremium ? '💾 Save Calculation' : '🔒 Save (Premium)'}
              </button>

              <button
                onClick={handleExportPDF}
                className={`w-full rounded-2xl py-3 transition font-semibold ${
                  isPremium
                    ? 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30 hover:ring-blue-500/50'
                    : 'bg-slate-700/50 text-slate-400 ring-1 ring-slate-600 cursor-not-allowed'
                }`}
              >
                {isPremium ? '📄 Export PDF' : '🔒 Export PDF (Premium)'}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full rounded-2xl py-3 text-slate-200 ring-1 ring-slate-700 hover:ring-slate-600 transition"
              >
                Start Over
              </button>
            </div>

            {!isPremium && (
              <button
                onClick={() => navigate('/premium')}
                className="w-full mt-4 rounded-2xl py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold hover:from-amber-600 hover:to-amber-700 transition"
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
