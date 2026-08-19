import { useCallback, useEffect, useState } from 'react';
import { Smartphone, Store } from 'lucide-react';
import { detectInstallKind } from '../../lib/installContext';
import { isNativeApp } from '../../lib/nativePlatform';
import type { PublicRoute } from '../../public/routes';
import { SITE } from '../../siteContent';

interface HomeDownloadButtonsProps {
  onNavigate: (route: PublicRoute) => void;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function HomeDownloadButtons({ onNavigate }: HomeDownloadButtonsProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const installKind = typeof window !== 'undefined' ? detectInstallKind() : 'browser';
  const isStandalone = installKind === 'pwa' || installKind === 'ios-pwa';

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handlePwaInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    onNavigate('download');
  }, [deferredPrompt, onNavigate]);

  if (isNativeApp()) return null;

  const pwaLabel = deferredPrompt ? 'Install app' : 'Add to Home Screen';

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Get the app</p>
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <a
          href={SITE.playStoreBetaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sbn-btn sbn-btn-primary inline-flex items-center justify-center gap-2"
        >
          <Store className="w-4 h-4" />
          Get it from Play Store
        </a>

        {!isStandalone ? (
          <button
            type="button"
            onClick={() => void handlePwaInstall()}
            className="sbn-btn sbn-btn-secondary inline-flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            {pwaLabel}
          </button>
        ) : null}
      </div>
      <p className="text-xs text-subtle leading-relaxed">{SITE.downloadHelper}</p>
    </div>
  );
}
