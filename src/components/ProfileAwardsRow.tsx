import { useEffect, useState } from 'react';
import { getAwardsUnlockStatus, getUserAwards } from '../lib/awardsApi';
import { UserAward } from '../types';
import AwardBadge from './AwardBadge';

interface ProfileAwardsRowProps {
  userId: string;
  maxDisplay?: number;
  viewerIsStaff?: boolean;
  onOpenAwards?: () => void;
}

export default function ProfileAwardsRow({
  userId,
  maxDisplay = 6,
  viewerIsStaff = false,
  onOpenAwards,
}: ProfileAwardsRowProps) {
  const [awards, setAwards] = useState<UserAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getUserAwards(userId), getAwardsUnlockStatus()]).then(([rows, status]) => {
      if (!cancelled) {
        setAwards(rows);
        setVisible(status.unlocked || viewerIsStaff);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, viewerIsStaff]);

  if (loading || !visible || awards.length === 0) {
    return null;
  }

  const shown = awards.slice(0, maxDisplay);
  const extra = awards.length - shown.length;

  return (
    <div className="w-full mt-4 pt-4 border-t border-app text-left">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-app flex items-center gap-1.5">
          <span aria-hidden>🏅</span>
          Badges
        </p>
        {onOpenAwards && (
          <button
            type="button"
            onClick={onOpenAwards}
            className="text-[10px] font-bold text-accent hover:underline"
          >
            View all badges
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {shown.map((grant, i) =>
          grant.award ? (
            <span key={grant.id} className="contents">
              <AwardBadge award={grant.award} index={i} />
            </span>
          ) : null,
        )}
        {extra > 0 && (
          <span className="text-[10px] text-muted font-semibold self-center">+{extra} more</span>
        )}
      </div>
    </div>
  );
}
