import { Trash2 } from 'lucide-react';
import type { ItemPost } from '../types';

interface ProfilePostListProps {
  posts: ItemPost[];
  emptyMessage: string;
  onViewPost?: (post: ItemPost) => void;
  onDeletePost?: (post: ItemPost) => void;
}

export default function ProfilePostList({
  posts,
  emptyMessage,
  onViewPost,
  onDeletePost,
}: ProfilePostListProps) {
  if (posts.length === 0) {
    return <p className="text-xs text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => {
        const canDelete = post.status === 'withdrawn' && !!onDeletePost;
        const clickable = !!onViewPost;

        return (
          <div
            key={post.id}
            className={`rounded-xl border border-app bg-inset p-3 flex items-start gap-2 ${
              clickable ? 'hover:border-accent/40 hover:bg-inset/80 transition-colors' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onViewPost?.(post)}
              disabled={!clickable}
              className={`flex-1 min-w-0 text-left ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <p className="text-sm font-semibold text-app">{post.title}</p>
              <p className="text-xs text-muted mt-0.5">
                {post.category} · {post.status.replace('_', ' ')}
              </p>
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDeletePost?.(post)}
                className="shrink-0 p-2 rounded-lg text-red-400 hover:bg-red-950/30 transition-colors"
                aria-label={`Delete ${post.title}`}
                title="Delete withdrawn post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
