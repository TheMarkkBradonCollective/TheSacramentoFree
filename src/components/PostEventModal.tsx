import { useEffect, useState } from 'react';
import { X, Calendar, MapPin, Sparkles, Camera, Trash2 } from 'lucide-react';
import { SACRAMENTO_NEIGHBORHOODS, CommunityEvent, UserProfile, findClosestNeighborhoodByLatLng } from '../types';
import { createSupabaseEvent, updateSupabaseEvent, uploadItemImage } from '../supabase';
import EventLocationMapPicker from './EventLocationMapPicker';

interface PostEventModalProps {
  userProfile: UserProfile;
  editEvent?: CommunityEvent | null;
  onClose: () => void;
  onSuccess: () => void;
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostEventModal({
  userProfile,
  editEvent = null,
  onClose,
  onSuccess,
}: PostEventModalProps) {
  const isEditing = !!editEvent;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
  const [hostedBy, setHostedBy] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [eventStartAt, setEventStartAt] = useState('');
  const [eventEndAt, setEventEndAt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!editEvent) return;
    setTitle(editEvent.title);
    setDescription(editEvent.description);
    setLocation(editEvent.location);
    setNeighborhood(editEvent.neighborhood);
    setHostedBy(editEvent.hostedBy || '');
    setLocationLat(
      typeof editEvent.locationLat === 'number' && Number.isFinite(editEvent.locationLat)
        ? editEvent.locationLat
        : null,
    );
    setLocationLng(
      typeof editEvent.locationLng === 'number' && Number.isFinite(editEvent.locationLng)
        ? editEvent.locationLng
        : null,
    );
    setEventStartAt(toDatetimeLocalValue(editEvent.eventStartAt));
    setEventEndAt(editEvent.eventEndAt ? toDatetimeLocalValue(editEvent.eventEndAt) : '');
    setImageUrl(editEvent.imageUrl || null);
    setPendingImage(null);
    setErrorMsg('');
  }, [editEvent]);

  const handleImagePick = (file: File | null) => {
    if (!file) return;
    if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage({ file, preview: URL.createObjectURL(file) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !description.trim() || !location.trim() || !eventStartAt) {
      setErrorMsg('Please fill in title, description, location, and start date/time.');
      return;
    }

    const startDate = new Date(eventStartAt);
    if (Number.isNaN(startDate.getTime())) {
      setErrorMsg('Invalid start date/time.');
      return;
    }

    let endIso: string | null = null;
    if (eventEndAt) {
      const endDate = new Date(eventEndAt);
      if (Number.isNaN(endDate.getTime())) {
        setErrorMsg('Invalid end date/time.');
        return;
      }
      if (endDate <= startDate) {
        setErrorMsg('End time must be after start time.');
        return;
      }
      endIso = endDate.toISOString();
    }

    setIsSubmitting(true);

    const eventId = editEvent?.id || `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    let finalImageUrl = imageUrl;

    if (pendingImage) {
      const uploaded = await uploadItemImage(pendingImage.file, eventId);
      if (uploaded?.startsWith('http')) {
        finalImageUrl = uploaded;
      }
    }

    const event: CommunityEvent = {
      id: eventId,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      neighborhood,
      eventStartAt: startDate.toISOString(),
      eventEndAt: endIso,
      userId: userProfile.uid,
      userDisplayName: userProfile.displayName,
      userPhotoURL: userProfile.photoURL,
      hostedBy: hostedBy.trim() || null,
      locationLat,
      locationLng,
      isFree: true,
      status: editEvent?.status || 'active',
      imageUrl: finalImageUrl || undefined,
      createdAt: editEvent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = isEditing
      ? await updateSupabaseEvent(event)
      : await createSupabaseEvent(event, userProfile);

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMsg(result.errorMessage || 'Could not save event.');
      return;
    }

    onSuccess();
  };

  const previewSrc = pendingImage?.preview || imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-surface border border-app rounded-t-2xl sm:rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post_event_modal_title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-app bg-surface/95 backdrop-blur">
          <div>
            <h2 id="post_event_modal_title" className="font-display font-bold text-app">
              {isEditing ? 'Edit event' : 'Post a free event'}
            </h2>
            <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-accent" />
              All events must be 100% free — no tickets or fees
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-inset text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errorMsg && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Event title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sbn-input w-full"
              placeholder="Neighborhood potluck, clothing swap…"
              required
              maxLength={120}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="sbn-input w-full min-h-[100px] resize-y"
              placeholder="What to bring, who it's for, accessibility notes…"
              required
              maxLength={2000}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Location
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="sbn-input w-full"
              placeholder="Park name, community center, porch address…"
              required
              maxLength={200}
            />
          </label>

          <div className="rounded-xl border border-app bg-inset/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">Map pin (GPS)</p>
            <p className="text-[11px] text-muted">
              Uses the same Leaflet + OpenStreetMap view as the site map. Tap the exact park spot so neighbors find it.
            </p>
            <EventLocationMapPicker
              neighborhood={neighborhood}
              latitude={locationLat}
              longitude={locationLng}
              onCoordinatesChange={(lat, lng) => {
                setLocationLat(lat);
                setLocationLng(lng);
                setNeighborhood(findClosestNeighborhoodByLatLng(lat, lng));
              }}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Neighborhood</span>
            <select
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="sbn-input w-full"
            >
              {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Hosted by</span>
            <input
              type="text"
              value={hostedBy}
              onChange={(e) => setHostedBy(e.target.value)}
              className="sbn-input w-full"
              placeholder="Unknown, your name, group, or organization"
              maxLength={120}
            />
            <p className="text-[11px] text-muted">
              Who is running the gathering? Leave blank to show as Unknown.
            </p>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Starts
              </span>
              <input
                type="datetime-local"
                value={eventStartAt}
                onChange={(e) => setEventStartAt(e.target.value)}
                className="sbn-input w-full"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">Ends (optional)</span>
              <input
                type="datetime-local"
                value={eventEndAt}
                onChange={(e) => setEventEndAt(e.target.value)}
                className="sbn-input w-full"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Photo (optional)</span>
            {previewSrc ? (
              <div className="relative">
                <img
                  src={previewSrc}
                  alt=""
                  className="w-full h-36 object-cover rounded-lg border border-app"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
                    setPendingImage(null);
                    setImageUrl(null);
                  }}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-app rounded-xl cursor-pointer hover:border-accent transition-colors">
                <Camera className="w-6 h-6 text-muted" />
                <span className="text-xs text-muted">Add a flyer or photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleImagePick(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="sbn-btn sbn-btn-primary flex-1">
              {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Post event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
