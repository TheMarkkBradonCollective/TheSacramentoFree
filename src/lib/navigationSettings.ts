export type NavTravelMode = 'driving' | 'walking' | 'cycling';

export const NAV_TRAVEL_MODES: readonly NavTravelMode[] = ['driving', 'walking', 'cycling'] as const;

export const NAV_TRAVEL_MODE_LABELS: Record<NavTravelMode, string> = {
  driving: 'Driving',
  walking: 'Walking',
  cycling: 'Biking',
};

export const NAV_TRAVEL_MODE_HINTS: Record<NavTravelMode, string> = {
  driving: 'Follows traffic rules and one-way streets.',
  walking: 'Uses sidewalks and paths. One-way car streets do not apply.',
  cycling: 'Prefers bike-friendly streets and ignores car-only one-ways when bikes may use them.',
};

export interface NavigationSettings {
  travelMode: NavTravelMode;
  voiceEnabled: boolean;
  headingUp: boolean;
  followAppTheme: boolean;
  showLaneGuidance: boolean;
  speakOnRecenter: boolean;
}

export const DEFAULT_NAV_SETTINGS: NavigationSettings = {
  travelMode: 'driving',
  voiceEnabled: true,
  headingUp: true,
  followAppTheme: true,
  showLaneGuidance: true,
  speakOnRecenter: true,
};

export const NAV_SETTINGS_STORAGE_KEY = 'sbn_nav_settings';
const NAV_SETTINGS_EVENT = 'sbn-nav-settings-changed';

function isTravelMode(value: unknown): value is NavTravelMode {
  return value === 'driving' || value === 'walking' || value === 'cycling';
}

export function normalizeNavigationSettings(raw: unknown): NavigationSettings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    travelMode: isTravelMode(source.travelMode) ? source.travelMode : DEFAULT_NAV_SETTINGS.travelMode,
    voiceEnabled: typeof source.voiceEnabled === 'boolean' ? source.voiceEnabled : DEFAULT_NAV_SETTINGS.voiceEnabled,
    headingUp: typeof source.headingUp === 'boolean' ? source.headingUp : DEFAULT_NAV_SETTINGS.headingUp,
    followAppTheme:
      typeof source.followAppTheme === 'boolean' ? source.followAppTheme : DEFAULT_NAV_SETTINGS.followAppTheme,
    showLaneGuidance:
      typeof source.showLaneGuidance === 'boolean' ? source.showLaneGuidance : DEFAULT_NAV_SETTINGS.showLaneGuidance,
    speakOnRecenter:
      typeof source.speakOnRecenter === 'boolean' ? source.speakOnRecenter : DEFAULT_NAV_SETTINGS.speakOnRecenter,
  };
}

export function readNavigationSettings(): NavigationSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_NAV_SETTINGS };
  try {
    const stored = window.localStorage.getItem(NAV_SETTINGS_STORAGE_KEY);
    if (!stored) return { ...DEFAULT_NAV_SETTINGS };
    return normalizeNavigationSettings(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_NAV_SETTINGS };
  }
}

function emitSettings(next: NavigationSettings): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NavigationSettings>(NAV_SETTINGS_EVENT, { detail: next }));
}

export function writeNavigationSettings(patch: Partial<NavigationSettings>): NavigationSettings {
  const next = normalizeNavigationSettings({ ...readNavigationSettings(), ...patch });
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(NAV_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode / quota — still publish in-memory so this session updates.
    }
    emitSettings(next);
  }
  return next;
}

export function subscribeNavigationSettings(listener: (settings: NavigationSettings) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<NavigationSettings>).detail;
    listener(normalizeNavigationSettings(detail ?? readNavigationSettings()));
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== NAV_SETTINGS_STORAGE_KEY) return;
    listener(readNavigationSettings());
  };

  window.addEventListener(NAV_SETTINGS_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  listener(readNavigationSettings());

  return () => {
    window.removeEventListener(NAV_SETTINGS_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

export function travelModeVerb(mode: NavTravelMode): string {
  switch (mode) {
    case 'walking':
      return 'Walk';
    case 'cycling':
      return 'Bike';
    default:
      return 'Drive';
  }
}

export function travelModeGerund(mode: NavTravelMode): string {
  switch (mode) {
    case 'walking':
      return 'walking';
    case 'cycling':
      return 'biking';
    default:
      return 'driving';
  }
}
