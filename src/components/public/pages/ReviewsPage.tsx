import DirectorMessage from '../../DirectorMessage';
import CityManagerMessage from '../../CityManagerMessage';
import CommunityReviews from '../../CommunityReviews';
import PublicPageShell from '../PublicPageShell';

interface ReviewsPageProps {
  onRequireSignIn?: () => void;
}

export default function ReviewsPage({ onRequireSignIn }: ReviewsPageProps) {
  return (
    <PublicPageShell
      title="Reviews"
      subtitle="Messages from our team and what neighbors think of the app."
    >
      <DirectorMessage />
      <CityManagerMessage />
      <CommunityReviews onRequireSignIn={onRequireSignIn} />
    </PublicPageShell>
  );
}
