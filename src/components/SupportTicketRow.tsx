import { LifeBuoy } from 'lucide-react';
import type { SupportTicket } from '../types';
import { avatarImageUrl } from '../lib/imageUrl';
import { formatSupportTime, supportMessagePreview, type SupportTicketLastMessage } from '../lib/supportChat';
import RoleBadge from './RoleBadge';

interface SupportTicketRowProps {
  ticket: SupportTicket;
  preview?: SupportTicketLastMessage | null;
  selected?: boolean;
  onClick: () => void;
  /** Staff inbox — highlight the neighbor who opened the ticket */
  showOpener?: boolean;
  className?: string;
}

export default function SupportTicketRow({
  ticket,
  preview,
  selected = false,
  onClick,
  showOpener = false,
  className = '',
}: SupportTicketRowProps) {
  const title = showOpener ? ticket.openerName : ticket.subject;
  const subtitle = showOpener ? ticket.subject : null;
  const avatarSeed = showOpener ? ticket.openerName : ticket.subject;
  const avatarUid = showOpener ? ticket.openerUserId : ticket.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left p-3 mx-1.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer',
        selected
          ? 'bg-accent-soft ring-1 ring-accent/25 shadow-sm'
          : 'hover:bg-surface-hover',
        className,
      ].join(' ')}
    >
      <img
        src={avatarImageUrl(showOpener ? ticket.openerPhotoURL : null, avatarSeed, avatarUid)}
        alt=""
        className="w-10 h-10 rounded-full border border-app object-cover shrink-0 bg-inset"
        referrerPolicy="no-referrer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-app truncate">{title}</p>
          <span className="text-[10px] text-subtle shrink-0">
            {formatSupportTime(preview?.createdAt || ticket.updatedAt)}
          </span>
        </div>
        {subtitle ? (
          <p className="text-[10px] text-muted mt-0.5 truncate flex items-center gap-1">
            <LifeBuoy className="w-3 h-3 shrink-0 text-accent" />
            <span className="truncate">{subtitle}</span>
            {ticket.openerRole && ticket.openerRole !== 'user' && showOpener ? (
              <RoleBadge role={ticket.openerRole} />
            ) : null}
          </p>
        ) : null}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted line-clamp-2 flex-1 min-w-0">
            {supportMessagePreview(preview)}
          </p>
          {ticket.status === 'open' ? (
            <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-400" title="Open" />
          ) : null}
        </div>
      </div>
    </button>
  );
}
