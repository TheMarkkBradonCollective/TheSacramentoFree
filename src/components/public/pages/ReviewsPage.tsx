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
      subtitle="What neighbors think of the app — plus notes from our director and city manager."
    >
      <CommunityReviews onRequireSignIn={onRequireSignIn} />
      <DirectorMessage />
      <CityManagerMessage />
    </PublicPageShell>
  );
}
