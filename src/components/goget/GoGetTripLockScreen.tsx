import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle,
  Clock,
  Loader2,
  MessageCircle,
  Navigation2,
  PhoneOff,
  XCircle,
} from 'lucide-react';
import type { GoGetFulfillerLiveLocation, GoGetLiveLocation, GoGetSession, ItemPost, UserProfile } from '../../types';
import type { LatLng } from '../../lib/mapRoute';
import { formatRouteDistance, formatRouteDuration } from '../../lib/mapRoute';
import { getLastLiveLatLng, retainLiveGeolocation, subscribeLiveGeolocation } from '../../lib/liveGeolocation';
import { unlockNavigationSpeech } from '../../lib/navigationVoice';
import {
  buildGoGetNavigationFollowUpMessages,
  buildGoGetNavigationStartPhrase,
} from '../../lib/goGetNavigationVoice';
import { isPlayStoreDemo } from '../../preview/playStoreDemo';
import { getSupabaseItemById } from '../../supabase';
import {
  cancelGoGetSession,
  completeGoGetItemForSession,
  confirmGoGetCompletion,
  disputeGoGetCompletion,
  getFulfillerLiveLocation,
  getLiveLocation,
  markGoGetArrived,
  setFulfillerSharingLocation,
  startGoGetTrip,
  subscribeToFulfillerLiveLocationChanges,
  subscribeToGoGetSession,
  subscribeToLiveLocationChanges,
  upsertFulfillerLiveLocation,
  upsertLiveLocation,
} from '../../lib/goGetSessions';
import { fileGoGetViolation } from '../../lib/violations';
import { isGoGetTripLocked } from '../../lib/goGetTripLock';
import { useConfirm } from '../../contexts/ConfirmContext';
import { confirmGoGetTripStart } from './goGetSafetyConfirm';
import MapNavigationView, { type NavProgressUpdate } from '../MapNavigationView';
import GoGetLiveTripMap from './GoGetLiveTripMap';
import GoGetTripChatSheet from './GoGetTripChatSheet';
import GoGetRingWaitingPanel from './GoGetRingWaitingPanel';
import GoGetShareLocationToggle from './GoGetShareLocationToggle';
import ReportGoGetViolationDialog from './ReportGoGetViolationDialog';

interface GoGetTripLockScreenProps {
  session: GoGetSession;
  userProfile: UserProfile;
  item?: ItemPost | null;
  initialOrigin?: LatLng | null;
  /** Screenshot/demo: show overview map instead of turn-by-turn for the picker. */
  preferOverview?: boolean;
  onSessionChange?: (session: GoGetSession) => void;
  onClosed?: () => void;
  onPickupCompleted?: () => void;
}

