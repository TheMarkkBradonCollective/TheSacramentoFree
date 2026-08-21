import type {
  AppPreferences,
  ChatCategoryFilter,
  ChatInboxPreferences,
  ChatStatusFilter,
  FeedAudienceScope,
  FeedContentFilter,
  FeedViewMode,
} from '../types';
import { normalizeEventsFilterPreferences } from './eventsFilterPrefs';
import { normalizeFeedFilterPreferences } from './feedFilterPrefs';

type Theme = NonNullable<AppPreferences['theme']>;

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function isFeedViewMode(value: unknown): value is FeedViewMode {
  return value === 'list' || value === 'grid';
}

function isFeedContentFilter(value: unknown): value is FeedContentFilter {
  return value === 'all' || value === 'text' || value === 'pictures';
}

function isFeedAudienceScope(value: unknown): value is FeedAudienceScope {
  return value === 'everyone' || value === 'neighbors' || value === 'friends';
}

function isChatCategoryFilter(value: unknown): value is ChatCategoryFilter {
  return value === 'everyone' || value === 'dm' || value === 'support' || value === 'groups';
}

function isChatStatusFilter(value: unknown): value is ChatStatusFilter {
  return value === 'all' || value === 'live' || value === 'closed' || value === 'archived';
}

export function normalizeChatInboxPreferences(raw: unknown): ChatInboxPreferences {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prefs: ChatInboxPreferences = {};
  if (isChatCategoryFilter(source.category)) prefs.category = source.category;
  if (isChatStatusFilter(source.status)) prefs.status = source.status;
  if (Array.isArray(source.archivedKeys)) {
    prefs.archivedKeys = source.archivedKeys.filter(
      (key): key is string => typeof key === 'string' && key.length > 0,
    );
  }
  return prefs;
}

export function normalizeAppPreferences(raw: unknown): AppPreferences {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prefs: AppPreferences = {};
  if (isFeedViewMode(source.feedViewMode)) prefs.feedViewMode = source.feedViewMode;
  if (isFeedViewMode(source.eventsViewMode)) prefs.eventsViewMode = source.eventsViewMode;
  if (isTheme(source.theme)) prefs.theme = source.theme;
  if (isFeedContentFilter(source.feedContentFilter)) prefs.feedContentFilter = source.feedContentFilter;
  if (isFeedAudienceScope(source.feedAudienceScope)) prefs.feedAudienceScope = source.feedAudienceScope;
  const eventsFilters = normalizeEventsFilterPreferences(source.eventsFilters);
  if (Object.keys(eventsFilters).length > 0) prefs.eventsFilters = eventsFilters;
  const feedFilters = normalizeFeedFilterPreferences(source.feedFilters);
  if (Object.keys(feedFilters).length > 0) prefs.feedFilters = feedFilters;
  const chatInbox = normalizeChatInboxPreferences(source.chatInbox);
  if (Object.keys(chatInbox).length > 0) prefs.chatInbox = chatInbox;
  return prefs;
}

export function appPreferencesIsEmpty(prefs: AppPreferences | null | undefined): boolean {
  return Object.keys(normalizeAppPreferences(prefs)).length === 0;
}

export function mergeAppPreferences(
  current: AppPreferences | null | undefined,
  patch: Partial<AppPreferences>,
): AppPreferences {
  const base = normalizeAppPreferences(current);
  const merged = normalizeAppPreferences({ ...base, ...patch });
  if (patch.eventsFilters !== undefined) {
    merged.eventsFilters = normalizeEventsFilterPreferences({
      ...base.eventsFilters,
      ...patch.eventsFilters,
    });
  }
  if (patch.feedFilters !== undefined) {
    merged.feedFilters = normalizeFeedFilterPreferences({
      ...base.feedFilters,
      ...patch.feedFilters,
    });
  }
  if (patch.chatInbox !== undefined) {
    merged.chatInbox = normalizeChatInboxPreferences({
      ...base.chatInbox,
      ...patch.chatInbox,
    });
  }
  return merged;
}
