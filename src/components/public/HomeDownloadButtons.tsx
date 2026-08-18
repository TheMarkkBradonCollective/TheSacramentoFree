import { useCallback, useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import TrackedDownloadLink from '../TrackedDownloadLink';
import { useInstallVersions } from '../../hooks/useInstallVersions';
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
  const { latestApk, apkDownloadHref } = useInstallVersions();
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

  const apkUrl = apkDownloadHref;
  const pwaLabel = deferredPrompt ? 'Install app' : 'Add to Home Screen';

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Get the app</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {apkUrl ? (
          <TrackedDownloadLink
            href={apkUrl}
            download={latestApk?.fileName || 'sac-buy-nothing.apk'}
            className="sbn-btn sbn-btn-secondary inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {latestApk?.betaLabel ? `Download ${latestApk.betaLabel}` : 'Download APK'}
          </TrackedDownloadLink>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('download')}
            className="sbn-btn sbn-btn-secondary inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download APK
          </button>
        )}

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
