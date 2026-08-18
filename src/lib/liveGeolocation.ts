import { geolocationAgeMs } from './mapRoute';

type PositionListener = (position: GeolocationPosition) => void;
type ErrorListener = (error: GeolocationPositionError) => void;

let watchId: number | null = null;
let primed = false;
let retainCount = 0;
let lastPosition: GeolocationPosition | null = null;
const positionListeners = new Set<PositionListener>();
const errorListeners = new Set<ErrorListener>();

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 6000,
  timeout: 30000,
};

const PRIME_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 20000,
  timeout: 15000,
};

function dispatchPosition(position: GeolocationPosition) {
  lastPosition = position;
  for (const listener of positionListeners) {
    try {
      listener(position);
    } catch (error) {
      console.warn('Live geolocation listener failed:', error);
    }
  }
}

function dispatchError(error: GeolocationPositionError) {
  for (const listener of errorListeners) {
    try {
      listener(error);
    } catch (err) {
      console.warn('Live geolocation error listener failed:', err);
    }
  }
}

function ensureWatch(): void {
  if (watchId != null || typeof navigator === 'undefined' || !navigator.geolocation) return;

  if (!primed) {
    primed = true;
    navigator.geolocation.getCurrentPosition(
      (position) => dispatchPosition(position),
      () => undefined,
      PRIME_OPTIONS,
    );
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => dispatchPosition(position),
    (error) => dispatchError(error),
    WATCH_OPTIONS,
  );
}

function stopWatchIfIdle(): void {
  if (positionListeners.size > 0 || retainCount > 0 || watchId == null) return;
  navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

/** Keep GPS alive while turn-by-turn navigation is persisted (e.g. app backgrounded). */
export function retainLiveGeolocation(): () => void {
  retainCount += 1;
  ensureWatch();
  return () => {
    retainCount = Math.max(0, retainCount - 1);
    stopWatchIfIdle();
  };
}

export function getLastLiveLatLng(): { lat: number; lng: number } | null {
  if (!lastPosition) return null;
  return {
    lat: lastPosition.coords.latitude,
    lng: lastPosition.coords.longitude,
  };
}

/** Subscribe to a single shared device GPS watch (safe for map + navigation at once). */
export function subscribeLiveGeolocation(
  onPosition: PositionListener,
  onError?: ErrorListener,
): () => void {
  positionListeners.add(onPosition);
  if (onError) errorListeners.add(onError);

  if (lastPosition) {
    try {
      onPosition(lastPosition);
    } catch (error) {
      console.warn('Live geolocation listener failed on replay:', error);
    }
  }

  ensureWatch();

  return () => {
    positionListeners.delete(onPosition);
    if (onError) errorListeners.delete(onError);
    stopWatchIfIdle();
  };
}

export function getLastLivePosition(): GeolocationPosition | null {
  return lastPosition;
}

/** Age of the last cached GPS fix in milliseconds, or null if none. */
export function getLastLivePositionAgeMs(): number | null {
  if (!lastPosition) return null;
  return geolocationAgeMs(lastPosition);
}
