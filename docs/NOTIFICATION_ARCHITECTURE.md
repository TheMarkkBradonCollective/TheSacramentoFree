# Sacramento Buy Nothing — Notification Architecture

Every meaningful event creates **one notification record first**. Delivery is secondary.

```
EVENT (client action or DB webhook)
        │
        ▼
┌───────────────────────────────────────┐
│         NOTIFICATION ENGINE           │
├───────────────────────────────────────┤
│ • Resolve recipients                  │
│ • Check preferences                   │
│ • Check quiet hours                   │
│ • Determine priority + delivery mode  │
│ • Deduplicate (deterministic key)     │
│ • Write inbox notification            │
└───────────────┬───────────────────────┘
                │
                ▼
         DELIVERY ROUTER
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
  Android     Web/PWA    In-App
   (FCM)      (VAPID)     Inbox
```

## Core principle

> **Event → Notification → Preference check → Priority → Dedup → Inbox → Delivery**

Both client-side (`POST /api/push/send`) and database webhooks (`/api/webhooks/supabase-push`) feed the same `dispatchNotification()` engine in `api/push/_server/notificationEngine.ts`.

## Priority and delivery modes

Every event type maps to metadata in `shared/notificationTypes.ts`:

| Priority | Meaning | Typical delivery |
|----------|---------|------------------|
| `silent` | Low-signal activity | In-app only |
| `normal` | Standard alerts | Push + inbox |
| `important` | Time-sensitive for the user | Push + inbox (high urgency) |
| `urgent` | Safety, pickup arrival, account lock | Urgent push + inbox |

| Delivery mode | Inbox | Device push |
|---------------|-------|-------------|
| `in_app` | ✓ | — |
| `push` | — | ✓ |
| `push_and_in_app` | ✓ | ✓ |
| `urgent_push` | ✓ | ✓ (high priority) |

**Examples (current defaults):**

| Event | Priority | Delivery |
|-------|----------|----------|
| Listing upvote | Silent | In-app only |
| New comment | Normal | Push + inbox |
| Item claimed | Important | Push + inbox |
| Pickup reminder | Important | Push + inbox |
| Picker arriving | Urgent | Urgent push + inbox |
| Account locked | Urgent | Urgent push + inbox |

Votes, reactions, and minor feed activity are **in-app only** to reduce notification noise.

## Deterministic deduplication

Legacy: global `push_dispatch_log` tag with a 90-second window (still used for one-shot campaigns).

**Current:** per-recipient keys in `notification_events`:

```
{eventType}:{entityId}:{secondaryEntityId?}:{recipientUserId}
```

Examples:
- `item_claimed:item_abc:user_poster`
- `new_message:msg_123:user_recipient`
- `feed_comment:post_1:comment_9:user_author`

Unique constraint on `(recipientId, dedupKey)` means client + webhook paths cannot double-notify.

Computed by `shared/dedupKey.ts`, claimed in `api/push/_server/pushDedup.ts`.

## Quiet hours

Schema columns on `notification_preferences`:
- `quietHoursEnabled` (default off)
- `quietHoursStart` / `quietHoursEnd` (default 22:00 – 07:00)
- `quietHoursAllowUrgent` (default on)

During quiet hours, normal notifications are suppressed for push (inbox still written). Urgent/important events with `bypassQuietHours` still push. UI for quiet hours is planned.

## Platforms

| Platform | Push method |
|----------|-------------|
| Desktop / mobile browser | Web Push (VAPID) via service worker |
| PWA (Android) | Web Push |
| **iOS / iPadOS** | **PWA Web Push** — available when installed to Home Screen on supported iOS/iPadOS versions; permissions managed by Apple |
| Android APK/AAB | FCM via Capacitor |
| Go Get / pickup coordination | Android native (FCM) only |

## Android notification channels

FCM payloads include an `androidChannel` mapped to `sac_buy_nothing_{channel}`:

`messages` · `listings` · `community` · `pickup` · `account` · `staff` · `urgent`

## Database tables

| Table | Role |
|-------|------|
| `notification_events` | Deterministic dedup + audit trail |
| `user_notifications` | In-app bell inbox |
| `push_subscriptions` | Device endpoints (VAPID or `fcm:{token}`) |
| `notification_preferences` | Per-user toggles + quiet hours |
| `push_dispatch_log` | Legacy global tag dedup (campaigns) |

### Planned tables (next phases)

| Table | Purpose |
|-------|---------|
| `notification_groups` | Batching ("12 people reacted") |
| `notification_deliveries` | Per-device delivery tracking |
| `user_devices` | Device registry with last-seen |
| `notification_mutes` | Per-listing/conversation/person mute |

## Pickup / Go Get (future)

Pickup coordination will move to a dedicated state machine:

```
PENDING → SCHEDULED → REMINDER_SENT → PICKER_ON_WAY → PICKER_ARRIVED → PICKUP_CONFIRMED → COMPLETED
```

Notifications attach to state transitions rather than ad-hoc events.

## Key files

| File | Role |
|------|------|
| `shared/notificationTypes.ts` | Priority, delivery mode, per-event metadata |
| `shared/dedupKey.ts` | Deterministic dedup key computation |
| `api/push/_server/notificationEngine.ts` | Central dispatch |
| `api/push/_server/pushDedup.ts` | `notification_events` claims |
| `api/push/_server/quietHours.ts` | Quiet hours suppression |
| `api/push/_server/pushDelivery.ts` | Web Push + FCM send helpers |
| `api/push/_server/runPushSend.ts` | HTTP adapter for `/api/push/send` |
| `api/push/_server/webhookDispatch.ts` | Supabase webhook router |

## Roadmap

1. **Done (this PR):** Central engine, priority/delivery modes, deterministic dedup, quiet hours backend, vote/reaction → in-app only, Android channels
2. **Next:** Quiet hours UI, notification batching, per-device registry, delivery tracking, dead-token cleanup
3. **Later:** Pickup state machine, per-channel prefs (in-app / push / email), mute controls, deep-link validation, notification expiration, admin analytics
