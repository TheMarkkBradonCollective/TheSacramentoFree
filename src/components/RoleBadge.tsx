import type { UserProfile } from '../types';

interface RoleBadgeProps {
  role?: UserProfile['role'];
  /** When true, also renders a badge for plain 'user' role (own profile view). */
  showForUser?: boolean;
}

export default function RoleBadge({ role, showForUser = false }: RoleBadgeProps) {
  switch (role) {
    case 'director':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold tracking-wider uppercase rounded-full border border-amber-500/20">
          🌻 Sunflower Director
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent text-on-accent text-[10px] font-bold tracking-wider uppercase rounded-full">
          🛡️ Circle Admin
        </span>
      );
    case 'moderator':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-bold tracking-wider uppercase rounded-full border border-sky-500/20">
          🤝 Community Moderator
        </span>
      );
    default:
      if (!showForUser) return null;
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-inset border border-app text-muted text-[10px] font-bold tracking-wider uppercase rounded-full">
          🏡 Local Neighbor
        </span>
      );
  }
}
