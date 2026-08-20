import type { PickupAvailabilitySchedule, PickupDayAvailability, UserProfile } from '../types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Every day, all hours — default until a neighbor narrows their window. */
export function defaultPickupAvailability(): PickupAvailabilitySchedule {
  return {
    days: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      day,
      enabled: true,
      startMinute: 0,
      endMinute: 1440,
    })),
  };
}

export function normalizePickupAvailability(raw: unknown): PickupAvailabilitySchedule {
  if (!raw || typeof raw !== 'object') return defaultPickupAvailability();
  const daysRaw = (raw as { days?: unknown }).days;
  if (!Array.isArray(daysRaw) || daysRaw.length === 0) return defaultPickupAvailability();

  const byDay = new Map<number, PickupDayAvailability>();
  for (const entry of daysRaw) {
    if (!entry || typeof entry !== 'object') continue;
    const day = Number((entry as PickupDayAvailability).day);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const enabled = (entry as PickupDayAvailability).enabled === true;
    const startMinute = clampMinute(Number((entry as PickupDayAvailability).startMinute), 0);
    const endMinute = clampMinute(Number((entry as PickupDayAvailability).endMinute), 1440);
    byDay.set(day, {
      day,
      enabled,
      startMinute: Math.min(startMinute, endMinute - 1),
      endMinute: Math.max(endMinute, startMinute + 1),
    });
  }

  if (byDay.size === 0) return defaultPickupAvailability();

  return {
    days: [0, 1, 2, 3, 4, 5, 6].map((day) => byDay.get(day) ?? {
      day,
      enabled: false,
      startMinute: 0,
      endMinute: 1440,
    }),
  };
}

function clampMinute(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1440, Math.round(value)));
}

export function getPickupAvailability(profile: Pick<UserProfile, 'pickupAvailability'> | null | undefined): PickupAvailabilitySchedule {
  return normalizePickupAvailability(profile?.pickupAvailability);
}

export function isWithinPickupAvailability(
  schedule: PickupAvailabilitySchedule,
  at: Date = new Date(),
): boolean {
  const day = at.getDay();
  const dayRow = schedule.days.find((d) => d.day === day);
  if (!dayRow?.enabled) return false;
  const minute = at.getHours() * 60 + at.getMinutes();
  return minute >= dayRow.startMinute && minute < dayRow.endMinute;
}

export function isProfileWithinPickupAvailability(
  profile: Pick<UserProfile, 'pickupAvailability'> | null | undefined,
  at?: Date,
): boolean {
  return isWithinPickupAvailability(getPickupAvailability(profile), at);
}

export function formatDayAvailabilityLabel(row: PickupDayAvailability): string {
  if (!row.enabled) return `${DAY_LABELS[row.day]}: off`;
  if (row.startMinute === 0 && row.endMinute >= 1440) return `${DAY_LABELS[row.day]}: all day`;
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const d = new Date(2000, 0, 1, h, min);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };
  return `${DAY_LABELS[row.day]}: ${fmt(row.startMinute)} – ${fmt(row.endMinute)}`;
}

/** Half-hour slots in the intersection of two schedules over the next N days. */
export function getSharedSchedulingSlots(
  posterSchedule: PickupAvailabilitySchedule,
  requesterSchedule: PickupAvailabilitySchedule,
  options?: { from?: Date; daysAhead?: number; slotMinutes?: number },
): Date[] {
  const from = options?.from ?? new Date();
  const daysAhead = options?.daysAhead ?? 7;
  const slotMinutes = options?.slotMinutes ?? 30;
  const slots: Date[] = [];
  const start = new Date(from);
  start.setMinutes(Math.ceil(start.getMinutes() / slotMinutes) * slotMinutes, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  for (let t = start.getTime(); t < end.getTime(); t += slotMinutes * 60 * 1000) {
    const at = new Date(t);
    if (
      isWithinPickupAvailability(posterSchedule, at) &&
      isWithinPickupAvailability(requesterSchedule, at)
    ) {
      slots.push(at);
    }
  }
  return slots;
}

export function isTimeInSharedAvailability(
  posterSchedule: PickupAvailabilitySchedule,
  requesterSchedule: PickupAvailabilitySchedule,
  isoTime: string,
): boolean {
  const at = new Date(isoTime);
  if (Number.isNaN(at.getTime())) return false;
  return (
    isWithinPickupAvailability(posterSchedule, at) &&
    isWithinPickupAvailability(requesterSchedule, at)
  );
}
