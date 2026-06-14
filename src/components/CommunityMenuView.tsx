import { UserProfile } from '../types';
import AccountHelpSection from './AccountHelpSection';
import StaffModerationPanel from './StaffModerationPanel';
import { canAccessStaffDirectory, canViewDirectorOverview } from '../lib/roles';

interface CommunityMenuViewProps {
  userProfile: UserProfile;
  onViewProfile: (userId: string) => void;
  scrollToDirectorOverview?: boolean;
  onClearScrollToDirectorOverview?: () => void;
  /** Edge-to-edge sections (mobile tab) — no nested card frames */
  fullBleed?: boolean;
}

/** Director overview and staff tools — shown on the Account tab. */
export default function CommunityMenuView({
  userProfile,
  onViewProfile,
  scrollToDirectorOverview,
  onClearScrollToDirectorOverview,
  fullBleed = false,
}: CommunityMenuViewProps) {
  const isStaff = canAccessStaffDirectory(userProfile.role);
  const isDirector = canViewDirectorOverview(userProfile);

  if (!isStaff && !isDirector) {
    return null;
  }

  const sectionShell = fullBleed ? 'px-4 py-5 border-t border-app/40' : '';

  return (
    <div className={`${fullBleed ? 'pb-2' : 'space-y-6'} min-w-0 w-full overflow-x-hidden`}>
      {isDirector ? (
        <div className={fullBleed ? sectionShell : ''}>
          <AccountHelpSection
            user={userProfile}
            scrollToDirectorOverview={scrollToDirectorOverview}
            onClearScrollToDirectorOverview={onClearScrollToDirectorOverview}
          />
        </div>
      ) : null}

      {isStaff ? (
        <div className={fullBleed ? `${sectionShell} border-t-0` : ''}>
          <StaffModerationPanel viewer={userProfile} onViewProfile={onViewProfile} />
        </div>
      ) : null}
    </div>
  );
}
