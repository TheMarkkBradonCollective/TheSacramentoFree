import { UserProfile } from '../types';
import DirectorMessage from './DirectorMessage';
import CityManagerMessage from './CityManagerMessage';
import HorizontalSnapRow, { SnapSlide } from './HorizontalSnapRow';
import { useCityManagerMessage } from '../hooks/useCityManagerMessage';

interface LeadershipMessagesCarouselProps {
  userProfile?: UserProfile | null;
  onRequireSignIn?: () => void;
}

export default function LeadershipMessagesCarousel({
  userProfile,
  onRequireSignIn,
}: LeadershipMessagesCarouselProps) {
  const { isPublished, loading } = useCityManagerMessage(userProfile);
  const showCityManager = !loading && isPublished;

  if (!showCityManager) {
    return (
      <div>
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">From our team</p>
        <DirectorMessage userProfile={userProfile} compact onRequireSignIn={onRequireSignIn} />
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">From our team</p>
      <HorizontalSnapRow label="Leadership messages">
        <SnapSlide>
          <DirectorMessage userProfile={userProfile} compact onRequireSignIn={onRequireSignIn} />
        </SnapSlide>
        <SnapSlide>
          <CityManagerMessage userProfile={userProfile} compact onRequireSignIn={onRequireSignIn} />
        </SnapSlide>
      </HorizontalSnapRow>
    </div>
  );
}
