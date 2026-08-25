import type { NotificationPriority } from '../../../shared/notificationTypes';

export interface QuietHoursPrefs {
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursAllowUrgent?: boolean;
}

function parseTimeMinutes(value: string | undefined, fallback: string): number {
  const raw = (value || fallback).trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return 22 * 60;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return hours * 60 + minutes;
}

function isWithinQuietWindow(nowMinutes: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Overnight window (e.g. 22:00 – 07:00)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/**
 * Returns true when push delivery should be suppressed for quiet hours.
 * Urgent/important bypass events with bypassQuietHours still deliver.
 */
export function shouldSuppressForQuietHours(
  prefs: QuietHoursPrefs,
  priority: NotificationPriority,
  bypassQuietHours?: boolean,
  now: Date = new Date(),
): boolean {
  if (!prefs.quietHoursEnabled) return false;
  if (bypassQuietHours) return false;
  if (prefs.quietHoursAllowUrgent !== false && (priority === 'urgent' || priority === 'important')) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeMinutes(prefs.quietHoursStart, '22:00');
  const end = parseTimeMinutes(prefs.quietHoursEnd, '07:00');
  return isWithinQuietWindow(nowMinutes, start, end);
}
