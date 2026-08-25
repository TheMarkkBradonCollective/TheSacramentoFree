/** Sliding window for how many distinct new votes a user can cast in a row. */
export {
  VOTE_COOLDOWN_WINDOW_MS,
  VOTE_COOLDOWN_MAX_NEW_VOTES,
  VOTE_BURST_WINDOW_MS,
  VOTE_BURST_MAX_NEW_VOTES,
  VOTE_COOLDOWN_MESSAGE,
  voteCooldownRemainingMs,
} from './safetyCooldowns';
