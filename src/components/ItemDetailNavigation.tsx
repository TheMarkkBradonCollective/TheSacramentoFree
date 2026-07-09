import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Loader2, MessageCircle, XCircle } from 'lucide-react';
import type { ItemPost, UserProfile } from '../types';
import { extractGPSCoordinates } from '../types';
import { canViewerSeeExactLocation, convertPercentToLatLng, getItemMapDestination } from '../lib/itemLocation';
import {
  getListingNavigateLabel,
  navigatesDirectlyToPin,
} from '../lib/listingMapActions';
import {
  fetchDrivingRoute,
  isRoadGeometry,
  openDrivingDirections,
  type LatLng,
} from '../lib/mapRoute';
import { fetchNavigationRoute } from '../lib/navigationRoute';
import { getLastLiveLatLng, subscribeLiveGeolocation } from '../lib/liveGeolocation';
import {
  cancelGoGetSession,
  confirmGoGetCompletion,
  createGoGetSession,
  disputeGoGetCompletion,
  getActiveGoGetSession,
  goGetHandshakeModeForItem,
  isTerminalGoGetStatus,
  markFulfillerReady,
  markGoGetArrived,
  pickScheduledTime,
  proposeAvailabilityWindow,
  respondAvailableNow,
  startGoGetTrip,
  subscribeToGoGetSession,
  subscribeToFulfillerLiveLocationChanges,
  upsertLiveLocation,
  getFulfillerLiveLocation,
} from '../lib/goGetSessions';
import { clearActiveNavSession, saveActiveNavSession } from '../lib/navigationSession';
import { fileGoGetViolation } from '../lib/violations';
import {
  recordItemClaimInChat,
  markItemFulfilledFromChat,
  updateSupabaseItemStatus,
  createSupabaseMessage,
  getListingSubitems,
} from '../supabase';
import { formatItemClaimedChatMessage, formatItemFulfilledChatMessage, formatTradeCompletedChatMessage } from '../lib/claims';
import type { GoGetFulfillerLiveLocation, GoGetSession, ListingSubItem } from '../types';
import MapNavigationView, { type NavProgressUpdate } from './MapNavigationView';
import {
  buildGoGetNavigationFollowUpMessages,
  buildGoGetNavigationStartPhrase,
} from '../lib/goGetNavigationVoice';
import MapSelectionRouteRow from './MapSelectionRouteRow';
import GoGetAvailabilityPrompt from './goget/GoGetAvailabilityPrompt';
import GoGetTimePicker from './goget/GoGetTimePicker';
import GoGetLiveTrackingCard from './goget/GoGetLiveTrackingCard';
import GoGetMeetingMap from './goget/GoGetMeetingMap';
import GoGetShareLocationToggle from './goget/GoGetShareLocationToggle';
import ReportGoGetViolationDialog from './goget/ReportGoGetViolationDialog';
import { confirmGoGetAsRequester, confirmGoGetTripStart, confirmDropOffAsFulfiller, confirmMeetUp } from './goget/goGetSafetyConfirm';
import { useConfirm } from '../contexts/ConfirmContext';

interface ItemDetailNavigationProps {
  item: ItemPost;
  currentUserId: string;
  userProfile?: UserProfile;
  onOpenChat?: (chatId: string) => void;
}

