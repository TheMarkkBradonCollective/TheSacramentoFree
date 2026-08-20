import { useMemo, useState } from 'react';
import type { PickupAvailabilitySchedule, PickupDayAvailability } from '../../types';
import {
  defaultPickupAvailability,
  formatDayAvailabilityLabel,
  normalizePickupAvailability,
} from '../../lib/pickupAvailability';

interface PickupAvailabilityEditorProps {
  value: PickupAvailabilitySchedule;
  onChange: (next: PickupAvailabilitySchedule) => void;
  disabled?: boolean;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function minuteToInput(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function inputToMinute(value: string): number {
  const [h, min] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return 0;
  return Math.max(0, Math.min(1439, h * 60 + min));
}

export default function PickupAvailabilityEditor({
  value,
  onChange,
  disabled,
}: PickupAvailabilityEditorProps) {
  const schedule = useMemo(() => normalizePickupAvailability(value), [value]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const updateDay = (day: number, patch: Partial<PickupDayAvailability>) => {
    const days = schedule.days.map((row) =>
      row.day === day ? { ...row, ...patch } : row,
    );
    onChange({ days });
  };

  const setAllDay = () => {
    onChange(defaultPickupAvailability());
  };

  return (
    <div className="space-y-2" id="pickup_availability_editor">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted leading-snug">
          Neighbors can only start app pickup coordination during these hours (default: 24/7).
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={setAllDay}
          className="text-[10px] font-semibold text-accent shrink-0"
        >
          Reset 24/7
        </button>
      </div>

      <div className="space-y-1">
        {schedule.days.map((row) => {
          const isOpen = expandedDay === row.day;
          return (
            <div key={row.day} className="rounded-xl border border-app bg-inset overflow-hidden">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setExpandedDay(isOpen ? null : row.day)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="text-xs font-semibold text-app">{DAY_LABELS[row.day]}</span>
                <span className="text-[10px] text-muted truncate">{formatDayAvailabilityLabel(row)}</span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-app pt-2">
                  <label className="flex items-center gap-2 text-xs text-app">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      disabled={disabled}
                      onChange={(e) => updateDay(row.day, { enabled: e.target.checked })}
                    />
                    Available this day
                  </label>
                  {row.enabled && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="text-[10px] text-muted">
                        From
                        <input
                          type="time"
                          disabled={disabled}
                          value={minuteToInput(row.startMinute)}
                          onChange={(e) => updateDay(row.day, { startMinute: inputToMinute(e.target.value) })}
                          className="sbn-input text-xs mt-0.5"
                        />
                      </label>
                      <label className="text-[10px] text-muted">
                        Until
                        <input
                          type="time"
                          disabled={disabled}
                          value={minuteToInput(row.endMinute >= 1440 ? 0 : row.endMinute)}
                          onChange={(e) => {
                            const m = inputToMinute(e.target.value);
                            updateDay(row.day, { endMinute: m === 0 ? 1440 : m });
                          }}
                          className="sbn-input text-xs mt-0.5"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
