import type { ReactNode } from 'react';
import { MapPin, Menu } from 'lucide-react';
import type { UserProfile } from '../types';
import { NotificationsHubButton } from '../contexts/NotificationsHubContext';
import AwardsButton from './AwardsButton';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';

interface AppTopbarProps {
  userProfile: UserProfile;
  eyebrow?: string;
  title?: string;
  onOpenAwards: () => void;
  awardsButtonGlow?: boolean;
  /** Contextual primary action, e.g. "+ Post" on Feed, "+ Post event" on Events. */
  action?: ReactNode;
  /** Opens the staff sidebar drawer — hamburger sits top-left where the logo lives in the shell. */
  onToggleSidebar?: () => void;
  /** Logo + SacramentoBuyNothing + tagline instead of eyebrow/title (staff mobile). */
  brandLockup?: boolean;
}

/** Slim utility bar shared by the desktop + tablet shells — always reachable, even inside staff panels. */
export default function AppTopbar({
  userProfile,
  eyebrow,
  title,
  onOpenAwards,
  awardsButtonGlow = false,
  action,
  onToggleSidebar,
  brandLockup = false,
}: AppTopbarProps) {
  return (
    <header id="app_topbar" className="sbn-topbar">
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
          <BrandLogo showTitle compact className="flex items-center gap-2 min-w-0" />
        ) : (
          <div className="min-w-0">
            {eyebrow && <p className="sbn-topbar-eyebrow">{eyebrow}</p>}
            {title && <h1 className="sbn-topbar-title truncate">{title}</h1>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0" id="app_topbar_actions">
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-inset border border-app text-accent text-xs font-semibold"
          id="topbar_neighborhood_badge"
        >
          <MapPin className="w-3.5 h-3.5" />
          {userProfile.neighborhood}
        </div>
        <ThemeToggle />
        <NotificationsHubButton />
        <AwardsButton onClick={onOpenAwards} glow={awardsButtonGlow} />
        {action}
      </div>
    </header>
  );
}
