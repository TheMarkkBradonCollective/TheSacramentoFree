import { useState } from 'react';
import { CalendarClock } from 'lucide-react';

interface GoGetTimePickerProps {
  fulfillerName: string;
  availableFrom: string;
  availableUntil: string;
  submitting: boolean;
  onConfirm: (scheduledAt: string) => void;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GoGetTimePicker({
  fulfillerName,
  availableFrom,
  availableUntil,
  submitting,
  onConfirm,
}: GoGetTimePickerProps) {
  const [value, setValue] = useState(toLocalInput(availableFrom));
  const [err, setErr] = useState('');

  const fromLabel = new Date(availableFrom).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const untilLabel = new Date(availableUntil).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const handleConfirm = () => {
    const chosen = new Date(value);
    if (Number.isNaN(chosen.getTime())) {
      setErr('Pick a valid time.');
      return;
    }
    if (chosen.getTime() < new Date(availableFrom).getTime() || chosen.getTime() > new Date(availableUntil).getTime()) {
      setErr(`Pick a time between ${fromLabel} and ${untilLabel}.`);
      return;
    }
    setErr('');
    onConfirm(chosen.toISOString());
  };

  return (
    <div className="sbn-card p-4 space-y-3" id="go_get_time_picker">
      <div className="flex items-start gap-2">
        <CalendarClock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-app leading-snug">
          {fulfillerName} isn't available right now, but is free between {fromLabel} and {untilLabel}. Pick a pickup
          time.
        </p>
      </div>

      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

      <input
        type="datetime-local"
        min={toLocalInput(availableFrom)}
        max={toLocalInput(availableUntil)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="sbn-input text-sm w-full"
      />

      <button
        type="button"
        disabled={submitting}
        onClick={handleConfirm}
        className="sbn-btn sbn-btn-primary w-full justify-center disabled:opacity-60"
      >
        {submitting ? 'Scheduling…' : 'Set pickup time'}
      </button>
    </div>
  );
}
