const STORAGE_KEY = 'trademark_notice_dismissed_v1';

export function hasDismissedTrademarkNotice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissTrademarkNotice(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // localStorage may be unavailable
  }
}
