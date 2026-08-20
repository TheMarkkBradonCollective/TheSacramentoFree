import type { FeedPost } from '../../types';
import { formatPostClientBadge } from '../../lib/installContext';

interface FeedPostClientBadgeProps {
  installKind?: FeedPost['clientInstallKind'];
  version?: string | null;
}

export default function FeedPostClientBadge({ installKind, version }: FeedPostClientBadgeProps) {
  if (!installKind) return null;

  const { short, title } = formatPostClientBadge(installKind, version);

  return (
    <span
      className="shrink-0 inline-flex items-center rounded-full border border-app bg-inset px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-subtle"
      title={title}
    >
      {short}
    </span>
  );
}
