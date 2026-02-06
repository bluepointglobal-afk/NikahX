import { colors } from '../lib/designTokens';

export default function ProfileView() {
  return (
    <div
      className="w-full max-w-md mx-auto min-h-screen"
      style={{ backgroundColor: colors.backgroundDark }}
    >
      {/* Header */}
      <header
        className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-4"
        style={{
          backgroundColor: `${colors.backgroundDark}cc`,
          backdropFilter: 'blur(12px)',
          borderBottomColor: colors.borderDark,
          borderBottomWidth: '1px',
        }}
      >
        <h1
          className="font-display font-bold text-lg tracking-tight"
          style={{ color: colors.textMainDark }}
        >
          My Profile
        </h1>
        <div className="flex items-center gap-1">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{ color: colors.textSubDark }}
          >
            <span className="material-symbols-outlined text-[20px]">
              visibility
            </span>
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{ color: colors.textSubDark }}
          >
            <span className="material-symbols-outlined text-[20px]">
              settings
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full pt-20 px-4 flex flex-col gap-6 pb-20">
        {/* Profile Photo Section */}
        <section className="flex flex-col items-center relative py-4">
          <div className="relative group cursor-pointer mb-4">
            <div
              className="absolute -inset-2 rounded-full blur-xl opacity-60"
              style={{
                background: `linear-gradient(to bottom, ${colors.primary}4d, transparent)`,
              }}
            ></div>
            <div
              className="relative w-32 h-32 rounded-full p-1"
              style={{
                background: `linear-gradient(to bottom, ${colors.primary}7f, ${colors.surfaceDark})`,
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden border-2 relative flex items-center justify-center text-5xl"
                style={{
                  borderColor: colors.surfaceDark,
                  backgroundColor: colors.primary,
                }}
              >
                👨
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: `${colors.backgroundDark}4d` }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: colors.textMainDark }}
                  >
                    edit
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2
              className="text-2xl font-bold mb-1"
              style={{ color: colors.textMainDark }}
            >
              Ahmed Khan
            </h2>
            <p
              className="text-sm"
              style={{ color: colors.textSubDark }}
            >
              28, Muslim • New York, USA
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <span
                className="text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1"
                style={{
                  backgroundColor: `${colors.primary}1a`,
                  color: colors.primary,
                }}
              >
                <span className="material-symbols-outlined text-[14px]">
                  verified_user
                </span>
                Verified
              </span>
            </div>
          </div>
        </section>

        {/* Bio */}
        <section
          className="rounded-3xl p-6 border"
          style={{
            backgroundColor: colors.surfaceDark,
            borderColor: colors.borderDark,
          }}
        >
          <h3
            className="text-sm font-bold uppercase tracking-wider mb-3"
            style={{ color: colors.textSubDark }}
          >
            About Me
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: colors.textMainDark }}
          >
            Software engineer passionate about building meaningful connections. I value my faith, family, and
            personal growth. Looking for someone who shares similar values and dreams for the future.
          </p>
        </section>

        {/* Interests */}
        <section
          className="rounded-3xl p-6 border"
          style={{
            backgroundColor: colors.surfaceDark,
            borderColor: colors.borderDark,
          }}
        >
          <h3
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ color: colors.textSubDark }}
          >
            Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Reading',
              'Hiking',
              'Cooking',
              'Technology',
              'Travel',
              'Quran',
            ].map((interest) => (
              <span
                key={interest}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${colors.primary}1a`,
                  color: colors.primary,
                }}
              >
                {interest}
              </span>
            ))}
          </div>
        </section>

        {/* Edit Profile Button */}
        <button
          className="w-full py-4 rounded-2xl font-semibold transition-all duration-300"
          style={{
            backgroundColor: colors.primary,
            color: colors.backgroundDark,
          }}
        >
          Edit Profile
        </button>
      </main>
    </div>
  );
}
