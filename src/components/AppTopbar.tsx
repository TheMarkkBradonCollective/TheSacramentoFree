import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import type { UserProfile } from '../types';
import BrandLogo from './BrandLogo';
import TopbarActions from './TopbarActions';

interface AppTopbarProps {
  userProfile: UserProfile;
  eyebrow?: string;
  title?: string;
  onOpenAccount: () => void;
  onOpenAwards?: () => void;
  awardsButtonGlow?: boolean;
  accountActive?: boolean;
  /** Contextual primary action, e.g. "+ Post" on Stuff, "+ Post event" on Events. */
  action?: ReactNode;
  /** Opens the staff sidebar drawer — hamburger sits top-left where the logo lives in the shell. */
  onToggleSidebar?: () => void;
  /** Logo + SacramentoBuyNothing + tagline instead of eyebrow/title (staff mobile). */
  brandLockup?: boolean;
  /** Hide while a mobile nav drawer covers the shell. */
  drawerOpen?: boolean;
  /** Ghost icon buttons — less chrome on narrow mobile headers. */
  compactActions?: boolean;
}

/** Slim utility bar shared by the desktop + tablet shells — always reachable, even inside staff panels. */
export default function AppTopbar({
  userProfile,
  eyebrow,
  title,
  onOpenAccount,
  onOpenAwards,
  awardsButtonGlow = false,
  accountActive = false,
  action,
  onToggleSidebar,
  brandLockup = false,
  drawerOpen = false,
  compactActions = false,
}: AppTopbarProps) {
  if (drawerOpen) return null;

  return (
    <header id="app_topbar" className={`sbn-topbar${compactActions ? ' sbn-topbar-compact' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation menu"
            id="topbar_menu_btn"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {brandLockup ? (
          <BrandLogo
            compact
            showTitle
            className="flex items-center gap-2 min-w-0 flex-1"
            imgClassName="h-9 w-9 object-cover rounded-lg shrink-0"
          />
        ) : (
          <div className="min-w-0">
            {eyebrow && <p className="sbn-topbar-eyebrow">{eyebrow}</p>}
            {title && <h1 className="sbn-topbar-title truncate">{title}</h1>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <TopbarActions
          userProfile={userProfile}
          onOpenAccount={onOpenAccount}
          onOpenAwards={onOpenAwards}
          awardsButtonGlow={awardsButtonGlow}
          accountActive={accountActive}
          compact={compactActions}
          showNeighborhood
        />
        {action}
      </div>
    </header>
  );
}
