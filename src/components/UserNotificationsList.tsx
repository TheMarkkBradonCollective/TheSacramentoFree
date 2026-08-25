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
  Shield,
  Sparkles,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react';
import type { UserNotificationItem, UserNotificationKind, UserProfile } from '../types';
import { useUserNotifications } from '../hooks/useUserNotifications';
import { parsePushDeepLink, type PushDeepLinkTarget } from '../lib/pushDeepLink';
import { isStaffModeNotificationKind, receivesStaffNotifications } from '../lib/staffInteractionMode';
import { isStaffRole } from '../lib/roles';
import {
  STAFF_APPLY_INVITE,
  STAFF_APPLY_INVITE_KIND,
  isStaffApplyInviteItem,
  isStaffApplyInviteSeen,
  markStaffApplyInviteSeen,
} from '../lib/staffApplyInvite';
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
    case 'feed_comment':
    case 'feed_reply':
    case 'feed_reaction':
    case 'feed_post':
    case 'event_comment':
    case 'announcement_comment':
    case 'update_comment':
      return MessageSquare;
    case 'message':
    case 'message_request':
      return MessageSquare;
    case 'community_chat':
    case 'staff_chat':
    case 'event_rsvp':
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
    case 'feed_upvote':
      return ArrowUp;
    case 'downvote':
    case 'feed_downvote':
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
    case 'friend_request':
    case 'friend_request_accepted':
      return UserPlus;
    case 'account_update':
    case 'director_alert':
    case 'award_unlocked':
      return Sparkles;
    case 'staff_apply':
      return Shield;
    default:
      return Package;
  }
}

function kindColor(kind: UserNotificationKind): string {
  switch (kind) {
    case 'upvote':
    case 'feed_upvote':
      return 'text-emerald-400 bg-emerald-500/10';
    case 'downvote':
    case 'feed_downvote':
      return 'text-accent bg-accent/10';
    case 'claim':
    case 'claim_request':
    case 'gift':
    case 'pickup_reminder':
    case 'on_the_way':
      return 'text-accent bg-accent/10';
    case 'message':
    case 'message_request':
    case 'community_chat':
    case 'comment':
    case 'feed_comment':
    case 'feed_reply':
    case 'feed_reaction':
    case 'event_comment':
    case 'announcement_comment':
    case 'update_comment':
    case 'friend_request':
    case 'friend_request_accepted':
      return 'text-sky-400 bg-sky-500/10';
    case 'announcement':
    case 'app_update':
    case 'award_unlocked':
    case 'event_rsvp':
      return 'text-violet-400 bg-violet-500/10';
    case 'staff_apply':
      return 'text-accent bg-accent/10';
    default:
      return 'text-muted bg-inset';
  }
}

