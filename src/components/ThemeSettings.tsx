import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import type { UserProfile } from '../types';
import { persistUserAppPreferences } from '../lib/appPreferences';

interface ThemeSettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function ThemeSettings({ userProfile, onUpdateProfile }: ThemeSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const chooseTheme = (next: 'light' | 'dark') => {
    setTheme(next);
    setSaving(true);
    setErrorMessage('');
    void persistUserAppPreferences(userProfile, { theme: next }).then((result) => {
      setSaving(false);
      if (result.ok && result.profile) {
        onUpdateProfile(result.profile);
        return;
      }
      setErrorMessage(result.errorMessage || 'Theme could not be saved to your account.');
    });
  };

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5" id="profile_theme_settings">
      <div>
        <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Appearance</h4>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Light or dark mode — saved to your account so it follows you across devices.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => chooseTheme('light')}
          disabled={saving}
          className={`inline-flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-accent text-on-accent border-accent'
              : 'bg-inset text-muted border-app hover:bg-surface-hover hover:text-app'
          }`}
          id="profile_theme_light_btn"
        >
          <Sun className="w-4 h-4" />
          Light
        </button>
        <button
          type="button"
          onClick={() => chooseTheme('dark')}
          disabled={saving}
          className={`inline-flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            theme === 'dark'
              ? 'bg-accent text-on-accent border-accent'
              : 'bg-inset text-muted border-app hover:bg-surface-hover hover:text-app'
          }`}
          id="profile_theme_dark_btn"
        >
          <Moon className="w-4 h-4" />
          Dark
        </button>
      </div>
      {errorMessage ? (
        <p className="text-xs text-red-600 font-semibold">{errorMessage}</p>
      ) : null}
    </section>
  );
}
