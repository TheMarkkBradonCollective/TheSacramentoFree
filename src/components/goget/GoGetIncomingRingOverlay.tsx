import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Phone } from 'lucide-react';
import type { GoGetSession, ItemPost, UserProfile } from '../../types';
import {
  abandonGoGetRing,
  declineGoGetRing,
  expireGoGetRing,
  isGoGetRingActive,
  respondAvailableNow,
  proposeAvailabilityWindow,
} from '../../lib/goGetSessions';
import { formatRingCountdown } from '../../lib/pickupEngine';
import { meetCopyForSession } from '../../lib/meetCopy';
import { getGoGetRingDuration, getGoGetRingPattern, startGoGetRingAlert, stopGoGetRingAlert } from '../../lib/goGetRing';
import GoGetAvailabilityPrompt from './GoGetAvailabilityPrompt';
import GoGetLiveTripMap from './GoGetLiveTripMap';
import { getSupabaseItemById } from '../../supabase';

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
  const [itemLoadFailed, setItemLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const ringStoppedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setItem(null);
    setItemLoadFailed(false);
    void getSupabaseItemById(session.itemId)
      .then((next) => {
        if (cancelled) return;
        if (next) setItem(next);
        else setItemLoadFailed(true);
      })
      .catch(() => {
        if (!cancelled) setItemLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session.itemId]);

  useEffect(() => {
    if (!itemLoadFailed) return;
    void abandonGoGetRing(session, 'Listing is no longer available');
  }, [itemLoadFailed, session.id]);

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

  const shell = (body: ReactNode) =>
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Incoming Meet request"
        id="go_get_incoming_ring_overlay"
      >
        <GoGetLiveTripMap
          destination={{ lat: session.destinationLat, lng: session.destinationLng }}
          destinationLabel={session.destinationLabel}
          mapId="go_get_ring_map"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4 safe-area-pt">
          <div className="pointer-events-auto sbn-card px-3 py-2 flex items-center gap-2 shadow-lg border border-accent/40">
            <Phone className="w-5 h-5 text-accent animate-pulse shrink-0" />
            <p className="text-sm font-bold text-app">{meetCopyForSession(session).requestTitle}</p>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 safe-area-pb">
          <div className="pointer-events-auto w-full max-w-lg mx-auto sbn-card rounded-b-none rounded-t-3xl p-5 space-y-4 shadow-2xl border border-accent/40">
            {body}
          </div>
        </div>
      </div>,
      document.body,
    );

  if (itemLoadFailed) {
    return shell(
      <div className="space-y-3">
        <p className="text-sm text-app leading-snug">
          This listing is no longer available. The pickup request was cancelled.
        </p>
        <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary w-full justify-center">
          Close
        </button>
      </div>,
    );
  }

  if (!item) {
    return shell(
      <div className="flex items-center gap-3 text-sm text-muted">
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
        Loading listing…
      </div>,
    );
  }

  const active = isGoGetRingActive(session);

  return shell(
    <>
      {active ? (
        <>
          <p className="text-4xl font-black tabular-nums text-app text-center py-1" aria-live="polite">
            {formatRingCountdown(remaining)}
          </p>
          <p className="text-xs text-muted text-center">
            {session.destinationLabel}
          </p>
          <GoGetAvailabilityPrompt
            requesterName={session.requesterName}
            itemTitle={item.title}
            requestLine={meetCopyForSession(session).requestLine(session.requesterName, item.title)}
            submitting={busy}
            onAvailableNow={() => void run(() => respondAvailableNow(session, item))}
            onProposeWindow={(w) => void run(() => proposeAvailabilityWindow(session, item, w))}
            onDecline={() => void run(() => declineGoGetRing(session, item))}
            onIgnore={onClose}
            embedded
          />
        </>
      ) : (
        <p className="text-xs text-muted">This request timed out. The picker can schedule a meet instead.</p>
      )}
    </>,
  );
}
