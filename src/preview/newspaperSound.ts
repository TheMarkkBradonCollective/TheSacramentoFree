/**
 * The Sacramento Free — original newspaper sound engine.
 *
 * Every sound is synthesised at runtime with the Web Audio API: no recordings,
 * no sample files, no licensing questions, and nothing extra to download.
 * The palette is drawn from a newsroom — typewriter keys, a carriage bell,
 * paper movement, and the thud of a press.
 */

export type NewspaperSoundName =
  | 'key'
  | 'keySpace'
  | 'bell'
  | 'pageTurn'
  | 'press'
  | 'stamp'
  | 'notify'
  | 'notifyImportant'
  | 'message'
  | 'paperOpen'
  | 'paperClose'
  | 'ink';

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let masterVolume = 1;
let unlocked = false;

function supported(): boolean {
  return typeof window !== 'undefined' && typeof (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) === 'function';
}

function getCtx(): Ctx | null {
  if (!supported()) return null;
  if (ctx) return ctx;
  try {
    const Impl = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Impl();
    master = ctx.createGain();
    master.gain.value = masterVolume;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
  return ctx;
}

/** Browsers only allow audio after a gesture; call this from a real user event. */
export function unlockNewspaperAudio(): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  unlocked = true;
}

export function isNewspaperAudioUnlocked(): boolean {
  return unlocked;
}

export function setNewspaperMasterVolume(volume: number): void {
  masterVolume = Math.max(0, Math.min(1, volume));
  if (master && ctx) master.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.02);
}

/** One second of white noise, reused by every paper and mechanical sound. */
function getNoise(audio: Ctx): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === audio.sampleRate) return noiseBuffer;
  const frames = Math.floor(audio.sampleRate);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

interface NoiseOptions {
  start: number;
  duration: number;
  gain: number;
  type?: BiquadFilterType;
  frequency: number;
  endFrequency?: number;
  q?: number;
  attack?: number;
  destination: AudioNode;
}

