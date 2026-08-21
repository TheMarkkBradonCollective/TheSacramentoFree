import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import type { GoGetSession, UserProfile } from '../../types';
import { expireGoGetRing } from '../../lib/goGetSessions';
import { subscribePostgresChanges } from '../../lib/supabaseRealtime';
import GoGetIncomingRingOverlay from './GoGetIncomingRingOverlay';

interface GoGetRingCoordinatorProps {
  userProfile: UserProfile | null;
}

function normalizeIncomingSession(row: Record<string, unknown>): GoGetSession | null {
  const status = String(row.status ?? '');
  if (status !== 'awaiting_availability') return null;
  const ringExpires = row.ringExpiresAt ? new Date(String(row.ringExpiresAt)).getTime() : Infinity;
  if (Date.now() >= ringExpires) return null;
  return {
    id: String(row.id),
    itemId: String(row.itemId),
    itemType: row.itemType as GoGetSession['itemType'],
    fulfillerUserId: String(row.fulfillerUserId),
    fulfillerName: String(row.fulfillerName ?? 'Neighbor'),
    requesterUserId: String(row.requesterUserId),
    requesterName: String(row.requesterName ?? 'Neighbor'),
    chatId: String(row.chatId),
    handshakeMode: (row.handshakeMode as GoGetSession['handshakeMode']) ?? 'availability',
    status: 'awaiting_availability',
    destinationLat: Number(row.destinationLat),
    destinationLng: Number(row.destinationLng),
    destinationLabel: String(row.destinationLabel ?? 'Pickup'),
    ringExpiresAt: row.ringExpiresAt ? String(row.ringExpiresAt) : null,
    ringDurationSeconds: typeof row.ringDurationSeconds === 'number' ? row.ringDurationSeconds : null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

export default function GoGetRingCoordinator({ userProfile }: GoGetRingCoordinatorProps) {
  const [ringSession, setRingSession] = useState<GoGetSession | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [pendingExpire, setPendingExpire] = useState<GoGetSession | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) {
      setRingSession(null);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from('go_get_sessions')
        .select('*')
        .eq('fulfillerUserId', userProfile.uid)
        .eq('status', 'awaiting_availability')
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return;
      const session = normalizeIncomingSession(data as Record<string, unknown>);
      if (!session || session.id === dismissedId) return;
      setRingSession(session);
      setPendingExpire(session);
    };

    void load();

    return subscribePostgresChanges(
      {
        channelName: `go-get-ring-${userProfile.uid}`,
        table: 'go_get_sessions',
        event: '*',
        filter: `fulfillerUserId=eq.${userProfile.uid}`,
      },
      () => void load(),
    );
  }, [userProfile?.uid, dismissedId]);

  // Keep expiry armed after the overlay is dismissed so the requester is not stuck.
  useEffect(() => {
    if (!pendingExpire?.ringExpiresAt) return;
    const session = pendingExpire;
    const delay = new Date(session.ringExpiresAt as string).getTime() - Date.now() + 250;
    const id = window.setTimeout(() => {
      void expireGoGetRing(session).then((result) => {
        if (!result.ok) return;
        setDismissedId(session.id);
        setRingSession(null);
        setPendingExpire(null);
      });
    }, Math.max(0, delay));
    return () => window.clearTimeout(id);
  }, [pendingExpire?.id, pendingExpire?.ringExpiresAt]);

  if (!userProfile || !ringSession || ringSession.id === dismissedId) return null;

  return (
    <GoGetIncomingRingOverlay
      session={ringSession}
      userProfile={userProfile}
      onClose={() => {
        setDismissedId(ringSession.id);
        setRingSession(null);
      }}
      onSessionResolved={() => {
        setDismissedId(ringSession.id);
        setRingSession(null);
        setPendingExpire(null);
      }}
    />
  );
}
