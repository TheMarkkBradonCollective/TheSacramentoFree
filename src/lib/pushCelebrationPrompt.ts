export const PUSH_CELEBRATION_DISMISSED_KEY = 'sbn_push_celebration_prompt_dismissed_v1';

export function isPushCelebrationDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(PUSH_CELEBRATION_DISMISSED_KEY) === 'true';
}

export function dismissPushCelebration(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PUSH_CELEBRATION_DISMISSED_KEY, 'true');
}
