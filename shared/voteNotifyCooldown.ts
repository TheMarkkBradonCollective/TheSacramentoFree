/** Burst-vote window shared by client and server push paths. */
export const VOTE_NOTIFY_BURST_WINDOW_MS = 3 * 60 * 1000;
export const VOTE_NOTIFY_BURST_MAX = 10;

export function isVoteNotifyBurst(count: number | null | undefined): boolean {
  return (count ?? 0) > VOTE_NOTIFY_BURST_MAX;
}