function noiseBurst(audio: Ctx, options: NoiseOptions): void {
  const { start, duration, gain, frequency, endFrequency, q = 1, attack = 0.002, destination } = options;
  const source = audio.createBufferSource();
  source.buffer = getNoise(audio);
  source.loop = true;
  source.playbackRate.value = 0.85 + Math.random() * 0.3;

  const filter = audio.createBiquadFilter();
  filter.type = options.type ?? 'bandpass';
  filter.frequency.setValueAtTime(frequency, start);
  if (endFrequency != null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), start + duration);
  filter.Q.value = q;

  const amp = audio.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter).connect(amp).connect(destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

interface ToneOptions {
  start: number;
  duration: number;
  gain: number;
  frequency: number;
  endFrequency?: number;
  type?: OscillatorType;
  attack?: number;
  destination: AudioNode;
}

function tone(audio: Ctx, options: ToneOptions): void {
  const { start, duration, gain, frequency, endFrequency, type = 'sine', attack = 0.002, destination } = options;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (endFrequency != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);

  const amp = audio.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(amp).connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Struck-metal bell built from inharmonic partials, the way a real bell rings. */
function bellStrike(audio: Ctx, at: number, gain: number, base: number, decay: number, destination: AudioNode): void {
  const partials: Array<[number, number]> = [
    [1, 1],
    [2.02, 0.5],
    [3.01, 0.28],
    [4.35, 0.16],
    [5.93, 0.08],
  ];
  partials.forEach(([ratio, level], index) => {
    tone(audio, {
      start: at,
      duration: decay * (1 - index * 0.13),
      gain: gain * level,
      frequency: base * ratio,
      type: 'sine',
      attack: 0.001,
      destination,
    });
  });
  // The hammer hitting the dome.
  noiseBurst(audio, { start: at, duration: 0.03, gain: gain * 0.5, frequency: 4200, q: 1.2, destination });
}

function renderSound(audio: Ctx, name: NewspaperSoundName, at: number, out: AudioNode): void {
  switch (name) {
    case 'key': {
      // Typebar hitting paper: a wooden click plus a short paper slap.
      const jitter = 1 + (Math.random() - 0.5) * 0.22;
      noiseBurst(audio, { start: at, duration: 0.018, gain: 0.5, frequency: 2600 * jitter, q: 0.9, destination: out });
      noiseBurst(audio, { start: at + 0.004, duration: 0.045, gain: 0.2, frequency: 900 * jitter, q: 1.4, destination: out });
      tone(audio, { start: at, duration: 0.05, gain: 0.18, frequency: 190 * jitter, endFrequency: 90, type: 'triangle', destination: out });
      break;
    }
    case 'keySpace': {
      // Wider, softer bar.
      noiseBurst(audio, { start: at, duration: 0.03, gain: 0.42, frequency: 1500, q: 0.7, destination: out });
      tone(audio, { start: at, duration: 0.07, gain: 0.22, frequency: 140, endFrequency: 70, type: 'triangle', destination: out });
      break;
    }
    case 'bell': {
      bellStrike(audio, at, 0.3, 1180, 1.5, out);
      break;
    }
    case 'notify': {
      bellStrike(audio, at, 0.2, 1320, 1.0, out);
      break;
    }
    case 'notifyImportant': {
      // Full mechanical carriage return: bell, then the carriage travelling back.
      bellStrike(audio, at, 0.32, 1180, 1.6, out);
      noiseBurst(audio, { start: at + 0.1, duration: 0.22, gain: 0.16, frequency: 1800, endFrequency: 520, q: 0.8, destination: out });
      break;
    }
    case 'message': {
      // A single key, then a small sheet of paper shifting.
      renderSound(audio, 'key', at, out);
      noiseBurst(audio, { start: at + 0.07, duration: 0.16, gain: 0.12, frequency: 2400, endFrequency: 900, q: 0.6, attack: 0.03, destination: out });
      break;
    }
    case 'pageTurn': {
      // Broadsheet lifting, arcing over, and settling.
      noiseBurst(audio, { start: at, duration: 0.16, gain: 0.13, frequency: 700, endFrequency: 3200, q: 0.5, attack: 0.05, destination: out });
      noiseBurst(audio, { start: at + 0.12, duration: 0.26, gain: 0.16, frequency: 3400, endFrequency: 760, q: 0.45, attack: 0.04, destination: out });
      noiseBurst(audio, { start: at + 0.3, duration: 0.12, gain: 0.07, frequency: 1100, endFrequency: 380, q: 0.7, destination: out });
      break;
    }
    case 'paperOpen': {
      noiseBurst(audio, { start: at, duration: 0.2, gain: 0.1, frequency: 900, endFrequency: 2900, q: 0.5, attack: 0.05, destination: out });
      break;
    }
    case 'paperClose': {
      noiseBurst(audio, { start: at, duration: 0.18, gain: 0.1, frequency: 2700, endFrequency: 620, q: 0.5, attack: 0.03, destination: out });
      break;
    }
    case 'press': {
      // Press impression: plate down, ink roller, cylinder release.
      tone(audio, { start: at, duration: 0.16, gain: 0.34, frequency: 120, endFrequency: 48, type: 'sine', destination: out });
      noiseBurst(audio, { start: at, duration: 0.06, gain: 0.26, frequency: 1500, q: 0.8, destination: out });
      noiseBurst(audio, { start: at + 0.09, duration: 0.2, gain: 0.12, frequency: 620, endFrequency: 240, q: 0.6, attack: 0.03, destination: out });
      tone(audio, { start: at + 0.2, duration: 0.12, gain: 0.16, frequency: 96, endFrequency: 52, type: 'triangle', destination: out });
      bellStrike(audio, at + 0.26, 0.12, 1560, 0.7, out);
      break;
    }
    case 'stamp': {
      tone(audio, { start: at, duration: 0.11, gain: 0.3, frequency: 150, endFrequency: 55, type: 'sine', destination: out });
      noiseBurst(audio, { start: at, duration: 0.04, gain: 0.22, frequency: 1900, q: 0.9, destination: out });
      break;
    }
    case 'ink': {
      noiseBurst(audio, { start: at, duration: 0.12, gain: 0.05, frequency: 480, endFrequency: 190, q: 0.5, attack: 0.03, destination: out });
      break;
    }
  }
}

/**
 * Play one newspaper sound. `volume` scales it so mobile can stay quieter than
 * desktop without a second set of definitions.
 */
export function playNewspaperSound(name: NewspaperSoundName, volume = 1): void {
  const audio = getCtx();
  if (!audio || !master) return;
  if (audio.state === 'suspended') {
    // Nothing we can do until the next gesture — stay silent rather than queue up.
    void audio.resume();
    if (audio.state === 'suspended') return;
  }
  const level = Math.max(0, Math.min(1, volume));
  if (level <= 0) return;

  const bus = audio.createGain();
  bus.gain.value = level;
  bus.connect(master);
  try {
    renderSound(audio, name, audio.currentTime + 0.001, bus);
  } catch {
    /* a scheduling failure should never break the page */
  }
}

/* ─────────────────────────── Ringtone ─────────────────────────── */

let ringTimer: ReturnType<typeof setInterval> | null = null;

/** One phrase of the signature ring: CLICK — CLICK — CLICK — DING. */
function ringPhrase(volume: number): void {
  playNewspaperSound('key', volume);
  window.setTimeout(() => playNewspaperSound('key', volume), 190);
  window.setTimeout(() => playNewspaperSound('key', volume), 380);
  window.setTimeout(() => playNewspaperSound('notifyImportant', volume), 620);
}

/**
 * The Sacramento Free ringtone — a typewriter reaching the end of a line and
 * hitting the carriage-return bell, repeating until stopped.
 */
export function startNewspaperRing(volume = 0.9): void {
  stopNewspaperRing();
  unlockNewspaperAudio();
  ringPhrase(volume);
  ringTimer = setInterval(() => ringPhrase(volume), 2200);
}

export function stopNewspaperRing(): void {
  if (ringTimer != null) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
}
