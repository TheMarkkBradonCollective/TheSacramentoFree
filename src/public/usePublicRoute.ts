import { useCallback, useEffect, useState } from 'react';
import {
  bridgePathnameToPublicHash,
  parsePublicRoute,
  publicRouteHref,
  type PublicRoute,
} from './routes';

function readCurrentPublicRoute(): PublicRoute {
  if (typeof window === 'undefined') return 'home';
  bridgePathnameToPublicHash();
  return parsePublicRoute(window.location.hash);
}

export function usePublicRoute() {
  const [route, setRoute] = useState<PublicRoute>(readCurrentPublicRoute);

  useEffect(() => {
    const sync = () => {
      bridgePathnameToPublicHash();
      setRoute(parsePublicRoute(window.location.hash));
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
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
