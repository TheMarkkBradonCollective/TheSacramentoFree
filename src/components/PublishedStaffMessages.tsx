import { Fragment } from 'react';
import { UserProfile } from '../types';
import { usePublishedStaffMessages } from '../hooks/usePublishedStaffMessages';
import { useStaffMessage } from '../hooks/useStaffMessage';
import StaffMessage from './StaffMessage';

interface PublishedStaffMessagesProps {
  userProfile?: UserProfile | null;
  compact?: boolean;
  showVotes?: boolean;
  onRequireSignIn?: () => void;
}

export default function PublishedStaffMessages({
  userProfile,
  compact = false,
  showVotes = true,
  onRequireSignIn,
}: PublishedStaffMessagesProps) {
  const { messages, loading } = usePublishedStaffMessages();
  const { saveMessage } = useStaffMessage(userProfile);

  if (loading) {
    return (
      <section className={`sbn-card ${compact ? 'p-4' : 'p-5'} text-sm text-muted`}>
        Loading team messages…
      </section>
    );
  }

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={compact ? 'contents' : 'space-y-5'}>
      {messages.map((message) => (
        <Fragment key={message.userId}>
          <StaffMessage
            message={message}
            userProfile={userProfile}
            compact={compact}
            canEdit={userProfile?.uid === message.userId}
            onSave={userProfile?.uid === message.userId ? saveMessage : undefined}
            showVotes={showVotes}
            onRequireSignIn={onRequireSignIn}
          />
        </Fragment>
      ))}
    </div>
  );
}
