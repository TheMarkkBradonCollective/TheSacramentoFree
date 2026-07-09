import { useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Car,
  Clock,
  Gift,
  Heart,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  Sparkles,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react';
import type { UserNotificationKind } from '../types';
import { useUserNotifications } from '../hooks/useUserNotifications';
import PublicCard from './public/PublicCard';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function kindIcon(kind: UserNotificationKind) {
  switch (kind) {
    case 'comment':
      return MessageSquare;
    case 'message':
    case 'message_request':
      return MessageSquare;
    case 'community_chat':
    case 'staff_chat':
      return Users;
    case 'support':
    case 'staff_support':
      return Bell;
    case 'announcement':
    case 'app_update':
      return Megaphone;
    case 'new_listing':
    case 'nearby_listing':
    case 'new_request':
    case 'nearby_request':
      return MapPin;
    case 'saved_item':
      return Heart;
    case 'upvote':
      return ArrowUp;
    case 'downvote':
      return ArrowDown;
    case 'claim':
    case 'gift':
      return Gift;
    case 'pickup_reminder':
      return Clock;
    case 'on_the_way':
      return Car;
    case 'listing_status':
      return Tag;
    case 'claim_request':
      return UserPlus;
    case 'account_update':
    case 'director_alert':
      return Sparkles;
    default:
      return Package;
  }
}

function kindColor(kind: UserNotificationKind): string {
  switch (kind) {
    case 'upvote':
      return 'text-emerald-400 bg-emerald-500/10';
    case 'downvote':
      return 'text-amber-400 bg-amber-500/10';
    case 'claim':
    case 'claim_request':
    case 'gift':
    case 'pickup_reminder':
    case 'on_the_way':
      return 'text-accent bg-accent/10';
    case 'message':
    case 'message_request':
    case 'community_chat':
      return 'text-sky-400 bg-sky-500/10';
    case 'announcement':
    case 'app_update':
      return 'text-violet-400 bg-violet-500/10';
    default:
      return 'text-muted bg-inset';
  }
}

interface UserNotificationsListProps {
  userId: string;
  /** Called when the Notify list is shown so the hub can clear unread state. */
  onViewed?: () => void;
}

export default function UserNotificationsList({ userId, onViewed }: UserNotificationsListProps) {
  const { items, loading } = useUserNotifications(userId);

  // Mark read only once the Notify list is actually shown.
  useEffect(() => {
    onViewed?.();
  }, [userId, onViewed]);

  if (loading) {
    return <p className="text-sm text-muted">Loading your notifications…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted italic">
        Nothing yet — every alert you receive (messages, listings, comments, claims, and more) is logged here.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const Icon = kindIcon(item.kind);
        return (
          <li key={item.id}>
            <PublicCard className={item.readAt ? '' : 'border-accent/25 bg-accent-soft/10'}>
              <div className="flex gap-3">
                <span
                  className={`shrink-0 p-2 rounded-xl h-fit ${kindColor(item.kind)}`}
                  aria-hidden
                >
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-app flex items-center gap-2">
                      {item.title}
                      {!item.readAt ? (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-accent bg-accent-soft px-1.5 py-0.5 rounded-full">
                          New
                        </span>
                      ) : null}
                    </h3>
                    <time className="text-[10px] text-muted whitespace-nowrap shrink-0">
                      {formatWhen(item.at)}
                    </time>
                  </div>
                  {item.itemTitle ? (
                    <p className="text-[11px] font-semibold text-accent mt-0.5 truncate">{item.itemTitle}</p>
                  ) : null}
                  {item.actorName ? (
                    <p className="text-[11px] text-muted mt-0.5">{item.actorName}</p>
                  ) : null}
                  <p className="text-sm text-muted mt-1 leading-relaxed line-clamp-3">{item.body}</p>
                </div>
              </div>
            </PublicCard>
          </li>
        );
      })}
    </ul>
  );
}
