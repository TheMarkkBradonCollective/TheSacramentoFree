import { useState } from 'react';
import { StaffMessageContent, UserProfile } from '../types';
import { useCommunityContentVotes, EMPTY_VOTE } from '../hooks/useCommunityContentVotes';
import LeaderMessageCard from './LeaderMessageCard';
import LeaderMessageEditModal from './LeaderMessageEditModal';

interface StaffMessageProps {
  message: StaffMessageContent;
  userProfile?: UserProfile | null;
  compact?: boolean;
  canEdit?: boolean;
  onSave?: (next: StaffMessageContent) => Promise<{ ok: boolean; errorMessage?: string }>;
  onRequireSignIn?: () => void;
}

export default function StaffMessage({
  message,
  userProfile,
  compact = false,
  canEdit = false,
  onSave,
  onRequireSignIn,
}: StaffMessageProps) {
  const { getVoteState, handleVote } = useCommunityContentVotes(
    'leader_message',
    [message.userId],
    userProfile,
  );
  const [editing, setEditing] = useState(false);

  return (
    <>
      <LeaderMessageCard
        variant="staff"
        headingId={`staff_message_heading_${message.userId}`}
        headline={message.headline}
        name={message.staffName}
        title={message.staffTitle}
        goal={message.goal}
        promises={message.promises}
        closing={message.closing}
        compact={compact}
        canEdit={canEdit}
        onEdit={() => setEditing(true)}
        voteState={getVoteState(message.userId) ?? EMPTY_VOTE}
        onVote={(dir) => handleVote(message.userId, dir)}
        onRequireSignIn={onRequireSignIn}
        signedIn={Boolean(userProfile)}
      />

      {editing && onSave && (
        <LeaderMessageEditModal
          editTitle="Edit your team message"
          values={{
            name: message.staffName,
            title: message.staffTitle,
            headline: message.headline,
            goal: message.goal,
            promises: message.promises,
            closing: message.closing,
          }}
          onClose={() => setEditing(false)}
          onSave={async (next) => {
            const result = await onSave({
              ...message,
              staffName: next.name,
              staffTitle: next.title,
              headline: next.headline,
              goal: next.goal,
              promises: next.promises,
              closing: next.closing,
              updatedAt: new Date().toISOString(),
            });
            if (result.ok) setEditing(false);
            return result;
          }}
        />
      )}
    </>
  );
}
