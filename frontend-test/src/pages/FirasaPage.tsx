import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type FirasaReport = {
  id: string;
  user_id: string;
  target_user_id: string;
  compatibility_score: number;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  character_analysis_you: Record<string, number>;
  character_analysis_match: Record<string, number>;
  created_at: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  profile_photo_url: string | null;
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

// Unused helper - kept for future use
// function getScoreGradient(score: number): string {
//   if (score >= 80) return 'from-emerald-500 to-emerald-600';
//   if (score >= 60) return 'from-blue-500 to-blue-600';
//   if (score >= 40) return 'from-amber-500 to-amber-600';
//   return 'from-rose-500 to-rose-600';
// }

export default function FirasaPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FirasaReport | null>(null);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
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

      // Get monthly usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('firasa_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      setMonthlyUsage(count || 0);
    };

    checkAccess();
  }, [user]);

  // Fetch or generate report
  useEffect(() => {
    const fetchReport = async () => {
      if (!userId || !user?.id) return;

      setLoading(true);
      setError(null);

      // Get target user info
      const { data: targetData } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url')
        .eq('id', userId)
        .single();

      setTargetUser(targetData);

      // Check if report already exists
      const { data: existingReport } = await supabase
        .from('firasa_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingReport) {
        setReport(existingReport as FirasaReport);
        setLoading(false);
      } else {
        setLoading(false);
        // Report doesn't exist - will need to generate
      }
    };

    fetchReport();
  }, [userId, user]);

  const handleGenerate = async () => {
    if (!userId || !user?.id) return;

    // Check access limits
    if (!isPremium && monthlyUsage >= 1) {
      setError('Free users get 1 report per month. Upgrade to Premium for 5 reports/month.');
      return;
    }

    if (isPremium && monthlyUsage >= 5) {
      setError('Premium users get 5 reports per month. Additional reports cost $4.99 each.');
      return;
    }

    setGenerating(true);
    setError(null);

    // Call backend to generate report (mock for now)
    const mockReport: FirasaReport = {
      id: crypto.randomUUID(),
      user_id: user.id,
      target_user_id: userId,
      compatibility_score: Math.floor(Math.random() * 30) + 70,
      strengths: [
        'Shared religious values and practices',
        'Compatible life goals and family vision',
        'Strong communication styles alignment',
        'Similar educational and professional backgrounds',
      ],
      concerns: [
        'Different madhab interpretations may require discussion',
        'Geographic distance needs practical planning',
      ],
      recommendation:
        'This is a highly compatible match with strong foundational alignment. The identified concerns are manageable with open communication and mutual respect. We recommend proceeding with family introductions.',
      character_analysis_you: {
        Religiosity: 85,
        Ambition: 75,
        Family: 90,
        Communication: 80,
        Flexibility: 70,
      },
      character_analysis_match: {
        Religiosity: 88,
        Ambition: 70,
        Family: 92,
        Communication: 75,
        Flexibility: 65,
      },
      created_at: new Date().toISOString(),
    };

    // Save to database
    const { error: saveError } = await supabase.from('firasa_reports').insert({
      user_id: user.id,
      target_user_id: userId,
      compatibility_score: mockReport.compatibility_score,
      strengths: mockReport.strengths,
      concerns: mockReport.concerns,
      recommendation: mockReport.recommendation,
      character_analysis_you: mockReport.character_analysis_you,
      character_analysis_match: mockReport.character_analysis_match,
    });

    if (saveError) {
      setError(saveError.message);
      setGenerating(false);
      return;
    }

    setReport(mockReport);
    setMonthlyUsage((prev) => prev + 1);
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading report...</p>
        </div>
      </div>
    );
  }

  // Generate Report View
  if (!report) {
    return (
      <div className="min-h-screen w-full px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="rounded-3xl bg-slate-900/50 ring-1 ring-slate-700 p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="text-white text-2xl font-bold mb-2">Firasa Compatibility Report</h1>
            <p className="text-slate-400 text-sm mb-6">
              AI-powered compatibility analysis with{' '}
              <span className="text-white font-semibold">{targetUser?.full_name || 'this user'}</span>
            </p>

            {error && (
              <div className="mb-6 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 p-4">
                <p className="text-rose-200 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6 rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/30 p-4">
              <h3 className="text-blue-200 font-semibold mb-2">What You'll Get</h3>
              <ul className="text-blue-100 text-sm text-left space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Compatibility score (0-100)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Character trait analysis (You vs Match)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Key strengths and potential concerns</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>AI recommendation</span>
                </li>
              </ul>
            </div>

            {/* Usage Info */}
            <div className="mb-6 rounded-2xl bg-slate-800/50 ring-1 ring-slate-700 p-4">
              <p className="text-slate-300 text-sm">
                {isPremium ? (
                  <>
                    You've used <span className="text-white font-semibold">{monthlyUsage} of 5</span> reports this
                    month
                  </>
                ) : (
                  <>
                    Free users: <span className="text-white font-semibold">{monthlyUsage} of 1</span> report used
                  </>
                )}
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-2xl py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold hover:from-emerald-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating Report...
                </span>
              ) : (
                '🔮 Generate Firasa Report'
              )}
            </button>

            {!isPremium && (
              <button
                onClick={() => navigate('/premium')}
                className="w-full mt-3 rounded-2xl py-3 bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30 hover:ring-amber-500/50 transition text-sm"
              >
                Upgrade to Premium for 5 reports/month
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Display Report View
  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Header with Score */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 ring-1 ring-white/10 p-8 text-center">
          <h1 className="text-white text-2xl font-bold mb-2">Firasa Compatibility Report</h1>
          <p className="text-slate-400 text-sm mb-6">
            Analysis with <span className="text-white">{targetUser?.full_name || 'User'}</span>
          </p>

          <div className="relative inline-flex items-center justify-center">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="none" className="text-slate-700" />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - report.compatibility_score / 100)}`}
                className={`${getScoreColor(report.compatibility_score)} transition-all duration-1000`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold ${getScoreColor(report.compatibility_score)}`}>
                {report.compatibility_score}
              </span>
              <span className="text-slate-400 text-sm mt-1">Compatibility</span>
            </div>
          </div>
        </div>

        {/* Character Analysis */}
        <div className="mb-6 rounded-2xl bg-slate-900/50 ring-1 ring-slate-700 p-6">
          <h2 className="text-white text-xl font-semibold mb-4">Character Analysis</h2>

          <div className="space-y-4">
            {Object.entries(report.character_analysis_you).map(([trait, yourScore]) => {
              const matchScore = report.character_analysis_match[trait] || 0;

              return (
                <div key={trait}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 text-sm font-medium">{trait}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-blue-400">You: {yourScore}</span>
                      <span className="text-emerald-400">Match: {matchScore}</span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${yourScore}%` }}
                    />
                    <div
                      className="absolute left-0 h-full bg-emerald-500/50 rounded-full transition-all duration-500"
                      style={{ width: `${matchScore}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths */}
        <div className="mb-6 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 p-6">
          <h2 className="text-emerald-200 text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Strengths
          </h2>
          <ul className="space-y-2">
            {report.strengths.map((strength, i) => (
              <li key={i} className="text-emerald-100 text-sm flex items-start gap-2">
                <span className="text-emerald-400 shrink-0">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Concerns */}
        {report.concerns.length > 0 && (
          <div className="mb-6 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 p-6">
            <h2 className="text-amber-200 text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Concerns to Discuss
            </h2>
            <ul className="space-y-2">
              {report.concerns.map((concern, i) => (
                <li key={i} className="text-amber-100 text-sm flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">•</span>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        <div className="mb-6 rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/30 p-6">
          <h2 className="text-blue-200 text-xl font-semibold mb-3">AI Recommendation</h2>
          <p className="text-blue-100 text-sm leading-relaxed">{report.recommendation}</p>
        </div>

        {/* Disclaimer */}
        <div className="rounded-2xl bg-slate-800/50 ring-1 ring-slate-700 p-6">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Important Disclaimer
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Firasa reports are AI-generated insights based on profile data and behavioral patterns. They are meant to
            supplement—not replace—personal judgment, family consultation, and istikhara. Marriage is a serious commitment
            that requires thorough investigation beyond algorithmic analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
