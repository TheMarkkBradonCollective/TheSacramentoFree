# Go Get + Pickup Push Integration

> **Architecture rule:** `go_get_sessions` is the source of truth. Push is an event-delivery layer only. Never treat a notification as proof that something happened — always re-query Supabase after opening a deep link.

## Event pipeline

```
USER ACTION → DB STATE CHANGE → PUSH EVENT → RECIPIENT RESOLUTION
  → PREFERENCES → PLATFORM FILTER (Android FCM only) → DEDUP
  → IN-APP INBOX → FCM → DEEP LINK (/go-get/{sessionId})
```

## Platform rules

| Platform | Go Get push |
|----------|-------------|
| Android APK/AAB | Yes (FCM) |
| Browser / PWA | No — filtered by `pickupPushEvents.ts` |
| iOS PWA | No |

Go Get UI remains native Android only. Web Push handles normal app notifications only.

## Event lifecycle

See `docs/NOTIFICATION_ARCHITECTURE.md` for the full transition table.

Key additions in Push 2.0:

- `go_get_ring_expired` — ring timed out, requester can schedule
- `go_get_schedule_changed` — pickup time updated
- `go_get_pickup_thirty_min` — cron reminder 30 minutes before
- `on_the_way` / `go_get_approaching` — navigation engine thresholds (once per session)
- `go_get_disputed` — issue reported on a session

## Idempotency

- **Dedup:** `notification_events` unique on `(recipientId, dedupKey)` where key includes `goGetSessionId`
- **Emission flags on session:** `onTheWayNotifiedAt`, `approachingNotifiedAt`, `ringExpiredNotifiedAt`

## Deep links

- Native path: `/go-get/{sessionId}` (also `/pickup/{sessionId}`)
- App opens listing after verifying session + participant access
- Terminal sessions show a friendly message instead of stale CTAs

## Key files

| File | Role |
|------|------|
| `shared/goGetPushSpec.ts` | Event catalog, pickup category, deep link helper |
| `shared/goGetNotifications.ts` | Status transition → event mapping |
| `api/push/_server/goGetNotify.ts` | Webhook + cron reminders |
| `src/lib/goGetNavigationPush.ts` | Navigation → approaching/on-the-way (threshold-based) |
| `src/lib/pushDeepLink.ts` | `/go-get/` route parsing |
| `api/push/_server/pickupPushEvents.ts` | Android-only FCM filter |

## Realtime vs push

- **Realtime:** live location, session status, chat while app is open
- **Push:** get attention when app is backgrounded — never replace realtime with push
