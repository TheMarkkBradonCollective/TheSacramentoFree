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

  const eta =
    distanceMeters != null && durationSeconds != null && durationSeconds > 0
      ? `${formatRouteDistance(distanceMeters)} · ${formatRouteDuration(durationSeconds)}`
      : distanceMeters != null
        ? formatRouteDistance(distanceMeters)
        : null;

  return (
    <div className="sbn-map-trip">
      <NavTravelModeSwitcher
        value={travelMode}
        onChange={(mode) => writeNavigationSettings({ travelMode: mode })}
      />
      {!routeEndpoints ? (
        <p className="sbn-map-trip-hint">Enable GPS to see distance and turn-by-turn.</p>
      ) : (
        <div className="sbn-map-trip-row">
          <div className="sbn-map-trip-copy">
            {eta ? (
              <>
                <p className="sbn-map-trip-eta">{eta}</p>
                <p className="sbn-map-trip-hint">{routeOnMap ? locationHint : 'Road route loading…'}</p>
              </>
            ) : routeLoading ? (
              <p className="sbn-map-trip-hint animate-pulse">Calculating route…</p>
            ) : (
              <p className="sbn-map-trip-hint">{locationHint}</p>
            )}
          </div>
          {(showNavigateButton || (onOpenExternalMaps && hasLiveGps)) && (
            <div className="sbn-map-trip-actions">
              {showNavigateButton && (
                <button
                  type="button"
                  onClick={() => onStartNavigation?.()}
                  disabled={!canNavigate || !onStartNavigation}
                  className="sbn-btn sbn-btn-primary sbn-btn-sm disabled:opacity-40"
                  title={canNavigate ? `Start: ${navigateLabel}` : `Enable GPS to ${navigateLabel.toLowerCase()}`}
                  aria-label={canNavigate ? `Start: ${navigateLabel}` : `Enable GPS to ${navigateLabel.toLowerCase()}`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{navigateLabel}</span>
                </button>
              )}
              {onOpenExternalMaps && hasLiveGps && (
                <button
                  type="button"
                  onClick={onOpenExternalMaps}
                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                  title="Open directions in Google or Apple Maps"
                  aria-label="Open directions in Google or Apple Maps"
                >
                  <Compass className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
