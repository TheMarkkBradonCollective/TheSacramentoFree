import { Bike, Car, Footprints } from 'lucide-react';
import {
  NAV_TRAVEL_MODE_LABELS,
  NAV_TRAVEL_MODES,
  type NavTravelMode,
} from '../lib/navigationSettings';

const MODE_ICONS: Record<NavTravelMode, typeof Car> = {
  driving: Car,
  walking: Footprints,
  cycling: Bike,
};

interface NavTravelModeSwitcherProps {
  value: NavTravelMode;
  onChange: (mode: NavTravelMode) => void;
  variant?: 'compact' | 'nav';
}

export default function NavTravelModeSwitcher({
  value,
  onChange,
  variant = 'compact',
}: NavTravelModeSwitcherProps) {
  const isNav = variant === 'nav';

  return (
    <div
      className={`grid grid-cols-3 gap-1 ${isNav ? '' : ''}`}
      role="radiogroup"
      aria-label="Travel mode"
    >
      {NAV_TRAVEL_MODES.map((mode) => {
        const Icon = MODE_ICONS[mode];
        const selected = value === mode;
        return (
          <button
            type="button"
            key={mode}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(mode)}
            className={`inline-flex items-center justify-center gap-1 rounded-lg font-bold transition-colors ${
              isNav
                ? `py-2 px-2 text-[11px] border ${
                    selected
                      ? 'bg-accent text-on-accent border-accent'
                      : 'bg-[var(--sbn-nav-surface)] text-[var(--sbn-nav-text)] border-[var(--sbn-nav-glass-border)]'
                  }`
                : `py-1.5 px-1.5 text-[9px] uppercase tracking-wide border ${
                    selected
                      ? 'bg-accent text-on-accent border-accent'
                      : 'bg-inset text-muted border-app'
                  }`
            }`}
          >
            <Icon className={isNav ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
            {NAV_TRAVEL_MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
