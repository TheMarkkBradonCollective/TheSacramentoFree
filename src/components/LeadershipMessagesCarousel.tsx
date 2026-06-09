import { UserProfile } from '../types';
import DirectorMessage from './DirectorMessage';
import CityManagerMessage from './CityManagerMessage';
import HorizontalSnapRow, { SnapSlide } from './HorizontalSnapRow';

interface LeadershipMessagesCarouselProps {
  userProfile?: UserProfile | null;
}

export default function LeadershipMessagesCarousel({ userProfile }: LeadershipMessagesCarouselProps) {
  return (
    <div>
      <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">From our team</p>
      <HorizontalSnapRow label="Leadership messages">
        <SnapSlide>
          <DirectorMessage userProfile={userProfile} compact />
        </SnapSlide>
        <SnapSlide>
          <CityManagerMessage userProfile={userProfile} compact />
        </SnapSlide>
      </HorizontalSnapRow>
    </div>
  );
}
