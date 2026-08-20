/** Planned neighbor wall reactions (Feed tab — not wired yet). */
export const FEED_REACTION_EMOJI = ['🥹', '😂', '🤤', '🙄', '🤔', '😲', '🥺'] as const;

export type FeedReactionEmoji = (typeof FEED_REACTION_EMOJI)[number];
