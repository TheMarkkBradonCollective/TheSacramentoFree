export const PUBLIC_ROUTES = {
  home: 'home',
  about: 'about',
  'how-it-works': 'how-it-works',
  rules: 'rules',
  neighborhoods: 'neighborhoods',
  community: 'community',
  updates: 'updates',
  login: 'login',
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
  'login',
];

export const PUBLIC_NAV: { route: PublicRoute; label: string }[] = [
  { route: 'home', label: 'Home' },
  { route: 'about', label: 'About' },
  { route: 'how-it-works', label: 'How It Works' },
  { route: 'rules', label: 'Rules' },
  { route: 'neighborhoods', label: 'Areas' },
  { route: 'community', label: 'Community' },
];

export function parsePublicRoute(hash: string): PublicRoute {
  const path = hash.replace(/^#\/?/, '').split('?')[0].trim().toLowerCase();
  if (path === '' || path === 'home') return 'home';
  if (PUBLIC_ROUTE_LIST.includes(path as PublicRoute)) {
    return path as PublicRoute;
  }
  return 'home';
}

export function publicRouteHref(route: PublicRoute): string {
  return route === 'home' ? '#/' : `#/${route}`;
}
