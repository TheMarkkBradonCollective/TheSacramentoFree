import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import type { UserProfile } from '../types';
import { NotificationsHubButton } from '../contexts/NotificationsHubContext';
import AwardsButton from './AwardsButton';
import ThemeToggle from './ThemeToggle';

interface AppTopbarProps {
  userProfile: UserProfile;
  eyebrow?: string;
  title?: string;
  onOpenAwards: () => void;
  awardsButtonGlow?: boolean;
  /** Contextual primary action, e.g. "+ Post" on Feed, "+ Post event" on Events. */
  action?: ReactNode;
}

/** Slim utility bar shared by the desktop + tablet shells — always reachable, even inside staff panels. */
export default function AppTopbar({
  userProfile,
  eyebrow,
  title,
  onOpenAwards,
  awardsButtonGlow = false,
  action,
}: AppTopbarProps) {
  return (
    <header id="app_topbar" className="sbn-topbar">
      <div className="min-w-0">
        {eyebrow && <p className="sbn-topbar-eyebrow">{eyebrow}</p>}
        {title && <h1 className="sbn-topbar-title truncate">{title}</h1>}
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
