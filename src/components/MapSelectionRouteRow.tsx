import { Compass, Navigation } from 'lucide-react';
import { formatRouteDistance, formatRouteDuration, type LatLng } from '../lib/mapRoute';
import {
  readNavigationSettings,
  subscribeNavigationSettings,
  travelModeGerund,
  writeNavigationSettings,
  type NavTravelMode,
} from '../lib/navigationSettings';
import { useEffect, useState } from 'react';
import NavTravelModeSwitcher from './NavTravelModeSwitcher';

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
  /** "Go Get" for eligible listings (giveaway/looking/trade); plain "Navigate" for events. */
  navigateLabel?: string;
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
  navigateLabel = 'Navigate',
}: MapSelectionRouteRowProps) {
  const [travelMode, setTravelMode] = useState<NavTravelMode>(() => readNavigationSettings().travelMode);
  useEffect(() => subscribeNavigationSettings((settings) => setTravelMode(settings.travelMode)), []);

  if (!routeEndpoints) {
    return (
      <div className="mt-2 pt-2 border-t border-app space-y-2">
        <NavTravelModeSwitcher
          value={travelMode}
          onChange={(mode) => writeNavigationSettings({ travelMode: mode })}
        />
        <p className="text-[9px] text-muted">Enable GPS to see distance and turn-by-turn navigation.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-app space-y-2">
      <NavTravelModeSwitcher
        value={travelMode}
        onChange={(mode) => writeNavigationSettings({ travelMode: mode })}
      />
      <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        {distanceMeters != null ? (
          <>
            <p className="text-[10px] font-bold text-app leading-snug">
              <span className="text-accent">{formatRouteDistance(distanceMeters)}</span>
              <span className="text-muted font-semibold"> away</span>
              {durationSeconds != null && durationSeconds > 0 && (
                <span className="text-muted font-semibold">
                  {' '}
                  · {formatRouteDuration(durationSeconds)} {travelModeGerund(travelMode)}
                </span>
              )}
            </p>
            <p className="text-[8px] text-muted mt-0.5 truncate">{locationHint}</p>
            {!hasLiveGps && (
              <p className="text-[7.5px] text-subtle mt-0.5">Enable GPS for distance from you</p>
            )}
            {!routeOnMap && (
              <p className="text-[7.5px] text-subtle mt-0.5">Road route loading…</p>
            )}
          </>
        ) : routeLoading ? (
          <p className="text-[9px] font-medium text-muted animate-pulse">Calculating route…</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onStartNavigation?.()}
          disabled={!canNavigate || !onStartNavigation}
          className="sbn-btn sbn-btn-primary sbn-btn-sm disabled:opacity-40"
          title={canNavigate ? `Start: ${navigateLabel}` : `Enable GPS to ${navigateLabel.toLowerCase()}`}
        >
          <Navigation className="w-3.5 h-3.5" />
          {navigateLabel}
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
    </div>
  );
}
