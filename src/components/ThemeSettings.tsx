import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5" id="profile_theme_settings">
      <div>
        <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Appearance</h4>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Choose light or dark mode for the app on this device.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTheme('light')}
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
          onClick={() => setTheme('dark')}
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
    </section>
  );
}
