import type { EventStatus } from '../types';
import { eventStatusLabel, getEventStatusBadgeClass } from '../lib/eventRsvp';

interface EventStatusBadgeProps {
  status: EventStatus;
  className?: string;
}

export default function EventStatusBadge({ status, className = '' }: EventStatusBadgeProps) {
  return (
    <span className={`sbn-badge ${getEventStatusBadgeClass(status)} text-[10px] sm:text-xs py-0.5 ${className}`.trim()}>
      {eventStatusLabel(status)}
    </span>
  );
}
