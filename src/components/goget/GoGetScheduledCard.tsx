import type { ReactNode } from 'react';
import { formatPickupCountdown, formatScheduledWhen } from '../../lib/pickupEngine';
import { meetCopyForMode, type MeetCopy } from '../../lib/meetCopy';
import type { CoordinationMode } from '../../types';

interface GoGetScheduledCardProps {
  scheduledAt: string;
  locationLabel?: string;
  otherName: string;
  role: 'requester' | 'fulfiller';
  ready: boolean;
  readyWindowOpen: boolean;
  mode?: CoordinationMode;
  children?: ReactNode;
}

export default function GoGetScheduledCard({
  scheduledAt,
  locationLabel,
  otherName,
  role,
  ready,
  readyWindowOpen,
  mode = 'go_get',
  children,
}: GoGetScheduledCardProps) {
  const copy: MeetCopy = meetCopyForMode(mode);
  const when = formatScheduledWhen(scheduledAt);
  const countdown = formatPickupCountdown(scheduledAt, new Date(), copy.countdownNoun);

  return (
    <div className="sbn-card p-4 space-y-3" id="go_get_scheduled_card">
      <p className="text-[10px] font-bold uppercase tracking-wider text-accent">{copy.umbrella}</p>
      <div>
        <p className="text-sm font-bold text-app">{copy.scheduledTitle}</p>
        <p className="text-lg font-black text-app mt-0.5">{when}</p>
        <p className="text-xs text-muted mt-1">{countdown}</p>
      </div>
      {locationLabel ? (
        <p className="text-xs text-muted">{copy.locationKind} · {locationLabel}</p>
      ) : null}
      {ready ? (
        <p className="text-sm text-app">
          {role === 'requester' ? copy.theyAreReady(otherName) : copy.youAreReady(otherName)}
        </p>
      ) : readyWindowOpen ? (
        <p className="text-sm text-app">
          {role === 'fulfiller' ? copy.readyQuestion : copy.gettingReady(otherName)}
        </p>
      ) : (
        <p className="text-xs text-muted">
          {role === 'requester'
            ? `Waiting for ${otherName} to confirm they're ready.`
            : 'Come back when the window opens to mark ready.'}
        </p>
      )}
      {children}
    </div>
  );
}
