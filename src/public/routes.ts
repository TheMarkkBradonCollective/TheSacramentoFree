export const PUBLIC_ROUTES = {
  home: 'home',
  about: 'about',
  'how-it-works': 'how-it-works',
  rules: 'rules',
  neighborhoods: 'neighborhoods',
  community: 'community',
  updates: 'updates',
  reviews: 'reviews',
  gofundme: 'gofundme',
  privacy: 'privacy',
  terms: 'terms',
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
  'gofundme',
  'privacy',
  'terms',
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

export function parsePublicRoute(hash: string): PublicRoute {
  const path = hash.replace(/^#\/?/, '').split('?')[0].trim().toLowerCase();
  if (path === '' || path === 'home') return 'home';
  if (PUBLIC_ROUTE_LIST.includes(path as PublicRoute)) {
    return path as PublicRoute;
  }
  return 'not-found';
}

export function isKnownPublicRoute(hash: string): boolean {
  const path = hash.replace(/^#\/?/, '').split('?')[0].trim().toLowerCase();
  if (path === '' || path === 'home') return true;
  return PUBLIC_ROUTE_LIST.includes(path as PublicRoute);
}

export function publicRouteHref(route: PublicRoute): string {
  return route === 'home' ? '#/' : `#/${route}`;
}
