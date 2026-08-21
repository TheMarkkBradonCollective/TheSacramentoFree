export const PUBLIC_ROUTES = {
  home: 'home',
  about: 'about',
  'how-it-works': 'how-it-works',
  rules: 'rules',
  neighborhoods: 'neighborhoods',
  community: 'community',
  updates: 'updates',
  reviews: 'reviews',
  download: 'download',
  gofundme: 'gofundme',
  privacy: 'privacy',
  'delete-account': 'delete-account',
  terms: 'terms',
  'child-safety': 'child-safety',
  login: 'login',
  'not-found': 'not-found',
} as const;

export type PublicRoute = keyof typeof PUBLIC_ROUTES;

export const PUBLIC_ROUTE_LIST: PublicRoute[] = [
  'home',
  'about',
  'how-it-works',
  'rules',
  'neighborhoods',
  'community',
  'updates',
  'reviews',
  'download',
  'gofundme',
  'privacy',
  'delete-account',
  'terms',
  'child-safety',
  'login',
  'not-found',
];

export const PUBLIC_NAV: { route: PublicRoute; label: string }[] = [
  { route: 'home', label: 'Home' },
  { route: 'about', label: 'About' },
  { route: 'how-it-works', label: 'How It Works' },
  { route: 'rules', label: 'Rules' },
  { route: 'neighborhoods', label: 'Neighborhoods' },
  { route: 'community', label: 'Community' },
];

/** Authenticated app tabs — never treat these as public marketing routes. */
const APP_TAB_PATHS = new Set(['feed', 'stuff', 'events', 'map', 'chats', 'profile']);

export function normalizePublicPath(raw: string): string {
  return raw.replace(/^\/+/, '').split('?')[0].split('#')[0].trim().toLowerCase().replace(/\/+$/, '');
}

export function parsePublicRoute(hash: string): PublicRoute {
  const path = normalizePublicPath(hash.replace(/^#\/?/, ''));
  if (path === '' || path === 'home') return 'home';
  if (path === 'news' || path === 'announcements') return 'updates';
  if (PUBLIC_ROUTE_LIST.includes(path as PublicRoute)) {
    return path as PublicRoute;
  }
  return 'not-found';
}

/** True when a pathname (without leading slash) is a known public marketing page. */
export function isPublicPathname(pathname: string): boolean {
  const path = normalizePublicPath(pathname);
  if (path === '' || path === 'home') return true;
  if (APP_TAB_PATHS.has(path)) return false;
  return PUBLIC_ROUTE_LIST.includes(path as PublicRoute);
}

export function publicRouteFromPathname(pathname: string): PublicRoute | null {
  const path = normalizePublicPath(pathname);
  if (path === '' || path === 'home') return 'home';
  if (APP_TAB_PATHS.has(path)) return null;
  if (path === 'news' || path === 'announcements') return 'updates';
  if (PUBLIC_ROUTE_LIST.includes(path as PublicRoute)) {
    return path as PublicRoute;
  }
  return null;
}

export function isKnownPublicRoute(hash: string): boolean {
  const path = normalizePublicPath(hash.replace(/^#\/?/, ''));
  if (path === '' || path === 'home') return true;
  return PUBLIC_ROUTE_LIST.includes(path as PublicRoute);
}

export function publicRouteHref(route: PublicRoute): string {
  return route === 'home' ? '#/' : `#/${route}`;
}

export function isDownloadRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    publicRouteFromPathname(window.location.pathname) === 'download' ||
    parsePublicRoute(window.location.hash) === 'download'
  );
}

export function downloadPagePath(): string {
  return '/download';
}

/**
 * If the visitor landed on a clean path like `/about` (no hash), rewrite to `#/about`
 * so the public hash router and shareable links stay consistent.
 * Returns the public route that was bridged, or null when nothing changed.
 */
export function bridgePathnameToPublicHash(): PublicRoute | null {
  if (typeof window === 'undefined') return null;
  const { pathname, hash, search } = window.location;
  if (hash && hash !== '#' && hash !== '#/') return null;

  const route = publicRouteFromPathname(pathname);
  if (!route) return null;
  // Root with no hash is already home — PublicSite seeds `#/` itself.
  if (route === 'home' && (pathname === '/' || pathname === '')) return null;

  const nextHash = publicRouteHref(route);
  try {
    window.history.replaceState(window.history.state, '', `${pathname}${search}${nextHash}`);
  } catch {
    window.location.hash = nextHash;
  }
  return route;
}
