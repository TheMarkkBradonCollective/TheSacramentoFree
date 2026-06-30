import { Fragment } from 'react';
import { UserProfile } from '../types';
import DirectorMessage from './DirectorMessage';
import StaffMessage from './StaffMessage';
import HorizontalSnapRow, { SnapSlide } from './HorizontalSnapRow';
import { usePublishedStaffMessages } from '../hooks/usePublishedStaffMessages';
import { useStaffMessage } from '../hooks/useStaffMessage';

interface LeadershipMessagesCarouselProps {
  userProfile?: UserProfile | null;
  onRequireSignIn?: () => void;
}

export default function LeadershipMessagesCarousel({
  userProfile,
  onRequireSignIn,
}: LeadershipMessagesCarouselProps) {
  const { messages: staffMessages, loading } = usePublishedStaffMessages();
  const { saveMessage } = useStaffMessage(userProfile);
  const hasStaffMessages = !loading && staffMessages.length > 0;

  if (!hasStaffMessages) {
    return (
      <div>
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">From our team</p>
        <DirectorMessage userProfile={userProfile} compact showVotes={false} onRequireSignIn={onRequireSignIn} />
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">From our team</p>
      <HorizontalSnapRow label="Leadership messages">
        <SnapSlide>
          <DirectorMessage userProfile={userProfile} compact showVotes={false} onRequireSignIn={onRequireSignIn} />
        </SnapSlide>
        {staffMessages.map((message) => (
          <Fragment key={message.userId}>
            <SnapSlide>
              <StaffMessage
                message={message}
                userProfile={userProfile}
                compact
                showVotes={false}
                canEdit={userProfile?.uid === message.userId}
                onSave={userProfile?.uid === message.userId ? saveMessage : undefined}
                onRequireSignIn={onRequireSignIn}
              />
            </SnapSlide>
          </Fragment>
        ))}
      </HorizontalSnapRow>
    </div>
  );
}
