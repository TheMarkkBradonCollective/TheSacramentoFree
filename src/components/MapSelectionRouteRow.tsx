import { Compass, Navigation } from 'lucide-react';
import { formatRouteDistance, formatRouteDuration, type LatLng } from '../lib/mapRoute';
import {
  readNavigationSettings,
  subscribeNavigationSettings,
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
  /** Hide the primary navigate button (parent shows it in a pinned footer). */
  showNavigateButton?: boolean;
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
  showNavigateButton = true,
}: MapSelectionRouteRowProps) {
  const [travelMode, setTravelMode] = useState<NavTravelMode>(() => readNavigationSettings().travelMode);
  useEffect(() => subscribeNavigationSettings((settings) => setTravelMode(settings.travelMode)), []);

  const etaLabel =
    distanceMeters != null && durationSeconds != null && durationSeconds > 0
      ? formatRouteDuration(durationSeconds)
      : distanceMeters != null
        ? formatRouteDistance(distanceMeters)
        : null;
  const distanceLabel =
    distanceMeters != null && durationSeconds != null && durationSeconds > 0
      ? formatRouteDistance(distanceMeters)
      : null;

  return (
    <div className="sbn-gps-trip">
      <NavTravelModeSwitcher
        variant="gps"
        value={travelMode}
        onChange={(mode) => writeNavigationSettings({ travelMode: mode })}
      />

      {!routeEndpoints ? (
        <p className="sbn-gps-trip-hint">Enable GPS to see distance and turn-by-turn navigation.</p>
      ) : (
        <div className="sbn-gps-trip-row">
          <div className="sbn-gps-trip-copy">
            {etaLabel ? (
              <>
                <p className="sbn-gps-trip-eta">
                  {etaLabel}
                  {distanceLabel ? <span className="sbn-gps-trip-dist"> ({distanceLabel})</span> : null}
                </p>
                <p className="sbn-gps-trip-hint">{locationHint}</p>
                {!hasLiveGps && (
                  <p className="sbn-gps-trip-hint">Enable GPS for distance from you</p>
                )}
                {!routeOnMap && (
                  <p className="sbn-gps-trip-hint">Road route loading…</p>
                )}
              </>
            ) : routeLoading ? (
              <p className="sbn-gps-trip-hint animate-pulse">Calculating route…</p>
            ) : (
              <p className="sbn-gps-trip-hint">{locationHint}</p>
            )}
          </div>
          {showNavigateButton && (
            <button
              type="button"
              onClick={() => onStartNavigation?.()}
              disabled={!canNavigate || !onStartNavigation}
              className="sbn-gps-start-btn is-inline"
              title={canNavigate ? `Start: ${navigateLabel}` : `Enable GPS to ${navigateLabel.toLowerCase()}`}
            >
              <Navigation className="w-4 h-4" />
              {navigateLabel}
            </button>
          )}
          {onOpenExternalMaps && hasLiveGps && (
            <button
              type="button"
              onClick={onOpenExternalMaps}
              className="sbn-gps-icon-btn"
              title="Open directions in Google or Apple Maps"
              aria-label="Open directions in Google or Apple Maps"
            >
              <Compass className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
