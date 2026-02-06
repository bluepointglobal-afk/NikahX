import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../lib/designTokens';

export default function ProfileEditor() {
  const navigate = useNavigate();
  const [bio, setBio] = useState(
    'Software engineer passionate about building meaningful connections...'
  );
  const [interests, setInterests] = useState(['Reading', 'Hiking', 'Cooking']);
  const [newInterest, setNewInterest] = useState('');

  const handleAddInterest = () => {
    if (newInterest.trim()) {
      setInterests([...interests, newInterest]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  return (
    <div
      className="w-full max-w-md mx-auto min-h-screen"
      style={{ backgroundColor: colors.backgroundDark }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b"
        style={{
          backgroundColor: `${colors.backgroundDark}95`,
          backdropFilter: 'blur(12px)',
          borderColor: colors.borderDark,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium transition-colors"
          style={{ color: colors.textSubDark }}
        >
          Cancel
        </button>
        <h2
          className="text-base font-semibold"
          style={{ color: colors.textMainDark }}
        >
          Edit Profile
        </h2>
        <button
          className="text-sm font-bold transition-colors"
          style={{ color: colors.primary }}
        >
          Save
        </button>
      </header>

      <main className="flex-1 pb-10 space-y-6 px-4 pt-6">
        {/* Profile Photos Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className="text-lg font-bold"
              style={{ color: colors.textMainDark }}
            >
              Profile Photos
            </h3>
            <span
              className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
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

          {/* Photo Privacy Toggle */}
          <div
            className="flex p-1 rounded-xl border"
            style={{
              backgroundColor: colors.backgroundDark,
              borderColor: colors.borderDark,
            }}
          >
            {['Public', 'Blurred', 'Private'].map((option) => (
              <label
                key={option}
                className="flex-1 cursor-pointer relative py-2.5 px-3"
              >
                <input className="peer sr-only" type="radio" name="privacy" />
                <div
                  className="flex items-center justify-center text-sm font-medium rounded transition-all"
                  style={{
                    backgroundColor: colors.surfaceDark,
                    color: colors.textMainDark,
                  }}
                >
                  {option}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Bio Section */}
        <div className="space-y-3">
          <label
            className="block text-sm font-semibold"
            style={{ color: colors.textMainDark }}
          >
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            className="w-full rounded-2xl px-4 py-3 text-sm resize-none"
            style={{
              backgroundColor: colors.surfaceDark,
              border: `1px solid ${colors.borderDark}`,
              color: colors.textMainDark,
              minHeight: '100px',
            }}
            placeholder="Tell us about yourself..."
          />
          <p
            className="text-xs text-right"
            style={{ color: colors.textSubDark }}
          >
            {bio.length}/500
          </p>
        </div>

        {/* Interests Section */}
        <div className="space-y-3">
          <label
            className="block text-sm font-semibold"
            style={{ color: colors.textMainDark }}
          >
            Interests
          </label>

          {/* Interest Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {interests.map((interest) => (
              <div
                key={interest}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${colors.primary}1a`,
                  color: colors.primary,
                }}
              >
                {interest}
                <button
                  onClick={() => handleRemoveInterest(interest)}
                  className="hover:opacity-70"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Add Interest */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="Add an interest..."
              className="flex-1 rounded-2xl px-4 py-3 text-sm"
              style={{
                backgroundColor: colors.surfaceDark,
                border: `1px solid ${colors.borderDark}`,
                color: colors.textMainDark,
              }}
            />
            <button
              onClick={handleAddInterest}
              className="px-4 py-3 rounded-2xl transition-all"
              style={{ backgroundColor: colors.primary, color: colors.backgroundDark }}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          className="w-full py-4 rounded-2xl font-semibold transition-all mt-8"
          style={{
            backgroundColor: colors.primary,
            color: colors.backgroundDark,
          }}
        >
          Save Changes
        </button>
      </main>
    </div>
  );
}
