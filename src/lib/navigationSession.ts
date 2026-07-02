import type { LatLng } from './mapRoute';

const ACTIVE_NAV_STORAGE_KEY = 'sbn_active_nav_session_v1';

/** Max age before an unstopped session is treated as stale (12 hours). */
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type NavTargetType = 'post' | 'event';

export interface ActiveNavSession {
  userId: string;
  targetType: NavTargetType;
  targetId: string;
  /** Legacy field — kept for older saved sessions. */
  postId?: string;
  destination: LatLng;
  destinationLabel: string;
  startedAt: number;
  updatedAt: number;
}

function normalizeSession(parsed: Partial<ActiveNavSession> | null): ActiveNavSession | null {
  if (!parsed?.userId || !parsed.destinationLabel) return null;
  if (typeof parsed.destination?.lat !== 'number' || typeof parsed.destination?.lng !== 'number') {
    return null;
  }

  const targetType: NavTargetType =
    parsed.targetType === 'event' ? 'event' : parsed.targetType === 'post' ? 'post' : 'post';
  const targetId = parsed.targetId || parsed.postId;
  if (!targetId) return null;

  const startedAt = parsed.startedAt ?? Date.now();
  const updatedAt = parsed.updatedAt ?? startedAt;
  const age = Date.now() - updatedAt;
  if (age > SESSION_MAX_AGE_MS) return null;

  return {
    userId: parsed.userId,
    targetType,
    targetId,
    postId: targetType === 'post' ? targetId : parsed.postId,
    destination: parsed.destination,
    destinationLabel: parsed.destinationLabel,
    startedAt,
    updatedAt,
  };
}

function readRawSession(): ActiveNavSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_NAV_STORAGE_KEY);
    if (!raw) return null;
    return normalizeSession(JSON.parse(raw) as Partial<ActiveNavSession>);
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
    postId: session.targetType === 'post' ? session.targetId : session.postId,
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
