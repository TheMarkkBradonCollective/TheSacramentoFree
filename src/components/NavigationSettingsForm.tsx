import { Bike, Car, Footprints, Volume2, Compass, Layers, Route, Moon } from 'lucide-react';
import {
  NAV_TRAVEL_MODE_HINTS,
  NAV_TRAVEL_MODE_LABELS,
  NAV_TRAVEL_MODES,
  type NavigationSettings,
  type NavTravelMode,
} from '../lib/navigationSettings';

const MODE_ICONS: Record<NavTravelMode, typeof Car> = {
  driving: Car,
  walking: Footprints,
  cycling: Bike,
};

interface NavigationSettingsFormProps {
  settings: NavigationSettings;
  onChange: (patch: Partial<NavigationSettings>) => void;
  variant?: 'account' | 'nav';
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
  icon: Icon,
  variant,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: typeof Volume2;
  variant: 'account' | 'nav';
}) {
  const labelClass = variant === 'nav' ? 'text-[var(--sbn-nav-text)]' : 'text-app';
  const mutedClass = variant === 'nav' ? 'text-[var(--sbn-nav-text-secondary)]' : 'text-muted';
  const borderClass = checked
    ? variant === 'nav'
      ? 'border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
      : 'border-accent/40 bg-accent/10'
    : variant === 'nav'
      ? 'border-[var(--sbn-nav-glass-border)] bg-[var(--sbn-nav-surface)]'
      : 'border-app bg-inset';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${borderClass}`}
    >
      <div className="flex items-start gap-2.5 min-w-0 text-left">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${checked ? 'text-accent' : mutedClass}`} />
        <div className="min-w-0">
          <p className={`text-xs font-bold ${labelClass}`}>{title}</p>
          <p className={`text-[10px] mt-0.5 leading-snug ${mutedClass}`}>{description}</p>
        </div>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : variant === 'nav' ? 'bg-[var(--sbn-nav-lane-inactive)]' : 'bg-zinc-600'
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

export default function NavigationSettingsForm({
  settings,
  onChange,
  variant = 'account',
}: NavigationSettingsFormProps) {
  const headingClass = variant === 'nav' ? 'text-[var(--sbn-nav-text-secondary)]' : 'text-muted';
  const labelClass = variant === 'nav' ? 'text-[var(--sbn-nav-text)]' : 'text-app';
  const mutedClass = variant === 'nav' ? 'text-[var(--sbn-nav-text-secondary)]' : 'text-muted';

  return (
    <div className="space-y-4">
      <div>
        <h5 className={`text-[10px] font-bold uppercase tracking-wider ${headingClass}`}>Travel mode</h5>
        <p className={`text-[10px] mt-1 leading-snug ${mutedClass}`}>
          Walking and biking use pedestrian and bike routing, so car one-ways do not trap you.
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {NAV_TRAVEL_MODES.map((mode) => {
            const Icon = MODE_ICONS[mode];
            const selected = settings.travelMode === mode;
            return (
              <button
                type="button"
                key={mode}
                onClick={() => onChange({ travelMode: mode })}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                  selected
                    ? 'bg-accent text-on-accent border-accent'
                    : variant === 'nav'
                      ? 'bg-[var(--sbn-nav-surface)] text-[var(--sbn-nav-text)] border-[var(--sbn-nav-glass-border)]'
                      : 'bg-inset text-muted border-app hover:bg-surface-hover hover:text-app'
                }`}
                aria-pressed={selected}
              >
                <Icon className="w-4 h-4" />
                {NAV_TRAVEL_MODE_LABELS[mode]}
              </button>
            );
          })}
        </div>
        <p className={`text-[10px] mt-2 leading-snug ${mutedClass}`}>{NAV_TRAVEL_MODE_HINTS[settings.travelMode]}</p>
      </div>

      <div className="space-y-2">
        <h5 className={`text-[10px] font-bold uppercase tracking-wider ${headingClass}`}>Guidance</h5>
        <ToggleRow
          id={variant === 'nav' ? 'nav_setting_voice' : 'profile_nav_voice'}
          title="Voice guidance"
          description="Speak upcoming turns, including when you recenter on yourself."
          checked={settings.voiceEnabled}
          onChange={(voiceEnabled) => onChange({ voiceEnabled })}
          icon={Volume2}
          variant={variant}
        />
        <ToggleRow
          id={variant === 'nav' ? 'nav_setting_recenter_voice' : 'profile_nav_recenter_voice'}
          title="Speak when centered"
          description="When you tap recenter, announce the next turn so follow-me mode has voice."
          checked={settings.speakOnRecenter}
          onChange={(speakOnRecenter) => onChange({ speakOnRecenter })}
          icon={Route}
          variant={variant}
        />
        <ToggleRow
          id={variant === 'nav' ? 'nav_setting_heading' : 'profile_nav_heading'}
          title="Heading-up map"
          description="Rotate the map to match your compass and GPS heading. Turn off for north-up."
          checked={settings.headingUp}
          onChange={(headingUp) => onChange({ headingUp })}
          icon={Compass}
          variant={variant}
        />
        <ToggleRow
          id={variant === 'nav' ? 'nav_setting_lanes' : 'profile_nav_lanes'}
          title="Lane guidance"
          description="Show the real number of travel lanes and highlight the lane to use. Driving only."
          checked={settings.showLaneGuidance}
          onChange={(showLaneGuidance) => onChange({ showLaneGuidance })}
          icon={Layers}
          variant={variant}
        />
        <ToggleRow
          id={variant === 'nav' ? 'nav_setting_theme' : 'profile_nav_theme'}
          title="Follow app theme"
          description="Navigation chrome and map tiles match light or dark mode from Account."
          checked={settings.followAppTheme}
          onChange={(followAppTheme) => onChange({ followAppTheme })}
          icon={Moon}
          variant={variant}
        />
      </div>
      <p className={`text-[10px] leading-snug ${labelClass} opacity-70`}>
        These preferences save on this device and apply the next time you start navigation.
      </p>
    </div>
  );
}
