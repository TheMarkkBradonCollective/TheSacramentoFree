import { registerPlugin } from '@capacitor/core';
import { isAndroidApp } from './nativePlatform';

interface NavigationTtsPlugin {
  speak(options: { text: string }): Promise<{ spoken?: boolean }>;
  stop(): Promise<void>;
  warmup(): Promise<{ available?: boolean }>;
}

const NavigationTts = registerPlugin<NavigationTtsPlugin>('NavigationTts');

let nativeReady: boolean | null = null;
let nativeProbe: Promise<boolean> | null = null;

export async function warmupNativeNavigationTts(): Promise<boolean> {
  if (!isAndroidApp()) {
    nativeReady = false;
    return false;
  }
  if (nativeReady === true) return true;
  if (nativeProbe) return nativeProbe;

  nativeProbe = (async () => {
    try {
      const result = await NavigationTts.warmup();
      nativeReady = result?.available !== false;
    } catch {
      nativeReady = false;
    }
    return nativeReady === true;
  })();

  const available = await nativeProbe;
  nativeProbe = null;
  return available;
}

export async function speakNativeNavigationTts(text: string): Promise<boolean> {
  if (!text.trim()) return true;
  if (!(await warmupNativeNavigationTts())) return false;
  try {
    const result = await NavigationTts.speak({ text: text.trim() });
    return result?.spoken !== false;
  } catch {
    return false;
  }
}

export async function stopNativeNavigationTts(): Promise<void> {
  if (!isAndroidApp()) return;
  try {
    await NavigationTts.stop();
  } catch {
    // Plugin may be missing on older APKs.
  }
}
