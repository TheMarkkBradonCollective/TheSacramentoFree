import { useEffect, useState } from 'react';
import { Clock, Loader2, PhoneOff } from 'lucide-react';
import type { GoGetSession, ItemPost } from '../../types';
import { expireGoGetRing, isGoGetRingActive } from '../../lib/goGetSessions';

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
    const result = await expireGoGetRing(session);
    setExpiring(false);
    if (result.ok && result.session) {
      onSessionChange(result.session);
      onRingExpired();
    }
  };

  const total = session.ringDurationSeconds ?? 140;

  return (
    <div className="sbn-card p-4 space-y-3 border border-accent/30 bg-accent/5" id="go_get_ring_waiting">
      <div className="flex items-start gap-3">
        <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-app">Checking if {posterName} is available now</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Their phone is ringing for up to {total} seconds — like a delivery alert. You’ll hear back here
            when they answer or when the timer ends.
          </p>
          <p className="text-xs font-mono text-accent mt-2">
            {remaining > 0 ? `${remaining}s remaining` : 'Ring window ended'}
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
