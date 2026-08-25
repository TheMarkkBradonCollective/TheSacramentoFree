import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getUsersLastActive, touchLastActive } from '../supabase';
import { isPlayStoreDemo } from '../preview/playStoreDemo';

interface PresenceContextValue {
  getLastActive: (uid: string) => string | null | undefined;
  trackUids: (uids: string[]) => void;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

const HEARTBEAT_MS = 60_000;
const REFRESH_MS = 90_000;

export function PresenceProvider({
  userId,
  children,
}: {
  userId?: string;
  children: ReactNode;
}) {
  const [presenceMap, setPresenceMap] = useState<Record<string, string | null>>({});
  const trackedRef = useRef<Set<string>>(new Set());

  const refreshTracked = useCallback(async () => {
    if (isPlayStoreDemo()) return;
    const uids = [...trackedRef.current];
    if (uids.length === 0) return;
    const next = await getUsersLastActive(uids);
    setPresenceMap((prev) => ({ ...prev, ...next }));
  }, []);

  const trackUids = useCallback(
    (uids: string[]) => {
      let added = false;
      for (const uid of uids) {
        if (!uid || trackedRef.current.has(uid)) continue;
        trackedRef.current.add(uid);
        added = true;
      }
      if (added) void refreshTracked();
    },
    [refreshTracked],
  );

  const getLastActive = useCallback(
    (uid: string) => presenceMap[uid],
    [presenceMap],
  );

  useEffect(() => {
    if (!userId) return;

    const ping = () => {
      void touchLastActive();
    };

    ping();
    const heartbeat = window.setInterval(ping, HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const timer = window.setInterval(() => {
      void refreshTracked();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [userId, refreshTracked]);

  const value = useMemo(() => ({ getLastActive, trackUids }), [getLastActive, trackUids]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(uid?: string | null): string | null | undefined {
  const ctx = useContext(PresenceContext);
  if (!uid) return undefined;
  return ctx?.getLastActive(uid);
}

export function useTrackPresence(uids: string[]) {
  const ctx = useContext(PresenceContext);
  const key = uids.filter(Boolean).sort().join(',');

  useEffect(() => {
    if (!ctx || !key) return;
    ctx.trackUids(key.split(','));
  }, [ctx, key]);
}
