import type { LucideIcon } from 'lucide-react';
import { UserPlus } from 'lucide-react';
import { PresenceUserAvatar } from './UserAvatar';

export interface ConversationStripItem {
  id: string;
  label: string;
  selected?: boolean;
  /** Direct message / support avatar */
  avatarUid?: string;
  avatarSrc?: string;
  /** Group / action tile */
  icon?: LucideIcon;
  iconClassName?: string;
  badge?: number;
  onClick: () => void;
}

interface ChatConversationStripProps {
  items: ConversationStripItem[];
  /** Optional leading action (e.g. start conversation) */
  onStartConversation?: () => void;
  className?: string;
  id?: string;
}

export default function ChatConversationStrip({
  items,
  onStartConversation,
  className = '',
  id = 'chat_conversation_strip',
}: ChatConversationStripProps) {
  if (items.length === 0 && !onStartConversation) return null;

  return (
    <div
      id={id}
      className={`shrink-0 border-b border-app/60 bg-surface/80 backdrop-blur-sm ${className}`}
    >
      <div className="flex gap-3 overflow-x-auto px-3 py-3 scrollbar-thin overscroll-x-contain">
        {onStartConversation ? (
          <button
            type="button"
            onClick={onStartConversation}
            className="flex shrink-0 flex-col items-center gap-1.5 w-[4.25rem] group"
            aria-label="Start conversation"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-app bg-inset/50 text-accent transition-colors group-hover:border-accent/40 group-hover:bg-accent-soft">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium text-muted group-hover:text-app">
              New
            </span>
          </button>
        ) : null}

        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="relative flex shrink-0 flex-col items-center gap-1.5 w-[4.25rem] group"
              aria-current={item.selected ? 'true' : undefined}
              title={item.label}
            >
              <span
                className={[
                  'relative flex h-16 w-16 items-center justify-center rounded-full transition-all',
                  item.selected
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-105'
                    : 'ring-1 ring-app/80 group-hover:ring-accent/30',
                ].join(' ')}
              >
                {item.avatarUid ? (
                  <PresenceUserAvatar
                    uid={item.avatarUid}
                    src={item.avatarSrc || ''}
                    name={item.label}
                    size="lg"
                  />
                ) : Icon ? (
                  <span
                    className={`flex h-full w-full items-center justify-center rounded-full ${item.iconClassName || 'bg-inset text-muted'}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                ) : null}
                {item.badge != null && item.badge > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-on-accent">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </span>
              <span
                className={`w-full truncate text-center text-[10px] font-medium leading-tight ${
                  item.selected ? 'text-app' : 'text-muted group-hover:text-app'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
