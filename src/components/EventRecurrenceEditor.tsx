import { Plus, Trash2 } from 'lucide-react';
import {
  MONTHS_AHEAD_OPTIONS,
  NTH_WEEKDAY_POSITIONS,
  RecurrenceConfig,
  RecurrenceRule,
  WEEKDAY_LABELS,
  describeRecurrenceRule,
  generateRecurrenceOccurrences,
  newDayOfMonthRule,
  newNthWeekdayRule,
  newWeeklyRule,
} from '../lib/eventRecurrence';

interface EventRecurrenceEditorProps {
  config: RecurrenceConfig;
  onChange: (config: RecurrenceConfig) => void;
  startTemplate: string;
  endTemplate: string;
  disabled?: boolean;
}

function toggleNumber(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value].sort((a, b) => a - b);
}

function updateRule(rules: RecurrenceRule[], index: number, next: RecurrenceRule): RecurrenceRule[] {
  return rules.map((rule, i) => (i === index ? next : rule));
}

function formatPreviewDate(iso: Date, end: Date | null): string {
  const start = iso.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!end) return start;
  const endTime = end.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${start} – ${endTime}`;
}

export default function EventRecurrenceEditor({
  config,
  onChange,
  startTemplate,
  endTemplate,
  disabled = false,
}: EventRecurrenceEditorProps) {
  const preview = (() => {
    if (!config.enabled || !startTemplate) return [];
    const start = new Date(startTemplate);
    if (Number.isNaN(start.getTime())) return [];
    const end = endTemplate ? new Date(endTemplate) : null;
    if (end && Number.isNaN(end.getTime())) return [];
    return generateRecurrenceOccurrences(config, start, end);
  })();

  const setConfig = (patch: Partial<RecurrenceConfig>) => onChange({ ...config, ...patch });

  const addRule = (rule: RecurrenceRule) => {
    setConfig({ rules: [...config.rules, rule] });
  };

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.enabled}
          disabled={disabled}
          onChange={(e) => {
            const enabled = e.target.checked;
            onChange({
              ...config,
              enabled,
              rules: enabled && config.rules.length === 0 ? [newNthWeekdayRule()] : config.rules,
            });
          }}
          className="mt-1"
        />
        <span>
          <span className="text-xs font-semibold text-muted uppercase tracking-wide block">
            Repeat on a schedule
          </span>
          <span className="text-[11px] text-muted">
            Auto-fill dates by month day (4th, 20th), weekday position (4th Saturday), or every week.
          </span>
        </span>
      </label>

      {config.enabled && (
        <div className="space-y-3 rounded-lg border border-app bg-surface/60 p-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold text-muted uppercase">Generate for</span>
            <select
              value={config.monthsAhead}
              disabled={disabled}
              onChange={(e) => setConfig({ monthsAhead: Number(e.target.value) })}
              className="sbn-input w-full"
            >
              {MONTHS_AHEAD_OPTIONS.map((months) => (
                <option key={months} value={months}>
                  Next {months} months
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            {config.rules.map((rule, index) => (
              <div key={index} className="rounded-lg border border-app bg-inset/40 p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={rule.kind}
                    disabled={disabled}
                    onChange={(e) => {
                      const kind = e.target.value as RecurrenceRule['kind'];
                      const next =
                        kind === 'dayOfMonth'
                          ? newDayOfMonthRule()
                          : kind === 'weekly'
                            ? newWeeklyRule()
                            : newNthWeekdayRule();
                      setConfig({ rules: updateRule(config.rules, index, next) });
                    }}
                    className="sbn-input text-sm"
                  >
                    <option value="dayOfMonth">Days of month</option>
                    <option value="nthWeekday">Weekday of month</option>
                    <option value="weekly">Every week</option>
                  </select>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setConfig({ rules: config.rules.filter((_, i) => i !== index) })}
                    className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                    aria-label="Remove rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {rule.kind === 'dayOfMonth' && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted">Pick one or more days (every month)</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                        const active = rule.days.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              setConfig({
                                rules: updateRule(config.rules, index, {
                                  ...rule,
                                  days: toggleNumber(rule.days, day),
                                }),
                              })
                            }
                            className={`min-w-[2rem] px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                              active
                                ? 'bg-accent text-white border-accent'
                                : 'bg-surface border-app text-muted hover:border-accent/50'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {rule.kind === 'nthWeekday' && (
                  <div className="space-y-2">
                    <label className="block space-y-1">
                      <span className="text-[10px] text-muted">Weekday</span>
                      <select
                        value={rule.weekday}
                        disabled={disabled}
                        onChange={(e) =>
                          setConfig({
                            rules: updateRule(config.rules, index, {
                              ...rule,
                              weekday: Number(e.target.value),
                            }),
                          })
                        }
                        className="sbn-input w-full text-sm"
                      >
                        {WEEKDAY_LABELS.map((label, value) => (
                          <option key={label} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted">Which in the month (pick multiple)</p>
                      <div className="flex flex-wrap gap-1">
                        {NTH_WEEKDAY_POSITIONS.map(({ value, label }) => {
                          const active = rule.positions.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={disabled}
                              onClick={() =>
                                setConfig({
                                  rules: updateRule(config.rules, index, {
                                    ...rule,
                                    positions: toggleNumber(rule.positions, value),
                                  }),
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                active
                                  ? 'bg-accent text-white border-accent'
                                  : 'bg-surface border-app text-muted hover:border-accent/50'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {rule.kind === 'weekly' && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted">Every week on (pick multiple)</p>
                    <div className="flex flex-wrap gap-1">
                      {WEEKDAY_LABELS.map((label, value) => {
                        const active = rule.weekdays.includes(value);
                        return (
                          <button
                            key={label}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              setConfig({
                                rules: updateRule(config.rules, index, {
                                  ...rule,
                                  weekdays: toggleNumber(rule.weekdays, value),
                                }),
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              active
                                ? 'bg-accent text-white border-accent'
                                : 'bg-surface border-app text-muted hover:border-accent/50'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted italic">{describeRecurrenceRule(rule)}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => addRule(newDayOfMonthRule())}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Month days
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => addRule(newNthWeekdayRule())}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Weekday of month
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => addRule(newWeeklyRule())}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Weekly
            </button>
          </div>

          {startTemplate && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted uppercase">
                Preview ({preview.length} date{preview.length === 1 ? '' : 's'})
              </p>
              {preview.length === 0 ? (
                <p className="text-[11px] text-muted">Add at least one valid rule and a start time.</p>
              ) : (
                <ul className="max-h-28 overflow-y-auto space-y-0.5 text-[11px] text-muted">
                  {preview.slice(0, 8).map((occurrence) => (
                    <li key={occurrence.start.toISOString()}>
                      {formatPreviewDate(occurrence.start, occurrence.end)}
                    </li>
                  ))}
                  {preview.length > 8 && (
                    <li className="text-accent font-semibold">+ {preview.length - 8} more</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
