import type { UserProfile } from '../types';
import { NotificationsHubButton } from '../contexts/NotificationsHubContext';
import AwardsButton from './AwardsButton';
import ProfileHeaderButton from './ProfileHeaderButton';

interface TopbarActionsProps {
  userProfile: UserProfile;
  onOpenAccount: () => void;
  onOpenAwards?: () => void;
  awardsButtonGlow?: boolean;
  accountActive?: boolean;
  /** Ghost icon buttons — less chrome on narrow mobile headers. */
  compact?: boolean;
  /** Show neighborhood badge on large screens (desktop/tablet topbar). */
  showNeighborhood?: boolean;
}

/** Shared header — badges, bell (news/updates/alerts), profile avatar. */
export default function TopbarActions({
  userProfile,
  onOpenAccount,
  onOpenAwards,
  awardsButtonGlow = false,
  accountActive = false,
  compact = false,
  showNeighborhood = false,
}: TopbarActionsProps) {
  return (
    <div className="flex items-center shrink-0 gap-1.5 sm:gap-2" id="app_topbar_actions">
      {showNeighborhood && (
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-inset border border-app text-accent text-xs font-semibold"
          id="topbar_neighborhood_badge"
        >
          {userProfile.neighborhood}
        </div>
      )}
      {onOpenAwards ? (
        <AwardsButton
          onClick={onOpenAwards}
          glow={awardsButtonGlow}
          compact={compact}
          className="-mr-0.5"
        />
      ) : null}
      <NotificationsHubButton compact={compact} className="-mr-0.5" />
      <ProfileHeaderButton
        userProfile={userProfile}
        active={accountActive}
        onClick={onOpenAccount}
        compact={compact}
        className="ml-0.5 sm:ml-1"
      />
    </div>
  );
}
