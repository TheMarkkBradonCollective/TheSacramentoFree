import { Sparkles } from 'lucide-react';
import { FEED_REACTION_EMOJI } from '../lib/feedReactions';
import { IN_APP } from '../siteContent';

/** Neighbor wall placeholder — posts, photos, comments, and reactions coming soon. */
export default function FeedView() {
  return (
    <div className="sbn-card text-center py-16 px-8 border-dashed" id="community_feed_placeholder">
      <Sparkles className="w-10 h-10 text-accent mx-auto mb-3" aria-hidden />
      <h2 className="font-display text-lg font-bold text-app">{IN_APP.communityFeedTitle}</h2>
      <p className="text-sm text-muted mt-2 max-w-sm mx-auto leading-relaxed">{IN_APP.communityFeedDescription}</p>
      <p className="text-xs text-muted mt-4">Planned reactions</p>
      <div className="flex flex-wrap justify-center gap-2 mt-2" aria-hidden>
        {FEED_REACTION_EMOJI.map((emoji) => (
          <span
            key={emoji}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-app bg-inset text-lg"
          >
            {emoji}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-3">Plus upvote / downvote on each post</p>
    </div>
  );
}
