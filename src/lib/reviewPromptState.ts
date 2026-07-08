const STORAGE_PREFIX = 'sbn_review_prompt_';
const SESSION_COUNTED_PREFIX = 'sbn_login_session_counted_';

export const REVIEW_FIRST_PROMPT_AT = 5;
export const REVIEW_UPDATE_PROMPT_AT = 25;

export type ReviewPromptKind = 'first' | 'update';

interface ReviewPromptState {
  loginCount: number;
  firstPromptDismissed: boolean;
  updatePromptDismissed: boolean;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function sessionCountedKey(userId: string): string {
  return `${SESSION_COUNTED_PREFIX}${userId}`;
}

function loadState(userId: string): ReviewPromptState {
  if (typeof window === 'undefined') {
    return { loginCount: 0, firstPromptDismissed: false, updatePromptDismissed: false };
  }
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return { loginCount: 0, firstPromptDismissed: false, updatePromptDismissed: false };
    }
    const parsed = JSON.parse(raw) as Partial<ReviewPromptState>;
    return {
      loginCount: typeof parsed.loginCount === 'number' ? parsed.loginCount : 0,
      firstPromptDismissed: Boolean(parsed.firstPromptDismissed),
      updatePromptDismissed: Boolean(parsed.updatePromptDismissed),
    };
  } catch {
    return { loginCount: 0, firstPromptDismissed: false, updatePromptDismissed: false };
  }
}

function saveState(userId: string, state: ReviewPromptState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

/** Count one app open per browser session while signed in. */
export function recordSignedInSession(userId: string): number {
  if (!userId || typeof window === 'undefined') return 0;
  try {
    const sessionKey = sessionCountedKey(userId);
    if (window.sessionStorage.getItem(sessionKey)) {
      return loadState(userId).loginCount;
    }
    window.sessionStorage.setItem(sessionKey, '1');
    const state = loadState(userId);
    state.loginCount += 1;
    saveState(userId, state);
    return state.loginCount;
  } catch {
    return loadState(userId).loginCount;
  }
}

export function getReviewPromptKind(
  userId: string,
  hasReview: boolean,
): ReviewPromptKind | null {
  const state = loadState(userId);

  if (
    !hasReview &&
    state.loginCount >= REVIEW_FIRST_PROMPT_AT &&
    !state.firstPromptDismissed
  ) {
    return 'first';
  }

  if (
    hasReview &&
    state.loginCount >= REVIEW_UPDATE_PROMPT_AT &&
    !state.updatePromptDismissed
  ) {
    return 'update';
  }

  return null;
}

export function dismissReviewPrompt(userId: string, kind: ReviewPromptKind): void {
  const state = loadState(userId);
  if (kind === 'first') {
    state.firstPromptDismissed = true;
  } else {
    state.updatePromptDismissed = true;
  }
  saveState(userId, state);
}

export function markReviewPromptCompleted(userId: string, kind: ReviewPromptKind): void {
  dismissReviewPrompt(userId, kind);
}
