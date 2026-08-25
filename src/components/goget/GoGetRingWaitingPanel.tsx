import { useEffect, useState } from 'react';
import { Loader2, PhoneOff } from 'lucide-react';
import type { GoGetSession, ItemPost } from '../../types';
import { expireGoGetRing, isGoGetRingActive } from '../../lib/goGetSessions';
import { formatRingCountdown } from '../../lib/pickupEngine';

interface GoGetRingWaitingPanelProps {
  session: GoGetSession;
  item: ItemPost;
  posterName: string;
  onSessionChange: (session: GoGetSession) => void;
  onCancel: () => void;
  onRingExpired: () => void;
}

export default function GoGetRingWaitingPanel({
  session,
  item,
  posterName,
  onSessionChange,
  onCancel,
  onRingExpired,
}: GoGetRingWaitingPanelProps) {
  const [remaining, setRemaining] = useState(() => computeRemaining(session));
  const [expiring, setExpiring] = useState(false);

  useEffect(() => {
    const tick = () => {
      const next = computeRemaining(session);
      setRemaining(next);
      if (next <= 0 && session.status === 'awaiting_availability') {
        void handleExpire();
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [session.id, session.status, session.ringExpiresAt]);

  const handleExpire = async () => {
    if (expiring || session.status !== 'awaiting_availability') return;
    if (isGoGetRingActive(session)) return;
    setExpiring(true);
    const result = await expireGoGetRing(session, item);
    setExpiring(false);
    if (result.ok && result.session) {
      onSessionChange(result.session);
      onRingExpired();
    }
  };

  return (
    <div className="sbn-card p-4 space-y-3 border border-accent/30 bg-accent/5" id="go_get_ring_waiting">
      <div className="flex items-start gap-3">
        <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-app">Waiting for {posterName}</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {remaining > 0
              ? `Their phone is ringing. You'll hear back here when they answer.`
              : `No response yet. You can propose a pickup time.`}
          </p>
          <p className="text-2xl font-black font-mono text-accent mt-2 tabular-nums">
            {remaining > 0 ? formatRingCountdown(remaining) : '0:00'}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-muted truncate">"{item.title}"</p>
      <button
        type="button"
        onClick={onCancel}
        className="sbn-btn sbn-btn-secondary sbn-btn-sm w-full"
      >
        <PhoneOff className="w-3.5 h-3.5" />
        Cancel request
      </button>
    </div>
  );
}

function computeRemaining(session: GoGetSession): number {
  if (!session.ringExpiresAt) return session.ringDurationSeconds ?? 140;
  const ms = new Date(session.ringExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
}
