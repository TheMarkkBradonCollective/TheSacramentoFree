import { Lock, Sparkles, Star } from 'lucide-react';
import { AwardDefinition } from '../types';
import { awardCategoryTheme } from '../lib/awardTheme';
import AwardIcon from './AwardIcon';

interface AwardCardProps {
  award: AwardDefinition;
  earned?: boolean;
  locked?: boolean;
  compact?: boolean;
}

export default function AwardCard({ award, earned = false, locked = false, compact = false }: AwardCardProps) {
  const dimmed = locked && !earned;
  const theme = awardCategoryTheme(award.category);
  const iconSize = compact ? 'w-10 h-10' : 'w-14 h-14';
  const iconInner = compact ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <div
      className={`sbn-award-card relative overflow-hidden p-4 flex gap-3 transition-all duration-300 ${
        earned
          ? 'sbn-award-earned border-accent/35 bg-gradient-to-br from-accent-soft/35 via-surface to-surface'
          : dimmed
            ? 'opacity-70 border-app bg-inset/40'
            : 'border-app bg-surface hover:border-accent/20 hover:shadow-md hover:-translate-y-0.5'
      } ${compact ? 'p-3 rounded-2xl' : 'rounded-2xl'}`}
    >
      {earned && <span className="sbn-award-sparkle" aria-hidden />}

      <div
        className={`shrink-0 flex items-center justify-center rounded-2xl border-2 shadow-sm ${iconSize} ${
          earned
            ? `${theme.iconBg} ${theme.iconText} border-white/20 sbn-award-icon-pop`
            : dimmed
              ? 'bg-inset border-app text-muted'
              : `${theme.iconBg} ${theme.iconText} border-transparent`
        }`}
      >
        {dimmed && !earned ? (
          <Lock className={iconInner} />
        ) : (
          <AwardIcon name={award.icon} className={iconInner} />
        )}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full border px-2 py-0.5 mb-1.5 ${theme.chip}`}
            >
              <span aria-hidden>{theme.emoji}</span>
              {theme.label}
            </span>
            <h4 className={`font-display font-bold text-app leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
              {award.title}
            </h4>
          </div>
          {earned && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-accent px-2.5 py-1 rounded-full shadow-sm sbn-award-icon-pop">
              <Star className="w-3 h-3 fill-current" />
              Got it!
            </span>
          )}
        </div>
        <p className={`text-muted leading-relaxed mt-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          {award.description}
        </p>
        {award.triggerType === 'auto' && !earned && !dimmed && (
          <p className="text-[11px] text-accent/80 mt-2 font-semibold inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Earns automatically when you hit this milestone
          </p>
        )}
        {!earned && !dimmed && award.triggerType === 'manual' && (
          <p className="text-[11px] text-muted mt-2 font-medium">A special pick from staff</p>
        )}
      </div>
    </div>
  );
}
