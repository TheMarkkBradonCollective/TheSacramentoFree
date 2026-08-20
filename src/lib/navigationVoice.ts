import type { LatLng } from './mapRoute';
import { spokenLaneGuidance, type NavLane } from './navLanes';
import {
  formatArrivalTime,
  getDisplayedNavGuidance,
  shouldFireVoiceCue,
  spokenNavDistance,
  spokenNavDuration,
  type DisplayedNavGuidance,
  type NavigationRouteResult,
} from './navigationRoute';
import type { NavTravelMode } from './navigationSettings';

export type VoiceCueKind = 'start' | 'far' | 'medium' | 'near' | 'now' | 'step' | 'arrival' | 'reroute';

/** Distance thresholds for spoken turn cues (meters). */
export const VOICE_CUE_THRESHOLDS: Record<Exclude<VoiceCueKind, 'start' | 'step' | 'arrival' | 'reroute'>, number> = {
  far: 804,
  medium: 402,
  near: 152,
  now: 46,
};

export function voiceCueThresholdsForMode(
  mode: NavTravelMode,
): Record<Exclude<VoiceCueKind, 'start' | 'step' | 'arrival' | 'reroute'>, number> {
  if (mode === 'walking') return { far: 250, medium: 120, near: 55, now: 22 };
  if (mode === 'cycling') return { far: 402, medium: 180, near: 80, now: 28 };
  return VOICE_CUE_THRESHOLDS;
}

export function distanceCueKeysForStep(
  stepIndex: number,
  stepDistanceMeters: number,
  distanceToManeuver: number,
  thresholds: ReturnType<typeof voiceCueThresholdsForMode>,
): string[] {
  const keys: string[] = [];
  for (const kind of ['far', 'medium', 'near', 'now'] as const) {
    if (shouldFireVoiceCue(stepDistanceMeters, distanceToManeuver, kind, thresholds)) {
      keys.push(`cue-${stepIndex}-${kind}`);
    }
  }
  return keys;
}

function clause(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/g, '');
  if (!trimmed) return null;
  return `${trimmed}.`;
}

