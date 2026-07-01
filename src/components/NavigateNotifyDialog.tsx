import ConfirmDialog from './ConfirmDialog';
import { formatRouteDistance, formatRouteDuration } from '../lib/mapRoute';

interface NavigateNotifyDialogProps {
  open: boolean;
  posterName: string;
  itemTitle: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  notifying?: boolean;
  onNotify: () => void;
  onSkip: () => void;
}

export default function NavigateNotifyDialog({
  open,
  posterName,
  itemTitle,
  distanceMeters,
  durationSeconds,
  notifying = false,
  onNotify,
  onSkip,
}: NavigateNotifyDialogProps) {
  const etaLine =
    distanceMeters != null && durationSeconds != null
      ? `They'll see you're about ${formatRouteDistance(distanceMeters)} away (${formatRouteDuration(durationSeconds)}).`
      : "They'll see your estimated arrival time and distance.";

  return (
    <ConfirmDialog
      open={open}
      title="Notify the poster?"
      message={`Let ${posterName} know you're on your way to pick up "${itemTitle}"?\n\n${etaLine} Your live location is never shared.`}
      confirmLabel={notifying ? 'Sending…' : 'Yes, notify'}
      cancelLabel="No thanks"
      onConfirm={onNotify}
      onCancel={onSkip}
    />
  );
}
