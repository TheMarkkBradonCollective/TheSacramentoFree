import { useState } from 'react';
import { isDirectorRole } from '../lib/roles';
import { UserProfile } from '../types';
import { useDirectorMessage } from '../hooks/useDirectorMessage';
import { useCommunityContentVotes, EMPTY_VOTE } from '../hooks/useCommunityContentVotes';
import { OWN_CONTENT_VOTE_DISABLED_REASON } from './ContentVoteButtons';
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
  const isOwnDirectorMessage = isDirectorRole(userProfile?.role);

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
        onVote={
          showVotes
            ? (dir) => handleVote('director', dir, { blockSelfId: isOwnDirectorMessage ? userProfile?.uid : undefined })
            : undefined
        }
        onRequireSignIn={onRequireSignIn}
        signedIn={Boolean(userProfile)}
        votesDisabled={isOwnDirectorMessage}
        votesDisabledReason={OWN_CONTENT_VOTE_DISABLED_REASON}
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
