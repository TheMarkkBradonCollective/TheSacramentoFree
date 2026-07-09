import { AppTab, parseAppTab } from './appTabs';
import { hasActiveNavSession } from './navigationSession';

export const TAB_STORAGE_KEY = 'sbn_active_tab_v1';
export const TAB_HISTORY_KEY = 'sbnTab';

const APP_TAB_PATHS = new Set(['feed', 'events', 'map', 'chats', 'profile']);

function tabStorageKey(userId?: string): string {
  return userId ? `${TAB_STORAGE_KEY}_${userId}` : TAB_STORAGE_KEY;
}

export function appTabPath(tab: AppTab): string {
  return `/${tab}`;
}

export function parseTabFromPathname(pathname: string): AppTab | null {
  const segment = pathname.replace(/^\/+/, '').split('/')[0]?.toLowerCase() ?? '';
  if (!APP_TAB_PATHS.has(segment)) return null;
  return parseAppTab(segment);
}

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

  const pathTab = parseTabFromPathname(window.location.pathname);
  const historyTab = parseTabFromHistoryState(window.history.state);
  const storedTab = parseStoredTab(window.localStorage.getItem(tabStorageKey(userId)));
  return pathTab || historyTab || storedTab || 'map';
}

function tabUrl(tab: AppTab): string {
  return appTabPath(tab);
}

export function persistActiveTab(tab: AppTab, userId?: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(tabStorageKey(userId), tab);
  try {
    window.history.replaceState(withTabInHistoryState(tab), '', tabUrl(tab));
  } catch (err) {
    console.warn('History replaceState unavailable, tab persistence fallback active:', err);
  }
}

export function pushActiveTabHistory(tab: AppTab, userId?: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(tabStorageKey(userId), tab);
  try {
    window.history.pushState(withTabInHistoryState(tab), '', tabUrl(tab));
  } catch (err) {
    console.warn('History pushState unavailable, continuing without tab back-stack:', err);
  }
}

export function replaceAppTabUrl(tab: AppTab) {
  if (typeof window === 'undefined') return;
  try {
    window.history.replaceState(withTabInHistoryState(tab), '', tabUrl(tab));
  } catch {
    // ignore
  }
}

export function clearPersistedTab(userId?: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(tabStorageKey(userId));
}
