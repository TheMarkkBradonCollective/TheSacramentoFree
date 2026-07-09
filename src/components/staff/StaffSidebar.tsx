import {
  ActivitySquare,
  CalendarDays,
  FileText,
  GaugeCircle,
  Inbox,
  List,
  Map,
  MapPin,
  MessageSquare,
  Shield,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import type { AnyTab } from '../../lib/appTabs';
import { normalizeUserRole, roleLabel, roleRank } from '../../lib/roles';
import { NotificationsHubButton } from '../../contexts/NotificationsHubContext';
import BrandLogo from '../BrandLogo';

interface SidebarItem {
  id: AnyTab;
  label: string;
  icon: typeof List;
  section?: 'community' | 'staff';
  /** Minimum role rank required to see this item (0 = everyone). */
  minRank?: number;
}

const NAV_ITEMS: SidebarItem[] = [
  // Community
  { id: 'feed', label: 'Feed', icon: List, section: 'community' },
  { id: 'events', label: 'Events', icon: CalendarDays, section: 'community' },
  { id: 'map', label: 'Map', icon: Map, section: 'community' },
  { id: 'chats', label: 'Chats', icon: MessageSquare, section: 'community' },
  { id: 'profile', label: 'Account', icon: User, section: 'community' },
  // Staff
  { id: 'staff_overview', label: 'Overview', icon: GaugeCircle, section: 'staff', minRank: 1 },
  { id: 'staff_users', label: 'Users', icon: Users, section: 'staff', minRank: 1 },
  { id: 'staff_posts', label: 'Posts', icon: FileText, section: 'staff', minRank: 1 },
  { id: 'staff_messages', label: 'Messages', icon: Inbox, section: 'staff', minRank: 1 },
  { id: 'staff_meets', label: 'Meet Records', icon: MapPin, section: 'staff', minRank: 1 },
  { id: 'staff_moderation', label: 'Moderation', icon: ActivitySquare, section: 'staff', minRank: 1 },
  { id: 'staff_team', label: 'Team', icon: Shield, section: 'staff', minRank: 2 },
];

interface StaffSidebarProps {
  userProfile: UserProfile;
  activeTab: AnyTab;
  onTabChange: (tab: AnyTab) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function StaffSidebar({
  userProfile,
  activeTab,
  onTabChange,
  collapsed = false,
  onToggleCollapse,
}: StaffSidebarProps) {
  const actorRank = roleRank(userProfile.role);

  const communityItems = NAV_ITEMS.filter((i) => i.section === 'community');
  const staffItems = NAV_ITEMS.filter(
    (i) => i.section === 'staff' && actorRank >= (i.minRank ?? 0),
  );

  const roleName = roleLabel(userProfile.role);
  const isDirector = normalizeUserRole(userProfile.role) === 'director';

  return (
    <aside
      id="staff_sidebar"
      className={`flex flex-col h-full bg-surface border-r border-app transition-all duration-200 shrink-0 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2 px-3 py-4 border-b border-app ${collapsed ? 'justify-center' : ''}`}>
        {collapsed ? (
          <ShieldCheck className="w-6 h-6 text-accent shrink-0" />
        ) : (
          <BrandLogo imgClassName="h-7 w-auto" showTitle={false} />
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-app">
          <p className="text-[9px] font-black uppercase tracking-widest text-subtle font-mono">Signed in as</p>
          <p className="text-xs font-semibold text-app truncate mt-0.5">{userProfile.displayName}</p>
          <p className={`text-[10px] font-semibold mt-0.5 ${isDirector ? 'text-accent' : 'text-muted'}`}>{roleName}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 min-h-0">
        {/* Community section */}
        {!collapsed && (
          <p className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest text-subtle font-mono">
            Community
          </p>
        )}
        {communityItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              id={`staff_sidebar_${id}`}
              onClick={() => onTabChange(id)}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mx-1 transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:bg-inset hover:text-app'
              } ${collapsed ? 'justify-center w-auto' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}

        {/* Staff section */}
        {staffItems.length > 0 && (
          <>
            {!collapsed && (
              <p className="px-3 pt-4 pb-1 text-[9px] font-black uppercase tracking-widest text-accent font-mono">
                Staff Tools
              </p>
            )}
            {collapsed && <div className="mx-2 my-2 border-t border-app" />}
            {staffItems.map(({ id, label, icon: Icon, minRank = 0 }) => {
              const hasAccess = actorRank >= minRank;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  id={`staff_sidebar_${id}`}
                  onClick={() => onTabChange(id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mx-1 transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : hasAccess
                        ? 'text-muted hover:bg-inset hover:text-app'
                        : 'text-subtle opacity-50 cursor-pointer'
                  } ${collapsed ? 'justify-center w-auto' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  {!collapsed && (
                    <span className="flex-1 truncate text-left">{label}</span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={`border-t border-app p-2 flex items-center gap-2 ${collapsed ? 'flex-col' : 'justify-between'}`}>
        <NotificationsHubButton />
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors"
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
        )}
      </div>
    </aside>
  );
}
