import type { GoGetRingPattern, UserProfile } from '../types';
import { isNewspaperSkinActive } from '../preview/NewspaperSkinContext';
import { playNewspaperSound, unlockNewspaperAudio } from '../preview/newspaperSound';

export const MIN_GO_GET_RING_DURATION = 10;
export const MAX_GO_GET_RING_DURATION = 140;
export const DEFAULT_GO_GET_RING_DURATION = 140;

export const GO_GET_RING_PATTERN_LABELS: Record<GoGetRingPattern, string> = {
  single_beep: 'Single beep',
  double_beep: 'Double beep',
  triple_beep: 'Triple beep',
  ring: 'Ring',
  vibrate: 'Ring + vibrate',
  vibrate_only: 'Vibrate only',
};

export function normalizeGoGetRingPattern(value: unknown): GoGetRingPattern {
  const allowed: GoGetRingPattern[] = [
    'single_beep',
    'double_beep',
    'triple_beep',
    'ring',
    'vibrate',
    'vibrate_only',
  ];
  return allowed.includes(value as GoGetRingPattern) ? (value as GoGetRingPattern) : 'ring';
}

export function normalizeGoGetRingDuration(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_GO_GET_RING_DURATION;
  return Math.max(MIN_GO_GET_RING_DURATION, Math.min(MAX_GO_GET_RING_DURATION, Math.round(n)));
}

export function getGoGetRingDuration(profile: Pick<UserProfile, 'goGetRingDurationSeconds'> | null | undefined): number {
  return normalizeGoGetRingDuration(profile?.goGetRingDurationSeconds);
}

export function getGoGetRingPattern(profile: Pick<UserProfile, 'goGetRingPattern'> | null | undefined): GoGetRingPattern {
  return normalizeGoGetRingPattern(profile?.goGetRingPattern);
}

type RingController = {
  stop: () => void;
};

let activeController: RingController | null = null;

function beepOnce(audioCtx: AudioContext, startMs: number, freq = 880, durationMs = 180): void {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const t0 = audioCtx.currentTime + startMs / 1000;
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000);
}

function vibratePattern(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

/**
 * Plays the neighbor's chosen alert for an incoming Go Get ring.
 * Returns a stop handle — call when they respond or the ring window ends.
 */
export function startGoGetRingAlert(
  pattern: GoGetRingPattern,
  durationSeconds: number,
): RingController {
  if (activeController) activeController.stop();

  let stopped = false;
  let audioCtx: AudioContext | null = null;
  let intervalId: number | null = null;
  let timeoutId: number | null = null;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (intervalId != null) window.clearInterval(intervalId);
    if (timeoutId != null) window.clearTimeout(timeoutId);
    if (audioCtx) {
      try {
        audioCtx.close();
      } catch {
        // ignore
      }
    }
    if (activeController?.stop === stop) activeController = null;
  };

  const playBurst = () => {
    if (stopped) return;
    const useAudio = pattern !== 'vibrate_only';
    const useVibrate = pattern === 'vibrate' || pattern === 'vibrate_only';

    if (useVibrate) {
      vibratePattern([200, 120, 200, 120, 400]);
    }

    if (!useAudio) return;

    // Under the newspaper skin the ring becomes the paper's own signature:
    // a typewriter running out of line, then the carriage-return bell.
    if (isNewspaperSkinActive()) {
      unlockNewspaperAudio();
      const strikes = pattern === 'single_beep' ? 1 : pattern === 'double_beep' ? 2 : 3;
      for (let i = 0; i < strikes; i += 1) {
        window.setTimeout(() => {
          if (!stopped) playNewspaperSound('key', 0.95);
        }, i * 190);
      }
      window.setTimeout(() => {
        if (!stopped) playNewspaperSound('notifyImportant', 0.95);
      }, strikes * 190 + 60);
      return;
    }

    try {
      audioCtx = audioCtx ?? new AudioContext();
      const beepCount =
        pattern === 'single_beep' ? 1 : pattern === 'double_beep' ? 2 : pattern === 'triple_beep' ? 3 : 1;
      if (pattern === 'ring') {
        beepOnce(audioCtx, 0, 740, 420);
        beepOnce(audioCtx, 480, 880, 420);
      } else {
        for (let i = 0; i < beepCount; i++) {
          beepOnce(audioCtx, i * 280, 880, 160);
        }
      }
    } catch {
      // Web audio unavailable
    }
  };

  playBurst();
  intervalId = window.setInterval(playBurst, 2800);
  timeoutId = window.setTimeout(stop, durationSeconds * 1000);

  activeController = { stop };
  return { stop };
}

export function stopGoGetRingAlert(): void {
  activeController?.stop();
}
