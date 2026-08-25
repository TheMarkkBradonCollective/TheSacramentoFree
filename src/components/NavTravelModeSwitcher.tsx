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

  if (isNav) {
    return (
      <div className="sbn-nav-mode-switch" role="radiogroup" aria-label="Travel mode">
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
              className={`sbn-nav-mode-btn ${selected ? 'is-selected' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{NAV_TRAVEL_MODE_LABELS[mode]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="sbn-map-mode-row" role="radiogroup" aria-label="Travel mode">
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
            className={`sbn-map-mode ${selected ? 'is-selected' : ''}`}
            title={NAV_TRAVEL_MODE_LABELS[mode]}
            aria-label={NAV_TRAVEL_MODE_LABELS[mode]}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
