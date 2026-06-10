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
      title="Announcements"
      subtitle="News from Sacramento Buy Nothing staff — tap to read more, vote, and join the discussion."
    >
      <UpdatesList userProfile={userProfile} onRequireSignIn={onRequireSignIn} />
    </PublicPageShell>
  );
}
