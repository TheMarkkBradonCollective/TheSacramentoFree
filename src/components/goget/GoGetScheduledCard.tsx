import type { ReactNode } from 'react';
import { formatPickupCountdown, formatScheduledWhen } from '../../lib/pickupEngine';

interface GoGetScheduledCardProps {
  scheduledAt: string;
  locationLabel?: string;
  otherName: string;
  role: 'requester' | 'fulfiller';
  ready: boolean;
  readyWindowOpen: boolean;
  children?: ReactNode;
}

export default function GoGetScheduledCard({
  scheduledAt,
  locationLabel,
  otherName,
  role,
  ready,
  readyWindowOpen,
  children,
}: GoGetScheduledCardProps) {
  const when = formatScheduledWhen(scheduledAt);
  const countdown = formatPickupCountdown(scheduledAt);

  return (
    <div className="sbn-card p-4 space-y-3" id="go_get_scheduled_card">
      <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Go Get</p>
      <div>
        <p className="text-sm font-bold text-app">Pickup scheduled</p>
        <p className="text-lg font-black text-app mt-0.5">{when}</p>
        <p className="text-xs text-muted mt-1">{countdown}</p>
      </div>
      {locationLabel ? (
        <p className="text-xs text-muted">Pickup location · {locationLabel}</p>
      ) : null}
      {ready ? (
        <p className="text-sm text-app">
          {role === 'requester' ? `${otherName} is ready for pickup.` : `You're ready — waiting for ${otherName}.`}
        </p>
      ) : readyWindowOpen ? (
        <p className="text-sm text-app">
          {role === 'fulfiller'
            ? 'Are you ready for pickup?'
            : `${otherName} is getting ready for your pickup.`}
        </p>
      ) : (
        <p className="text-xs text-muted">
          {role === 'requester'
            ? `Waiting for ${otherName} to confirm they're ready.`
            : 'Come back when the pickup window opens to mark ready.'}
        </p>
      )}
      {children}
    </div>
  );
}
