import { AppTab, parseAppTab } from './appTabs';
import { hasActiveNavSession } from './navigationSession';

export const TAB_STORAGE_KEY = 'sbn_active_tab_v1';
export const TAB_HISTORY_KEY = 'sbnTab';

export function parseStoredTab(value: string | null): AppTab | null {
  return parseAppTab(value);
}

export function parseTabFromHistoryState(state: unknown): AppTab | null {
  if (!state || typeof state !== 'object') return null;
  const value = (state as Record<string, unknown>)[TAB_HISTORY_KEY];
  return typeof value === 'string' ? parseStoredTab(value) : null;
}

export function withTabInHistoryState(tab: AppTab) {
  return { [TAB_HISTORY_KEY]: tab };
}

export function readPersistedTab(userId?: string): AppTab {
  if (typeof window === 'undefined') return 'map';
  if (hasActiveNavSession(userId)) return 'map';

  const historyTab = parseTabFromHistoryState(window.history.state);
  const storedTab = parseStoredTab(window.localStorage.getItem(TAB_STORAGE_KEY));
  return historyTab || storedTab || 'map';
}

export function persistActiveTab(tab: AppTab) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  try {
    window.history.replaceState(withTabInHistoryState(tab), '', window.location.href);
  } catch (err) {
    console.warn('History replaceState unavailable, tab persistence fallback active:', err);
  }
}

export function pushActiveTabHistory(tab: AppTab) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  try {
    window.history.pushState(withTabInHistoryState(tab), '', window.location.href);
  } catch (err) {
    console.warn('History pushState unavailable, continuing without tab back-stack:', err);
  }
}
