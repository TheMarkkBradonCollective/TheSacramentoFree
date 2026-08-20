import type { ManeuverIconKind } from '../../lib/navigationRoute';

interface NavManeuverShieldProps {
  kind: ManeuverIconKind;
  className?: string;
}

export default function NavManeuverShield({ kind, className = 'w-12 h-12' }: NavManeuverShieldProps) {
  const arrow =
    kind === 'left' ? (
      <path d="M34 30 L22 42 L22 36 L14 36 L14 48 L22 48 L22 42 Z" fill="currentColor" />
    ) : kind === 'right' ? (
      <path d="M30 30 L42 42 L42 36 L50 36 L50 48 L42 48 L42 42 Z" fill="currentColor" />
    ) : kind === 'slight-left' ? (
      <path d="M30 28 L20 38 L24 38 L24 48 L36 48 L36 42 L30 42 Z" fill="currentColor" />
    ) : kind === 'slight-right' ? (
      <path d="M34 28 L44 38 L40 38 L40 48 L28 48 L28 42 L34 42 Z" fill="currentColor" />
    ) : kind === 'uturn' ? (
      <path d="M24 30 C24 22 40 22 40 30 L40 36 L34 36 L38 44 L46 36 L40 36 L40 30 C40 18 20 18 20 30 L20 48 L28 48 Z" fill="currentColor" />
    ) : kind === 'roundabout' ? (
      <path d="M32 18 A14 14 0 1 1 31.9 18 Z M32 26 L32 40 M32 40 L26 34 M32 40 L38 34" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    ) : kind === 'arrive' ? (
      <path d="M32 16 L32 40 M24 48 L32 40 L40 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M32 18 L32 44 M24 36 L32 44 L40 36" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    );

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="28" fill="var(--color-accent)" />
      <g className="text-white" transform="translate(0, 1)">
        {arrow}
      </g>
    </svg>
  );
}
