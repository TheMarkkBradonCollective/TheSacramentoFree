import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { CommunityEvent, findClosestNeighborhoodByLatLng } from '../types';
import { updateSupabaseEvent, updateSupabaseEventSeriesLocation } from '../supabase';
import { isEventEditable } from '../lib/eventRsvp';
import { isSeriesEvent } from '../lib/eventSeries';
import EventLocationMapPicker from './EventLocationMapPicker';

interface EventPinAdjustModalProps {
  event: CommunityEvent;
  onClose: () => void;
  onSaved: (event: CommunityEvent) => void;
}

export default function EventPinAdjustModal({ event, onClose, onSaved }: EventPinAdjustModalProps) {
  const editBlocked = !isEventEditable(event);
  const [latitude, setLatitude] = useState<number | null>(event.locationLat ?? null);
  const [longitude, setLongitude] = useState<number | null>(event.locationLng ?? null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (editBlocked) {
      setErrorMsg('Past and cancelled events cannot be edited.');
      return;
    }

    if (latitude === null || longitude === null) {
      setErrorMsg('Tap the map to place a pin before saving.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const neighborhood = findClosestNeighborhoodByLatLng(latitude, longitude);
    const updatedEvent: CommunityEvent = {
      ...event,
      locationLat: latitude,
      locationLng: longitude,
      neighborhood,
      updatedAt: new Date().toISOString(),
    };

    const result =
      isSeriesEvent(event) && event.seriesId
        ? await updateSupabaseEventSeriesLocation(
            event.seriesId,
            event.userId,
            latitude,
            longitude,
            neighborhood,
          )
        : await updateSupabaseEvent(updatedEvent);
    setSaving(false);

    if (!result.ok) {
      setErrorMsg(result.errorMessage || 'Could not save map pin.');
      return;
    }

    onSaved(updatedEvent);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto bg-surface border border-app rounded-t-2xl sm:rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event_pin_adjust_title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-app bg-surface/95 backdrop-blur">
          <div>
            <h2 id="event_pin_adjust_title" className="font-display font-bold text-app flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              Fix event map pin
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {isSeriesEvent(event)
                ? 'Pin applies to every upcoming date in this repeat series.'
                : 'Same map as the site — tap Fremont Park to line it up.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-inset text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {editBlocked && (
            <p className="text-sm text-muted bg-inset border border-app rounded-lg px-3 py-2">
              This event can no longer be edited.
            </p>
          )}

          {errorMsg && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <EventLocationMapPicker
            neighborhood={event.neighborhood}
            latitude={latitude}
            longitude={longitude}
            onCoordinatesChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
              setErrorMsg('');
            }}
          />

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || editBlocked}
              className="sbn-btn sbn-btn-primary flex-1"
            >
              {saving ? 'Saving…' : 'Save pin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
