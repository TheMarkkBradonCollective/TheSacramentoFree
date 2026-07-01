import type { LatLng } from './mapRoute';

const ACTIVE_NAV_STORAGE_KEY = 'sbn_active_nav_session_v1';

/** Max age before an unstopped session is treated as stale (12 hours). */
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface ActiveNavSession {
  userId: string;
  postId: string;
  destination: LatLng;
  destinationLabel: string;
  startedAt: number;
  updatedAt: number;
}

function readRawSession(): ActiveNavSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_NAV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveNavSession;
    if (
      !parsed?.userId ||
      !parsed?.postId ||
      typeof parsed.destination?.lat !== 'number' ||
      typeof parsed.destination?.lng !== 'number' ||
      !parsed.destinationLabel
    ) {
      return null;
    }
    const age = Date.now() - (parsed.updatedAt ?? parsed.startedAt ?? 0);
    if (age > SESSION_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readActiveNavSession(userId?: string): ActiveNavSession | null {
  const session = readRawSession();
  if (!session) return null;
  if (userId && session.userId !== userId) return null;
  return session;
}

export function hasActiveNavSession(userId?: string): boolean {
  return readActiveNavSession(userId) != null;
}

export function saveActiveNavSession(session: Omit<ActiveNavSession, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  const payload: ActiveNavSession = {
    ...session,
    updatedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(ACTIVE_NAV_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be unavailable in private mode.
  }
}

export function touchActiveNavSession(): void {
  const session = readRawSession();
  if (!session) return;
  saveActiveNavSession(session);
}

export function clearActiveNavSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACTIVE_NAV_STORAGE_KEY);
  } catch {
    // ignore
  }
}
