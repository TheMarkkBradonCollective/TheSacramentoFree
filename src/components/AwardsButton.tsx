import { Award } from 'lucide-react';

interface AwardsButtonProps {
  onClick: () => void;
  className?: string;
}

export default function AwardsButton({ onClick, className = '' }: AwardsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`sbn-awards-glow-btn inline-flex items-center gap-1.5 p-2 rounded-xl border text-accent hover:bg-accent-soft transition-colors cursor-pointer ${className}`}
      title="Neighbor awards"
      aria-label="Neighbor awards"
      id="awards_header_btn"
    >
      <Award className="w-4 h-4" />
      <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">Awards</span>
    </button>
  );
}
