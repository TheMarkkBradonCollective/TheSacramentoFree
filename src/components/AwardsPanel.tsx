import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, PartyPopper, Sparkles, Star, Trophy } from 'lucide-react';
import { ItemPost, UserProfile } from '../types';
import { useAwards } from '../hooks/useAwards';
import { awardCategoryTheme } from '../lib/awardTheme';
import { AWARDS } from '../siteContent';
import AwardsSharePrompt from './AwardsSharePrompt';
import AwardCard from './AwardCard';
import AwardsLeaderboard from './AwardsLeaderboard';
import AwardsNeighborHistory from './AwardsNeighborHistory';
import StaffAwardsAdmin from './StaffAwardsAdmin';
import { useAwardsLeaderboard } from '../hooks/useAwardsLeaderboard';

interface AwardsPanelProps {
  userProfile: UserProfile;
  userPosts?: ItemPost[];
  onViewProfile?: (userId: string) => void;
}

type AwardsTab = 'mine' | 'all' | 'leaderboard' | 'history' | 'manage';

export default function AwardsPanel({ userProfile, userPosts = [], onViewProfile }: AwardsPanelProps) {
  const {
    definitions,
    userAwards,
    unlockStatus,
    loading,
    earnedAwardIds,
    isCommunityUnlocked,
    canAccessAwards,
    canManage,
  } = useAwards(userProfile);

  const { entries: leaderboardEntries, loading: leaderboardLoading } = useAwardsLeaderboard(
    canAccessAwards,
    25,
  );

  const [tab, setTab] = useState<AwardsTab>('mine');

  const visibleDefinitions = useMemo(() => {
    if (canManage || isCommunityUnlocked) return definitions;
    return definitions.filter((d) => d.requiresUnlock);
  }, [definitions, canManage, isCommunityUnlocked]);

  const earnedCount = userAwards.length;
  const totalVisible = visibleDefinitions.length;
  const progressPct = totalVisible > 0 ? Math.round((earnedCount / totalVisible) * 100) : 0;

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
    return (
      <div className="py-12 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-soft border border-accent/30 sbn-award-icon-pop">
          <Sparkles className="w-7 h-7 text-accent animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-muted">Gathering your badges…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-4">
      {!isCommunityUnlocked && unlockStatus && !canManage && (
        <AwardsSharePrompt unlockStatus={unlockStatus} />
      )}

      {!isCommunityUnlocked && unlockStatus && canManage && (
        <AwardsSharePrompt unlockStatus={unlockStatus} variant="compact" />
      )}

      {isCommunityUnlocked && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sbn-award-hero sbn-card p-6 text-center space-y-4 border-accent/20"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-accent-soft to-accent/15 border-2 border-accent/25 sbn-awards-glow-btn shadow-md">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-lg font-bold text-app">Hey {userProfile.displayName.split(' ')[0]}! 👋</p>
            <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">{AWARDS.unlockedIntro}</p>
          </div>

          <div className="max-w-xs mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-accent inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-accent" />
                {earnedCount} earned
              </span>
              <span className="text-muted">{totalVisible - earnedCount} to discover</span>
            </div>
            <div className="sbn-award-progress-track h-3 rounded-full overflow-hidden border border-accent/15">
              <div className="sbn-award-progress-fill h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </motion.div>
      )}

      {canAccessAwards ? (
        <>
          <div className="flex flex-wrap gap-2 justify-center">
            <TabButton active={tab === 'mine'} onClick={() => setTab('mine')} emoji="🏅">
              My badges
            </TabButton>
            <TabButton active={tab === 'all'} onClick={() => setTab('all')} emoji="🗺️">
              Explore all
            </TabButton>
            <TabButton active={tab === 'leaderboard'} onClick={() => setTab('leaderboard')} emoji="🏆">
              Leaderboard
            </TabButton>
            <TabButton active={tab === 'history'} onClick={() => setTab('history')} emoji="🕰️">
              Go back in time
            </TabButton>
            {canManage && (
              <TabButton active={tab === 'manage'} onClick={() => setTab('manage')} emoji="🛠️">
                Manage
              </TabButton>
            )}
          </div>

          {tab === 'mine' && (
            <section className="space-y-3">
              {userAwards.length === 0 ? (
                <div className="sbn-card p-8 text-center space-y-3 rounded-2xl border-dashed border-accent/25 bg-accent-soft/10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-inset border border-app">
                    <PartyPopper className="w-7 h-7 text-accent" />
                  </div>
                  <p className="text-base font-display font-bold text-app">{AWARDS.noAwardsYet}</p>
                  <p className="text-sm text-muted max-w-sm mx-auto">{AWARDS.noAwardsHint}</p>
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-1">
                  {userAwards.map((grant, i) =>
                    grant.award ? (
                      <motion.li
                        key={grant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <AwardCard award={grant.award} earned />
                      </motion.li>
                    ) : null,
                  )}
                </ul>
              )}
            </section>
          )}

          {tab === 'all' && (
            <section className="space-y-8">
              {Array.from(grouped.entries()).map(([category, awards]) => {
                const theme = awardCategoryTheme(category);
                const earnedInGroup = awards.filter((a) => earnedAwardIds.has(a.id)).length;
                return (
                  <div key={category} className="space-y-3">
                    <div
                      className={`rounded-2xl border bg-gradient-to-r px-4 py-3 flex items-center justify-between gap-3 ${theme.header}`}
                    >
                      <h3 className="text-sm font-display font-bold text-app flex items-center gap-2">
                        <span className="text-lg" aria-hidden>
                          {theme.emoji}
                        </span>
                        {theme.label}
                      </h3>
                      <span className="text-[11px] font-bold text-muted shrink-0">
                        {earnedInGroup}/{awards.length} earned
                      </span>
                    </div>
                    <ul className="grid gap-3">
                      {awards.map((award) => (
                        <li key={award.id}>
                          <AwardCard
                            award={award}
                            earned={earnedAwardIds.has(award.id)}
                            locked={award.requiresUnlock && !isCommunityUnlocked}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          )}

          {tab === 'leaderboard' && (
            <AwardsLeaderboard
              entries={leaderboardEntries}
              loading={leaderboardLoading}
              currentUserId={userProfile.uid}
              onViewProfile={onViewProfile}
            />
          )}

          {tab === 'history' && (
            <AwardsNeighborHistory userId={userProfile.uid} userPosts={userPosts} />
          )}

          {tab === 'manage' && canManage && <StaffAwardsAdmin userProfile={userProfile} />}
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 justify-center">
            <TabButton active={tab === 'history'} onClick={() => setTab('history')} emoji="🕰️">
              Go back in time
            </TabButton>
          </div>
          {tab === 'history' && (
            <AwardsNeighborHistory userId={userProfile.uid} userPosts={userPosts} />
          )}
        </>
      )}

      {!canAccessAwards && tab !== 'history' && (
        <div className="sbn-card p-5 text-left space-y-4 rounded-2xl border-accent/15 bg-gradient-to-b from-accent-soft/15 to-transparent">
          <p className="text-sm font-display font-bold text-app flex items-center gap-2">
            <Heart className="w-4 h-4 text-accent fill-accent/30" />
            Sneak peek at what&apos;s coming
          </p>
          <ul className="space-y-2.5 text-sm text-muted">
            {AWARDS.previewBullets.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-xs">
                  ✓
                </span>
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
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  emoji: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`sbn-chip text-sm py-2 px-3.5 ${active ? 'sbn-chip-active' : ''}`}
    >
      <span aria-hidden>{emoji}</span>
      {children}
    </button>
  );
}
