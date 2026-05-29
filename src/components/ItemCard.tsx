import {
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  MessageSquare,
  Pencil,
  Tag,
  Trash2,
} from 'lucide-react';
import { ItemComment, ItemPost } from '../types';

export interface ItemCardVoteState {
  userVote: 'up' | 'down' | null;
  upvotes: number;
  downvotes: number;
}

interface ItemCardProps {
  item: ItemPost;
  currentUserId: string;
  voteState: ItemCardVoteState;
  comments: ItemComment[];
  commentsExpanded: boolean;
  updating: boolean;
  onVote: (direction: 'up' | 'down') => void;
  onToggleComments: () => void;
  onAddComment: (text: string) => void;
  onUpdateStatus: (status: 'completed' | 'withdrawn' | 'active') => void;
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
}

export default function ItemCard({
  item,
  currentUserId,
  voteState,
  comments,
  commentsExpanded,
  updating,
  onVote,
  onToggleComments,
  onAddComment,
  onUpdateStatus,
  onEdit,
  onDelete,
  onMessage,
}: ItemCardProps) {
  const isOwner = item.userId === currentUserId;
  const { userVote, upvotes, downvotes } = voteState;
  const netScore = upvotes - downvotes;
  const inactive = item.status !== 'active';

  const dateLabel = item.createdAt
    ? new Date(
        typeof item.createdAt === 'object' && 'seconds' in item.createdAt
          ? (item.createdAt as { seconds: number }).seconds * 1000
          : item.createdAt,
      ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Recent';

  return (
    <article
      id={`item_card_${item.id}`}
      className={`item-feed-card flex flex-col ${inactive ? 'opacity-75' : ''}`}
    >
      {item.imageUrl && (
        <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.type === 'giveaway' ? (
            <span className="sbn-badge sbn-badge-give">Giving</span>
          ) : (
            <span className="sbn-badge sbn-badge-ask">Looking for</span>
          )}
          {item.status === 'completed' && (
            <span className="sbn-badge sbn-badge-done">
              {item.type === 'giveaway' ? 'Claimed' : 'Fulfilled'}
            </span>
          )}
          {item.status === 'withdrawn' && (
            <span className="sbn-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
              Withdrawn
            </span>
          )}
          {item.status === 'active' && (
            <span className="sbn-badge sbn-badge-give">Active</span>
          )}
        </div>

        <h3 className="font-display text-lg font-bold text-card mt-3 leading-snug">{item.title}</h3>

        <p className="text-xs font-medium text-card-muted flex items-center gap-1 mt-1">
          <Tag className="w-3 h-3 text-accent shrink-0" />
          {item.category}
        </p>

        <p className="text-sm text-card-muted mt-2 leading-relaxed line-clamp-3">{item.description}</p>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-card-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            {item.neighborhood}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {dateLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => onVote('up')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              userVote === 'up'
                ? 'bg-accent-soft border-accent text-accent'
                : 'border-zinc-200 text-card-muted hover:border-accent'
            }`}
            title="Interested"
          >
            <ChevronUp className="w-4 h-4" />
            {upvotes}
          </button>
          <span className="text-xs font-bold text-card min-w-[1.5rem] text-center">
            {netScore > 0 ? `+${netScore}` : netScore}
          </span>
          <button
            type="button"
            onClick={() => onVote('down')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              userVote === 'down'
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'border-zinc-200 text-card-muted hover:border-zinc-400'
            }`}
            title="Not for me"
          >
            <ChevronDown className="w-4 h-4" />
            {downvotes}
          </button>
          <button
            type="button"
            onClick={onToggleComments}
            className={`ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              commentsExpanded
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-card-muted hover:border-zinc-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {comments.length}
          </button>
        </div>

        {commentsExpanded && (
          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs text-card-muted italic text-center py-2">No comments yet — say hello!</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {comments.map((comment) => (
                  <li key={comment.id} className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                    <div className="flex items-center gap-2">
                      <img
                        src={
                          comment.userPhoto ||
                          `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(comment.userName)}`
                        }
                        alt=""
                        className="w-6 h-6 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-xs font-bold text-card">{comment.userName}</span>
                      <span className="text-[10px] text-accent font-medium">{comment.userNeighborhood}</span>
                    </div>
                    <p className="text-sm text-card-muted mt-1.5">{comment.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('commentText') as HTMLInputElement;
                if (input?.value.trim()) {
                  onAddComment(input.value.trim());
                  input.value = '';
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                name="commentText"
                placeholder="Add a comment…"
                className="flex-1 text-sm px-3 py-2 rounded-full border border-zinc-200 bg-white text-card"
                required
              />
              <button type="submit" className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
                Post
              </button>
            </form>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={
                item.userPhotoURL ||
                `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(item.userDisplayName)}`
              }
              alt=""
              className="w-9 h-9 rounded-full border border-zinc-200 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-card truncate">{item.userDisplayName}</p>
              <p className="text-[10px] text-card-muted">Neighbor</p>
            </div>
          </div>

          {isOwner ? (
            <div className="flex flex-wrap gap-1 justify-end">
              <button
                type="button"
                disabled={updating}
                onClick={onEdit}
                className="sbn-btn sbn-btn-sm sbn-btn-secondary"
                title="Edit listing"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              {item.status === 'active' ? (
                <>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('completed')}
                    className="sbn-btn sbn-btn-sm sbn-btn-secondary"
                  >
                    {item.type === 'giveaway' ? 'Mark claimed' : 'Mark fulfilled'}
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('withdrawn')}
                    className="sbn-btn sbn-btn-sm sbn-btn-ghost"
                  >
                    Withdraw
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('active')}
                    className="sbn-btn sbn-btn-sm sbn-btn-primary"
                  >
                    Relist
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={onDelete}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ) : (item.status === 'active' || item.status === 'completed') ? (
            <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </button>
          ) : (
            <span className="text-[10px] font-medium text-card-muted">Archived</span>
          )}
        </div>
      </div>
    </article>
  );
}
