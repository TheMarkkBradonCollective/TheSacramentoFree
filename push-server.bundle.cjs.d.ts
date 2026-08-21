/**
 * Type declarations for push-server.bundle.cjs — generated at build time by
 * scripts/build-push-bundle.mjs. These types mirror the public API exported
 * from api/push/_server/index.ts so TypeScript can type-check API handlers
 * that import the bundle via dynamic import() without the bundle being present
 * during development.
 */

import type { VercelRequest } from '@vercel/node';

export interface PushSendBody {
  eventType: string;
  title: string;
  body: string;
  url: string;
  tag?: string;
  data?: Record<string, string>;
  recipientUserIds?: string[];
  excludeUserIds?: string[];
  listingId?: string;
  conversationId?: string;
  requestId?: string;
  radius?: number;
  lat?: number;
  lng?: number;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface ClaimSubscriptionParams {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

export interface CronResult {
  status: number;
  body: Record<string, unknown>;
}

export interface ActionResult {
  status: number;
  body: Record<string, unknown>;
}

/** Extract the raw Bearer token string (no validation). */
export function getBearerToken(authorization: string | undefined): string | null;

/** Validate the Bearer token against Supabase and return the user row, or null. */
export function getUserFromBearer(authorization: string | undefined): Promise<{ id: string; email?: string | null } | null>;

/** Return a Supabase client authenticated with the service role key. */
export function getSupabaseAdmin(): import('@supabase/supabase-js').SupabaseClient;

/** Return a Supabase client scoped to the authenticated user's token. */
export function getSupabaseForUser(token: string): Promise<import('@supabase/supabase-js').SupabaseClient>;

/** Return the Supabase service role key (throws if missing). */
export function getServiceRoleKey(): string;

/** True if the role string grants staff-level access. */
export function isStaffRole(role: string): boolean;

/** Parse the JSON body of a VercelRequest (handles pre-parsed and raw string). */
export function parseJsonBody<T = Record<string, unknown>>(req: VercelRequest): T;

/** Send a push notification to a specific subscription for testing. */
export function runPushTest(params: {
  userId: string;
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
}): Promise<ActionResult>;

/** Send a broadcast test notification to all director-role subscriptions. */
export function runDirectorBroadcastTest(
  userId: string,
  params?: { title?: string; body?: string },
): Promise<ActionResult>;

/** Export all neighbor emails as Play Console tester CSV (director only). */
export function runExportPlayTesters(
  callerId: string,
): Promise<{ status: number; body: Record<string, unknown> | string; csv?: boolean }>;

/** Fan-out a push notification from a trusted or untrusted client-side caller. */
export function runPushSend(
  userId: string,
  body: PushSendBody | Record<string, unknown>,
  options?: { trusted?: boolean },
): Promise<ActionResult>;

/** Dispatch a webhook payload from Supabase to send the appropriate push notifications. */
export function runSupabasePushWebhook(body: Record<string, unknown>): Promise<ActionResult>;

/** Handle a push subscription key rotation (pushsubscriptionchange). */
export function runPushResubscribe(params: {
  userId: string;
  subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  userAgent?: string;
}): Promise<ActionResult>;

/** Save (or update) a push subscription for a user. */
export function claimPushSubscriptionForUser(
  userId: string,
  params: ClaimSubscriptionParams,
): Promise<{ ok: boolean; error?: string }>;

/** Insert default notification preferences for a user if they don't exist yet. */
export function ensureNotificationPreferencesOnSubscribe(userId: string): Promise<void>;

/** Cron job: notify owners of listings expiring within the warning window. */
export function runListingExpiryCron(): Promise<CronResult>;

/** Cron job: remind pending-pickup participants who haven't completed pickup. */
export function runPickupReminderCron(): Promise<CronResult>;

/** Notify users when a listing's status changes. */
export function runListingStatusNotify(params: {
  itemId: string;
  newStatus: string;
  oldStatus?: string;
}): Promise<ActionResult>;

/** Notify users who saved a listing when its status changes. */
export function runSavedItemsStatusNotify(params: {
  itemId: string;
  newStatus: string;
}): Promise<ActionResult>;

/** Notify relevant parties when a listing is marked completed. */
export function runItemCompletedNotify(params: {
  itemId: string;
  posterUserId: string;
  claimerUserId: string;
}): Promise<ActionResult>;

/** Notify the director when a user reports a neighbor. */
export function runReportNotify(userId: string, reportId: string): Promise<ActionResult>;

/** Notify staff when a support ticket action occurs. */
export function runSupportNotify(
  userId: string,
  ticketId: string,
  event: string,
  messageId?: string,
): Promise<ActionResult>;

export function runDirectorCategoryAlert(params: Record<string, unknown>): Promise<ActionResult>;
export function runDirectorClaimRequestNotify(params: Record<string, unknown>): Promise<ActionResult>;
export function runDirectorJoinNotify(params: Record<string, unknown>): Promise<ActionResult>;
export function runDirectorLeaveNotify(params: Record<string, unknown>): Promise<ActionResult>;
export function runDirectorListingNotify(params: Record<string, unknown>): Promise<ActionResult>;
export function runDirectorMessageRequestNotify(params: Record<string, unknown>): Promise<ActionResult>;
export function runDirectorModerationNotify(params: Record<string, unknown>): Promise<ActionResult>;
