import { useMemo } from 'react';

type Profile = {
  id: string;
  full_name: string | null;
  dob: string | null;
  city: string | null;
  country: string | null;
  one_liner?: string | null;
  profile_photo_url?: string | null;
};

type SwipeCardProps = {
  profile: Profile;
  onLike: () => void;
  onSuperLike: () => void;
  onPass: () => void;
  disabled?: boolean;
  isPremium?: boolean;
  currentIndex: number;
  totalCards: number;
};

function calcAge(dobIso: string | null) {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export default function SwipeCard({
  profile,
  onLike,
  onSuperLike,
  onPass,
  disabled = false,
  isPremium = false,
  currentIndex,
  totalCards,
}: SwipeCardProps) {
  const age = useMemo(() => calcAge(profile.dob), [profile.dob]);
  const location = useMemo(() => {
    const parts = [profile.city, profile.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  }, [profile.city, profile.country]);

  return (
    <div className="w-full">
      {/* Card Counter */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-slate-400 text-sm">
          {currentIndex + 1} / {totalCards}
        </span>
        {isPremium && (
          <span className="text-xs bg-amber-500/20 text-amber-200 px-3 py-1 rounded-full ring-1 ring-amber-500/30">
            Premium
          </span>
        )}
      </div>

      {/* Main Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 ring-1 ring-white/10 shadow-2xl overflow-hidden">
        {/* Photo Placeholder */}
        <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={profile.full_name || 'Profile'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-slate-700/50 ring-1 ring-white/10 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-slate-400 text-sm mt-4">Photo hidden until wali approval</p>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Name & Age Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-white text-3xl font-bold tracking-tight">
              {profile.full_name || 'Anonymous'}
              {age && <span className="text-white/80 font-normal">, {age}</span>}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-white/70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm">{location}</span>
            </div>
          </div>
        </div>

        {/* One-liner */}
        {profile.one_liner && (
          <div className="p-6 border-t border-white/5">
            <p className="text-slate-200 text-sm leading-relaxed italic">"{profile.one_liner}"</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {/* Pass */}
        <button
          onClick={onPass}
          disabled={disabled}
          className="group relative rounded-2xl p-4 bg-slate-900/50 ring-1 ring-slate-700 hover:ring-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Pass"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-rose-500/20 ring-1 ring-slate-700 group-hover:ring-rose-500/30 flex items-center justify-center transition">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-300">Pass</span>
          </div>
        </button>

        {/* Super Like */}
        <button
          onClick={onSuperLike}
          disabled={disabled || !isPremium}
          className="group relative rounded-2xl p-4 bg-slate-900/50 ring-1 ring-slate-700 hover:ring-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Super Like"
        >
          {!isPremium && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl backdrop-blur-sm">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-blue-500/20 ring-1 ring-slate-700 group-hover:ring-blue-500/30 flex items-center justify-center transition">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-300">Super</span>
          </div>
        </button>

        {/* Like */}
        <button
          onClick={onLike}
          disabled={disabled}
          className="group relative rounded-2xl p-4 bg-slate-900/50 ring-1 ring-slate-700 hover:ring-emerald-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Like"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 ring-1 ring-slate-700 group-hover:ring-emerald-500/30 flex items-center justify-center transition">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-300">Like</span>
          </div>
        </button>
      </div>
    </div>
  );
}
