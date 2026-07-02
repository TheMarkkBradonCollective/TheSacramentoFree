import { Compass, Navigation } from 'lucide-react';
import { formatRouteDistance, formatRouteDuration, type LatLng } from '../lib/mapRoute';

export interface MapSelectionRouteRowProps {
  locationHint: string;
  routeEndpoints: { start: LatLng; end: LatLng } | null;
  routeLoading: boolean;
  distanceMeters: number | null;
  durationSeconds: number | null;
  routeOnMap: boolean;
  hasLiveGps: boolean;
  canNavigate?: boolean;
  onStartNavigation?: () => void;
  onOpenExternalMaps?: () => void;
}

export default function MapSelectionRouteRow({
  locationHint,
  routeEndpoints,
  routeLoading,
  distanceMeters,
  durationSeconds,
  routeOnMap,
  hasLiveGps,
  canNavigate = false,
  onStartNavigation,
  onOpenExternalMaps,
}: MapSelectionRouteRowProps) {
  if (!routeEndpoints) {
    return (
      <div className="mt-2 pt-2 border-t border-app">
        <p className="text-[9px] text-muted">Enable GPS to see distance and turn-by-turn navigation.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-app flex items-center gap-2">
      <div className="flex-1 min-w-0">
        {routeLoading ? (
          <p className="text-[9px] font-medium text-muted animate-pulse">Calculating route…</p>
        ) : distanceMeters != null ? (
          <>
            <p className="text-[10px] font-bold text-app leading-snug">
              <span className="text-accent">{formatRouteDistance(distanceMeters)}</span>
              <span className="text-muted font-semibold"> away</span>
              {durationSeconds != null && durationSeconds > 0 && (
                <span className="text-muted font-semibold">
                  {' '}
                  · {formatRouteDuration(durationSeconds)} drive
                </span>
              )}
            </p>
            <p className="text-[8px] text-muted mt-0.5 truncate">{locationHint}</p>
            {!hasLiveGps && (
              <p className="text-[7.5px] text-subtle mt-0.5">Enable GPS for distance from you</p>
            )}
            {!routeOnMap && distanceMeters != null && (
              <p className="text-[7.5px] text-subtle mt-0.5">Road route loading…</p>
            )}
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onStartNavigation?.()}
          disabled={!canNavigate || !onStartNavigation}
          className="sbn-btn sbn-btn-primary sbn-btn-sm disabled:opacity-40"
          title={canNavigate ? 'Start in-app turn-by-turn navigation' : 'Enable GPS to navigate'}
        >
          <Navigation className="w-3.5 h-3.5" />
          Navigate
        </button>
        {onOpenExternalMaps && hasLiveGps && (
          <button
            type="button"
            onClick={onOpenExternalMaps}
            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            title="Open directions in Google or Apple Maps"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
