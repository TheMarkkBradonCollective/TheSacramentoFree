import { useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import {
  DIRECTOR_BROADCAST_DEFAULT_BODY,
  DIRECTOR_BROADCAST_DEFAULT_TITLE,
} from '../lib/pushNotifications';

interface DirectorBroadcastTestModalProps {
  onClose: () => void;
  onSend: (payload: { title: string; body: string }) => void;
  sending?: boolean;
}

export default function DirectorBroadcastTestModal({
  onClose,
  onSend,
  sending = false,
}: DirectorBroadcastTestModalProps) {
  const [title, setTitle] = useState(DIRECTOR_BROADCAST_DEFAULT_TITLE);
  const [body, setBody] = useState(DIRECTOR_BROADCAST_DEFAULT_BODY);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend({
      title: title.trim() || DIRECTOR_BROADCAST_DEFAULT_TITLE,
      body: body.trim() || DIRECTOR_BROADCAST_DEFAULT_BODY,
    });
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div
        className="sbn-card w-full max-w-md p-5 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="director_broadcast_title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4
              id="director_broadcast_title"
              className="font-display font-bold text-app flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4 text-accent/80" />
              Broadcast
            </h4>
            <p className="text-xs text-muted mt-1 leading-snug">
              Send a notification to every neighbor with push enabled. This alerts all subscribed
              devices across the community — not just yours.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={sending} aria-label="Close" className="p-1.5 rounded-full hover:bg-inset shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted">Notification title</span>
            <input
              className="sbn-input text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={sending}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted">Notification message</span>
            <textarea
              className="sbn-input text-sm min-h-[5rem]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              disabled={sending}
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={sending} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={sending} className="sbn-btn sbn-btn-primary flex-1">
              {sending ? 'Broadcasting…' : 'Send to all'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
