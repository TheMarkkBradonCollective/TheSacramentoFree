import { isPushCelebrationDismissed } from './pushCelebrationPrompt';

const NOTIFICATIONS_FIRST_RUN_KEY = 'sbn_notifications_first_run_v1';

/** Includes legacy push-celebration dismissals so neighbors are not prompted twice. */
export function hasSeenNotificationsFirstRunPrompt(): boolean {
  try {
    if (localStorage.getItem(NOTIFICATIONS_FIRST_RUN_KEY) === '1') return true;
    return isPushCelebrationDismissed();
  } catch {
    return true;
  }
}

export function markNotificationsFirstRunPromptSeen(): void {
  try {
    localStorage.setItem(NOTIFICATIONS_FIRST_RUN_KEY, '1');
  } catch {
    /* ignore */
  }
}
