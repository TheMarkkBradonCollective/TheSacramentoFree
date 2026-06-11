import { UserProfile } from '../types';
import AccountHelpSection from './AccountHelpSection';
import StaffModerationPanel from './StaffModerationPanel';
import { canAccessStaffDirectory } from '../lib/roles';

interface CommunityMenuViewProps {
  userProfile: UserProfile;
  onViewProfile: (userId: string) => void;
  initialStaffPanel?: 'reports' | null;
  onClearInitialStaffPanel?: () => void;
  scrollToDirectorOverview?: boolean;
  onClearScrollToDirectorOverview?: () => void;
  /** Edge-to-edge sections (mobile tab) — no nested card frames */
  fullBleed?: boolean;
}

export default function CommunityMenuView({
  userProfile,
  onViewProfile,
  initialStaffPanel = null,
  onClearInitialStaffPanel,
  scrollToDirectorOverview,
  onClearScrollToDirectorOverview,
  fullBleed = false,
}: CommunityMenuViewProps) {
  const sectionShell = fullBleed ? 'px-4 py-5 border-t border-app/40' : '';

  return (
    <div className={`${fullBleed ? 'pb-6' : 'space-y-6'} min-w-0 w-full overflow-x-hidden`}>
      <div className={fullBleed ? sectionShell : ''}>
        <AccountHelpSection
          user={userProfile}
          scrollToDirectorOverview={scrollToDirectorOverview}
          onClearScrollToDirectorOverview={onClearScrollToDirectorOverview}
        />
      </div>

      {canAccessStaffDirectory(userProfile.role) && (
        <div className={fullBleed ? `${sectionShell} border-t-0` : ''}>
          <StaffModerationPanel
            viewer={userProfile}
            onViewProfile={onViewProfile}
            initialPanel={initialStaffPanel}
            onClearInitialPanel={onClearInitialStaffPanel}
          />
        </div>
      )}
    </div>
  );
}