/** Applies the pickup completion for whichever post type this session is for, reusing the existing claim/fulfill/trade paths. */
async function applyCompletionForItemType(
  item: ItemPost,
  session: GoGetSession,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (item.type === 'giveaway') {
    return recordItemClaimInChat({
      itemId: item.id,
      itemTitle: item.title,
      giverUserId: session.fulfillerUserId,
      claimerUserId: session.requesterUserId,
      chatId: session.chatId,
      claimMessage: formatItemClaimedChatMessage(item.title),
    });
  }
  if (item.type === 'looking') {
    // Looking sessions: fulfiller = looking poster (owner), requester = helper who dropped off.
    return markItemFulfilledFromChat({
      itemId: item.id,
      ownerUserId: session.fulfillerUserId,
      helperUserId: session.requesterUserId,
      chatId: session.chatId,
      message: formatItemFulfilledChatMessage(item.title, session.requesterName),
    });
  }
  // trade
  const ok = await updateSupabaseItemStatus(item.id, 'completed', session.fulfillerUserId);
  if (!ok) return { ok: false, errorMessage: 'Could not mark trade as completed.' };
  await createSupabaseMessage(
    session.chatId,
    formatTradeCompletedChatMessage(item.title, session.requesterName),
    session.fulfillerUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  return { ok: true };
}

export default function ItemDetailNavigation({ item, currentUserId, userProfile, onOpenChat }: ItemDetailNavigationProps) {
  const { confirm, alert } = useConfirm();

  const [session, setSession] = useState<GoGetSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Once a session exists, its own destination is authoritative. Before that:
  // Looking/Trade navigate to the poster's pin (fulfiller) — resolve with the
  // poster's uid so private pins still become the drop-off/meetup destination
  // (same as ChatSystem). Giveaways use the viewer uid for privacy rules.
  const itemPinDestination = useMemo<LatLng | null>(() => {
    const locationOwnerId =
      item.type === 'looking' || item.type === 'trade' ? item.userId : currentUserId;
    return getItemMapDestination(item, locationOwnerId);
  }, [item, currentUserId]);

  const destination = useMemo<LatLng | null>(() => {
    if (session) return { lat: session.destinationLat, lng: session.destinationLng };
    return itemPinDestination;
  }, [session, itemPinDestination]);

  const [userLocation, setUserLocation] = useState<LatLng | null>(() => getLastLiveLatLng());
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [lockedOrigin, setLockedOrigin] = useState<LatLng | null>(null);
  const fetchIdRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [fulfillerLiveLocation, setFulfillerLiveLocation] = useState<GoGetFulfillerLiveLocation | null>(null);
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const arrivalHandledRef = useRef(false);

  const isOwner = item.userId === currentUserId;

  useEffect(() => {
    if (!destination) return;
    const unsub = subscribeLiveGeolocation((position) => {
      setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
    });
    return unsub;
  }, [destination]);

  // Load + subscribe to any existing session for this item involving me (either role).
  useEffect(() => {
    let cancelled = false;
    setSessionLoaded(false);
    void getActiveGoGetSession(item.id, currentUserId).then((s) => {
      if (!cancelled) {
        setSession(s);
        setSessionLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [item.id, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    void getListingSubitems(item.id).then((rows) => {
      if (!cancelled) setSubitems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  useEffect(() => {
    if (!session) return;
    return subscribeToGoGetSession(session.id, (updated) => {
      setSession(updated);
      if (isTerminalGoGetStatus(updated.status)) {
        clearActiveNavSession();
        setNavigationOpen(false);
      }
    });
  }, [session?.id]);

  useEffect(() => {
    if (!session?.fulfillerSharingLocation || !['active', 'arrived'].includes(session.status)) {
      setFulfillerLiveLocation(null);
      return;
    }
    let cancelled = false;
    void getFulfillerLiveLocation(session.id).then((loc) => {
      if (!cancelled) setFulfillerLiveLocation(loc);
    });
    const unsubscribe = subscribeToFulfillerLiveLocationChanges(session.id, (loc) => {
      if (!cancelled) setFulfillerLiveLocation(loc);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [session?.id, session?.fulfillerSharingLocation, session?.status]);

  const routeEndpoints = useMemo(() => {
    if (!destination || !userLocation) return null;
    return { start: userLocation, end: destination };
  }, [destination, userLocation]);

  useEffect(() => {
    if (!routeEndpoints || session) {
      if (!routeEndpoints) {
        setRouteCoords(null);
        setDistanceMeters(null);
        setDurationSeconds(null);
        setRouteLoading(false);
      }
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setRouteLoading(true);
    setRouteCoords(null);
    setDistanceMeters(null);
    setDurationSeconds(null);

    fetchNavigationRoute(routeEndpoints.start, routeEndpoints.end).then(async (navResult) => {
      if (fetchId !== fetchIdRef.current) return;

      if (navResult) {
        setRouteCoords(navResult.coords.length >= 2 ? navResult.coords : null);
        setDistanceMeters(navResult.distanceMeters);
        setDurationSeconds(navResult.durationSeconds);
        setRouteLoading(false);
        return;
      }

      const fallback = await fetchDrivingRoute(routeEndpoints.start, routeEndpoints.end);
      if (fetchId !== fetchIdRef.current) return;

      setRouteCoords(fallback.onRoads && isRoadGeometry(fallback.coords) ? fallback.coords : null);
      setDistanceMeters(fallback.distanceMeters);
      setDurationSeconds(fallback.durationSeconds);
      setRouteLoading(false);
    });
  }, [routeEndpoints, session]);

  const openNavigation = useCallback(() => {
    if (!destination || !userLocation) return;
    arrivalHandledRef.current = false;
    saveActiveNavSession({
      userId: currentUserId,
      targetType: 'post',
      targetId: item.id,
      postId: item.id,
      destination,
      destinationLabel: item.title,
      startedAt: Date.now(),
    });
    setLockedOrigin(userLocation);
    setNavigationOpen(true);
  }, [currentUserId, destination, userLocation, item.id, item.title]);

  const handleStartGoGet = useCallback(async () => {
    if (!destination || !userLocation || !userProfile) return;
    if (navigatesDirectlyToPin(item)) {
      openNavigation();
      return;
    }
    const confirmed = await confirmGoGetAsRequester(confirm, item.userDisplayName, item.title, item.category);
    if (!confirmed) return;
    setBusy(true);
    setErr('');
    const result = await createGoGetSession({
      item,
      fulfillerUserId: item.userId,
      fulfillerName: item.userDisplayName,
      requesterUserId: userProfile.uid,
      requesterName: userProfile.displayName,
      destination,
      destinationLabel: item.title,
    });
    setBusy(false);
    if (!result.ok || !result.session) {
      setErr(result.errorMessage || 'Could not start Go Get.');
      return;
    }
    setSession(result.session);
    if (result.session.status === 'active') {
      openNavigation();
    }
  }, [confirm, destination, userLocation, userProfile, item, openNavigation]);

  const handleStartDropOff = useCallback(async () => {
    if (!destination || !userLocation || !userProfile) return;
    const confirmed = await confirmDropOffAsFulfiller(confirm, item.userDisplayName, item.title);
    if (!confirmed) return;
    setBusy(true);
    setErr('');
    // Looking: poster waits at their area (fulfiller); responder navigates with the item (requester).
    const result = await createGoGetSession({
      item,
      fulfillerUserId: item.userId,
      fulfillerName: item.userDisplayName,
      requesterUserId: userProfile.uid,
      requesterName: userProfile.displayName,
      destination,
      destinationLabel: `${item.userDisplayName}'s area`,
    });
    setBusy(false);
    if (!result.ok || !result.session) {
      setErr(result.errorMessage || 'Could not start drop off.');
      return;
    }
    setSession(result.session);
    if (result.session.status === 'active') {
      openNavigation();
    }
  }, [confirm, destination, userLocation, userProfile, item, openNavigation]);

  const handleStartMeetUp = useCallback(async () => {
    if (!destination || !userLocation || !userProfile) return;
    const confirmed = await confirmMeetUp(confirm, item.userDisplayName, item.title);
    if (!confirmed) return;
    setBusy(true);
    setErr('');
    const result = await createGoGetSession({
      item,
      fulfillerUserId: item.userId,
      fulfillerName: item.userDisplayName,
      requesterUserId: userProfile.uid,
      requesterName: userProfile.displayName,
      destination,
      destinationLabel: `Meetup: ${item.title}`,
    });
    setBusy(false);
    if (!result.ok || !result.session) {
      setErr(result.errorMessage || 'Could not start meet up.');
      return;
    }
    setSession(result.session);
    if (result.session.status === 'active') {
      openNavigation();
    }
  }, [confirm, destination, userLocation, userProfile, item, openNavigation]);

  const handleListingNavigation = useCallback(() => {
    if (isOwner) {
      openNavigation();
      return;
    }
    if (item.type === 'looking') {
      void handleStartDropOff();
      return;
    }
    if (item.type === 'trade') {
      void handleStartMeetUp();
      return;
    }
    void handleStartGoGet();
  }, [isOwner, item.type, openNavigation, handleStartDropOff, handleStartMeetUp, handleStartGoGet]);

  const handleProgressUpdate = useCallback(
    (update: NavProgressUpdate) => {
      if (!session) return;
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
      if (update.arrived && !arrivalHandledRef.current && session.status === 'active') {
        arrivalHandledRef.current = true;
        void markGoGetArrived(session, item);
      }
    },
    [session, item],
  );

  const handleExitNavigation = useCallback(() => {
    clearActiveNavSession();
    setNavigationOpen(false);
    setLockedOrigin(null);
  }, []);

  useEffect(() => {
    if (!navigationOpen || !destination) return;
    saveActiveNavSession({
      userId: currentUserId,
      targetType: 'post',
      targetId: item.id,
      postId: item.id,
      destination,
      destinationLabel: item.title,
      startedAt: Date.now(),
    });
  }, [navigationOpen, currentUserId, item.id, item.title, destination]);

  const meetNameForVoice = session
    ? session.fulfillerUserId === currentUserId
      ? session.requesterName
      : session.fulfillerName
    : item.userDisplayName;

  const goGetItemLabels = useMemo(() => {
    const available = subitems.filter((sub) => sub.status === 'available').map((sub) => sub.label);
    if (available.length > 0) return available;
    if (subitems.length > 0) return subitems.map((sub) => sub.label);
    return [item.title];
  }, [subitems, item.title]);

  const goGetNavigationVoice = useMemo(
    () => ({
      start: buildGoGetNavigationStartPhrase({
        meetName: meetNameForVoice,
        itemTitle: item.title,
        category: item.category,
        itemLabels: goGetItemLabels,
      }),
      followUp: buildGoGetNavigationFollowUpMessages(item.description),
    }),
    [meetNameForVoice, item.title, item.category, item.description, goGetItemLabels],
  );

  if (!destination) return null;

  const isFulfiller = !!session && session.fulfillerUserId === currentUserId;
  const isRequester = !!session && session.requesterUserId === currentUserId;
  const otherUserId = session ? (isFulfiller ? session.requesterUserId : session.fulfillerUserId) : null;
  const otherUserName = session ? (isFulfiller ? session.requesterName : session.fulfillerName) : item.userDisplayName;
  const locationHint = item.neighborhood?.trim() || 'Pickup pin';

  const run = async (fn: () => Promise<{ ok: boolean; errorMessage?: string; session?: GoGetSession }>) => {
    setBusy(true);
    setErr('');
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Something went wrong.');
      return;
    }
    if (result.session) setSession(result.session);
  };

  const handleCancel = async () => {
    if (!session) return;
    const confirmed = await confirm({
      title: 'Cancel Go Get',
      message: `Cancel this pickup with ${otherUserName}?`,
      confirmLabel: 'Cancel Go Get',
      variant: 'danger',
    });
    if (!confirmed) return;
    await run(() => cancelGoGetSession(session, item, currentUserId));
  };

  const handleConfirmCompletion = async () => {
    if (!session) return;
    setBusy(true);
    setErr('');
    const sessionResult = await confirmGoGetCompletion(session);
    if (!sessionResult.ok || !sessionResult.session) {
      setBusy(false);
      setErr(sessionResult.errorMessage || 'Could not confirm pickup.');
      return;
    }
    const completionResult = await applyCompletionForItemType(item, session);
    setBusy(false);
    setSession(sessionResult.session);
    if (!completionResult.ok) {
      setErr(completionResult.errorMessage || 'Pickup confirmed, but the listing could not be updated.');
    }
  };

  const handleDisputeCompletion = async () => {
    if (!session) return;
    const reason = await confirm({
      title: "Something's wrong",
      message: `Report that "${item.title}" was NOT actually picked up by ${otherUserName}? This will be reviewed by moderators and may result in a violation on their account.`,
      confirmLabel: 'Report a problem',
      variant: 'danger',
    });
    if (!reason) return;
    setBusy(true);
    setErr('');
    await disputeGoGetCompletion(session, 'Fulfiller disputed the pickup at arrival.');
    await fileGoGetViolation({
      targetUserId: session.requesterUserId,
      targetName: session.requesterName,
      sessionId: session.id,
      reportedByUserId: currentUserId,
      reportedByName: item.userDisplayName,
      category: 'false_claim',
      description: `Marked "${item.title}" as arrived but the fulfiller says it was never actually handed off.`,
    });
    setBusy(false);
    await alert({ title: 'Report submitted', message: 'A moderator will review this Go Get.' });
  };

  const handleReportSubmit = async (params: { category: 'no_show' | 'false_claim' | 'unsafe_behavior' | 'other'; description: string }) => {
    if (!session || !otherUserId) return;
    const result = await fileGoGetViolation({
      targetUserId: otherUserId,
      targetName: otherUserName,
      sessionId: session.id,
      reportedByUserId: currentUserId,
      reportedByName: userProfile?.displayName || 'A neighbor',
      category: params.category,
      description: params.description,
    });
    setReportOpen(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not submit report.');
    } else {
      await alert({ title: 'Report submitted', message: 'City moderators will review this Go Get.' });
    }
  };

  const renderPosterShareToggle = () => (
    <GoGetShareLocationToggle
      session={session!}
      pickerName={session!.requesterName}
      onSessionChange={setSession}
      onError={setErr}
    />
  );

  const renderPickerMeetingMap = () =>
    session?.fulfillerSharingLocation ? (
      <GoGetMeetingMap
        sessionId={session.id}
        destinationLat={session.destinationLat}
        destinationLng={session.destinationLng}
        destinationLabel={session.destinationLabel}
        posterName={otherUserName}
        sharingEnabled
      />
    ) : null;

  const renderSessionCard = () => {
    if (!session) return null;

    const errorBanner = err && (
      <p className="text-xs font-semibold text-red-400" role="alert">
        {err}
      </p>
    );

    const cancelLink = !isTerminalGoGetStatus(session.status) && (
      <button type="button" onClick={() => void handleCancel()} disabled={busy} className="text-xs text-muted hover:text-red-400 underline underline-offset-2">
        Cancel Go Get
      </button>
    );

    if (session.status === 'awaiting_availability') {
      if (isFulfiller) {
        return (
          <div className="space-y-2">
            {errorBanner}
            <GoGetAvailabilityPrompt
              requesterName={session.requesterName}
              itemTitle={item.title}
              submitting={busy}
              onAvailableNow={() => void run(() => respondAvailableNow(session, item))}
              onProposeWindow={(w) => void run(() => proposeAvailabilityWindow(session, item, w))}
            />
          </div>
        );
      }
      return (
        <div className="sbn-card p-4 space-y-2">
          {errorBanner}
          <p className="text-sm text-app flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            Waiting for {otherUserName} to respond…
          </p>
          {cancelLink}
        </div>
      );
    }

    if (session.status === 'window_offered') {
      if (isRequester) {
        return (
          <div className="space-y-2">
            {errorBanner}
            <GoGetTimePicker
              fulfillerName={session.fulfillerName}
              availableFrom={session.availableFrom!}
              availableUntil={session.availableUntil!}
              submitting={busy}
              onConfirm={(scheduledAt) => void run(() => pickScheduledTime(session, item, scheduledAt))}
            />
            {cancelLink}
          </div>
        );
      }
      return (
        <div className="sbn-card p-4 space-y-2">
          {errorBanner}
          <p className="text-sm text-app">Waiting for {otherUserName} to pick a pickup time…</p>
          {cancelLink}
        </div>
      );
    }

    if (session.status === 'scheduled') {
      const whenLabel = session.scheduledAt
        ? new Date(session.scheduledAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
        : '';
      const timeHasArrived = session.scheduledAt ? new Date(session.scheduledAt).getTime() <= Date.now() : false;

      if (isFulfiller) {
        if (!session.fulfillerReadyAt) {
          return (
            <div className="sbn-card p-4 space-y-3">
              {errorBanner}
              <p className="text-sm text-app">Pickup scheduled for <strong>{whenLabel}</strong> with {otherUserName}.</p>
              {timeHasArrived ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => markFulfillerReady(session, item))}
                  className="sbn-btn sbn-btn-primary w-full justify-center disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" />
                  I'm ready
                </button>
              ) : (
                <p className="text-xs text-muted">Come back at {whenLabel} to confirm you're ready.</p>
              )}
              {cancelLink}
            </div>
          );
        }
        return (
          <div className="sbn-card p-4 space-y-2">
            {errorBanner}
            <p className="text-sm text-app flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              You're ready — waiting for {otherUserName} to Go Get it.
            </p>
            {cancelLink}
          </div>
        );
      }

      // isRequester
      if (!session.fulfillerReadyAt) {
        return (
          <div className="sbn-card p-4 space-y-2">
            {errorBanner}
            <p className="text-sm text-app">
              Pickup scheduled for <strong>{whenLabel}</strong>. Waiting for {otherUserName} to confirm they're ready.
            </p>
            {cancelLink}
          </div>
        );
      }
      return (
        <div className="sbn-card p-4 space-y-3">
          {errorBanner}
          <p className="text-sm text-app">{otherUserName} is ready for pickup now.</p>
          <button
            type="button"
            disabled={busy || !userLocation}
            onClick={async () => {
              const confirmed = await confirmGoGetTripStart(confirm, otherUserName);
              if (!confirmed) return;
              await run(() => startGoGetTrip(session, item));
              openNavigation();
            }}
            className="sbn-btn sbn-btn-primary w-full justify-center disabled:opacity-60"
          >
            Go Get it
          </button>
          {cancelLink}
        </div>
      );
    }

    if (session.status === 'active') {
      if (isRequester) {
        return (
          <div className="sbn-card p-4 space-y-3">
            {errorBanner}
            <p className="text-sm text-app">You're on the way to {otherUserName}'s pickup.</p>
            {renderPickerMeetingMap()}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={openNavigation} className="sbn-btn sbn-btn-primary justify-center">
                Resume navigation
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => markGoGetArrived(session, item))}
                className="sbn-btn sbn-btn-secondary justify-center disabled:opacity-60"
              >
                I've arrived
              </button>
            </div>
            {cancelLink}
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {session.handshakeMode === 'instant' ? (
            <div className="sbn-card p-4 space-y-2">
              {errorBanner}
              <p className="text-sm text-app">
                {session.requesterName} is heading to your {item.category.toLowerCase()}.
              </p>
              <p className="text-xs text-muted">No notification was sent — curb and porch pickups are first-come.</p>
            </div>
          ) : (
            <GoGetLiveTrackingCard
              sessionId={session.id}
              requesterName={session.requesterName}
              destinationLabel={session.destinationLabel}
              onOpenChat={() => onOpenChat?.(session.chatId)}
            />
          )}
          {renderPosterShareToggle()}
        </div>
      );
    }

    if (session.status === 'arrived') {
      if (isFulfiller) {
        return (
          <div className="sbn-card p-4 space-y-3">
            {errorBanner}
            <p className="text-sm font-semibold text-app">{session.requesterName} has arrived.</p>
            <p className="text-xs text-muted">Confirm once the handoff is complete.</p>
            {renderPosterShareToggle()}
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
                Something's wrong
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="sbn-card p-4 space-y-3">
          {errorBanner}
          <p className="text-sm text-app flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            Waiting for {otherUserName} to confirm the pickup…
          </p>
          {renderPickerMeetingMap()}
        </div>
      );
    }

    if (session.status === 'completed') {
      return (
        <div className="sbn-card p-4 space-y-2 border border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm font-semibold text-emerald-500 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Pickup complete
          </p>
          <button type="button" onClick={() => setReportOpen(true)} className="text-xs text-muted hover:text-app underline underline-offset-2">
            Report a problem with this pickup
          </button>
        </div>
      );
    }

    if (session.status === 'disputed') {
      return (
        <div className="sbn-card p-4 space-y-2 border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-semibold text-amber-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            This pickup was reported and is under review
          </p>
        </div>
      );
    }

    if (session.status === 'cancelled') {
      return (
        <div className="sbn-card p-4 space-y-2">
          <p className="text-sm text-muted">This Go Get was cancelled.</p>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {!sessionLoaded ? null : session ? (
        renderSessionCard()
      ) : (
        destination && (
          <MapSelectionRouteRow
            locationHint={locationHint}
            routeEndpoints={routeEndpoints}
            routeLoading={routeLoading}
            distanceMeters={distanceMeters}
            durationSeconds={durationSeconds}
            routeOnMap={isRoadGeometry(routeCoords)}
            hasLiveGps={!!userLocation}
            canNavigate={!!userLocation}
            navigateLabel={isOwner ? 'Navigate' : getListingNavigateLabel(item)}
            onStartNavigation={() => (isOwner ? openNavigation() : void handleListingNavigation())}
            onOpenExternalMaps={() => {
              if (!routeEndpoints) {
                openDrivingDirections(destination);
                return;
              }
              openDrivingDirections(routeEndpoints.end, routeEndpoints.start);
            }}
          />
        )
      )}

      {session && !isOwner && !['completed', 'cancelled', 'disputed'].includes(session.status) && (
        <button
          type="button"
          onClick={() => onOpenChat?.(session.chatId)}
          className="mt-2 text-xs text-accent hover:underline underline-offset-2 inline-flex items-center gap-1"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Open chat with {otherUserName}
        </button>
      )}

      {session && otherUserId && (
        <ReportGoGetViolationDialog
          open={reportOpen}
          targetName={otherUserName}
          onClose={() => setReportOpen(false)}
          onSubmit={handleReportSubmit}
        />
      )}

      {navigationOpen && lockedOrigin && destination && (
        createPortal(
          <Fragment key={item.id}>
            <MapNavigationView
              origin={lockedOrigin}
              destination={destination}
              destinationLabel={item.title}
              onProgressUpdate={handleProgressUpdate}
              otherPartyLocation={
                session?.fulfillerSharingLocation && fulfillerLiveLocation
                  ? { lat: fulfillerLiveLocation.lat, lng: fulfillerLiveLocation.lng }
                  : null
              }
              otherPartyLabel={otherUserName}
              navigationStartMessage={session ? goGetNavigationVoice.start : undefined}
              navigationFollowUpMessages={session ? goGetNavigationVoice.followUp : undefined}
              onExit={handleExitNavigation}
            />
          </Fragment>,
          document.body,
        )
      )}
    </>
  );
}
