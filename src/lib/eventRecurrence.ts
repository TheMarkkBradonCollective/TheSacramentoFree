/** Monthly / weekly recurrence helpers for generating event occurrence dates. */

export type RecurrenceRule =
  | { kind: 'dayOfMonth'; days: number[] }
  | { kind: 'nthWeekday'; weekday: number; positions: number[] }
  | { kind: 'weekly'; weekdays: number[] };

export interface RecurrenceConfig {
  enabled: boolean;
  /** How many calendar months ahead to generate (from anchor month). */
  monthsAhead: number;
  rules: RecurrenceRule[];
}

export interface GeneratedOccurrence {
  start: Date;
  end: Date | null;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const NTH_WEEKDAY_POSITIONS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: 'Last' },
] as const;

export const MONTHS_AHEAD_OPTIONS = [3, 6, 12] as const;

export function emptyRecurrenceConfig(): RecurrenceConfig {
  return { enabled: false, monthsAhead: 6, rules: [] };
}

export function newDayOfMonthRule(): RecurrenceRule {
  return { kind: 'dayOfMonth', days: [] };
}

export function newNthWeekdayRule(): RecurrenceRule {
  return { kind: 'nthWeekday', weekday: 6, positions: [4] };
}

export function newWeeklyRule(): RecurrenceRule {
  return { kind: 'weekly', weekdays: [] };
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function applyTimeTemplate(template: Date, day: Date): Date {
  const result = new Date(day);
  result.setHours(template.getHours(), template.getMinutes(), 0, 0);
  return result;
}

function endFromTemplate(startTemplate: Date, endTemplate: Date | null, start: Date): Date | null {
  if (!endTemplate) return null;
  const durationMs = endTemplate.getTime() - startTemplate.getTime();
  if (durationMs <= 0) return null;
  return new Date(start.getTime() + durationMs);
}

/** Nth weekday in a month: position 1–4 or 5 (last). Returns null if not found. */
export function getNthWeekdayInMonth(year: number, month: number, weekday: number, position: number): Date | null {
  let count = 0;
  let lastMatch: Date | null = null;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() !== weekday) continue;
    count++;
    lastMatch = date;
    if (position >= 1 && position <= 4 && count === position) return date;
  }

  if (position === 5) return lastMatch;
  return null;
}

function datesForDayOfMonthRule(
  rule: Extract<RecurrenceRule, { kind: 'dayOfMonth' }>,
  anchor: Date,
  monthsAhead: number,
): Date[] {
  const results: Date[] = [];
  const startYear = anchor.getFullYear();
  const startMonth = anchor.getMonth();

  for (let offset = 0; offset < monthsAhead; offset++) {
    const month = startMonth + offset;
    const year = startYear + Math.floor(month / 12);
    const normalizedMonth = month % 12;
    const daysInMonth = new Date(year, normalizedMonth + 1, 0).getDate();

    for (const day of rule.days) {
      if (day < 1 || day > 31 || day > daysInMonth) continue;
      results.push(new Date(year, normalizedMonth, day));
    }
  }

  return results;
}

function datesForNthWeekdayRule(
  rule: Extract<RecurrenceRule, { kind: 'nthWeekday' }>,
  anchor: Date,
  monthsAhead: number,
): Date[] {
  const results: Date[] = [];
  const startYear = anchor.getFullYear();
  const startMonth = anchor.getMonth();

  for (let offset = 0; offset < monthsAhead; offset++) {
    const month = startMonth + offset;
    const year = startYear + Math.floor(month / 12);
    const normalizedMonth = month % 12;

    for (const position of rule.positions) {
      const match = getNthWeekdayInMonth(year, normalizedMonth, rule.weekday, position);
      if (match) results.push(match);
    }
  }

  return results;
}

function datesForWeeklyRule(
  rule: Extract<RecurrenceRule, { kind: 'weekly' }>,
  anchor: Date,
  monthsAhead: number,
): Date[] {
  const results: Date[] = [];
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + monthsAhead, 0);
  const cursor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());

  while (cursor <= end) {
    if (rule.weekdays.includes(cursor.getDay())) {
      results.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

function datesForRule(rule: RecurrenceRule, anchor: Date, monthsAhead: number): Date[] {
  switch (rule.kind) {
    case 'dayOfMonth':
      return datesForDayOfMonthRule(rule, anchor, monthsAhead);
    case 'nthWeekday':
      return datesForNthWeekdayRule(rule, anchor, monthsAhead);
    case 'weekly':
      return datesForWeeklyRule(rule, anchor, monthsAhead);
    default:
      return [];
  }
}

export function isRecurrenceRuleValid(rule: RecurrenceRule): boolean {
  switch (rule.kind) {
    case 'dayOfMonth':
      return rule.days.some((d) => d >= 1 && d <= 31);
    case 'nthWeekday':
      return rule.positions.length > 0;
    case 'weekly':
      return rule.weekdays.length > 0;
    default:
      return false;
  }
}

export function isRecurrenceConfigValid(config: RecurrenceConfig): boolean {
  if (!config.enabled) return true;
  return config.rules.length > 0 && config.rules.every(isRecurrenceRuleValid);
}

export function describeRecurrenceRule(rule: RecurrenceRule): string {
  switch (rule.kind) {
    case 'dayOfMonth': {
      const days = [...rule.days].sort((a, b) => a - b);
      if (days.length === 0) return 'Days of month (none selected)';
      const suffix = (n: number) => {
        if (n >= 11 && n <= 13) return 'th';
        const last = n % 10;
        if (last === 1) return 'st';
        if (last === 2) return 'nd';
        if (last === 3) return 'rd';
        return 'th';
      };
      const dayLabel = days.map((d) => `${d}${suffix(d)}`).join(', ');
      return `Every month on the ${dayLabel}`;
    }
    case 'nthWeekday': {
      const weekday = WEEKDAY_LABELS[rule.weekday] ?? 'day';
      const posLabels = rule.positions
        .map((p) => NTH_WEEKDAY_POSITIONS.find((x) => x.value === p)?.label ?? `${p}`)
        .join(', ');
      return `Every ${posLabels} ${weekday} of the month`;
    }
    case 'weekly': {
      const days = rule.weekdays
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_LABELS[d])
        .join(', ');
      return `Every week on ${days || '…'}`;
    }
    default:
      return 'Unknown rule';
  }
}

/** Generate occurrence start/end pairs from recurrence rules and a time template. */
export function generateRecurrenceOccurrences(
  config: RecurrenceConfig,
  startTemplate: Date,
  endTemplate: Date | null,
  options?: { includeBefore?: Date },
): GeneratedOccurrence[] {
  if (!config.enabled || config.rules.length === 0) return [];

  const anchor = new Date(startTemplate);
  anchor.setHours(0, 0, 0, 0);
  const cutoff = options?.includeBefore ?? new Date();

  const byDay = new Map<string, Date>();

  for (const rule of config.rules) {
    if (!isRecurrenceRuleValid(rule)) continue;
    for (const day of datesForRule(rule, anchor, config.monthsAhead)) {
      const start = applyTimeTemplate(startTemplate, day);
      if (start < cutoff) continue;
      const key = dateKey(start);
      if (!byDay.has(key)) byDay.set(key, start);
    }
  }

  return [...byDay.values()]
    .sort((a, b) => a.getTime() - b.getTime())
    .map((start) => ({
      start,
      end: endFromTemplate(startTemplate, endTemplate, start),
    }));
}
