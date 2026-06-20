/** Sliding window for how many distinct new votes a user can cast in a row. */
export const VOTE_COOLDOWN_WINDOW_MS = 3 * 60 * 1000;

/** Max new votes on different posts/content within the window before a short pause. */
export const VOTE_COOLDOWN_MAX_NEW_VOTES = 10;

export const VOTE_COOLDOWN_MESSAGE =
  'Easy there — take a short breather before voting on more posts. This helps keep the feed fair for everyone.';

export function voteCooldownRemainingMs(recentNewVoteCount: number): number {
  if (recentNewVoteCount < VOTE_COOLDOWN_MAX_NEW_VOTES) return 0;
  return VOTE_COOLDOWN_WINDOW_MS;
}
