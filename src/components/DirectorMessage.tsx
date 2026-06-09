import { useState } from 'react';
import { Heart, Pencil, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { useDirectorMessage } from '../hooks/useDirectorMessage';
import DirectorMessageEditModal from './DirectorMessageEditModal';

interface DirectorMessageProps {
  userProfile?: UserProfile | null;
  compact?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function DirectorMessage({ userProfile, compact = false }: DirectorMessageProps) {
  const { message, loading, saveMessage, canEdit } = useDirectorMessage(userProfile);
  const [editing, setEditing] = useState(false);

  if (loading) {
    return (
      <section className={`sbn-card ${compact ? 'p-4' : 'p-5'} text-sm text-muted`}>
        Loading director message…
      </section>
    );
  }

  return (
    <>
      <section
        className={`sbn-card border-l-4 border-l-amber-500/70 overflow-hidden ${
          compact ? 'p-4' : 'p-5 md:p-6'
        }`}
        aria-labelledby="director_message_heading"
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 font-display font-bold text-sm"
            aria-hidden
          >
            {initials(message.directorName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/90">
              {message.headline}
            </p>
            <h2
              id="director_message_heading"
              className="font-display font-bold text-app text-lg leading-snug mt-0.5"
            >
              {message.directorName}
            </h2>
            <p className="text-xs text-muted font-medium">{message.directorTitle}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-2 rounded-full text-muted hover:text-app hover:bg-inset"
                title="Edit director message"
                aria-label="Edit director message"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <Shield className="w-5 h-5 text-amber-500/60 mt-1" aria-hidden />
          </div>
        </div>

        <p className="mt-4 text-sm text-app leading-relaxed">{message.goal}</p>

        <ul className="mt-4 space-y-2">
          {message.promises.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-muted leading-relaxed">
              <Heart className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm font-semibold text-accent">{message.closing}</p>
      </section>

      {editing && (
        <DirectorMessageEditModal
          message={message}
          onClose={() => setEditing(false)}
          onSave={saveMessage}
        />
      )}
    </>
  );
}
