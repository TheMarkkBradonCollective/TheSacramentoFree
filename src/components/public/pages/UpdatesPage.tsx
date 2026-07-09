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
      title="App updates"
      subtitle={`What’s new in Sacramento Buy Nothing — posted by your director. Select any update to read more.`}
    >
      <UpdatesList
        userProfile={userProfile}
        onRequireSignIn={onRequireSignIn}
        showVotes={false}
        showComments
      />
    </PublicPageShell>
  );
}
