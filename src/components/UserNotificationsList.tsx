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
import type { UserNotificationItem, UserNotificationKind } from '../types';
import { useUserNotifications } from '../hooks/useUserNotifications';
import { parsePushDeepLink, type PushDeepLinkTarget } from '../lib/pushDeepLink';
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

function targetForNotification(item: UserNotificationItem): PushDeepLinkTarget | null {
  if (item.url) {
    return parsePushDeepLink(item.url);
  }
  if (
    item.itemId &&
    (item.kind === 'comment' ||
      item.kind === 'upvote' ||
      item.kind === 'downvote' ||
      item.kind === 'new_listing' ||
      item.kind === 'nearby_listing' ||
      item.kind === 'saved_item' ||
      item.kind === 'claim' ||
      item.kind === 'gift' ||
      item.kind === 'listing_status' ||
      item.kind === 'pickup_reminder' ||
      item.kind === 'on_the_way')
  ) {
    return { tab: 'feed', listingId: item.itemId };
  }
  if (item.kind === 'message' || item.kind === 'message_request') {
    return { tab: 'chats' };
  }
  if (item.kind === 'community_chat') {
    return { tab: 'chats', conversationId: 'community-global' };
  }
  if (item.kind === 'staff_chat') {
    return { tab: 'chats', conversationId: 'community-staff' };
  }
  if (item.kind === 'app_update') {
    return { notificationsTab: 'updates' };
  }
  if (item.kind === 'announcement') {
    return { notificationsTab: 'announcements' };
  }
  if (item.kind === 'support' || item.kind === 'staff_support') {
    return { tab: 'chats', chatSupportView: 'list' };
  }
  return null;
}

interface UserNotificationsListProps {
  userId: string;
  onNavigate?: (target: PushDeepLinkTarget) => void;
}

export default function UserNotificationsList({ userId, onNavigate }: UserNotificationsListProps) {
  const { items, loading } = useUserNotifications(userId);

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
        const target = targetForNotification(item);
        const isInteractive = Boolean(onNavigate && target);

        return (
          <li key={item.id}>
            <PublicCard
              className={`${item.readAt ? '' : 'border-accent/25 bg-accent-soft/10'} ${
                isInteractive ? 'cursor-pointer hover:border-accent/40 transition-colors' : ''
              }`}
            >
              {isInteractive ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(target!)}
                  className="flex gap-3 w-full text-left"
                >
                  <NotificationBody item={item} Icon={Icon} />
                </button>
              ) : (
                <div className="flex gap-3">
                  <NotificationBody item={item} Icon={Icon} />
                </div>
              )}
            </PublicCard>
          </li>
        );
      })}
    </ul>
  );
}

function NotificationBody({
  item,
  Icon,
}: {
  item: UserNotificationItem;
  Icon: typeof MessageSquare;
}) {
  return (
    <>
      <span className={`shrink-0 p-2 rounded-xl h-fit ${kindColor(item.kind)}`} aria-hidden>
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
          <time className="text-[10px] text-muted whitespace-nowrap shrink-0">{formatWhen(item.at)}</time>
        </div>
        {item.itemTitle ? (
          <p className="text-[11px] font-semibold text-accent mt-0.5 truncate">{item.itemTitle}</p>
        ) : null}
        {item.actorName ? <p className="text-[11px] text-muted mt-0.5">{item.actorName}</p> : null}
        <p className="text-sm text-muted mt-1 leading-relaxed line-clamp-3">{item.body}</p>
      </div>
    </>
  );
}
