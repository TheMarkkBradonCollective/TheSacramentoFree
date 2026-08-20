export const APP_TABS = ['feed', 'stuff', 'map', 'events', 'chats', 'profile'] as const;
export type AppTab = (typeof APP_TABS)[number];

/** Bottom nav + sidebar community tabs (account lives in header). */
export const FOOTER_NAV_TABS = ['feed', 'stuff', 'map', 'events', 'chats'] as const;
export type FooterNavTab = (typeof FOOTER_NAV_TABS)[number];

/** Staff-only tabs added to the sidebar for staff accounts. */
export const STAFF_TABS = [
  'staff_overview',
  'staff_users',
  'staff_posts',
  'staff_messages',
  'staff_meets',
  'staff_violations',
  'staff_audit',
  'staff_welcome',
  'staff_team',
] as const;
export type StaffTab = (typeof STAFF_TABS)[number];

export type AnyTab = AppTab | StaffTab;

export function isFooterNavTab(tab: string): tab is FooterNavTab {
  return (FOOTER_NAV_TABS as readonly string[]).includes(tab);
}

export function parseAppTab(value: string | null): AppTab | null {
  if (!value) return null;
  if (value === 'menu') return 'profile';
  return (APP_TABS as readonly string[]).includes(value) ? (value as AppTab) : null;
}

export function isStaffTab(tab: AnyTab): tab is StaffTab {
  return (STAFF_TABS as readonly string[]).includes(tab);
}

/** v1 localStorage used `feed` for Stuff listings — map to `stuff`. */
export function migrateLegacyStoredTab(value: string | null): AppTab | null {
  if (!value) return null;
  if (value === 'feed') return 'stuff';
  return parseAppTab(value);
}
