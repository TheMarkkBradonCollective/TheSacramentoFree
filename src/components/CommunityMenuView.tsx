import { UserProfile } from '../types';
import AccountHelpSection from './AccountHelpSection';
import { canViewDirectorOverview } from '../lib/roles';

interface CommunityMenuViewProps {
  userProfile: UserProfile;
  onViewProfile: (userId: string) => void;
  scrollToDirectorOverview?: boolean;
  onClearScrollToDirectorOverview?: () => void;
  /** Edge-to-edge sections (mobile tab) — no nested card frames */
  fullBleed?: boolean;
}

/** Director overview on the Account tab. Staff tools live in the staff sidebar. */
export default function CommunityMenuView({
  userProfile,
  scrollToDirectorOverview,
  onClearScrollToDirectorOverview,
  fullBleed = false,
}: CommunityMenuViewProps) {
  const isDirector = canViewDirectorOverview(userProfile?.role);

  if (!isDirector) {
    return null;
  }

  const sectionShell = fullBleed ? 'px-4 py-5 border-t border-app/40' : '';

  return (
    <div className={`${fullBleed ? 'pb-2' : 'space-y-6'} min-w-0 w-full overflow-x-hidden`}>
      <div className={fullBleed ? sectionShell : ''}>
        <AccountHelpSection
          user={userProfile}
          scrollToDirectorOverview={scrollToDirectorOverview}
          onClearScrollToDirectorOverview={onClearScrollToDirectorOverview}
        />
      </div>
    </div>
  );
}
