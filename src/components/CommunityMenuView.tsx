import { UserProfile } from '../types';
import AccountHelpSection from './AccountHelpSection';
import StaffModerationPanel from './StaffModerationPanel';
import CommunityFooter from './CommunityFooter';
import { canAccessStaffDirectory } from '../lib/roles';

interface CommunityMenuViewProps {
  userProfile: UserProfile;
  onViewProfile: (userId: string) => void;
  /** Edge-to-edge sections (mobile tab) — no nested card frames */
  fullBleed?: boolean;
}

export default function CommunityMenuView({
  userProfile,
  onViewProfile,
  fullBleed = false,
}: CommunityMenuViewProps) {
  const sectionShell = fullBleed ? 'px-4 py-5 border-t border-app/40' : '';

  return (
    <div className={fullBleed ? 'pb-6' : 'space-y-6'}>
      <div className={fullBleed ? sectionShell : ''}>
        <AccountHelpSection user={userProfile} />
      </div>

      {canAccessStaffDirectory(userProfile.role) && (
        <div className={fullBleed ? `${sectionShell} border-t-0` : ''}>
          <StaffModerationPanel viewer={userProfile} onViewProfile={onViewProfile} />
        </div>
      )}

      <div className={fullBleed ? 'px-4' : ''}>
        <CommunityFooter compact />
      </div>
    </div>
  );
}
