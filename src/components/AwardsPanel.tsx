import { useMemo, useState } from 'react';
import { Award, Sparkles, Trophy } from 'lucide-react';
import { UserProfile } from '../types';
import { useAwards } from '../hooks/useAwards';
import { AWARDS } from '../siteContent';
import AwardsSharePrompt from './AwardsSharePrompt';
import AwardCard from './AwardCard';
import StaffAwardsAdmin from './StaffAwardsAdmin';

interface AwardsPanelProps {
  userProfile: UserProfile;
}

type AwardsTab = 'mine' | 'all' | 'manage';

export default function AwardsPanel({ userProfile }: AwardsPanelProps) {
  const {
    definitions,
    userAwards,
    unlockStatus,
    loading,
    earnedAwardIds,
    showFullAwards,
    canManage,
  } = useAwards(userProfile);

  const [tab, setTab] = useState<AwardsTab>('mine');

  const visibleDefinitions = useMemo(() => {
    if (canManage) return definitions;
    if (!showFullAwards) return definitions.filter((d) => d.requiresUnlock);
    return definitions;
  }, [definitions, canManage, showFullAwards]);

  const earnedCount = userAwards.length;
  const totalVisible = visibleDefinitions.length;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleDefinitions>();
    for (const award of visibleDefinitions) {
      const list = map.get(award.category) || [];
      list.push(award);
      map.set(award.category, list);
    }
    return map;
  }, [visibleDefinitions]);

  if (loading) {
    return <p className="text-sm text-muted text-center py-8">Loading awards…</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {!showFullAwards && unlockStatus && (
        <AwardsSharePrompt unlockStatus={unlockStatus} />
      )}

      {showFullAwards && (
        <>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-soft border border-accent/30 sbn-awards-glow-btn">
              <Trophy className="w-7 h-7 text-accent" />
            </div>
            <p className="text-sm text-muted leading-relaxed">{AWARDS.unlockedIntro}</p>
            <p className="text-xs font-bold text-accent">
              {earnedCount} of {totalVisible} awards earned
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
              My awards
            </TabButton>
            <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
              All awards
            </TabButton>
            {canManage && (
              <TabButton active={tab === 'manage'} onClick={() => setTab('manage')}>
                Manage
              </TabButton>
            )}
          </div>

          {tab === 'mine' && (
            <section className="space-y-3">
              {userAwards.length === 0 ? (
                <div className="sbn-card p-6 text-center space-y-2">
                  <Award className="w-8 h-8 text-muted mx-auto" />
                  <p className="text-sm text-muted">{AWARDS.noAwardsYet}</p>
                  <p className="text-xs text-subtle">{AWARDS.noAwardsHint}</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {userAwards.map((grant) =>
                    grant.award ? (
                      <li key={grant.id}>
                        <AwardCard award={grant.award} earned />
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
            </section>
          )}

          {tab === 'all' && (
            <section className="space-y-6">
              {Array.from(grouped.entries()).map(([category, awards]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    {category.replace(/_/g, ' ')}
                  </h3>
                  <ul className="space-y-2">
                    {awards.map((award) => (
                      <li key={award.id}>
                        <AwardCard
                          award={award}
                          earned={earnedAwardIds.has(award.id)}
                          locked={award.requiresUnlock && !showFullAwards}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {tab === 'manage' && canManage && <StaffAwardsAdmin userProfile={userProfile} />}
        </>
      )}

      {!showFullAwards && (
        <div className="sbn-card p-4 text-left space-y-3 opacity-90">
          <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Coming when we hit 500
          </p>
          <ul className="space-y-2 text-sm text-muted">
            {AWARDS.previewBullets.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Award className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'bg-inset text-muted border border-app hover:text-app'
      }`}
    >
      {children}
    </button>
  );
}
