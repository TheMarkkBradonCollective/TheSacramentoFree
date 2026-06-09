import DirectorMessage from '../../DirectorMessage';
import PublishedStaffMessages from '../../PublishedStaffMessages';
import CommunityReviews from '../../CommunityReviews';
import PublicPageShell from '../PublicPageShell';

interface ReviewsPageProps {
  onRequireSignIn?: () => void;
}

export default function ReviewsPage({ onRequireSignIn }: ReviewsPageProps) {
  return (
    <PublicPageShell
      title="Reviews"
      subtitle="What neighbors think of the app — and notes from our team when you scroll down."
    >
      <CommunityReviews onRequireSignIn={onRequireSignIn} />
      <div className="space-y-5 mt-8">
        <DirectorMessage onRequireSignIn={onRequireSignIn} />
        <PublishedStaffMessages onRequireSignIn={onRequireSignIn} />
      </div>
    </PublicPageShell>
  );
}
