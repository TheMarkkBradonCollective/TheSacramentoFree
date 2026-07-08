import { useEffect, useState } from 'react';
import { MessageCircle, Navigation2 } from 'lucide-react';
import type { GoGetLiveLocation } from '../../types';
import { formatRouteDistance, formatRouteDuration } from '../../lib/mapRoute';
import { getLiveLocation, subscribeToLiveLocationChanges } from '../../lib/goGetSessions';

interface GoGetLiveTrackingCardProps {
  sessionId: string;
  requesterName: string;
  destinationLabel: string;
  onOpenChat: () => void;
}

/** Fulfiller-side "Uber driver approaching" style card — ETA + distance only, never a raw map pin of a private device. */
export default function GoGetLiveTrackingCard({
  sessionId,
  requesterName,
  destinationLabel,
  onOpenChat,
}: GoGetLiveTrackingCardProps) {
  const [location, setLocation] = useState<GoGetLiveLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getLiveLocation(sessionId).then((loc) => {
      if (!cancelled) setLocation(loc);
    });
    const unsubscribe = subscribeToLiveLocationChanges(sessionId, (loc) => {
      if (!cancelled) setLocation(loc);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sessionId]);

  return (
    <div className="sbn-card p-4 space-y-3" id="go_get_live_tracking_card">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <p className="text-sm font-bold text-app">{requesterName} is on the way</p>
      </div>

      {location ? (
        <div className="flex items-center gap-3 rounded-xl bg-inset p-3">
          <Navigation2 className="w-5 h-5 text-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-app tabular-nums leading-none">
              {location.etaSeconds != null ? formatRouteDuration(location.etaSeconds) : '—'}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {location.distanceMeters != null ? `${formatRouteDistance(location.distanceMeters)} away` : 'Tracking…'}
              {' · '}heading to {destinationLabel}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted">Waiting for their live location…</p>
      )}

      <button type="button" onClick={onOpenChat} className="sbn-btn sbn-btn-secondary w-full justify-center">
        <MessageCircle className="w-4 h-4" />
        Message {requesterName}
      </button>
    </div>
  );
}
