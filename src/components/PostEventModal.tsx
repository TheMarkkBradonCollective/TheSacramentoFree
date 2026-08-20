import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, MapPin, Sparkles, Camera, Trash2, Plus, Repeat } from 'lucide-react';
import { SACRAMENTO_NEIGHBORHOODS, CommunityEvent, UserProfile, findClosestNeighborhoodByLatLng } from '../types';
import {
  assignSupabaseEventSeriesId,
  createSupabaseEvent,
  createSupabaseEventSeries,
  updateSupabaseEvent,
  updateSupabaseEventSeriesMetadata,
  uploadItemImage,
} from '../supabase';
import { isEventEditable } from '../lib/eventRsvp';
import {
  emptyRecurrenceConfig,
  generateRecurrenceOccurrences,
  isRecurrenceConfigValid,
  type RecurrenceConfig,
} from '../lib/eventRecurrence';
import { generateSeriesId, getUpcomingSeriesOccurrences } from '../lib/eventSeries';
import EventLocationMapPicker from './EventLocationMapPicker';
import EventRecurrenceEditor from './EventRecurrenceEditor';
import { isLikelyImageFile, INVALID_IMAGE_FILE_MESSAGE } from '../lib/imageUrl';

interface PostEventModalProps {
  userProfile: UserProfile;
  editEvent?: CommunityEvent | null;
  /** All loaded events — used to list existing upcoming dates in a series. */
  allEvents?: CommunityEvent[];
  /** Add new upcoming dates only (e.g. from a past occurrence). */
  addOccurrencesOnly?: boolean;
  /** Render form body only — used inside NewListingModal. */
  embedded?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OccurrenceSlot {
  id: string;
  start: string;
  end: string;
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatScheduledLabel(iso: string, endIso?: string | null): string {
  const start = new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!endIso) return start;
  const end = new Date(endIso).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${start} – ${end}`;
}

function newOccurrenceSlot(): OccurrenceSlot {
  return { id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, start: '', end: '' };
}

function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function occurrenceDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function filterNewSeriesOccurrences(
  occurrences: { startDate: Date; endIso: string | null }[],
  existingEvents: CommunityEvent[],
  seriesId?: string | null,
): { startDate: Date; endIso: string | null }[] {
  if (!seriesId?.trim()) return occurrences;
  const existingDays = new Set(
    existingEvents
      .filter((event) => event.seriesId === seriesId)
      .map((event) => occurrenceDayKey(new Date(event.eventStartAt))),
  );
  return occurrences.filter((row) => !existingDays.has(occurrenceDayKey(row.startDate)));
}

function mergeOccurrenceInputs(
  primary: { startDate: Date; endIso: string | null } | null,
  manual: { startDate: Date; endIso: string | null }[],
  scheduled: { start: Date; end: Date | null }[],
): { startDate: Date; endIso: string | null }[] {
  const byDay = new Map<string, { startDate: Date; endIso: string | null }>();

  const add = (startDate: Date, endIso: string | null) => {
    const key = occurrenceDayKey(startDate);
    if (!byDay.has(key)) byDay.set(key, { startDate, endIso });
  };

  if (primary) add(primary.startDate, primary.endIso);
  for (const row of manual) add(row.startDate, row.endIso);
  for (const row of scheduled) add(row.start, row.end?.toISOString() ?? null);

  return [...byDay.values()].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export default function PostEventModal({
  userProfile,
  editEvent = null,
  allEvents = [],
  addOccurrencesOnly = false,
  embedded = false,
  onClose,
  onSuccess,
}: PostEventModalProps) {
  const isEditing = !!editEvent;
  const canEditCurrentOccurrence =
    isEditing && editEvent ? isEventEditable(editEvent) && !addOccurrencesOnly : true;
  const editBlocked = isEditing && !canEditCurrentOccurrence;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
  const [hostedBy, setHostedBy] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [eventStartAt, setEventStartAt] = useState('');
  const [eventEndAt, setEventEndAt] = useState('');
  const [extraOccurrences, setExtraOccurrences] = useState<OccurrenceSlot[]>([]);
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>(emptyRecurrenceConfig);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const scheduledUpcoming = useMemo(() => {
    if (!editEvent?.seriesId) return [];
    return getUpcomingSeriesOccurrences(allEvents, editEvent.seriesId);
  }, [allEvents, editEvent?.seriesId]);

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
    setExtraOccurrences(addOccurrencesOnly ? [newOccurrenceSlot()] : []);
    setRecurrenceConfig(emptyRecurrenceConfig());
    setImageUrl(editEvent.imageUrl || null);
    setPendingImage(null);
    setErrorMsg('');
  }, [editEvent, addOccurrencesOnly]);

  useEffect(() => {
    if (editEvent || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationLat(latitude);
        setLocationLng(longitude);
        const closest = findClosestNeighborhoodByLatLng(latitude, longitude);
        setNeighborhood(closest);
        setLocation((current) => (current.trim() ? current : closest));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, [editEvent]);

  const handleImagePick = (file: File | null) => {
    if (!file) return;
    if (!isLikelyImageFile(file)) {
      setErrorMsg(INVALID_IMAGE_FILE_MESSAGE);
      return;
    }
    if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage({ file, preview: URL.createObjectURL(file) });
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !description.trim() || !location.trim()) {
      setErrorMsg('Please fill in title, description, and location.');
      return;
    }

    if (!addOccurrencesOnly && !eventStartAt) {
      setErrorMsg('Please fill in start date/time.');
      return;
    }

    const parseOccurrence = (startValue: string, endValue: string) => {
      const startDate = new Date(startValue);
      if (Number.isNaN(startDate.getTime())) {
        return { error: 'Invalid start date/time.' };
      }

      let endIso: string | null = null;
      if (endValue) {
        const endDate = new Date(endValue);
        if (Number.isNaN(endDate.getTime())) {
          return { error: 'Invalid end date/time.' };
        }
        if (endDate <= startDate) {
          return { error: 'End time must be after start time.' };
        }
        endIso = endDate.toISOString();
      }

      return { startDate, endIso };
    };

    const newOccurrenceInputs: { startDate: Date; endIso: string | null }[] = [];
    for (const slot of extraOccurrences) {
      if (!slot.start.trim()) continue;
      const parsed = parseOccurrence(slot.start, slot.end);
      if ('error' in parsed) {
        setErrorMsg(parsed.error);
        return;
      }
      newOccurrenceInputs.push(parsed);
    }

    if (addOccurrencesOnly && newOccurrenceInputs.length === 0 && !recurrenceConfig.enabled) {
      setErrorMsg('Add at least one upcoming date.');
      return;
    }

    let primary: { startDate: Date; endIso: string | null } | null = null;
    if (!addOccurrencesOnly) {
      const parsedPrimary = parseOccurrence(eventStartAt, eventEndAt);
      if ('error' in parsedPrimary) {
        setErrorMsg(parsedPrimary.error);
        return;
      }
      primary = parsedPrimary;
    }

    let scheduledOccurrences: { start: Date; end: Date | null }[] = [];
    if (recurrenceConfig.enabled) {
      if (!isRecurrenceConfigValid(recurrenceConfig)) {
        setErrorMsg('Complete your repeat schedule — pick days, weekdays, or week positions.');
        return;
      }

      const templateStart =
        primary?.startDate ??
        (eventStartAt ? new Date(eventStartAt) : null) ??
        (editEvent ? new Date(editEvent.eventStartAt) : null);
      if (!templateStart || Number.isNaN(templateStart.getTime())) {
        setErrorMsg('Set a start date/time first — it sets the clock time for every repeat.');
        return;
      }

      const templateEnd = primary?.endIso
        ? new Date(primary.endIso)
        : eventEndAt
          ? new Date(eventEndAt)
          : editEvent?.eventEndAt
            ? new Date(editEvent.eventEndAt)
            : null;
      if (templateEnd && Number.isNaN(templateEnd.getTime())) {
        setErrorMsg('Invalid end date/time.');
        return;
      }

      scheduledOccurrences = generateRecurrenceOccurrences(
        recurrenceConfig,
        templateStart,
        templateEnd,
      );

      if (scheduledOccurrences.length === 0) {
        setErrorMsg('Your repeat schedule did not produce any upcoming dates. Adjust the rules or start date.');
        return;
      }
    }

    const mergedOccurrences = recurrenceConfig.enabled
      ? mergeOccurrenceInputs(null, newOccurrenceInputs, scheduledOccurrences)
      : mergeOccurrenceInputs(primary, newOccurrenceInputs, []);

    if (addOccurrencesOnly && mergedOccurrences.length === 0) {
      setErrorMsg('Add at least one upcoming date.');
      return;
    }

    if (!addOccurrencesOnly && !primary && mergedOccurrences.length === 0) {
      setErrorMsg('Please fill in start date/time.');
      return;
    }

    if (editBlocked && mergedOccurrences.length === 0 && !canEditCurrentOccurrence) {
      setErrorMsg('Add at least one upcoming date, or edit an upcoming occurrence.');
      return;
    }

    setIsSubmitting(true);

    const needsSeries =
      mergedOccurrences.length > 1 ||
      recurrenceConfig.enabled ||
      Boolean(editEvent?.seriesId) ||
      (!isEditing && (primary ? 1 : 0) + newOccurrenceInputs.length > 1);
    const seriesId =
      editEvent?.seriesId?.trim() ||
      (needsSeries && mergedOccurrences.length > 0 ? generateSeriesId() : null);

    const uploadKey = seriesId || editEvent?.id || generateEventId();
    let finalImageUrl = imageUrl;

    if (pendingImage) {
      const uploaded = await uploadItemImage(pendingImage.file, uploadKey);
      if (!uploaded?.startsWith('http')) {
        setIsSubmitting(false);
        setErrorMsg('Could not upload photo. Check your connection and try again.');
        return;
      }
      finalImageUrl = uploaded;
    }

    const imagePayload =
      finalImageUrl?.startsWith('http://') || finalImageUrl?.startsWith('https://') ? finalImageUrl : null;

    const sharedFields = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      neighborhood,
      userId: userProfile.uid,
      userDisplayName: userProfile.displayName,
      userPhotoURL: userProfile.photoURL,
      hostedBy: hostedBy.trim() || null,
      locationLat,
      locationLng,
      isFree: true as const,
      imageUrl: finalImageUrl || undefined,
    };

    if (isEditing && editEvent) {
      const activeSeriesId = editEvent.seriesId?.trim() || seriesId;

      if (canEditCurrentOccurrence && primary) {
        const event: CommunityEvent = {
          ...sharedFields,
          id: editEvent.id,
          seriesId: activeSeriesId ?? null,
          eventStartAt: primary.startDate.toISOString(),
          eventEndAt: primary.endIso,
          status: editEvent.status === 'cancelled' ? 'cancelled' : 'upcoming',
          createdAt: editEvent.createdAt,
          updatedAt: new Date().toISOString(),
        };

        const result = await updateSupabaseEvent(event);
        if (!result.ok) {
          setIsSubmitting(false);
          setErrorMsg(result.errorMessage || 'Could not save event.');
          return;
        }
      }

      if (activeSeriesId && !editEvent.seriesId && mergedOccurrences.length > 0) {
        const linkResult = await assignSupabaseEventSeriesId(editEvent.id, userProfile.uid, activeSeriesId);
        if (!linkResult.ok) {
          setIsSubmitting(false);
          setErrorMsg(linkResult.errorMessage || 'Could not link event to series.');
          return;
        }
      }

      if (activeSeriesId) {
        const metaResult = await updateSupabaseEventSeriesMetadata(activeSeriesId, userProfile.uid, {
          title: sharedFields.title,
          description: sharedFields.description,
          location: sharedFields.location,
          neighborhood: sharedFields.neighborhood,
          hostedBy: sharedFields.hostedBy,
          locationLat: sharedFields.locationLat ?? null,
          locationLng: sharedFields.locationLng ?? null,
          imageUrl: imagePayload,
        });
        if (!metaResult.ok) {
          setIsSubmitting(false);
          setErrorMsg(metaResult.errorMessage || 'Could not update series details.');
          return;
        }
      }

      const datesToCreate = filterNewSeriesOccurrences(
        mergedOccurrences,
        allEvents,
        activeSeriesId ?? editEvent.seriesId,
      );

      if (recurrenceConfig.enabled && datesToCreate.length === 0) {
        setIsSubmitting(false);
        setErrorMsg('Those dates are already on the schedule.');
        return;
      }

      if (datesToCreate.length > 0) {
        const nowIso = new Date().toISOString();
        const resolvedSeriesId = activeSeriesId ?? generateSeriesId();
        const newEvents: CommunityEvent[] = datesToCreate.map((occurrence) => ({
          ...sharedFields,
          id: generateEventId(),
          seriesId: resolvedSeriesId,
          eventStartAt: occurrence.startDate.toISOString(),
          eventEndAt: occurrence.endIso,
          status: 'upcoming',
          createdAt: nowIso,
          updatedAt: nowIso,
        }));

        const createResult = await createSupabaseEventSeries(newEvents, userProfile);
        if (!createResult.ok) {
          setIsSubmitting(false);
          setErrorMsg(createResult.errorMessage || 'Could not add new dates.');
          return;
        }

        if (!editEvent.seriesId && !canEditCurrentOccurrence) {
          await assignSupabaseEventSeriesId(editEvent.id, userProfile.uid, resolvedSeriesId);
        }
      }

      setIsSubmitting(false);
      onSuccess();
      return;
    }

    const occurrenceInputs = recurrenceConfig.enabled
      ? mergedOccurrences
      : primary
        ? mergeOccurrenceInputs(primary, newOccurrenceInputs, [])
        : newOccurrenceInputs;
    const createSeriesId =
      occurrenceInputs.length > 1 ? generateSeriesId() : null;

    const nowIso = new Date().toISOString();
    const events: CommunityEvent[] = occurrenceInputs.map((occurrence) => ({
      ...sharedFields,
      id: generateEventId(),
      seriesId: createSeriesId,
      eventStartAt: occurrence.startDate.toISOString(),
      eventEndAt: occurrence.endIso,
      status: 'upcoming',
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const result =
      events.length === 1
        ? await createSupabaseEvent(events[0], userProfile)
        : await createSupabaseEventSeries(events, userProfile);

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMsg(result.errorMessage || 'Could not save event.');
      return;
    }

    onSuccess();
  };

  const recurrenceStartTemplate =
    eventStartAt || (editEvent ? toDatetimeLocalValue(editEvent.eventStartAt) : '');
  const recurrenceEndTemplate =
    eventEndAt || (editEvent?.eventEndAt ? toDatetimeLocalValue(editEvent.eventEndAt) : '');

  const previewSrc = pendingImage?.preview || imageUrl;
  const showRepeatSection = !isEditing || canEditCurrentOccurrence || addOccurrencesOnly;
  const modalTitle = addOccurrencesOnly
    ? 'Add upcoming dates'
    : isEditing
      ? 'Edit event'
      : 'Post a free event';
  const submitLabel = addOccurrencesOnly
    ? 'Add dates'
    : isEditing
      ? 'Save changes'
      : 'Post event';
  const canSubmit =
    !isSubmitting &&
    (addOccurrencesOnly ||
      canEditCurrentOccurrence ||
      extraOccurrences.some((s) => s.start.trim()) ||
      recurrenceConfig.enabled);
  const metadataLocked = editBlocked && !addOccurrencesOnly;

  const formBody = (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {editBlocked && !addOccurrencesOnly && (
            <p className="text-sm text-muted bg-inset border border-app rounded-lg px-3 py-2">
              This date is in the past — you can still add new upcoming dates below.
            </p>
          )}

          {errorMsg && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          {embedded && !isEditing && (
            <p className="text-xs text-muted flex items-center gap-1 bg-inset border border-app rounded-lg px-3 py-2">
              <Sparkles className="w-3 h-3 text-accent shrink-0" />
              All events must be 100% free — no tickets or fees
            </p>
          )}

          <fieldset
            disabled={metadataLocked}
            className={metadataLocked ? 'opacity-60 space-y-4 pointer-events-none' : 'space-y-4'}
          >
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
                onClear={() => {
                  setLocationLat(null);
                  setLocationLng(null);
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

            {!addOccurrencesOnly && (
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
            )}

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
          </fieldset>

          {showRepeatSection && (
            <div className="space-y-3 rounded-xl border border-app bg-inset/40 p-3">
              {scheduledUpcoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5" />
                    Already scheduled
                  </p>
                  <ul className="space-y-1 text-xs text-muted">
                    {scheduledUpcoming.map((occurrence) => (
                      <li key={occurrence.id} className="rounded-lg bg-surface/60 border border-app px-2 py-1.5">
                        {formatScheduledLabel(occurrence.eventStartAt, occurrence.eventEndAt)}
                        {occurrence.id === editEvent?.id && (
                          <span className="text-accent font-semibold"> · this date</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <EventRecurrenceEditor
                config={recurrenceConfig}
                onChange={setRecurrenceConfig}
                startTemplate={recurrenceStartTemplate}
                endTemplate={recurrenceEndTemplate}
              />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                    {addOccurrencesOnly || isEditing ? 'Add upcoming dates' : 'Repeat at this location'}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Same place, more days — neighbors see every upcoming date and RSVP per day.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExtraOccurrences((prev) => [...prev, newOccurrenceSlot()])}
                  className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add date
                </button>
              </div>

              {extraOccurrences.length > 0 && (
                <div className="space-y-2">
                  {extraOccurrences.map((slot, index) => (
                    <div
                      key={slot.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end border border-app rounded-lg p-2 bg-surface/60"
                    >
                      <label className="block space-y-1">
                        <span className="text-[10px] font-semibold text-muted uppercase">
                          {addOccurrencesOnly ? `New date ${index + 1}` : `Date ${index + 2}`} starts
                        </span>
                        <input
                          type="datetime-local"
                          value={slot.start}
                          onChange={(e) =>
                            setExtraOccurrences((prev) =>
                              prev.map((row) =>
                                row.id === slot.id ? { ...row, start: e.target.value } : row,
                              ),
                            )
                          }
                          className="sbn-input w-full"
                          required
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[10px] font-semibold text-muted uppercase">Ends (optional)</span>
                        <input
                          type="datetime-local"
                          value={slot.end}
                          onChange={(e) =>
                            setExtraOccurrences((prev) =>
                              prev.map((row) =>
                                row.id === slot.id ? { ...row, end: e.target.value } : row,
                              ),
                            )
                          }
                          className="sbn-input w-full"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setExtraOccurrences((prev) => prev.filter((row) => row.id !== slot.id))
                        }
                        className="sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
                        aria-label="Remove date"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="sbn-btn sbn-btn-primary flex-1"
            >
              {isSubmitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
  );

  if (embedded) {
    return formBody;
  }

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
              {modalTitle}
            </h2>
            <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-accent" />
              {addOccurrencesOnly
                ? 'New dates use the same location and details — neighbors RSVP per day.'
                : 'All events must be 100% free — no tickets or fees'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-inset text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        {formBody}
      </div>
    </div>
  );
}
