import { AwardDefinition } from '../types';
import { awardCategoryTheme } from '../lib/awardTheme';
import AwardIcon from './AwardIcon';

interface AwardBadgeProps {
  award: Pick<AwardDefinition, 'title' | 'icon' | 'category'>;
  size?: 'sm' | 'md';
  index?: number;
}

export default function AwardBadge({ award, size = 'sm', index = 0 }: AwardBadgeProps) {
  const sm = size === 'sm';
  const theme = awardCategoryTheme(award.category || 'community');
  const tilt = index % 3 === 0 ? '-rotate-1' : index % 3 === 1 ? 'rotate-1' : 'rotate-0';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold shadow-sm transition-transform hover:scale-105 ${theme.chip} ${tilt} ${
        sm ? 'text-[10px] px-2.5 py-1' : 'text-xs px-3 py-1.5'
      }`}
      title={award.title}
    >
      <AwardIcon name={award.icon} className={sm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="truncate max-w-[9rem]">{award.title}</span>
    </span>
  );
}
