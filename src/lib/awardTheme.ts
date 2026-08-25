import type { AwardCategory } from '../types';

export const AWARD_CATEGORY_THEME: Record<
  AwardCategory,
  { label: string; emoji: string; iconBg: string; iconText: string; chip: string; header: string }
> = {
  milestone: {
    label: 'Founding neighbors',
    emoji: '🏡',
    iconBg: 'bg-accent/15',
    iconText: 'text-accent',
    chip: 'bg-accent/10 text-accent border-accent/25',
    header: 'from-accent/10 to-transparent border-accent/20',
  },
  giving: {
    label: 'Giving & sharing',
    emoji: '🎁',
    iconBg: 'bg-rose-500/15',
    iconText: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
    header: 'from-rose-500/10 to-transparent border-rose-500/20',
  },
  community: {
    label: 'Community spirit',
    emoji: '🤝',
    iconBg: 'bg-sky-500/15',
    iconText: 'text-sky-600 dark:text-sky-400',
    chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    header: 'from-sky-500/10 to-transparent border-sky-500/20',
  },
  recognition: {
    label: 'Neighbor love',
    emoji: '⭐',
    iconBg: 'bg-accent/15',
    iconText: 'text-accent',
    chip: 'bg-accent/10 text-accent border-accent/25',
    header: 'from-accent/10 to-transparent border-accent/20',
  },
  events: {
    label: 'Events & meetups',
    emoji: '🎉',
    iconBg: 'bg-violet-500/15',
    iconText: 'text-violet-600 dark:text-violet-400',
    chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
    header: 'from-violet-500/10 to-transparent border-violet-500/20',
  },
  profile: {
    label: 'Your profile',
    emoji: '✨',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    header: 'from-emerald-500/10 to-transparent border-emerald-500/20',
  },
  staff: {
    label: 'Staff picks',
    emoji: '💜',
    iconBg: 'bg-fuchsia-500/15',
    iconText: 'text-fuchsia-600 dark:text-fuchsia-400',
    chip: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/25',
    header: 'from-fuchsia-500/10 to-transparent border-fuchsia-500/20',
  },
};

export function awardCategoryTheme(category: string) {
  return AWARD_CATEGORY_THEME[category as AwardCategory] ?? AWARD_CATEGORY_THEME.community;
}
