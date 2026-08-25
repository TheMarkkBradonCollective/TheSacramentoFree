import { useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import type { GoGetSession, ItemPost, UserProfile } from '../../types';
import { getPickupAvailability, getSharedSchedulingSlots } from '../../lib/pickupAvailability';
import { requesterProposeScheduledMeet } from '../../lib/goGetSessions';

interface GoGetScheduleMeetPanelProps {
  session: GoGetSession;
  item: ItemPost;
  posterName: string;
  posterProfile: Pick<UserProfile, 'pickupAvailability'>;
  requesterProfile: Pick<UserProfile, 'pickupAvailability'>;
  onSessionChange: (session: GoGetSession) => void;
  onCancel: () => void;
}

export default function GoGetScheduleMeetPanel({
  session,
  item,
  posterName,
  posterProfile,
  requesterProfile,
  onSessionChange,
  onCancel,
}: GoGetScheduleMeetPanelProps) {
  const slots = useMemo(() => {
    const posterSchedule = getPickupAvailability(posterProfile);
    const requesterSchedule = getPickupAvailability(requesterProfile);
    return getSharedSchedulingSlots(posterSchedule, requesterSchedule);
  }, [posterProfile, requesterProfile]);
  const [selectedIso, setSelectedIso] = useState(slots[0]?.toISOString() ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSchedule = async () => {
    if (!selectedIso) {
      setErr('Pick a time inside both pickup windows.');
      return;
    }
    setBusy(true);
    setErr('');
    const result = await requesterProposeScheduledMeet(session, item, selectedIso, {
      poster: posterProfile,
      requester: requesterProfile,
    });
    setBusy(false);
    if (!result.ok || !result.session) {
      setErr(result.errorMessage || 'Could not schedule.');
      return;
    }
    onSessionChange(result.session);
  };

  return (
    <div className="sbn-card p-4 space-y-3" id="go_get_schedule_meet">
      <div className="flex items-start gap-2">
        <CalendarClock className="w-5 h-5 text-accent shrink-0" />
        <div>
          <p className="text-sm font-semibold text-app">{posterName} isn’t available right now</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Schedule a meet inside both of your pickup availability windows. {posterName} gets a normal
            notification — no urgent ring.
          </p>
        </div>
      </div>

      {slots.length === 0 ? (
        <p className="text-xs text-accent">
          No shared pickup hours in the next week. Message {posterName} or try again later.
        </p>
      ) : (
        <label className="block text-xs text-muted">
          Pickup time
          <select
            value={selectedIso}
            onChange={(e) => setSelectedIso(e.target.value)}
            className="sbn-input text-sm mt-1 w-full"
            disabled={busy}
          >
            {slots.map((slot) => (
              <option key={slot.toISOString()} value={slot.toISOString()}>
                {slot.toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </option>
            ))}
          </select>
        </label>
      )}

      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="sbn-btn sbn-btn-secondary flex-1">
          Cancel & come back later
        </button>
        <button
          type="button"
          onClick={() => void handleSchedule()}
          disabled={busy || slots.length === 0}
          className="sbn-btn sbn-btn-primary flex-1"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule meet'}
        </button>
      </div>
    </div>
  );
}
