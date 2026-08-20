import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Loader2, Phone, X } from 'lucide-react';
import type { GoGetSession, ItemPost, UserProfile } from '../../types';
import {
  expireGoGetRing,
  isGoGetRingActive,
  respondAvailableNow,
  proposeAvailabilityWindow,
} from '../../lib/goGetSessions';
import { getGoGetRingDuration, getGoGetRingPattern, startGoGetRingAlert, stopGoGetRingAlert } from '../../lib/goGetRing';
import GoGetAvailabilityPrompt from './GoGetAvailabilityPrompt';
import { staffGetListingById } from '../../supabase';

interface GoGetIncomingRingOverlayProps {
  session: GoGetSession;
  userProfile: UserProfile;
  onClose: () => void;
  onSessionResolved: (session: GoGetSession) => void;
}

export default function GoGetIncomingRingOverlay({
  session,
  userProfile,
  onClose,
  onSessionResolved,
}: GoGetIncomingRingOverlayProps) {
  const [item, setItem] = useState<ItemPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const ringStoppedRef = useRef(false);

  useEffect(() => {
    void staffGetListingById(session.itemId).then(setItem);
  }, [session.itemId]);

  useEffect(() => {
    const pattern = getGoGetRingPattern(userProfile);
    const duration = session.ringDurationSeconds ?? getGoGetRingDuration(userProfile);
    const controller = startGoGetRingAlert(pattern, duration);
    return () => controller.stop();
  }, [session.id, userProfile.goGetRingPattern, session.ringDurationSeconds, userProfile.goGetRingDurationSeconds]);

  useEffect(() => {
    const tick = () => {
      if (!session.ringExpiresAt) {
        setRemaining(session.ringDurationSeconds ?? 140);
        return;
      }
      const ms = new Date(session.ringExpiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0 && !ringStoppedRef.current) {
        ringStoppedRef.current = true;
        stopGoGetRingAlert();
        void expireGoGetRing(session).then((r) => {
          if (r.ok) onClose();
        });
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [session, onClose]);

  const run = async (fn: () => Promise<{ ok: boolean; session?: GoGetSession; errorMessage?: string }>) => {
    setBusy(true);
    stopGoGetRingAlert();
    const result = await fn();
    setBusy(false);
    if (result.ok && result.session) {
      onSessionResolved(result.session);
      onClose();
    }
  };

  if (!item) {
    return createPortal(
      <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>,
      document.body,
    );
  }

  const active = isGoGetRingActive(session);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/80 flex flex-col items-center justify-end sm:justify-center p-4 pb-8"
      role="dialog"
      aria-modal="true"
      id="go_get_incoming_ring_overlay"
    >
      <div className="w-full max-w-md sbn-card p-5 space-y-4 shadow-2xl border border-accent/40">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-accent animate-pulse" />
            <p className="text-sm font-bold text-app">Pickup request</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-inset text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-app leading-snug">
          <strong>{session.requesterName}</strong> wants to Go Get &quot;{item.title}&quot;
        </p>

        {active ? (
          <>
            <p className="text-xs text-muted flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {remaining > 0 ? `${remaining}s left to respond` : 'Ring ended'}
            </p>
            <GoGetAvailabilityPrompt
              requesterName={session.requesterName}
              itemTitle={item.title}
              submitting={busy}
              onAvailableNow={() => void run(() => respondAvailableNow(session, item))}
              onProposeWindow={(w) => void run(() => proposeAvailabilityWindow(session, item, w))}
            />
          </>
        ) : (
          <p className="text-xs text-muted">This request timed out. The picker can schedule a meet instead.</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
