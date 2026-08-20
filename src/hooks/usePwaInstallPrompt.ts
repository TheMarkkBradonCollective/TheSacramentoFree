import { useCallback, useEffect, useState } from 'react';

/**
 * Single shared source of truth for the native `beforeinstallprompt` /
 * `appinstalled` browser events. Previously App.tsx and UserProfileView.tsx
 * each registered their own listeners and kept separate `deferredPrompt`
 * state — this hook consolidates that into one place so install state stays
 * consistent everywhere it's surfaced (floating banner, profile section).
 */
export interface PwaInstallPromptState {
  /** True once the browser has fired `beforeinstallprompt` and it's still usable. */
  canPromptInstall: boolean;
  /** True on iOS Safari/WebKit, where there's no native install prompt event. */
  isIOS: boolean;
  /** True if the app is already running standalone (installed) or just got installed. */
  isInstalled: boolean;
  /** Shows the native install prompt. Resolves with the user's choice, or 'unavailable'. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function usePwaInstallPrompt(): PwaInstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  return {
    canPromptInstall: !!deferredPrompt,
    isIOS,
    isInstalled,
    promptInstall,
  };
}
