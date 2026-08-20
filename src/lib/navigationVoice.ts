import type { NavigationStep } from './navigationRoute';
import { formatNavDistance, formatNavDuration } from './navigationRoute';

export type VoiceCueKind = 'start' | 'far' | 'medium' | 'near' | 'now' | 'step' | 'arrival' | 'reroute';

/** Distance thresholds for spoken turn cues (meters). */
export const VOICE_CUE_THRESHOLDS: Record<Exclude<VoiceCueKind, 'start' | 'step' | 'arrival' | 'reroute'>, number> = {
  far: 804,
  medium: 402,
  near: 152,
  now: 46,
};

function voiceDistancePhrase(meters: number): string {
  const feet = meters * 3.28084;
  if (feet < 200) return `${Math.max(50, Math.round(feet / 50) * 50)} feet`;
  const miles = meters / 1609.34;
  if (miles < 0.15) return 'a quarter mile';
  if (miles < 0.35) return 'half a mile';
  if (miles < 0.75) return `${miles.toFixed(1)} miles`;
  return `${Math.round(miles)} miles`;
}

export function buildStepVoiceCue(
  step: NavigationStep,
  distanceMeters: number,
  kind: VoiceCueKind,
  destinationLabel?: string,
): string {
  if (kind === 'arrival') {
    return destinationLabel
      ? `You have arrived at ${destinationLabel}`
      : 'You have arrived at your destination';
  }
  if (kind === 'reroute') return 'Recalculating route';
  if (kind === 'start' && destinationLabel) {
    return `Starting navigation to ${destinationLabel}`;
  }
  if (kind === 'step' || kind === 'now') return step.instruction;

  const prefix = `In ${voiceDistancePhrase(distanceMeters)}, `;
  const instruction = step.instruction.replace(/^Arrive at pickup$/i, 'arrive at your destination');
  return `${prefix}${instruction.charAt(0).toLowerCase()}${instruction.slice(1)}`;
}

export function buildRouteSummaryVoice(
  destinationLabel: string,
  distanceMeters: number,
  durationSeconds: number,
  travelVerb = 'Drive',
): string {
  return `${travelVerb} ${formatNavDistance(distanceMeters)} to ${destinationLabel}. About ${formatNavDuration(durationSeconds)}.`;
}

export function buildRecenterVoiceCue(
  step: NavigationStep | undefined,
  distanceMeters: number,
  destinationLabel: string,
): string {
  if (!step) return `Centered on you. Continue toward ${destinationLabel}.`;
  if (step.maneuverType === 'arrive') return `Centered on you. Approaching ${destinationLabel}.`;
  const instruction = step.instruction.replace(/^Arrive at pickup$/i, `arrive at ${destinationLabel}`);
  if (distanceMeters > 80) {
    return `Centered on you. In ${voiceDistancePhrase(distanceMeters)}, ${instruction.charAt(0).toLowerCase()}${instruction.slice(1)}`;
  }
  return `Centered on you. ${instruction}`;
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
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  cancel(): void {
    this.queue = [];
    this.processing = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.utterance = null;
    this.setSpeaking(false);
  }

  clearSpokenKeys(): void {
    this.spokenKeys.clear();
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

  private processQueue(): void {
    if (this.processing || !this.enabled || this.queue.length === 0) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const text = this.queue.shift();
    if (!text) return;

    this.processing = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.volume = 1;
    this.setSpeaking(true, text);

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang.startsWith('en') && /samantha|google us english|karen|daniel/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    const onDone = () => {
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
  }

  /** Prime voices on iOS/Safari (must run after a user gesture). */
  prime(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const silent = new SpeechSynthesisUtterance('');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    window.speechSynthesis.cancel();
  }
}
