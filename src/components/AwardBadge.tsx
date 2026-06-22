import { AwardDefinition } from '../types';
import AwardIcon from './AwardIcon';

interface AwardBadgeProps {
  award: Pick<AwardDefinition, 'title' | 'icon'>;
  size?: 'sm' | 'md';
}

export default function AwardBadge({ award, size = 'sm' }: AwardBadgeProps) {
  const sm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft/40 text-accent font-semibold ${
        sm ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
      title={award.title}
    >
      <AwardIcon name={award.icon} className={sm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="truncate max-w-[8rem]">{award.title}</span>
    </span>
  );
}
