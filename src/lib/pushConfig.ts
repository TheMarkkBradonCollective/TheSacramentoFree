/**
 * Client dispatch sends pushes when the app writes to Supabase (messages, listings, etc.).
 * Server webhooks cover the same events when configured; push_dispatch_log dedup prevents doubles.
 */
export const CLIENT_PUSH_DISPATCH_ENABLED = true;
