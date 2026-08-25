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

## Pickup & Go Get (dedicated subsystem)

Go Get notifications are **Android native (FCM) only** — browser/PWA subscriptions are filtered out for all pickup/Go Get events.

### State machine

Session statuses in `go_get_sessions` drive which notification fires:

```
awaiting_availability → scheduled → active → arrived → completed
         ↓                  ↓
   awaiting_schedule    cancelled / expired / disputed
```

| Transition | Event | Who gets it |
|------------|-------|-------------|
| New live ring | `go_get_availability_request` | Fulfiller (urgent ring) |
| Fulfiller says yes now | `go_get_available_now` | Requester |
| Schedule proposed | `go_get_schedule_proposed` | Requester |
| Time confirmed | `go_get_schedule_confirmed` | Fulfiller |
| **24h before pickup** | `go_get_pickup_tomorrow` | Both parties (cron) |
| **1h before pickup** | `go_get_pickup_in_one_hour` | Both parties (cron) |
| **At pickup time** | `go_get_ready_reminder` | Fulfiller (cron) |
| Fulfiller taps Ready | `go_get_fulfiller_ready` | Requester |
| Requester starts trip | `go_get_started` | Fulfiller |
| Requester arrives | `go_get_arrived` | Fulfiller |
| Pickup confirmed | `go_get_completed` | Requester |
| Cancelled | `go_get_cancelled` | Other party |

### Dual dispatch + dedup

- **Client** fires pushes from `goGetSessions.ts` after state changes
- **Webhook** on `go_get_sessions` INSERT/UPDATE is backup (`goGetNotify.ts`)
- **Cron** (`runGoGetReminderCron`) sends advance reminders
- All paths dedupe via `goGetSessionId` + recipient in `notification_events`

### Urgent availability ring

`go_get_availability_request` includes FCM data: `urgentGoGetRing`, `ringDurationSeconds`, `ringPattern`. Android uses the `sac_buy_nothing_urgent` channel with high priority.

### Key files

| File | Role |
|------|------|
| `shared/goGetNotifications.ts` | State machine → event mapping |
| `api/push/_server/goGetNotify.ts` | Webhook + cron handlers |
| `src/lib/goGetSessions.ts` | Client-side session transitions + push |
| `src/lib/pushEvents.ts` | Client notify helpers |
| `api/push/_server/pickupPushEvents.ts` | FCM-only filter |

## Key files (general)

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

1. **Done:** Central engine, priority/delivery modes, deterministic dedup, quiet hours backend, vote/reaction → in-app only, Android channels, Go Get state machine + cron reminders + webhook backup
2. **Next:** Quiet hours UI, notification batching, per-device registry, delivery tracking, dead-token cleanup
3. **Later:** Per-channel prefs (in-app / push / email), mute controls, deep-link validation, notification expiration, admin analytics
