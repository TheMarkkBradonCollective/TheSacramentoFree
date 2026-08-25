import {
  CalendarDays,
  ClipboardList,
  FileText,
  GaugeCircle,
  Inbox,
  List,
  Map,
  MapPin,
  Megaphone,
  MessageSquare,
  Newspaper,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { UserProfile } from '../types';
import { type AnyTab } from '../lib/appTabs';
import { isStaffRole, roleLabel, roleRank, roleTheme } from '../lib/roles';
import { useNewspaperSkin } from '../preview/NewspaperSkinContext';
import { hasStaffConsoleAccess, profileUiRole } from '../lib/staffInteractionMode';
import { IN_APP } from '../siteContent';
import BrandLogo from './BrandLogo';
import { PresenceUserAvatar } from './UserAvatar';

interface SidebarItem {
  id: AnyTab;
  label: string;
  icon: typeof List;
  section?: 'community' | 'staff';
  /** Minimum role rank required to see this item (0 = everyone). */
  minRank?: number;
}

const NAV_ITEMS: SidebarItem[] = [
  // Community — account opens from header avatar, not sidebar
  { id: 'feed', label: IN_APP.feedTabLabel, icon: Newspaper, section: 'community' },
  { id: 'stuff', label: IN_APP.stuffTabLabel, icon: List, section: 'community' },
  { id: 'map', label: 'Map', icon: Map, section: 'community' },
  { id: 'events', label: 'Events', icon: CalendarDays, section: 'community' },
  { id: 'chats', label: IN_APP.chatsTabLabel, icon: MessageSquare, section: 'community' },
  // Staff
  { id: 'staff_overview', label: 'Overview', icon: GaugeCircle, section: 'staff', minRank: 1 },
  { id: 'staff_users', label: 'Users', icon: Users, section: 'staff', minRank: 1 },
  { id: 'staff_posts', label: 'Listings', icon: FileText, section: 'staff', minRank: 1 },
  { id: 'staff_messages', label: 'Messages', icon: Inbox, section: 'staff', minRank: 1 },
  { id: 'staff_meets', label: 'Meet Records', icon: MapPin, section: 'staff', minRank: 1 },
  { id: 'staff_violations', label: 'Go Get Violations', icon: ShieldAlert, section: 'staff', minRank: 1 },
  { id: 'staff_audit', label: 'Audit Log', icon: ClipboardList, section: 'staff', minRank: 3 },
  { id: 'staff_welcome', label: 'Welcome Message', icon: Megaphone, section: 'staff', minRank: 4 },
  { id: 'staff_team', label: 'Team', icon: Shield, section: 'staff', minRank: 2 },
];

interface AppSidebarProps {
  userProfile: UserProfile;
  activeTab: AnyTab;
  onTabChange: (tab: AnyTab) => void;
  /**
   * expanded = full-width icon+label sidebar with a collapse toggle (desktop).
   * rail = permanently icon-only, no toggle — the tablet's signature nav shape.
   */
  variant?: 'expanded' | 'rail';
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Collapse the sidebar after a nav item is selected (e.g. mobile). */
  onCollapse?: () => void;
  autoCollapseOnNavigate?: boolean;
  /** When collapsed, hide the sidebar entirely instead of leaving a narrow icon rail. */
  fullyHiddenWhenCollapsed?: boolean;
  /** Render as a fixed overlay drawer (e.g. mobile staff). */
  overlay?: boolean;
}

export default function AppSidebar({
  userProfile,
  activeTab,
  onTabChange,
  variant = 'expanded',
  collapsed = false,
  onToggleCollapse,
  onCollapse,
  autoCollapseOnNavigate = false,
  fullyHiddenWhenCollapsed = false,
  overlay = false,
}: AppSidebarProps) {
  const actorRank = roleRank(userProfile.role);
  const isRail = variant === 'rail';
  const isSlideDrawer = overlay && fullyHiddenWhenCollapsed;
  const isFullyHidden = fullyHiddenWhenCollapsed && collapsed && !isRail && !isSlideDrawer;
  const isCollapsed = isRail || collapsed;
  const theme = roleTheme(profileUiRole(userProfile));
  const { enabled: newspaper } = useNewspaperSkin();
  const showStaffConsole = hasStaffConsoleAccess(userProfile);

  const selectTab = (id: AnyTab) => {
    onTabChange(id);
    if (autoCollapseOnNavigate && onCollapse && !collapsed) {
      onCollapse();
    }
  };

  const communityItems = NAV_ITEMS.filter((i) => i.section === 'community');
  const staffItems = showStaffConsole
    ? NAV_ITEMS.filter((i) => i.section === 'staff' && actorRank >= (i.minRank ?? 0))
    : [];

  const roleName = showStaffConsole ? roleLabel(userProfile.role) : roleLabel('user');
  const drawerOpen = isSlideDrawer && !collapsed;
  const isOverlayDrawer = isSlideDrawer ? drawerOpen : overlay && !isFullyHidden && !isCollapsed;

  const asideClassName = isSlideDrawer
    ? `sbn-sidebar sbn-sidebar-drawer flex flex-col bg-surface border-r border-app ${
        drawerOpen ? 'sbn-sidebar-drawer-open' : 'sbn-sidebar-drawer-closed'
      }`
    : `sbn-sidebar flex flex-col h-full bg-surface border-r border-app shrink-0 ${
        isRail
          ? 'w-[4.5rem]'
          : isFullyHidden
            ? 'w-0 border-r-0 overflow-hidden pointer-events-none'
            : `transition-all duration-200 ${isCollapsed ? 'w-14' : 'w-60'}`
      } ${isOverlayDrawer ? 'sbn-sidebar-overlay fixed left-0 z-50 shadow-xl' : ''}`;

  return (
    <aside
      id="app_sidebar"
      data-variant={variant}
      className={asideClassName}
      style={{ '--sbn-role-accent': theme.accent, '--sbn-role-soft': theme.soft } as CSSProperties}
      aria-hidden={isFullyHidden || (isSlideDrawer && collapsed) || undefined}
    >
      {/* Role accent rail — a hairline strip of color so each rank reads instantly */}
      <div className="sbn-sidebar-accent-bar" />

      {isOverlayDrawer ? (
        <div className="sbn-sidebar-drawer-head border-b border-app">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <PresenceUserAvatar
              uid={userProfile.uid}
              src={userProfile.photoURL}
              name={userProfile.displayName}
              size="sm"
              className="shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-app truncate leading-tight">{userProfile.displayName}</p>
              <span className="sbn-sidebar-role-pill mt-1">{theme.shortLabel}</span>
            </div>
          </div>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="p-2 -mr-1 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors shrink-0"
              aria-label="Close navigation menu"
              id="app_sidebar_close_btn"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Logo */}
          <div className={`flex items-center gap-2 px-3 py-4 border-b border-app ${isCollapsed ? 'justify-center' : ''}`}>
            {isCollapsed ? (
              showStaffConsole ? (
                <ShieldCheck className="w-6 h-6 shrink-0" style={{ color: theme.accent }} />
              ) : (
                <BrandLogo compact showTitle={false} />
              )
            ) : (
              <BrandLogo imgClassName="h-12 w-12 object-contain shrink-0" showTitle={false} />
            )}
          </div>

          {/* Signed-in-as card */}
          {!isCollapsed && (
            <div className="sbn-sidebar-identity px-3 py-3 border-b border-app">
              <div className="flex items-center gap-2.5 min-w-0">
                <PresenceUserAvatar
                  uid={userProfile.uid}
                  src={userProfile.photoURL}
                  name={userProfile.displayName}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-app truncate leading-tight">{userProfile.displayName}</p>
                  <p className="text-[10px] font-semibold text-muted mt-0.5 truncate">{roleName}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <nav className="sbn-sidebar-nav flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5 min-h-0 min-w-0">
        {/* Community section */}
        {!isCollapsed && (
          <p className="px-1 pt-1 pb-1 text-[9px] font-black uppercase tracking-widest text-subtle font-mono">
            Community
          </p>
        )}
        {communityItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              id={`app_sidebar_${id}`}
              onClick={() => selectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? label : undefined}
              className={`sbn-sidebar-item w-full min-w-0 flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium ${
                isActive ? 'sbn-sidebar-item-active' : 'text-muted hover:bg-inset hover:text-app'
              } ${isCollapsed ? 'flex-col gap-1 justify-center py-2.5' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              {!isCollapsed ? (
                <span className="truncate text-left min-w-0 flex-1">{label}</span>
              ) : (
                <span className="text-[9px] font-bold leading-none">{label}</span>
              )}
            </button>
          );
        })}

        {/* Staff section */}
        {staffItems.length > 0 && (
          <>
            {!isCollapsed && (
              <p
                className="px-1 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest font-mono"
                style={{ color: theme.accent }}
              >
                {newspaper ? 'Editorial desks' : 'Staff'}
              </p>
            )}
            {isCollapsed && <div className="mx-1 my-2 border-t border-app" />}
            {staffItems.map(({ id, label, icon: Icon, minRank = 0 }) => {
              const hasAccess = actorRank >= minRank;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  id={`app_sidebar_${id}`}
                  onClick={() => selectTab(id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={isCollapsed ? label : undefined}
                  className={`sbn-sidebar-item w-full min-w-0 flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[13px] font-medium ${
                    isActive
                      ? 'sbn-sidebar-item-active'
                      : hasAccess
                        ? 'text-muted hover:bg-inset hover:text-app'
                        : 'text-subtle opacity-50 cursor-pointer'
                  } ${isCollapsed ? 'flex-col gap-1 justify-center py-2.5' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  {!isCollapsed ? (
                    <span className="flex-1 min-w-0 text-left leading-snug line-clamp-2">{label}</span>
                  ) : (
                    <span className="text-[9px] font-bold leading-none text-center">{label}</span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      {onToggleCollapse && !isRail && !fullyHiddenWhenCollapsed && (
        <div className={`border-t border-app p-2 flex items-center ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}
