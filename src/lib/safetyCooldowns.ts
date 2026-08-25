import { isStaffActingOfficial } from './staffInteractionMode';
import type { UserProfile } from '../types';

/** Official staff mode skips neighbor safety cooldowns so moderation is not throttled. */
export function staffBypassesSafetyCooldowns(
  profile: Pick<UserProfile, 'role' | 'staffInteractionMode'> | null | undefined,
): boolean {
  return isStaffActingOfficial(profile);
}

export type SafetyCooldownKind = 'vote' | 'comment' | 'message' | 'rsvp' | 'report' | 'listing' | 'feed_post';

export interface SafetyWindow {
  windowMs: number;
  maxActions: number;
}

export interface SafetyLimit {
  windows: SafetyWindow[];
  message: string;
}

/** Existing 10-new-votes / 3 min cap, plus a short burst so rapid tapping is blocked sooner. */
export const VOTE_COOLDOWN_WINDOW_MS = 3 * 60 * 1000;
export const VOTE_COOLDOWN_MAX_NEW_VOTES = 10;
export const VOTE_BURST_WINDOW_MS = 20 * 1000;
export const VOTE_BURST_MAX_NEW_VOTES = 4;

export const COMMENT_COOLDOWN_WINDOW_MS = 2 * 60 * 1000;
export const COMMENT_COOLDOWN_MAX = 6;

export const MESSAGE_COOLDOWN_WINDOW_MS = 30 * 1000;
export const MESSAGE_COOLDOWN_MAX = 12;

export const RSVP_COOLDOWN_WINDOW_MS = 2 * 60 * 1000;
export const RSVP_COOLDOWN_MAX = 8;

export const REPORT_COOLDOWN_WINDOW_MS = 10 * 60 * 1000;
export const REPORT_COOLDOWN_MAX = 3;

export const LISTING_COOLDOWN_WINDOW_MS = 10 * 60 * 1000;
export const LISTING_COOLDOWN_MAX = 3;

export const FEED_POST_COOLDOWN_WINDOW_MS = 10 * 60 * 1000;
export const FEED_POST_COOLDOWN_MAX = 3;

export const VOTE_COOLDOWN_MESSAGE =
  'Easy there — take a short breather before voting on more posts. This helps keep the feed fair for everyone.';

export const COMMENT_COOLDOWN_MESSAGE =
  'Slow down a moment before posting more comments. This keeps conversations readable for everyone.';

export const MESSAGE_COOLDOWN_MESSAGE =
  'You are sending messages very quickly. Wait a few seconds, then try again.';

export const RSVP_COOLDOWN_MESSAGE =
  'Give it a second before RSVPing to more events — that keeps the lists accurate.';

export const REPORT_COOLDOWN_MESSAGE =
  'Reports are limited so staff can review each one. Try again in a few minutes.';

export const LISTING_COOLDOWN_MESSAGE =
  'New listings are limited for a few minutes so the feed stays fair. Edit an existing post if you need to tweak one.';

export const FEED_POST_COOLDOWN_MESSAGE =
  'New posts are limited for a few minutes to keep the feed from getting flooded.';

export const SAFETY_LIMITS: Record<SafetyCooldownKind, SafetyLimit> = {
  vote: {
    windows: [
      { windowMs: VOTE_BURST_WINDOW_MS, maxActions: VOTE_BURST_MAX_NEW_VOTES },
      { windowMs: VOTE_COOLDOWN_WINDOW_MS, maxActions: VOTE_COOLDOWN_MAX_NEW_VOTES },
    ],
    message: VOTE_COOLDOWN_MESSAGE,
  },
  comment: {
    windows: [{ windowMs: COMMENT_COOLDOWN_WINDOW_MS, maxActions: COMMENT_COOLDOWN_MAX }],
    message: COMMENT_COOLDOWN_MESSAGE,
  },
  message: {
    windows: [{ windowMs: MESSAGE_COOLDOWN_WINDOW_MS, maxActions: MESSAGE_COOLDOWN_MAX }],
    message: MESSAGE_COOLDOWN_MESSAGE,
  },
  rsvp: {
    windows: [{ windowMs: RSVP_COOLDOWN_WINDOW_MS, maxActions: RSVP_COOLDOWN_MAX }],
    message: RSVP_COOLDOWN_MESSAGE,
  },
  report: {
    windows: [{ windowMs: REPORT_COOLDOWN_WINDOW_MS, maxActions: REPORT_COOLDOWN_MAX }],
    message: REPORT_COOLDOWN_MESSAGE,
  },
  listing: {
    windows: [{ windowMs: LISTING_COOLDOWN_WINDOW_MS, maxActions: LISTING_COOLDOWN_MAX }],
    message: LISTING_COOLDOWN_MESSAGE,
  },
  feed_post: {
    windows: [{ windowMs: FEED_POST_COOLDOWN_WINDOW_MS, maxActions: FEED_POST_COOLDOWN_MAX }],
    message: FEED_POST_COOLDOWN_MESSAGE,
  },
};

export function isOverSafetyWindow(count: number, maxActions: number): boolean {
  return count >= maxActions;
}

export function voteCooldownRemainingMs(recentNewVoteCount: number): number {
  if (recentNewVoteCount < VOTE_COOLDOWN_MAX_NEW_VOTES) return 0;
  return VOTE_COOLDOWN_WINDOW_MS;
}

let lastBlockMessage: string | null = null;

export function noteSafetyCooldownBlock(message: string): void {
  lastBlockMessage = message;
}

export function takeSafetyCooldownBlockMessage(): string | null {
  const message = lastBlockMessage;
  lastBlockMessage = null;
  return message;
}
