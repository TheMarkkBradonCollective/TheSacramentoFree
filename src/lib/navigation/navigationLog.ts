export type NavigationLogEvent =
  | 'GPS_PERMISSION_DENIED'
  | 'GPS_UNAVAILABLE'
  | 'GPS_LOW_ACCURACY'
  | 'GPS_TIMEOUT'
  | 'GPS_STALE'
  | 'GPS_REJECTED_JUMP'
  | 'GPS_STATIONARY_SUPPRESSED'
  | 'ROUTE_REQUEST_FAILED'
  | 'ROUTE_EMPTY'
  | 'OFF_ROUTE'
  | 'REROUTE_FAILED'
  | 'REROUTE_STARTED'
  | 'MAP_LOAD_FAILED'
  | 'NETWORK_OFFLINE'
  | 'NAVIGATION_STARTED'
  | 'NAVIGATION_ENDED'
  | 'ARRIVED';

type NavigationLogDetail = Record<string, string | number | boolean | null | undefined>;

/** Structured navigation logging — never logs precise coordinates. */
export function logNavigationEvent(event: NavigationLogEvent, detail?: NavigationLogDetail): void {
  if (typeof console === 'undefined') return;
  const payload = detail ? { event, ...detail } : { event };
  if (event.includes('FAILED') || event.includes('DENIED') || event === 'GPS_UNAVAILABLE') {
    console.warn('[navigation]', payload);
    return;
  }
  console.info('[navigation]', payload);
}
