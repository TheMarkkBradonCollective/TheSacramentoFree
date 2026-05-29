import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 p-2 rounded-xl border border-app bg-surface text-app hover:bg-surface-hover transition-colors cursor-pointer ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      id="theme_toggle_btn"
    >
      {isDark ? <Sun className="w-4 h-4 text-[#FF4500]" /> : <Moon className="w-4 h-4 text-[#FF4500]" />}
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
