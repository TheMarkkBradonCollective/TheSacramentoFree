/** Google Play review account — browse UI only, no community writes. */
export const PLAY_REVIEW_EMAIL = 'playstore-review@sacramentobuynothing.com';

export function isPlayReviewBrowseOnly(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === PLAY_REVIEW_EMAIL;
}
