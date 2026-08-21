import { useEffect, useRef } from 'react';
import { useNewspaperExperience } from './NewspaperExperienceContext';
import { useNewspaperSkin } from './NewspaperSkinContext';

interface UnreadCounts {
  notifications: number;
  announcements: number;
  updates: number;
}

/**
 * Rings the carriage bell when something new arrives. Reads the counts the
 * notifications hub already tracks — no new data, no new requests — and stays
 * silent on the first render so a page load never chimes.
 */
export function useNewspaperAlertBell({ notifications, announcements, updates }: UnreadCounts): void {
  const { enabled } = useNewspaperSkin();
  const { play } = useNewspaperExperience();
  const previous = useRef<UnreadCounts | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = { notifications, announcements, updates };
    if (!enabled || !before) return;

    if (notifications > before.notifications) {
      play('notifyImportant', 'notification');
    } else if (announcements > before.announcements || updates > before.updates) {
      play('notify', 'notification');
    }
  }, [enabled, play, notifications, announcements, updates]);
}
