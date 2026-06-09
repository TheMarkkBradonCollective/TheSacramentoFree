import { useState } from 'react';
import { UserProfile } from '../types';
import { useCityManagerMessage } from '../hooks/useCityManagerMessage';
import { useCommunityContentVotes, EMPTY_VOTE } from '../hooks/useCommunityContentVotes';
import LeaderMessageCard from './LeaderMessageCard';
import LeaderMessageEditModal from './LeaderMessageEditModal';

interface CityManagerMessageProps {
  userProfile?: UserProfile | null;
  compact?: boolean;
  onRequireSignIn?: () => void;
}

export default function CityManagerMessage({
  userProfile,
  compact = false,
  onRequireSignIn,
}: CityManagerMessageProps) {
  const { message, loading, saveMessage, canEdit, isPublished } = useCityManagerMessage(userProfile);
  const { getVoteState, handleVote } = useCommunityContentVotes(
    'leader_message',
    ['city_manager'],
    userProfile,
  );
  const [editing, setEditing] = useState(false);

  if (loading) {
    return (
      <section className={`sbn-card ${compact ? 'p-4' : 'p-5'} text-sm text-muted`}>
        Loading city manager message…
      </section>
    );
  }

  if (!isPublished) {
    return null;
  }

  return (
    <>
      <LeaderMessageCard
        variant="city_manager"
        headingId="city_manager_message_heading"
        headline={message.headline}
        name={message.managerName}
        title={message.managerTitle}
        goal={message.goal}
        promises={message.promises}
        closing={message.closing}
        compact={compact}
        canEdit={canEdit}
        onEdit={() => setEditing(true)}
        voteState={getVoteState('city_manager') ?? EMPTY_VOTE}
        onVote={(dir) => handleVote('city_manager', dir)}
        onRequireSignIn={onRequireSignIn}
        signedIn={Boolean(userProfile)}
      />

      {editing && (
        <LeaderMessageEditModal
          editTitle="Edit city manager message"
          values={{
            name: message.managerName,
            title: message.managerTitle,
            headline: message.headline,
            goal: message.goal,
            promises: message.promises,
            closing: message.closing,
          }}
          onClose={() => setEditing(false)}
          onSave={async (next) =>
            saveMessage({
              ...message,
              managerName: next.name,
              managerTitle: next.title,
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
