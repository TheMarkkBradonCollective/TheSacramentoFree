import type { UserProfile } from '../types';
import { MapPin } from 'lucide-react';
import { NotificationsHubButton } from '../contexts/NotificationsHubContext';
import AwardsButton from './AwardsButton';
import ThemeToggle from './ThemeToggle';

interface TopbarActionsProps {
  userProfile: UserProfile;
  onOpenAwards: () => void;
  awardsButtonGlow?: boolean;
  /** Ghost icon buttons — less chrome on narrow mobile headers. */
  compact?: boolean;
  /** Show neighborhood badge on large screens (desktop/tablet topbar). */
  showNeighborhood?: boolean;
}

/** Shared header action cluster — theme, notifications, and badges for every shell. */
export default function TopbarActions({
  userProfile,
  onOpenAwards,
  awardsButtonGlow = false,
  compact = false,
  showNeighborhood = false,
}: TopbarActionsProps) {
  return (
    <div className={`flex items-center shrink-0${compact ? ' gap-0.5' : ' gap-2'}`} id="app_topbar_actions">
      {showNeighborhood && (
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-inset border border-app text-accent text-xs font-semibold"
          id="topbar_neighborhood_badge"
        >
          <MapPin className="w-3.5 h-3.5" />
          {userProfile.neighborhood}
        </div>
      )}
      <ThemeToggle compact={compact} />
      <NotificationsHubButton compact={compact} />
      <AwardsButton onClick={onOpenAwards} glow={awardsButtonGlow} compact={compact} />
    </div>
  );
}
