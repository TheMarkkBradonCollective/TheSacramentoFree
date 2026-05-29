import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Info, X, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already running as PWA
    const checkIsStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsStandalone(checkIsStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const detectiOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(detectiOS);

    // If already running standalone, don't show prompt
    if (checkIsStandalone) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      // Prevent browser from showing automatic banner
      e.preventDefault();
      // Store event
      setDeferredPrompt(e);
      // Show custom banner
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Also show standard iOS hint if on iOS Safari and not standalone
    if (detectiOS) {
      // Show iOS prompt after a small delay so they get settled
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show prompt
    deferredPrompt.prompt();
    
    // Wait for user outcome
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA installation outcome:', outcome);
    
    // Clear prompt state
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div 
      id="pwa_install_container" 
      className="p-4 bg-surface border border-[#FF4500]/50 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans text-app mx-4 mt-4 transition-all animate-fade-in"
    >
      <div className="flex items-start space-x-3.5 flex-1 min-w-0" id="pwa_text_info">
        <div className="p-2.5 bg-[#FF4500]/15 border border-[#FF4500]/30 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-accent" />
        </div>
        <div className="text-left min-w-0">
          <h4 className="text-xs font-black text-app uppercase tracking-wider flex items-center gap-1.5 leading-none">
            Download Mobile App
          </h4>
          <p className="text-[11px] text-muted mt-1.5 font-medium leading-relaxed">
            {isIOS 
              ? "Install Sacramento Buy Nothing in one tap! Tap the Share icon at the bottom of Safari, then select 'Add to Home Screen' to download."
              : "Get instant offline coordination, offline loading, and desktop sharing by downloading our official web application."
            }
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 w-full md:w-auto justify-end" id="pwa_action_triggers">
        {!isIOS && deferredPrompt && (
          <button
            id="pwa_btn_install"
            onClick={handleInstallClick}
            className="flex items-center space-x-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent text-xs font-bold rounded-xl shadow-md cursor-pointer shrink-0 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Install App</span>
          </button>
        )}
        {isIOS && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-muted text-[10px] font-bold rounded-lg shrink-0">
            <Share className="w-3.5 h-3.5 text-accent" />
            <span>Tap Share icon</span>
          </div>
        )}
        <button
          id="pwa_btn_dismiss"
          onClick={() => setShowPrompt(false)}
          className="p-1 px-1.5 hover:bg-zinc-805 text-muted hover:text-app rounded-lg transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
