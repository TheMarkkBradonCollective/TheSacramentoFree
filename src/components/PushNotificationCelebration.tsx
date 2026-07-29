import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Sparkles, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { dismissPushCelebration, isPushCelebrationDismissed } from '../lib/pushCelebrationPrompt';
import { pauseAppUpdateWatcher } from '../pwa/appUpdateWatcher';
import { SITE } from '../siteContent';

const CONFETTI_COLORS = ['#FF4500', '#FFB347', '#FFD166', '#FF8C42', '#FFFFFF', '#FFECE6'];

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotate: number;
  drift: number;
};

function buildConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: 8 + Math.random() * 84,
    delay: Math.random() * 0.35,
    duration: 2.4 + Math.random() * 1.4,
    size: 6 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotate: Math.random() * 360,
    drift: -18 + Math.random() * 36,
  }));
}

function CelebrationLights() {
  return (
    <div className="push-celebration-lights" aria-hidden>
      <div className="push-celebration-lights__edge push-celebration-lights__edge--top" />
      <div className="push-celebration-lights__edge push-celebration-lights__edge--right" />
      <div className="push-celebration-lights__edge push-celebration-lights__edge--bottom" />
      <div className="push-celebration-lights__edge push-celebration-lights__edge--left" />
      <div className="push-celebration-lights__corner push-celebration-lights__corner--tl" />
      <div className="push-celebration-lights__corner push-celebration-lights__corner--tr" />
      <div className="push-celebration-lights__corner push-celebration-lights__corner--bl" />
      <div className="push-celebration-lights__corner push-celebration-lights__corner--br" />
    </div>
  );
}

function ConfettiLayer({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div className="push-celebration-confetti" aria-hidden>
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="push-celebration-confetti__piece"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.55,
            backgroundColor: piece.color,
          }}
          initial={{ opacity: 0, y: '42vh', rotate: piece.rotate, scale: 0.6 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: ['42vh', '18vh', '72vh'],
            x: [0, piece.drift * 0.4, piece.drift],
            rotate: [piece.rotate, piece.rotate + 180, piece.rotate + 360],
            scale: [0.6, 1, 0.85],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        />
      ))}
    </div>
  );
}

interface PushNotificationCelebrationProps {
  userId: string;
  onGoToProfile?: () => void;
}

export default function PushNotificationCelebration({
  userId,
  onGoToProfile,
}: PushNotificationCelebrationProps) {
  const { permission, isSubscribed, isLoading, enableNotifications } = usePushNotifications(userId, {
    syncPreferences: false,
  });
  const [open, setOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const confetti = useMemo(() => buildConfetti(56), [open]);

  useEffect(() => {
    if (permission === 'unsupported' || isSubscribed || isPushCelebrationDismissed()) return;

    const timer = window.setTimeout(() => {
      if (permission === 'unsupported' || isSubscribed || isPushCelebrationDismissed()) return;
      setOpen(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [permission, isSubscribed]);

  useEffect(() => {
    if (isSubscribed && open) {
      dismissPushCelebration();
      const timer = window.setTimeout(() => setOpen(false), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [isSubscribed, open]);

  const handleDismiss = useCallback(() => {
    dismissPushCelebration();
    setOpen(false);
  }, []);

  const handleTurnOn = useCallback(async () => {
    setEnabling(true);
    pauseAppUpdateWatcher(45_000);
    try {
      await enableNotifications();
      if (Notification.permission === 'granted') {
        dismissPushCelebration();
        setOpen(false);
        return;
      }
      if (Notification.permission === 'denied') {
        onGoToProfile?.();
      }
    } finally {
      setEnabling(false);
    }
  }, [enableNotifications, onGoToProfile]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <CelebrationLights />

          <motion.div
            className="fixed inset-0 z-[57] flex items-end sm:items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-hidden />
            <ConfettiLayer pieces={confetti} />

            <motion.div
              role="dialog"
              aria-labelledby="push_celebration_title"
              aria-describedby="push_celebration_desc"
              className="relative z-10 w-full max-w-md sbn-card-elevated border border-app overflow-hidden shadow-2xl"
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-accent via-[#FFB347] to-accent" />

              <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-2 rounded-full text-subtle hover:text-app hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="px-6 pt-8 pb-6 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-accent-soft border border-accent/25 flex items-center justify-center shadow-[0_0_32px_rgba(255,69,0,0.25)]">
                  <Bell className="w-8 h-8 text-accent" aria-hidden />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-soft text-accent text-[10px] font-black uppercase tracking-widest mb-3">
                  <Sparkles className="w-3 h-3" aria-hidden />
                  New
                </div>

                <h2
                  id="push_celebration_title"
                  className="font-display text-xl sm:text-2xl font-extrabold text-app leading-tight"
                >
                  {SITE.name} has push notifications!
                </h2>
                <p id="push_celebration_desc" className="mt-3 text-sm text-muted leading-relaxed">
                  Get alerts for messages, claims, nearby free items, and community updates — right on this device.
                </p>
                <p className="mt-2 text-sm font-semibold text-app">Turn them on?</p>

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="order-2 sm:order-1 flex-1 px-4 py-3 rounded-full border border-app text-sm font-bold text-muted hover:text-app hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    Maybe later
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTurnOn()}
                    disabled={enabling || isLoading || permission === 'denied'}
                    className="order-1 sm:order-2 flex-1 px-4 py-3 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-black uppercase tracking-wide shadow-lg transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {enabling || isLoading ? 'Turning on…' : 'Turn them on'}
                  </button>
                </div>

                {permission === 'denied' && (
                  <p className="mt-3 text-[11px] text-muted">
                    Notifications are blocked in your browser settings. Open the bell → Alerts tab to try again.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
