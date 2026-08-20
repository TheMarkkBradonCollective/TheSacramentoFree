import { UserProfile } from '../../../types';
import UpdatesList from '../../UpdatesList';
import PublicPageShell from '../PublicPageShell';
import { useBrand } from '../../../preview/useBrand';

interface UpdatesPageProps {
  onRequireSignIn?: () => void;
  userProfile?: UserProfile | null;
}

export default function UpdatesPage({ onRequireSignIn, userProfile }: UpdatesPageProps) {
  const { newspaper, copy } = useBrand();
  return (
    <PublicPageShell
      title={newspaper ? 'Dispatches' : 'App updates'}
      subtitle={copy(`What’s new in Sacramento Buy Nothing — posted by your director. Select any update to read more.`)}
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
