import { Award, ChevronRight, Clock } from 'lucide-react';
import { AWARDS } from '../siteContent';
import type { NeighborAwardSummary } from '../lib/neighborAwards';
import { formatAwardDate } from '../lib/neighborAwards';

interface ProfileAwardsSectionProps {
  summary: NeighborAwardSummary | null;
  loading?: boolean;
  onOpenAwards: () => void;
}

export default function ProfileAwardsSection({
  summary,
  loading = false,
  onOpenAwards,
}: ProfileAwardsSectionProps) {
  const earnedCount = summary?.badges.filter((b) => b.earned).length ?? 0;
  const recent = summary?.timeline.slice(0, 2) ?? [];

  return (
    <div className="sbn-card p-4 space-y-4 border border-accent/20" id="profile_awards_section">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            {AWARDS.profileSectionTitle}
          </p>
          <p className="text-sm text-muted mt-1 leading-relaxed">{AWARDS.profileSectionBody}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted">Loading awards…</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-app">
            {earnedCount} badge{earnedCount === 1 ? '' : 's'} earned
            {summary && summary.timeline.length > 0
              ? ` · ${summary.timeline.length} moment${summary.timeline.length === 1 ? '' : 's'} in your history`
              : ''}
          </p>

          {recent.length > 0 && (
            <ul className="space-y-2">
              {recent.map((entry) => (
                <li key={entry.id} className="text-xs text-muted flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    <span className="text-app font-medium">{entry.title}</span>
                    {' · '}
                    {formatAwardDate(entry.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onOpenAwards}
        className="sbn-awards-glow-btn w-full sbn-btn sbn-btn-secondary justify-center"
        id="profile_open_awards_btn"
      >
        <Award className="w-4 h-4" />
        {AWARDS.profileOpenButton}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
