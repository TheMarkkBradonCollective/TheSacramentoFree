import { useState } from 'react';
import { UserProfile } from '../types';
import { useDirectorMessage } from '../hooks/useDirectorMessage';
import { useCommunityContentVotes, EMPTY_VOTE } from '../hooks/useCommunityContentVotes';
import LeaderMessageCard from './LeaderMessageCard';
import LeaderMessageEditModal from './LeaderMessageEditModal';

interface DirectorMessageProps {
  userProfile?: UserProfile | null;
  compact?: boolean;
  showVotes?: boolean;
  onRequireSignIn?: () => void;
}

export default function DirectorMessage({
  userProfile,
  compact = false,
  showVotes = true,
  onRequireSignIn,
}: DirectorMessageProps) {
  const { message, loading, saveMessage, canEdit } = useDirectorMessage(userProfile);
  const { getVoteState, handleVote } = useCommunityContentVotes(
    'leader_message',
    showVotes ? ['director'] : [],
    userProfile,
  );
  const [editing, setEditing] = useState(false);

  return (
    <>
      <LeaderMessageCard
        variant="director"
        headingId="director_message_heading"
        headline={message.headline}
        name={message.directorName}
        title={message.directorTitle}
        goal={message.goal}
        promises={message.promises}
        closing={message.closing}
        compact={compact}
        loading={loading}
        canEdit={canEdit}
        onEdit={() => setEditing(true)}
        voteState={showVotes ? getVoteState('director') ?? EMPTY_VOTE : undefined}
        onVote={showVotes ? (dir) => handleVote('director', dir) : undefined}
        onRequireSignIn={onRequireSignIn}
        signedIn={Boolean(userProfile)}
      />

      {editing && (
        <LeaderMessageEditModal
          editTitle="Edit director message"
          values={{
            name: message.directorName,
            title: message.directorTitle,
            headline: message.headline,
            goal: message.goal,
            promises: message.promises,
            closing: message.closing,
          }}
          onClose={() => setEditing(false)}
          onSave={async (next) =>
            saveMessage({
              ...message,
              directorName: next.name,
              directorTitle: next.title,
              headline: next.headline,
              goal: next.goal,
              promises: next.promises,
              closing: next.closing,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}
    </>
  );
}
