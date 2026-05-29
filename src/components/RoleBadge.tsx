import type { UserProfile } from '../types';
import { normalizeUserRole, ROLE_LABELS } from '../lib/roles';

interface RoleBadgeProps {
  role?: UserProfile['role'];
  /** When true, also renders a badge for plain 'user' role (own profile view). */
  showForUser?: boolean;
}

export default function RoleBadge({ role, showForUser = false }: RoleBadgeProps) {
  const normalized = normalizeUserRole(role);

  switch (normalized) {
    case 'director':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold tracking-wider uppercase rounded-full border border-amber-500/20">
          {ROLE_LABELS.director}
        </span>
      );
    case 'city_manager':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent text-on-accent text-[10px] font-bold tracking-wider uppercase rounded-full">
          {ROLE_LABELS.city_manager}
        </span>
      );
    case 'city_administrator':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-bold tracking-wider uppercase rounded-full border border-sky-500/20">
          {ROLE_LABELS.city_administrator}
        </span>
      );
    case 'city_moderator':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-wider uppercase rounded-full border border-emerald-500/20">
          {ROLE_LABELS.city_moderator}
        </span>
      );
    default:
      if (!showForUser) return null;
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-inset border border-app text-muted text-[10px] font-bold tracking-wider uppercase rounded-full">
          {ROLE_LABELS.user}
        </span>
      );
  }
}
