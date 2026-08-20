/** Neighbor feed emoji reactions (Feed tab). */
export const FEED_REACTION_EMOJI = ['🥹', '😂', '🤤', '🙄', '🤔', '😲', '🥺'] as const;

export type FeedReactionEmoji = (typeof FEED_REACTION_EMOJI)[number];