export default function GoGetTripLockScreen({
  session: initialSession,
  userProfile,
  item: itemProp = null,
  initialOrigin = null,
  preferOverview = false,
  onSessionChange,
  onClosed,
  onPickupCompleted,
}: GoGetTripLockScreenProps) {
  const { confirm, alert } = useConfirm();
  const [session, setSession] = useState(initialSession);
  const [item, setItem] = useState<ItemPost | null>(itemProp);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [origin, setOrigin] = useState<LatLng | null>(initialOrigin ?? getLastLiveLatLng());
  const [selfLocation, setSelfLocation] = useState<LatLng | null>(initialOrigin ?? getLastLiveLatLng());
  const [pickerLocation, setPickerLocation] = useState<GoGetLiveLocation | null>(null);
  const [posterLocation, setPosterLocation] = useState<GoGetFulfillerLiveLocation | null>(null);
  const arrivalHandledRef = useRef(false);
  const autoShareAttemptedRef = useRef(false);

  const isFulfiller = session.fulfillerUserId === userProfile.uid;
  const isRequester = session.requesterUserId === userProfile.uid;
  const otherName = isFulfiller ? session.requesterName : session.fulfillerName;
  const otherUserId = isFulfiller ? session.requesterUserId : session.fulfillerUserId;
  const destination = useMemo<LatLng>(
    () => ({ lat: session.destinationLat, lng: session.destinationLng }),
    [session.destinationLat, session.destinationLng],
  );

  const applySession = useCallback(
    (next: GoGetSession) => {
      setSession(next);
      onSessionChange?.(next);
      if (!isGoGetTripLocked(next, userProfile.uid)) {
        onClosed?.();
      }
    },
    [onClosed, onSessionChange, userProfile.uid],
  );

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession.id, initialSession.status, initialSession.updatedAt]);

  useEffect(() => {
    if (itemProp) {
      setItem(itemProp);
      return;
    }
    let cancelled = false;
    void getSupabaseItemById(session.itemId).then((next) => {
      if (!cancelled && next) setItem(next);
    });
    return () => {
      cancelled = true;
    };
  }, [session.itemId, itemProp]);

  useEffect(() => {
    if (isPlayStoreDemo()) return;
    return subscribeToGoGetSession(session.id, applySession);
  }, [session.id, applySession]);

  useEffect(() => retainLiveGeolocation(), []);

  useEffect(() => {
    if (isPlayStoreDemo()) return undefined;
    const unsub = subscribeLiveGeolocation((position) => {
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setSelfLocation(next);
      setOrigin((prev) => prev ?? next);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!['active', 'arrived', 'scheduled'].includes(session.status)) {
      setPickerLocation(null);
      return;
    }
    let cancelled = false;
    void getLiveLocation(session.id).then((loc) => {
      if (!cancelled) setPickerLocation(loc);
    });
    const unsubscribe = subscribeToLiveLocationChanges(session.id, (loc) => {
      if (!cancelled) setPickerLocation(loc);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [session.id, session.status]);

  useEffect(() => {
    if (!session.fulfillerSharingLocation || !['active', 'arrived', 'scheduled'].includes(session.status)) {
      setPosterLocation(null);
      return;
    }
    let cancelled = false;
    void getFulfillerLiveLocation(session.id).then((loc) => {
      if (!cancelled) setPosterLocation(loc);
    });
    const unsubscribe = subscribeToFulfillerLiveLocationChanges(session.id, (loc) => {
      if (!cancelled) setPosterLocation(loc);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [session.id, session.fulfillerSharingLocation, session.status]);

  useEffect(() => {
    if (!isFulfiller || isPlayStoreDemo()) return;
    if (!['scheduled', 'active', 'arrived'].includes(session.status)) return;
    if (session.fulfillerSharingLocation || autoShareAttemptedRef.current) return;
    autoShareAttemptedRef.current = true;
    void setFulfillerSharingLocation(session, true).then((result) => {
      if (result.ok && result.session) applySession(result.session);
    });
  }, [isFulfiller, session, applySession]);

  useEffect(() => {
    if (!isFulfiller || !session.fulfillerSharingLocation) return;
    if (!['scheduled', 'active', 'arrived'].includes(session.status)) return;
    const unsub = subscribeLiveGeolocation((position) => {
      void upsertFulfillerLiveLocation(session.id, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
      });
    });
    return unsub;
  }, [isFulfiller, session.fulfillerSharingLocation, session.id, session.status]);

  const handleProgressUpdate = useCallback(
    (update: NavProgressUpdate) => {
      if (session.handshakeMode !== 'instant') {
        void upsertLiveLocation(session.id, {
          lat: update.lat,
          lng: update.lng,
          heading: update.heading,
          speedMph: update.speedMph,
          etaSeconds: update.etaSeconds,
          distanceMeters: update.distanceMeters,
        });
      }
      if (update.arrived && !arrivalHandledRef.current && session.status === 'active' && item) {
        arrivalHandledRef.current = true;
        void markGoGetArrived(session, item).then((result) => {
          if (result.ok && result.session) applySession(result.session);
        });
      }
    },
    [session, item, applySession],
  );

  const run = async (fn: () => Promise<{ ok: boolean; errorMessage?: string; session?: GoGetSession }>) => {
    setBusy(true);
    setErr('');
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Something went wrong.');
      return false;
    }
    if (result.session) applySession(result.session);
    return true;
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel Go Get',
      message: `Cancel this pickup with ${otherName}? They'll be notified and this live trip will end.`,
      confirmLabel: 'Cancel pickup',
      variant: 'danger',
    });
    if (!confirmed || !item) return;
    await run(() => cancelGoGetSession(session, item, userProfile.uid));
  };

  const handleStartTrip = async () => {
    if (!item) return;
    const confirmed = await confirmGoGetTripStart(confirm, otherName);
    if (!confirmed) return;
    unlockNavigationSpeech();
    await run(() => startGoGetTrip(session, item));
  };

  const handleConfirmCompletion = async () => {
    if (!item) return;
    setBusy(true);
    setErr('');
    const sessionResult = await confirmGoGetCompletion(session);
    if (!sessionResult.ok || !sessionResult.session) {
      setBusy(false);
      setErr(sessionResult.errorMessage || 'Could not confirm pickup.');
      return;
    }
    const completionResult = await completeGoGetItemForSession(item, session);
    setBusy(false);
    applySession(sessionResult.session);
    if (!completionResult.ok) {
      setErr(completionResult.errorMessage || 'Pickup confirmed, but the listing could not be updated.');
      return;
    }
    void import('../../lib/pushEvents').then((m) =>
      m.notifyGoGetCompleted({
        item,
        requesterUserId: session.requesterUserId,
        sessionId: session.id,
      }),
    );
    onPickupCompleted?.();
  };

  const handleDisputeCompletion = async () => {
    if (!item) return;
    const reason = await confirm({
      title: "Something's wrong",
      message: `Report that "${item.title}" was NOT actually picked up by ${session.requesterName}? This will be reviewed by moderators.`,
      confirmLabel: 'Report a problem',
      variant: 'danger',
    });
    if (!reason) return;
    setBusy(true);
    await disputeGoGetCompletion(session, 'Fulfiller disputed the pickup at arrival.');
    await fileGoGetViolation({
      targetUserId: session.requesterUserId,
      targetName: session.requesterName,
      sessionId: session.id,
      reportedByUserId: userProfile.uid,
      reportedByName: userProfile.displayName,
      category: 'false_claim',
      description: `Marked "${item.title}" as arrived but the fulfiller says it was never actually handed off.`,
    });
    setBusy(false);
    await alert({ title: 'Report submitted', message: 'A moderator will review this Go Get.' });
  };

  const handleReportSubmit = async (params: {
    category: 'no_show' | 'false_claim' | 'unsafe_behavior' | 'other';
    description: string;
  }) => {
    const result = await fileGoGetViolation({
      targetUserId: otherUserId,
      targetName: otherName,
      sessionId: session.id,
      reportedByUserId: userProfile.uid,
      reportedByName: userProfile.displayName,
      category: params.category,
      description: params.description,
    });
    setReportOpen(false);
    if (!result.ok) setErr(result.errorMessage || 'Could not submit report.');
    else await alert({ title: 'Report submitted', message: 'City moderators will review this Go Get.' });
  };

  const goGetNavigationVoice = useMemo(() => {
    const title = item?.title || session.destinationLabel;
    return {
      start: buildGoGetNavigationStartPhrase({
        meetName: otherName,
        itemTitle: title,
        category: item?.category || 'pickup',
        itemLabels: [title],
      }),
      followUp: item ? buildGoGetNavigationFollowUpMessages(item.description) : [],
    };
  }, [item, otherName, session.destinationLabel]);

  const travelerParty = pickerLocation
    ? {
        lat: pickerLocation.lat,
        lng: pickerLocation.lng,
        heading: pickerLocation.heading,
        label: session.requesterName,
      }
    : null;
  const neighborParty =
    session.fulfillerSharingLocation && posterLocation
      ? {
          lat: posterLocation.lat,
          lng: posterLocation.lng,
          heading: posterLocation.heading,
          label: session.fulfillerName,
        }
      : null;

  const showPickerNav =
    isRequester &&
    session.status === 'active' &&
    origin &&
    !preferOverview;

  const statusTitle = (() => {
    if (session.status === 'awaiting_availability') return `Waiting for ${otherName}`;
    if (session.status === 'scheduled' && isRequester) return `${otherName} is ready`;
    if (session.status === 'scheduled' && isFulfiller) return `Waiting for ${otherName}`;
    if (session.status === 'active' && isRequester) return `Heading to ${otherName}`;
    if (session.status === 'active' && isFulfiller) return `${otherName} is on the way`;
    if (session.status === 'arrived' && isFulfiller) return `${otherName} has arrived`;
    if (session.status === 'arrived') return `Waiting for ${otherName}`;
    return 'Go Get pickup';
  })();

  const etaLabel =
    pickerLocation?.etaSeconds != null ? formatRouteDuration(pickerLocation.etaSeconds) : null;
  const distanceLabel =
    pickerLocation?.distanceMeters != null ? formatRouteDistance(pickerLocation.distanceMeters) : null;

  const sheet = (() => {
    const errorBanner = err ? (
      <p className="text-xs font-semibold text-red-400" role="alert">
        {err}
      </p>
    ) : null;

    if (session.status === 'awaiting_availability' && isRequester && item) {
      return (
        <GoGetRingWaitingPanel
          session={session}
          item={item}
          posterName={otherName}
          onSessionChange={applySession}
          onCancel={() => void handleCancel()}
          onRingExpired={() => undefined}
        />
      );
    }

    if (session.status === 'scheduled' && session.fulfillerReadyAt && isRequester) {
      return (
        <div className="space-y-3">
          {errorBanner}
          <p className="text-sm text-app">{otherName} is ready for pickup now.</p>
          <p className="text-xs text-muted">{item?.title || session.destinationLabel}</p>
          <button
            type="button"
            disabled={busy || !origin}
            onClick={() => void handleStartTrip()}
            className="sbn-btn sbn-btn-primary w-full justify-center disabled:opacity-60"
            id="go_get_start_trip_btn"
          >
            <Navigation2 className="w-4 h-4" />
            Go Get it
          </button>
          {!origin && <p className="text-xs text-muted">Getting your location…</p>}
        </div>
      );
    }

    if (session.status === 'scheduled' && isFulfiller) {
      return (
        <div className="space-y-3" id="go_get_live_tracking_card">
          {errorBanner}
          <p className="text-sm text-app flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            You&apos;re ready — waiting for {otherName} to start heading over.
          </p>
          <GoGetShareLocationToggle
            session={session}
            pickerName={session.requesterName}
            onSessionChange={applySession}
            onError={setErr}
            compact
          />
        </div>
      );
    }

    if (session.status === 'active' && isFulfiller) {
      return (
        <div className="space-y-3" id="go_get_live_tracking_card">
          {errorBanner}
          <div className="flex items-start gap-3">
            {item?.imageUrl || item?.imageUrls?.[0] ? (
              <img
                src={(item?.imageUrl || item?.imageUrls?.[0]) ?? ''}
                alt=""
                className="h-14 w-14 rounded-xl object-cover border border-app shrink-0"
              />
            ) : (
              <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-app">
                {pickerLocation?.etaSeconds != null && pickerLocation.etaSeconds < 90
                  ? `${session.requesterName} is arriving now`
                  : `${session.requesterName} is on the way`}
              </p>
              <p className="text-[11px] text-muted truncate mt-0.5">
                {item?.title || session.destinationLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-inset p-3">
            <Navigation2 className="w-5 h-5 text-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-black text-app tabular-nums leading-none">{etaLabel ?? '—'}</p>
              <p className="text-xs text-muted mt-1">
                {distanceLabel ? `${distanceLabel} away` : 'Waiting for their live location…'}
                {pickerLocation?.speedMph != null ? ` · ${Math.round(pickerLocation.speedMph)} mph` : ''}
              </p>
            </div>
          </div>
          <GoGetShareLocationToggle
            session={session}
            pickerName={session.requesterName}
            onSessionChange={applySession}
            onError={setErr}
            compact
          />
        </div>
      );
    }

    if (session.status === 'arrived' && isFulfiller) {
      return (
        <div className="space-y-3" id="go_get_arrived_handoff">
          {errorBanner}
          <p className="text-sm font-semibold text-app">{session.requesterName} is here</p>
          <p className="text-xs text-muted">Confirm once the item is in their hands.</p>
          {(item?.imageUrl || item?.imageUrls?.[0]) && (
            <img
              src={(item?.imageUrl || item?.imageUrls?.[0]) ?? ''}
              alt=""
              className="h-16 w-16 rounded-xl object-cover border border-app"
            />
          )}
          <GoGetShareLocationToggle
            session={session}
            pickerName={session.requesterName}
            onSessionChange={applySession}
            onError={setErr}
            compact
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConfirmCompletion()}
              className="sbn-btn sbn-btn-primary justify-center disabled:opacity-60"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm pickup
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDisputeCompletion()}
              className="sbn-btn sbn-btn-secondary justify-center disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              Something&apos;s wrong
            </button>
          </div>
        </div>
      );
    }

    if (session.status === 'arrived' && isRequester) {
      return (
        <div className="space-y-3">
          {errorBanner}
          <p className="text-sm text-app flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            Waiting for {otherName} to confirm the pickup…
          </p>
          <p className="text-xs text-muted">{item?.title || session.destinationLabel}</p>
        </div>
      );
    }

    if (session.status === 'active' && isRequester) {
      return (
        <div className="space-y-3">
          {errorBanner}
          <p className="text-sm text-app">You&apos;re on the way to {otherName}&apos;s pickup.</p>
          <p className="text-xs text-muted">{session.destinationLabel}</p>
          {etaLabel && (
            <p className="text-lg font-black text-app tabular-nums">{etaLabel} remaining</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {errorBanner}
        <p className="text-sm text-app">{statusTitle}</p>
      </div>
    );
  })();

  const overlay = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[var(--sbn-nav-bg,#0b0b0c)] text-app"
      id="go_get_trip_lock_screen"
      role="dialog"
      aria-modal="true"
      aria-label="Go Get live pickup"
    >
      {showPickerNav ? (
        <MapNavigationView
          origin={origin}
          destination={destination}
          destinationLabel={session.destinationLabel}
          onProgressUpdate={handleProgressUpdate}
          otherPartyLocation={neighborParty}
          otherPartyLabel={session.fulfillerName}
          navigationStartMessage={goGetNavigationVoice.start}
          navigationFollowUpMessages={goGetNavigationVoice.followUp}
          tripLock
          embedded
          onOpenChat={() => setChatOpen(true)}
          chatLabel={`Message ${otherName}`}
          onExit={() => void handleCancel()}
        />
      ) : (
        <>
          <GoGetLiveTripMap
            destination={destination}
            destinationLabel={session.destinationLabel}
            traveler={
              isFulfiller
                ? travelerParty
                : isRequester && session.status === 'active' && selfLocation
                  ? { lat: selfLocation.lat, lng: selfLocation.lng, label: 'You' }
                  : travelerParty
            }
            neighbor={neighborParty}
            selfLocation={selfLocation}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4 safe-area-pt">
            <div className="pointer-events-auto sbn-card px-3 py-2 flex items-center gap-2 shadow-lg">
              <Clock className="w-4 h-4 text-accent shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-app truncate">{statusTitle}</p>
                <p className="text-[11px] text-muted truncate">
                  {item?.title || session.destinationLabel}
                  {session.status !== 'arrived' && etaLabel ? ` · ${etaLabel}` : ''}
                  {session.status !== 'arrived' && distanceLabel ? ` · ${distanceLabel}` : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 safe-area-pb">
            <div className="pointer-events-auto sbn-card rounded-b-none rounded-t-3xl p-4 space-y-3 shadow-2xl">
              {sheet}
              <div className={`grid gap-2 ${session.status === 'awaiting_availability' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="sbn-btn sbn-btn-secondary justify-center"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>
                {session.status !== 'awaiting_availability' && (
                  <button
                    type="button"
                    onClick={() => void handleCancel()}
                    disabled={busy}
                    className="sbn-btn sbn-btn-secondary justify-center text-red-400 disabled:opacity-60"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {chatOpen && (
        <GoGetTripChatSheet
          chatId={session.chatId}
          userProfile={userProfile}
          otherName={otherName}
          onClose={() => setChatOpen(false)}
        />
      )}

      <ReportGoGetViolationDialog
        open={reportOpen}
        targetName={otherName}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReportSubmit}
      />
    </div>
  );

  return createPortal(overlay, document.body);
}
