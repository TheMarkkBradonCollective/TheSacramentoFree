import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import type { GoGetSession } from '../../types';
import { subscribeLiveGeolocation } from '../../lib/liveGeolocation';
import { setFulfillerSharingLocation, upsertFulfillerLiveLocation } from '../../lib/goGetSessions';

interface GoGetShareLocationToggleProps {
  session: GoGetSession;
  pickerName: string;
  onSessionChange: (session: GoGetSession) => void;
  onError?: (message: string) => void;
}

const UPLOAD_INTERVAL_MS = 4000;

/** Fulfiller-side opt-in to share live location so the picker can find them at the meetup. */
export default function GoGetShareLocationToggle({
  session,
  pickerName,
  onSessionChange,
  onError,
}: GoGetShareLocationToggleProps) {
  const [busy, setBusy] = useState(false);
  const sharing = session.fulfillerSharingLocation === true;
  const lastUploadRef = useRef(0);

  useEffect(() => {
    if (!sharing) return;

    const upload = (lat: number, lng: number, heading: number | null) => {
      const now = Date.now();
      if (now - lastUploadRef.current < UPLOAD_INTERVAL_MS) return;
      lastUploadRef.current = now;
      void upsertFulfillerLiveLocation(session.id, { lat, lng, heading });
    };

    const unsubscribe = subscribeLiveGeolocation((position) => {
      upload(
        position.coords.latitude,
        position.coords.longitude,
        Number.isFinite(position.coords.heading) ? position.coords.heading : null,
      );
    });

    return unsubscribe;
  }, [sharing, session.id]);

  const handleToggle = async () => {
    setBusy(true);
    const result = await setFulfillerSharingLocation(session, !sharing);
    setBusy(false);
    if (!result.ok || !result.session) {
      onError?.(result.errorMessage || 'Could not update location sharing.');
      return;
    }
    onSessionChange(result.session);
    if (!sharing) {
      lastUploadRef.current = 0;
    }
  };

  return (
    <div className="rounded-xl border border-app bg-inset p-3 space-y-2" id="go_get_share_location_toggle">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-app flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent shrink-0" />
            Share my location
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Let {pickerName} see where you actually are — helpful when the pickup spot is a big area or you're not
            right at the pin.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={sharing}
          disabled={busy}
          onClick={() => void handleToggle()}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            sharing ? 'bg-accent' : 'bg-muted/40'
          }`}
          id="go_get_share_location_switch"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              sharing ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {busy && (
        <p className="text-[11px] text-muted flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Updating…
        </p>
      )}
      {sharing && !busy && (
        <p className="text-[11px] text-emerald-500 font-medium">Your live location is visible to {pickerName}.</p>
      )}
    </div>
  );
}
