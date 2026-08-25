import { isFcmSubscription } from './fcmDelivery';
import { isPickupCategoryEvent } from '../../../shared/goGetPushSpec';

/** Go Get / pickup coordination pushes — APK & AAB (FCM) only, not browser or PWA web push. */
const NATIVE_PICKUP_PUSH_EVENT_NAMES = new Set<string>([
  'pickup_scheduled',
  'pickup_reminder',
  'on_the_way',
  'go_get_availability_request',
  'go_get_available_now',
  'go_get_schedule_proposed',
  'go_get_schedule_confirmed',
  'go_get_schedule_changed',
  'go_get_pickup_tomorrow',
  'go_get_pickup_in_one_hour',
  'go_get_pickup_thirty_min',
  'go_get_ready_reminder',
  'go_get_fulfiller_ready',
  'go_get_started',
  'go_get_approaching',
  'go_get_arrived',
  'go_get_completed',
  'go_get_cancelled',
  'go_get_ring_expired',
  'go_get_expired',
  'go_get_declined',
  'go_get_disputed',
  'contactless_pickup_arrived',
  'contactless_pickup_left',
]);

export function isNativePickupPushEvent(eventType: string): boolean {
  return NATIVE_PICKUP_PUSH_EVENT_NAMES.has(eventType) || isPickupCategoryEvent(eventType);
}

export function filterSubscriptionsForPickupPush<T extends { endpoint: string }>(
  subscriptions: T[],
  eventType: string,
): T[] {
  if (!isNativePickupPushEvent(eventType)) return subscriptions;
  return subscriptions.filter((sub) => isFcmSubscription(sub.endpoint));
}
