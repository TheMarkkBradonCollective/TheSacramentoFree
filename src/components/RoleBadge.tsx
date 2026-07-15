import { Crown } from 'lucide-react';
import type { UserProfile } from '../types';
import { normalizeUserRole, ROLE_LABELS, ROLE_THEME } from '../lib/roles';

interface RoleBadgeProps {
  role?: UserProfile['role'];
  /** When true, also renders a badge for plain 'user' role (own profile view). */
  showForUser?: boolean;
}

/** Every rank shares one color identity (see ROLE_THEME) across badges, sidebars, and topbars. */
export default function RoleBadge({ role, showForUser = false }: RoleBadgeProps) {
  const normalized = normalizeUserRole(role);

  if (normalized === 'user') {
    if (!showForUser) return null;
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-inset border border-app text-muted text-[10px] font-bold tracking-wider uppercase rounded-full">
        {ROLE_LABELS.user}
      </span>
    );
  }

  const theme = ROLE_THEME[normalized];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full border"
      style={{ backgroundColor: theme.soft, color: theme.accent, borderColor: theme.soft }}
    >
      {normalized === 'director' && <Crown className="w-3 h-3" />}
      {ROLE_LABELS[normalized]}
    </span>
  );
}
