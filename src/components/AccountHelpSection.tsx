import { UserProfile } from '../types';
import { canViewDirectorOverview } from '../lib/roles';
import DirectorSiteOverview from './DirectorSiteOverview';

interface AccountHelpSectionProps {
  user: UserProfile;
  scrollToDirectorOverview?: boolean;
  onClearScrollToDirectorOverview?: () => void;
}

export default function AccountHelpSection({
  user,
  scrollToDirectorOverview,
  onClearScrollToDirectorOverview,
}: AccountHelpSectionProps) {
  const showDirectorOverview = canViewDirectorOverview(user.role);

  if (!showDirectorOverview) {
    return null;
  }

  return (
    <div className="space-y-3 min-w-0 w-full overflow-x-hidden" id="account_help_section">
      <DirectorSiteOverview
        scrollIntoView={scrollToDirectorOverview}
        onScrolled={onClearScrollToDirectorOverview}
      />
    </div>
  );
}
