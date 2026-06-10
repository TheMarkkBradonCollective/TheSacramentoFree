/**
 * Server webhooks dispatch pushes on database events.
 * Client-side dispatch duplicates those alerts and caused double notifications.
 */
export const CLIENT_PUSH_DISPATCH_ENABLED = false;
