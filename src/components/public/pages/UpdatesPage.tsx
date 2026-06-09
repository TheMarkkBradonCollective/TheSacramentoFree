import { UserProfile } from '../../../types';
import UpdatesList from '../../UpdatesList';
import PublicPageShell from '../PublicPageShell';

interface UpdatesPageProps {
  onRequireSignIn?: () => void;
  userProfile?: UserProfile | null;
}

export default function UpdatesPage({ onRequireSignIn, userProfile }: UpdatesPageProps) {
  return (
    <PublicPageShell
      title="Updates"
      subtitle="What’s new in Sacramento Buy Nothing — tap any update to read more. Your votes go to the director."
    >
      <UpdatesList userProfile={userProfile} onRequireSignIn={onRequireSignIn} />
    </PublicPageShell>
  );
}
