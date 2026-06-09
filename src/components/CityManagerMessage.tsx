import { useState } from 'react';
import { UserProfile } from '../types';
import { useCityManagerMessage } from '../hooks/useCityManagerMessage';
import LeaderMessageCard from './LeaderMessageCard';
import LeaderMessageEditModal from './LeaderMessageEditModal';

interface CityManagerMessageProps {
  userProfile?: UserProfile | null;
  compact?: boolean;
}

export default function CityManagerMessage({ userProfile, compact = false }: CityManagerMessageProps) {
  const { message, loading, saveMessage, canEdit } = useCityManagerMessage(userProfile);
  const [editing, setEditing] = useState(false);

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
        loading={loading}
        canEdit={canEdit}
        onEdit={() => setEditing(true)}
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
