import { useState } from 'react';
import { Check, Clock, X } from 'lucide-react';

interface GoGetAvailabilityPromptProps {
  requesterName: string;
  itemTitle: string;
  submitting: boolean;
  onAvailableNow: () => void;
  onProposeWindow: (window: { from: string; until: string }) => void;
  onDecline?: () => void;
  onIgnore?: () => void;
  embedded?: boolean;
}

function defaultWindow(): { from: string; until: string } {
  const now = new Date();
  const from = new Date(now.getTime() + 30 * 60 * 1000);
  const until = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return { from: toLocalInput(from), until: toLocalInput(until) };
}

export default function GoGetAvailabilityPrompt({
  requesterName,
  itemTitle,
  submitting,
  onAvailableNow,
  onProposeWindow,
  onDecline,
  onIgnore,
  embedded = false,
}: GoGetAvailabilityPromptProps) {
  const [showWindowPicker, setShowWindowPicker] = useState(false);
  const [window_, setWindow] = useState(defaultWindow);
  const [err, setErr] = useState('');

  const handleSendWindow = () => {
    const from = new Date(window_.from);
    const until = new Date(window_.until);
    if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) {
      setErr('Pick a valid start and end time.');
      return;
    }
    if (until.getTime() <= from.getTime()) {
      setErr('End time must be after the start time.');
      return;
    }
    setErr('');
    onProposeWindow({ from: from.toISOString(), until: until.toISOString() });
  };

  return (
    <div className={embedded ? 'space-y-3' : 'sbn-card p-4 space-y-3'} id="go_get_availability_prompt">
      <div className="flex items-start gap-2">
        <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-app leading-snug">
          {requesterName} wants to pick up "{itemTitle}".
        </p>
      </div>

      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

      {!showWindowPicker ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onAvailableNow}
            className="sbn-btn sbn-btn-primary w-full justify-center disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            Available now
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setShowWindowPicker(true)}
            className="sbn-btn sbn-btn-secondary w-full justify-center disabled:opacity-60"
          >
            <Clock className="w-4 h-4" />
            Choose a time
          </button>
          {onDecline ? (
            <button
              type="button"
              disabled={submitting}
              onClick={onDecline}
              className="sbn-btn sbn-btn-secondary w-full justify-center disabled:opacity-60"
            >
              <X className="w-4 h-4" />
              Not available
            </button>
          ) : null}
          {onIgnore ? (
            <button
              type="button"
              disabled={submitting}
              onClick={onIgnore}
              className="text-xs text-muted hover:text-app underline underline-offset-2 w-full"
            >
              Ignore
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 pt-1 border-t border-app">
          <p className="text-xs text-muted">When are you free instead? The neighbor will pick a time in this window.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">From</span>
              <input
                type="datetime-local"
                value={window_.from}
                onChange={(e) => setWindow((w) => ({ ...w, from: e.target.value }))}
                className="sbn-input text-sm w-full"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Until</span>
              <input
                type="datetime-local"
                value={window_.until}
                onChange={(e) => setWindow((w) => ({ ...w, until: e.target.value }))}
                className="sbn-input text-sm w-full"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowWindowPicker(false)}
              className="sbn-btn sbn-btn-secondary flex-1 justify-center"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSendWindow}
              className="sbn-btn sbn-btn-primary flex-1 justify-center disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send availability'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
