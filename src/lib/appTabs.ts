export const APP_TABS = ['feed', 'events', 'map', 'chats', 'menu', 'profile'] as const;
export type AppTab = (typeof APP_TABS)[number];

export function parseAppTab(value: string | null): AppTab | null {
  if (!value) return null;
  return (APP_TABS as readonly string[]).includes(value) ? (value as AppTab) : null;
}
