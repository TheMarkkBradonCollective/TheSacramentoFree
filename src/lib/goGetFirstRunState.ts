const GOGET_FIRST_RUN_KEY = 'sbn_goget_first_run_v1';

export function hasSeenGoGetFirstRunPrompt(): boolean {
  try {
    return localStorage.getItem(GOGET_FIRST_RUN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markGoGetFirstRunPromptSeen(): void {
  try {
    localStorage.setItem(GOGET_FIRST_RUN_KEY, '1');
  } catch {
    /* ignore */
  }
}
