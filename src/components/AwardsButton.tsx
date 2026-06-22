import { Sparkles } from 'lucide-react';

interface AwardsButtonProps {
  onClick: () => void;
  glow?: boolean;
  className?: string;
}

export default function AwardsButton({ onClick, glow = false, className = '' }: AwardsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-2xl border-2 border-accent/25 text-accent bg-accent-soft/30 hover:bg-accent-soft hover:scale-105 active:scale-95 transition-all cursor-pointer ${
        glow ? 'sbn-awards-glow-active' : ''
      } ${className}`}
      title={glow ? 'New badge waiting for you!' : 'Neighbor badges'}
      aria-label={glow ? 'Neighbor badges — new badge!' : 'Neighbor badges'}
      id="awards_header_btn"
    >
      <Sparkles className="w-4 h-4" />
      <span className="hidden sm:inline text-[10px] font-bold tracking-wide">Badges</span>
      {glow && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface sbn-awards-new-dot" aria-hidden />
      )}
    </button>
  );
}
