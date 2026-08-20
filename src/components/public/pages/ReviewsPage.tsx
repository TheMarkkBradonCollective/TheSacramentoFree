import DirectorMessage from '../../DirectorMessage';
import PublishedStaffMessages from '../../PublishedStaffMessages';
import CommunityReviews from '../../CommunityReviews';
import PublicPageShell from '../PublicPageShell';
import { useNewspaperSkin } from '../../../preview/NewspaperSkinContext';

interface ReviewsPageProps {
  onRequireSignIn?: () => void;
}

export default function ReviewsPage({ onRequireSignIn }: ReviewsPageProps) {
  const { enabled: newspaper } = useNewspaperSkin();
  return (
    <PublicPageShell
      title={newspaper ? 'Letters to the editor' : 'Reviews'}
      subtitle={
        newspaper
          ? 'What neighbors think of the gazette — and notes from the city desk when you scroll down.'
          : 'What neighbors think of the app — and notes from our team when you scroll down.'
      }
    >
      <CommunityReviews onRequireSignIn={onRequireSignIn} showVotes={false} />
      <div className="space-y-5 mt-8">
        <DirectorMessage onRequireSignIn={onRequireSignIn} showVotes={false} />
        <PublishedStaffMessages onRequireSignIn={onRequireSignIn} showVotes={false} />
      </div>
    </PublicPageShell>
  );
}
