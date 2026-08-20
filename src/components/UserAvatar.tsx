import { isUserOnline } from '../lib/presence';
import { usePresence } from '../contexts/PresenceContext';
import { resolveProfilePhoto } from '../lib/resolveProfilePhoto';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const DOT_CLASS: Record<AvatarSize, string> = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
  xl: 'w-3.5 h-3.5 border-2',
};

interface UserAvatarProps {
  src?: string | null;
  /** Stable uid for dicebear fallback when src is missing. */
  uid?: string;
  name: string;
  size?: AvatarSize;
  lastActiveAt?: string | null;
  showStatus?: boolean;
  className?: string;
  imgClassName?: string;
  borderClassName?: string;
}

export default function UserAvatar({
  src,
  uid,
  name,
  size = 'md',
  lastActiveAt,
  showStatus = true,
  className = '',
  imgClassName = '',
  borderClassName = 'border-app',
}: UserAvatarProps) {
  const online = showStatus && isUserOnline(lastActiveAt);
  const photo = resolveProfilePhoto({ snapshot: src, uid: uid || name, name });

  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        className={`${SIZE_CLASS[size]} rounded-full object-cover ${borderClassName} border ${imgClassName}`}
      />
      {showStatus && online && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-emerald-500 border-surface ${DOT_CLASS[size]}`}
          title="Active now"
          aria-label="Active now"
        />
      )}
    </span>
  );
}

export function PresenceUserAvatar({
  uid,
  src,
  name,
  size = 'md',
  showStatus = true,
  className = '',
  imgClassName = '',
  borderClassName = 'border-app',
}: {
  uid: string;
  src?: string | null;
  name: string;
  size?: AvatarSize;
  showStatus?: boolean;
  className?: string;
  imgClassName?: string;
  borderClassName?: string;
}) {
  const lastActiveAt = usePresence(uid);
  return (
    <UserAvatar
      src={src}
      uid={uid}
      name={name}
      size={size}
      showStatus={showStatus}
      lastActiveAt={lastActiveAt}
      className={className}
      imgClassName={imgClassName}
      borderClassName={borderClassName}
    />
  );
}
