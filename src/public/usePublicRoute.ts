import { useCallback, useEffect, useState } from 'react';
import { parsePublicRoute, publicRouteHref, type PublicRoute } from './routes';

export function usePublicRoute() {
  const [route, setRoute] = useState<PublicRoute>(() =>
    parsePublicRoute(typeof window !== 'undefined' ? window.location.hash : ''),
  );

  useEffect(() => {
    const sync = () => setRoute(parsePublicRoute(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const navigate = useCallback((next: PublicRoute) => {
    const href = publicRouteHref(next);
    if (window.location.hash !== href) {
      window.location.hash = href;
    } else {
      setRoute(next);
    }
  }, []);

  return { route, navigate };
}
