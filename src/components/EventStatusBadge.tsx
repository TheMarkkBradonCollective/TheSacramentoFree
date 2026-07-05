import { Clock, History, XCircle } from 'lucide-react';
import type { EventStatus } from '../types';
import { eventStatusLabel } from '../lib/eventRsvp';

interface EventStatusBadgeProps {
  status: EventStatus;
}

export default function EventStatusBadge({ status }: EventStatusBadgeProps) {
  if (status === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-accent bg-accent-soft px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" />
        {eventStatusLabel(status)}
      </span>
    );
  }

  if (status === 'past') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted bg-inset px-2 py-0.5 rounded-full">
        <History className="w-3 h-3" />
        {eventStatusLabel(status)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" />
      {eventStatusLabel(status)}
    </span>
  );
}
