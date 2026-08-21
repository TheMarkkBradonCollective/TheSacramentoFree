import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  playNewspaperSound,
  setNewspaperMasterVolume,
  unlockNewspaperAudio,
  type NewspaperSoundName,
} from './newspaperSound';

const STORAGE_KEY = 'sbn_newspaper_experience_v1';

export interface NewspaperExperiencePrefs {
  /** Paper movement when navigating between sections. */
  pageSounds: boolean;
  /** Per-keystroke typewriter keys in text fields. */
  typewriterSounds: boolean;
  /** Bells for notifications and messages. */
  notificationSounds: boolean;
  /** Page-turn animation, ink washes, press effects. */
  immersiveMode: boolean;
  /**
   * `null` follows the operating system. Once the reader touches the switch
   * their choice wins, so someone whose OS reduces motion can still opt into
   * the paper — and the switch never looks broken.
   */
  reducedMotion: boolean | null;
}

interface NewspaperExperienceValue {
  prefs: NewspaperExperiencePrefs;
  setPref: <K extends keyof NewspaperExperiencePrefs>(key: K, value: NewspaperExperiencePrefs[K]) => void;
  /** True when motion should be suppressed (OS preference or user override). */
  motionReduced: boolean;
  /** Coarse pointer / small screen — mobile stays deliberately quieter. */
  compact: boolean;
  play: (name: NewspaperSoundName, channel?: SoundChannel) => void;
}

type SoundChannel = 'page' | 'typing' | 'notification' | 'interface';

function isCompactDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function defaultNewspaperPrefs(compact = isCompactDevice()): NewspaperExperiencePrefs {
  return {
    // Only ever triggered by a deliberate navigation, and quieter on phones.
    pageSounds: !compact,
    // Never on by default — nobody expects their keyboard to make noise.
    typewriterSounds: false,
    notificationSounds: true,
    immersiveMode: !compact,
    reducedMotion: null,
  };
}

function readPrefs(): NewspaperExperiencePrefs {
  const fallback = defaultNewspaperPrefs();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<NewspaperExperiencePrefs>;
    return {
      pageSounds: typeof parsed.pageSounds === 'boolean' ? parsed.pageSounds : fallback.pageSounds,
      typewriterSounds:
        typeof parsed.typewriterSounds === 'boolean' ? parsed.typewriterSounds : fallback.typewriterSounds,
      notificationSounds:
        typeof parsed.notificationSounds === 'boolean' ? parsed.notificationSounds : fallback.notificationSounds,
      immersiveMode: typeof parsed.immersiveMode === 'boolean' ? parsed.immersiveMode : fallback.immersiveMode,
      reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : null,
    };
  } catch {
    return fallback;
  }
}

const NewspaperExperienceContext = createContext<NewspaperExperienceValue | null>(null);

const FALLBACK: NewspaperExperienceValue = {
  prefs: {
    pageSounds: false,
    typewriterSounds: false,
    notificationSounds: false,
    immersiveMode: false,
    reducedMotion: true,
  },
  setPref: () => {},
  motionReduced: true,
  compact: false,
  play: () => {},
};

export function NewspaperExperienceProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<NewspaperExperiencePrefs>(readPrefs);
  const [systemReducedMotion, setSystemReducedMotion] = useState(prefersReducedMotion);
  const [compact, setCompact] = useState(isCompactDevice);
  const gestureSeen = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* private mode — preferences just stay session-only */
    }
  }, [prefs]);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compactQuery = window.matchMedia('(max-width: 900px), (pointer: coarse)');
    const onMotion = () => setSystemReducedMotion(motionQuery.matches);
    const onCompact = () => setCompact(compactQuery.matches);
    motionQuery.addEventListener('change', onMotion);
    compactQuery.addEventListener('change', onCompact);
    return () => {
      motionQuery.removeEventListener('change', onMotion);
      compactQuery.removeEventListener('change', onCompact);
    };
  }, []);

  const motionReduced = prefs.reducedMotion ?? systemReducedMotion;

  // Autoplay policy: the audio context can only start inside a real gesture.
  useEffect(() => {
    const anySound = prefs.pageSounds || prefs.typewriterSounds || prefs.notificationSounds;
    if (!anySound || gestureSeen.current) return;
    const unlock = () => {
      gestureSeen.current = true;
      unlockNewspaperAudio();
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [prefs.pageSounds, prefs.typewriterSounds, prefs.notificationSounds]);

  useEffect(() => {
    setNewspaperMasterVolume(compact ? 0.55 : 0.8);
  }, [compact]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('tsf-immersive', prefs.immersiveMode && !motionReduced);
    root.classList.toggle('tsf-calm-motion', motionReduced);
    return () => {
      root.classList.remove('tsf-immersive', 'tsf-calm-motion');
    };
  }, [prefs.immersiveMode, motionReduced]);

  const play = useCallback(
    (name: NewspaperSoundName, channel: SoundChannel = 'interface') => {
      const allowed =
        channel === 'page'
          ? prefs.pageSounds
          : channel === 'typing'
            ? prefs.typewriterSounds
            : channel === 'notification'
              ? prefs.notificationSounds
              : prefs.pageSounds || prefs.notificationSounds;
      if (!allowed) return;
      playNewspaperSound(name, compact ? 0.6 : 1);
    },
    [prefs.pageSounds, prefs.typewriterSounds, prefs.notificationSounds, compact],
  );

  const setPref = useCallback<NewspaperExperienceValue['setPref']>((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    // Toggling a sound on is itself a gesture, so it is safe to confirm audibly.
    if (value === true && key !== 'reducedMotion' && key !== 'immersiveMode') {
      unlockNewspaperAudio();
      playNewspaperSound(key === 'typewriterSounds' ? 'key' : key === 'pageSounds' ? 'pageTurn' : 'notify', 0.8);
    }
  }, []);

  const value = useMemo<NewspaperExperienceValue>(
    () => ({ prefs, setPref, motionReduced, compact, play }),
    [prefs, setPref, motionReduced, compact, play],
  );

  return <NewspaperExperienceContext.Provider value={value}>{children}</NewspaperExperienceContext.Provider>;
}

export function useNewspaperExperience(): NewspaperExperienceValue {
  return useContext(NewspaperExperienceContext) ?? FALLBACK;
}
