import { Lock } from 'lucide-react';
import { AwardDefinition } from '../types';
import AwardIcon from './AwardIcon';

interface AwardCardProps {
  award: AwardDefinition;
  earned?: boolean;
  locked?: boolean;
  compact?: boolean;
}

export default function AwardCard({ award, earned = false, locked = false, compact = false }: AwardCardProps) {
  const dimmed = locked && !earned;

  return (
    <div
      className={`sbn-card p-4 flex gap-3 transition-all ${
        earned
          ? 'border-accent/40 bg-accent-soft/20 sbn-award-earned'
          : dimmed
            ? 'opacity-60 border-app'
            : 'border-app'
      } ${compact ? 'p-3' : ''}`}
    >
      <div
        className={`shrink-0 flex items-center justify-center rounded-xl border ${
          earned
            ? 'w-12 h-12 bg-accent-soft border-accent/30 text-accent sbn-awards-glow-btn'
            : dimmed
              ? 'w-12 h-12 bg-inset border-app text-muted'
              : 'w-12 h-12 bg-inset border-app text-accent'
        } ${compact ? 'w-10 h-10' : ''}`}
      >
        {dimmed && !earned ? (
          <Lock className="w-5 h-5" />
        ) : (
          <AwardIcon name={award.icon} className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        )}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`font-semibold text-app ${compact ? 'text-sm' : ''}`}>{award.title}</h4>
          {earned && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-accent bg-accent-soft px-2 py-0.5 rounded-full">
              Earned
            </span>
          )}
        </div>
        <p className={`text-muted leading-relaxed mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {award.description}
        </p>
        {award.triggerType === 'auto' && !earned && !dimmed && (
          <p className="text-[10px] text-subtle mt-2 uppercase tracking-wide font-semibold">Auto award</p>
        )}
      </div>
    </div>
  );
}
