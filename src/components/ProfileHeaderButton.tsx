import type { UserProfile } from '../types';
import { PresenceUserAvatar } from './UserAvatar';

interface ProfileHeaderButtonProps {
  userProfile: UserProfile;
  active?: boolean;
  onClick: () => void;
  compact?: boolean;
  className?: string;
}

/** Header account entry — opens settings/profile (not a footer tab). */
export default function ProfileHeaderButton({
  userProfile,
  active = false,
  onClick,
  compact = false,
  className = '',
}: ProfileHeaderButtonProps) {
  const size = compact ? 'xs' : 'sm';

  return (
    <button
      type="button"
      id="header_profile_btn"
      onClick={onClick}
      aria-label="Account and settings"
      aria-current={active ? 'page' : undefined}
      title="Account"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 p-0.5 transition-colors cursor-pointer ${
        active ? 'border-accent ring-2 ring-accent/30' : 'border-app hover:border-accent/50'
      } ${className}`}
    >
      <PresenceUserAvatar
        uid={userProfile.uid}
        name={userProfile.displayName}
        src={userProfile.photoURL}
        size={size}
        className="rounded-full"
      />
    </button>
  );
}
