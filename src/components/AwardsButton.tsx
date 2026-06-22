import { Sparkles } from 'lucide-react';

interface AwardsButtonProps {
  onClick: () => void;
  className?: string;
}

export default function AwardsButton({ onClick, className = '' }: AwardsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`sbn-awards-glow-btn inline-flex items-center gap-1.5 px-2.5 py-2 rounded-2xl border-2 border-accent/25 text-accent bg-accent-soft/30 hover:bg-accent-soft hover:scale-105 active:scale-95 transition-all cursor-pointer ${className}`}
      title="Neighbor badges"
      aria-label="Neighbor badges"
      id="awards_header_btn"
    >
      <Sparkles className="w-4 h-4" />
      <span className="hidden sm:inline text-[10px] font-bold tracking-wide">Badges</span>
    </button>
  );
}
