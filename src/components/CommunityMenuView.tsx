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

export default function CommunityMenuView({
  userProfile,
  onViewProfile,
  scrollToDirectorOverview,
  onClearScrollToDirectorOverview,
  fullBleed = false,
}: CommunityMenuViewProps) {
  const sectionShell = fullBleed ? 'px-4 py-5 border-t border-app/40' : '';
  const isStaff = canAccessStaffDirectory(userProfile.role);
  const isDirector = canViewDirectorOverview(userProfile.role);

  return (
    <div className={`${fullBleed ? 'pb-6' : 'space-y-6'} min-w-0 w-full overflow-x-hidden`}>
      {!isStaff && !isDirector ? (
        <div className={fullBleed ? sectionShell : ''}>
          <p className="text-sm text-muted leading-relaxed">
            Reviews and safety reports are in <span className="font-semibold text-app">Chat</span>. News and
            announcements are in the <span className="font-semibold text-app">bell</span> (top right).
          </p>
        </div>
      ) : null}
      <div className={fullBleed ? sectionShell : ''}>
        <AccountHelpSection
          user={userProfile}
          scrollToDirectorOverview={scrollToDirectorOverview}
          onClearScrollToDirectorOverview={onClearScrollToDirectorOverview}
        />
      </div>

      {isStaff && (
        <div className={fullBleed ? `${sectionShell} border-t-0` : ''}>
          <StaffModerationPanel viewer={userProfile} onViewProfile={onViewProfile} />
        </div>
      )}
    </div>
  );
}
