import { useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import type { GoGetSession, ItemPost, UserProfile } from '../../types';
import { getPickupAvailability, getSharedSchedulingSlots, groupSchedulingSlots } from '../../lib/pickupAvailability';
import { requesterProposeScheduledMeet } from '../../lib/goGetSessions';

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const grouped = useMemo(() => groupSchedulingSlots(slots), [slots]);
  const [selectedIso, setSelectedIso] = useState(slots[0]?.toISOString() ?? '');
  const [customMode, setCustomMode] = useState(false);
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
          <p className="text-sm font-semibold text-app">No response yet</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            You can propose a pickup time inside both of your pickup hours. {posterName} gets a normal
            notification — no urgent ring.
          </p>
        </div>
      </div>

      {slots.length === 0 ? (
        <p className="text-xs text-accent">
          No shared pickup hours in the next week. Message {posterName} or try again later.
        </p>
      ) : customMode ? (
        <label className="block text-xs text-muted">
          Custom time
          <input
            type="datetime-local"
            value={selectedIso ? toLocalInput(selectedIso) : ''}
            onChange={(e) => {
              const chosen = new Date(e.target.value);
              if (!Number.isNaN(chosen.getTime())) setSelectedIso(chosen.toISOString());
            }}
            className="sbn-input text-sm mt-1 w-full"
            disabled={busy}
          />
        </label>
      ) : (
        <div className="space-y-3 max-h-56 overflow-y-auto">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">{group.label}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {group.slots.slice(0, 8).map((slot) => {
                  const iso = slot.toISOString();
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={busy}
                      onClick={() => setSelectedIso(iso)}
                      className={`text-xs rounded-lg px-2 py-2 border ${
                        selectedIso === iso ? 'border-accent bg-accent-soft font-bold text-app' : 'border-app text-muted'
                      }`}
                    >
                      {slot.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setCustomMode(true)} className="text-xs text-accent underline">
            Choose custom time
          </button>
        </div>
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