function targetForNotification(item: UserNotificationItem): PushDeepLinkTarget | null {
  if (item.url) {
    const fromUrl = parsePushDeepLink(item.url);
    if (fromUrl) return fromUrl;
  }

  const feedKinds = ['feed_comment', 'feed_reaction', 'feed_upvote', 'feed_downvote', 'feed_post', 'feed_reply'] as const;
  if (item.itemId && feedKinds.includes(item.kind as (typeof feedKinds)[number])) {
    return { tab: 'feed', feedPostId: item.itemId };
  }

  if (item.kind === 'friend_request' || item.kind === 'friend_request_accepted') {
    if (item.itemId) return { tab: 'profile', viewProfileUid: item.itemId };
    return { tab: 'profile' };
  }

  if (item.kind === 'award_unlocked') {
    return { awardsPanel: true };
  }

  if ((item.kind === 'event_rsvp' || item.kind === 'event_comment') && item.itemId) {
    return { tab: 'events', eventId: item.itemId };
  }

  if (item.kind === 'announcement_comment') {
    return item.itemId
      ? { notificationsTab: 'announcements', announcementId: item.itemId }
      : { notificationsTab: 'announcements' };
  }

  if (item.kind === 'update_comment') {
    return item.itemId
      ? { notificationsTab: 'updates', updateId: item.itemId }
      : { notificationsTab: 'updates' };
  }

  if (item.kind === 'claim_request') {
    if (item.url) {
      const requestMatch = item.url.match(/\/requests\/([^/?#]+)/);
      if (requestMatch) return { tab: 'chats', requestId: requestMatch[1] };
    }
    if (item.itemId) return { tab: 'stuff', listingId: item.itemId };
    return { tab: 'chats' };
  }

  if (item.kind === 'message_request') {
    return { tab: 'chats', messageRequests: true };
  }

  if (item.kind === 'message') {
    return { tab: 'chats' };
  }

  if (item.kind === 'community_chat') {
    return { tab: 'chats', conversationId: 'community-global' };
  }

  if (item.kind === 'staff_chat') {
    return { tab: 'chats', conversationId: 'community-staff' };
  }

  if (item.kind === 'director_alert') {
    return { tab: 'profile', directorOverview: true };
  }

  if (item.kind === 'staff_report') {
    return { tab: 'chats', chatFeedbackPanel: 'staffReports' };
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

  if (item.kind === 'staff_apply') {
    return { tab: 'profile', staffApply: true };
  }

  if (
    item.itemId &&
    (item.kind === 'comment' ||
      item.kind === 'upvote' ||
      item.kind === 'downvote' ||
      item.kind === 'new_listing' ||
      item.kind === 'nearby_listing' ||
      item.kind === 'new_request' ||
      item.kind === 'nearby_request' ||
      item.kind === 'saved_item' ||
      item.kind === 'claim' ||
      item.kind === 'gift' ||
      item.kind === 'listing_status' ||
      item.kind === 'pickup_reminder' ||
      item.kind === 'on_the_way')
  ) {
    return { tab: 'stuff', listingId: item.itemId };
  }

  return null;
}

interface UserNotificationsListProps {
  user: UserProfile;
  onNavigate?: (target: PushDeepLinkTarget) => void;
  /** Called when the Notify list is shown so the hub can clear unread state. */
  onViewed?: () => void | Promise<void>;
}

export default function UserNotificationsList({ user, onNavigate, onViewed }: UserNotificationsListProps) {
  const { items, loading, reload } = useUserNotifications(user.uid);
  const receivesStaffNotis = receivesStaffNotifications(user);
  const dbInvites = items.filter(isStaffApplyInviteItem);
  const otherItems = items.filter((item) => {
    if (isStaffApplyInviteItem(item)) return false;
    if (!receivesStaffNotis && isStaffModeNotificationKind(item.kind)) return false;
    return true;
  });
  const showInvite = !isStaffRole(user.role);
  const inviteSeen = isStaffApplyInviteSeen(user.uid);
  const seededInvite =
    showInvite && dbInvites.length === 0
      ? { ...STAFF_APPLY_INVITE, readAt: inviteSeen ? new Date().toISOString() : null }
      : null;
  const inviteCards = seededInvite ? [seededInvite] : showInvite ? dbInvites : [];

  // Mark read once the Notify list is shown, then refresh so unread styling clears.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (showInvite) markStaffApplyInviteSeen(user.uid);
      await onViewed?.();
      if (!cancelled) await reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid, showInvite, onViewed, reload]);

  if (loading) {
    return <p className="text-sm text-muted">Loading your notifications…</p>;
  }

  if (!inviteCards.length && otherItems.length === 0) {
    return (
      <p className="text-sm text-muted italic">
        Nothing yet — every alert you receive (messages, listings, comments, claims, and more) is logged here.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {inviteCards.map((inviteItem) => (
        <li key={inviteItem.id}>
          <StaffApplyInviteCard
            item={inviteItem}
            onApply={() => {
              markStaffApplyInviteSeen(user.uid);
              onNavigate?.({ tab: 'profile', staffApply: true });
            }}
          />
        </li>
      ))}
      {otherItems.map((item) => {
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

function StaffApplyInviteCard({
  item,
  onApply,
}: {
  item: UserNotificationItem;
  onApply: () => void;
}) {
  const Icon = kindIcon(STAFF_APPLY_INVITE_KIND);

  return (
    <PublicCard className={`${item.readAt ? 'border-accent/25' : 'border-accent/40 bg-accent-soft/15'}`}>
      <div className="flex gap-3">
        <span className={`shrink-0 p-2 rounded-xl h-fit ${kindColor(STAFF_APPLY_INVITE_KIND)}`} aria-hidden>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-app flex items-center gap-2">
                {item.title}
                {!item.readAt ? (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-accent bg-accent-soft px-1.5 py-0.5 rounded-full">
                    New
                  </span>
                ) : null}
              </h3>
            </div>
            {item.actorName ? <p className="text-[11px] text-muted mt-0.5">{item.actorName}</p> : null}
            <p className="text-sm text-muted mt-1 leading-relaxed">{item.body}</p>
          </div>
          <button type="button" onClick={onApply} className="sbn-btn sbn-btn-primary sbn-btn-sm">
            Apply
          </button>
        </div>
      </div>
    </PublicCard>
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
