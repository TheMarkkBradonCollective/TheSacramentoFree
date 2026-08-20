import HeaderActionButton from './HeaderActionButton';
import { Sparkles } from 'lucide-react';

interface AwardsButtonProps {
  onClick: () => void;
  glow?: boolean;
  className?: string;
  compact?: boolean;
}

export default function AwardsButton({ onClick, glow = false, className = '', compact = false }: AwardsButtonProps) {
  return (
    <HeaderActionButton
      onClick={onClick}
      icon={Sparkles}
      label="Badges"
      glow={glow}
      compact={compact}
      unboxed
      title={glow ? 'New badge waiting for you!' : 'Neighbor badges'}
      ariaLabel={glow ? 'Neighbor badges — new badge!' : 'Neighbor badges'}
      id="awards_header_btn"
      className={className}
    />
  );
}