function joinVoice(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .replace(/\s+,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRouteSummaryVoice(
  destinationLabel: string,
  distanceMeters: number,
  durationSeconds: number,
  travelVerb = 'Drive',
): string {
  return joinVoice([
    clause(`${travelVerb} ${spokenNavDistance(distanceMeters)} to ${destinationLabel}`),
    clause(`About ${spokenNavDuration(durationSeconds)}`),
    clause(`Arriving at ${formatArrivalTime(durationSeconds)}`),
  ]);
}

/** Speak the same instruction card the banner shows. */
export function buildDisplayedGuidanceVoice(options: {
  guidance: DisplayedNavGuidance;
  prefix?: string;
  includeDistance?: boolean;
}): string {
  const { guidance, prefix, includeDistance = true } = options;
  if (guidance.arrived) {
    return joinVoice([clause(prefix), "You've arrived.", clause(guidance.destinationLabel)]);
  }

  const instruction = guidance.instruction || guidance.street;
  const streetAlreadySpoken =
    Boolean(instruction && guidance.street) &&
    instruction!.toLowerCase().includes(guidance.street.toLowerCase());

  const distanceLead =
    includeDistance && guidance.distanceMeters > 0
      ? `In ${spokenNavDistance(guidance.distanceMeters)},`
      : null;

  const lanePhrase = spokenLaneGuidance(guidance.lanes, guidance.maneuverKind);

  return joinVoice([
    clause(prefix),
    distanceLead,
    clause(instruction),
    streetAlreadySpoken ? null : clause(guidance.street),
    guidance.nowOnRoad ? clause(`now on ${guidance.nowOnRoad}`) : null,
    clause(guidance.thenLine),
    lanePhrase ? (lanePhrase.endsWith('.') ? lanePhrase : `${lanePhrase}.`) : null,
  ]);
}

export function buildLiveGuidanceVoice(options: {
  route: NavigationRouteResult | null;
  stepIndex: number;
  arrived: boolean;
  destinationLabel: string;
  userPos: LatLng;
  travelMode: NavTravelMode;
  showLaneGuidance: boolean;
  osmLanes?: NavLane[] | null;
  prefix?: string;
  includeDistance?: boolean;
}): string {
  const guidance = getDisplayedNavGuidance(options);
  return buildDisplayedGuidanceVoice({
    guidance,
    prefix: options.prefix,
    includeDistance: options.includeDistance,
  });
}

export function buildStartBriefingVoice(options: {
  startMessage: string;
  destinationLabel: string;
  distanceMeters: number;
  durationSeconds: number;
  travelVerb: string;
  guidance: DisplayedNavGuidance;
}): string {
  return joinVoice([
    clause(options.startMessage),
    buildRouteSummaryVoice(
      options.destinationLabel,
      options.distanceMeters,
      options.durationSeconds,
      options.travelVerb,
    ),
    buildDisplayedGuidanceVoice({ guidance: options.guidance }),
  ]);
}

/** Android WebView drops TTS unless it is unlocked from a tap. Never cancel() after this. */
let navigationSpeechUnlocked = false;

export function unlockNavigationSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.resume();
  if (navigationSpeechUnlocked) return;
  const warmup = new SpeechSynthesisUtterance('.');
  warmup.volume = 0.01;
  warmup.rate = 2;
  warmup.lang = 'en-US';
  window.speechSynthesis.speak(warmup);
  navigationSpeechUnlocked = true;
}

export class NavigationVoice {
  private enabled = true;
  private spokenKeys = new Set<string>();
  private queue: string[] = [];
  private processing = false;
  private speaking = false;
  private currentPhrase = '';
  private utterance: SpeechSynthesisUtterance | null = null;
  private speakingListeners = new Set<(speaking: boolean, phrase: string) => void>();
  private keepAliveTimer: number | null = null;
  private voicesListener: (() => void) | null = null;

  subscribeSpeaking(listener: (speaking: boolean, phrase: string) => void): () => void {
    this.speakingListeners.add(listener);
    listener(this.speaking, this.currentPhrase);
    return () => {
      this.speakingListeners.delete(listener);
    };
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  getCurrentPhrase(): string {
    return this.currentPhrase;
  }

  private setSpeaking(next: boolean, phrase = ''): void {
    this.speaking = next;
    this.currentPhrase = phrase;
    for (const listener of this.speakingListeners) {
      try {
        listener(next, phrase);
      } catch (error) {
        console.warn('Navigation voice listener failed:', error);
      }
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.cancel();
    else this.unlock();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private startKeepAlive(): void {
    if (this.keepAliveTimer != null || typeof window === 'undefined') return;
    this.keepAliveTimer = window.setInterval(() => {
      if (!this.enabled || !window.speechSynthesis) return;
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 8000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer == null) return;
    window.clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = null;
  }

  cancel(): void {
    this.queue = [];
    this.processing = false;
    this.stopKeepAlive();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.utterance = null;
    this.setSpeaking(false);
  }

  clearSpokenKeys(): void {
    this.spokenKeys.clear();
  }

  markSpoken(keys: string[]): void {
    for (const key of keys) this.spokenKeys.add(key);
  }

  /**
   * Queue speech so each phrase finishes before the next begins.
   * The optional third argument is kept for callers but no longer interrupts.
   */
  speak(text: string, key?: string, _interrupt = false): void {
    void _interrupt;
    if (!this.enabled || !text.trim()) return;
    if (key) {
      if (this.spokenKeys.has(key)) return;
      this.spokenKeys.add(key);
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    this.queue.push(text.trim());
    this.processQueue();
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang.startsWith('en') && /samantha|google us english|karen|daniel/i.test(v.name)) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
      null
    );
  }

  private processQueue(): void {
    if (this.processing || !this.enabled || this.queue.length === 0) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const text = this.queue.shift();
    if (!text) return;

    this.processing = true;
    window.speechSynthesis.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.volume = 1;
    this.setSpeaking(true, text);

    const preferred = this.pickVoice();
    if (preferred) utterance.voice = preferred;

    let settled = false;
    const onDone = () => {
      if (settled) return;
      settled = true;
      this.processing = false;
      this.utterance = null;
      if (this.queue.length === 0) {
        this.setSpeaking(false);
      }
      this.processQueue();
    };

    utterance.onend = onDone;
    utterance.onerror = onDone;

    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);

    // Android WebView often swallows the first speak() unless we retry after resume.
    window.setTimeout(() => {
      if (settled || this.utterance !== utterance) return;
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    }, 280);
  }

  /**
   * Must run from a user gesture on Android WebView or speech is silently dropped.
   * Do not cancel() afterward — that kills the engine on Chrome/WebView.
   */
  unlock(): void {
    unlockNavigationSpeech();
    this.startKeepAlive();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!this.voicesListener) {
      this.voicesListener = () => this.pickVoice();
      window.speechSynthesis.addEventListener('voiceschanged', this.voicesListener);
    }
    this.processQueue();
  }

  /** Prime voices on iOS/Safari (must run after a user gesture). */
  prime(): void {
    this.unlock();
  }
}
