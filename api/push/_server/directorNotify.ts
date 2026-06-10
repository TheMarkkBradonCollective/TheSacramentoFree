import { isDirectorUser } from './directorIdentity';
import { runPushSend } from './runPushSend';

export async function runDirectorJoinNotify(
  callerId: string,
  profile: { uid: string; displayName?: string; neighborhood?: string; email?: string | null },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const uid = String(profile.uid || '');
  if (!uid || isDirectorUser(uid, profile.email)) {
    return { status: 200, body: { ok: true, skipped: 'not a join alert candidate' } };
  }

  const displayName = String(profile.displayName || 'A neighbor').trim() || 'A neighbor';
  const neighborhood = String(profile.neighborhood || 'Sacramento area').trim() || 'Sacramento area';

  return runPushSend(uid, {
    eventType: 'director_alert',
    title: `New neighbor — ${displayName}`,
    body: `${neighborhood} · joined Sacramento Buy Nothing`,
    url: '/director/overview',
    excludeUserIds: [uid],
    tag: `director-join-${uid}`,
    data: { directorCategory: 'join' },
  });
}

export async function runDirectorLeaveNotify(
  callerId: string,
  profile: {
    uid: string;
    displayName?: string;
    neighborhood?: string;
    email?: string | null;
    detail?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const uid = String(profile.uid || '');
  if (!uid || isDirectorUser(uid, profile.email)) {
    return { status: 200, body: { ok: true, skipped: 'not a departure alert candidate' } };
  }

  const displayName = String(profile.displayName || 'A neighbor').trim() || 'A neighbor';
  const neighborhood = String(profile.neighborhood || 'Sacramento area').trim() || 'Sacramento area';
  const detail = String(profile.detail || 'account deleted').trim() || 'account deleted';

  return runPushSend(uid, {
    eventType: 'director_alert',
    title: `Neighbor left — ${displayName}`,
    body: `${neighborhood} · ${detail}`,
    url: '/director/overview',
    excludeUserIds: [uid],
    tag: `director-leave-${uid}`,
    data: { directorCategory: 'leave' },
  });
}
