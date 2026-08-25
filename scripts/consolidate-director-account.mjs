#!/usr/bin/env node
/**
 * Consolidate director accounts into marknickwhite@gmail.com:
 * - Keep marknickwhite@gmail.com as the sole director
 * - Delete markkisstickz96@gmail.com (and other duplicate director emails)
 * - Purge all community activity from the director account (listings, chats, awards, etc.)
 * - Set joinRank = 1 and exclude from awards leaderboard (revoke all badges)
 * - Update director_message title to TheSacramentoFree Director
 *
 * Usage (service role required):
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/consolidate-director-account.mjs
 *
 * Dry run (no writes):
 *   DRY_RUN=1 node scripts/consolidate-director-account.mjs
 */
import { createClient } from '@supabase/supabase-js';

const PRIMARY_EMAIL = (process.env.DIRECTOR_EMAIL || 'marknickwhite@gmail.com').toLowerCase();
const SECONDARY_EMAILS = (process.env.SECONDARY_DIRECTOR_EMAILS ||
  'markkisstickz96@gmail.com,sigsecspec@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const DIRECTOR_TITLE = 'TheSacramentoFree Director';
const DIRECTOR_DISPLAY_NAME = process.env.DIRECTOR_DISPLAY_NAME || 'Markeith White';
const DRY_RUN = ['1', 'true', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());

const url =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  '';

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  let page = 1;
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function deleteAuthUser(uid) {
  if (DRY_RUN) {
    console.log(`[dry-run] would delete auth user ${uid}`);
    return;
  }
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) throw error;
}

async function purgeDirectorCommunityData(uid) {
  const tables = [
  // Listings & coordination
    ['item_claim_requests', 'giverUserId'],
    ['item_claim_requests', 'claimerUserId'],
    ['item_claims', 'giverUserId'],
    ['item_claims', 'claimerUserId'],
    ['items', 'userId'],
    ['item_votes', 'userId'],
    ['item_comments', 'userId'],
    ['saved_items', 'userId'],
    // Feed
    ['feed_posts', 'userId'],
    ['feed_comments', 'userId'],
    ['feed_reactions', 'userId'],
    ['feed_poll_votes', 'userId'],
    // Events
    ['community_events', 'userId'],
    ['event_rsvps', 'userId'],
    ['event_comments', 'userId'],
    // Social
    ['user_blocks', 'blockerUserId'],
    ['user_blocks', 'blockedUserId'],
    ['message_requests', 'fromUserId'],
    ['message_requests', 'toUserId'],
    ['friend_requests', 'fromUserId'],
    ['friend_requests', 'toUserId'],
    // Support & moderation
    ['user_reports', 'reporterUserId'],
    ['user_reports', 'reportedUserId'],
    ['support_tickets', 'openerUserId'],
    ['support_ticket_messages', 'senderUserId'],
    ['moderation_audit_log', 'actorUserId'],
    ['moderation_audit_log', 'targetUserId'],
    // Notifications & push
    ['user_notifications', 'userId'],
    ['push_subscriptions', 'userId'],
    // Awards
    ['user_awards', 'userId'],
    // Staff pipeline (director shouldn't need these)
    ['staff_applications', 'applicantUserId'],
    ['staff_messages', 'userId'],
  ];

  for (const [table, column] of tables) {
    if (DRY_RUN) {
      const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(column, uid);
      if (count) console.log(`[dry-run] would delete ${count} row(s) from ${table} where ${column}=${uid}`);
      continue;
    }
    const { error } = await admin.from(table).delete().eq(column, uid);
    if (error && error.code !== '42P01') {
      console.warn(`[purge] ${table}.${column}: ${error.message}`);
    }
  }

  // Chats & messages (participant JSON arrays)
  if (DRY_RUN) {
    console.log(`[dry-run] would delete chats/messages involving ${uid}`);
    return;
  }

  const { data: chats } = await admin
    .from('chats')
    .select('id')
    .filter('participantIds', 'cs', JSON.stringify([uid]));

  const chatIds = (chats || []).map((c) => c.id);
  if (chatIds.length) {
    await admin.from('messages').delete().in('chatId', chatIds);
    await admin.from('chats').delete().in('id', chatIds);
  }

  await admin.from('messages').delete().eq('senderId', uid);
}

async function ensureProfile(uid, email) {
  const row = {
    uid,
    displayName: DIRECTOR_DISPLAY_NAME,
    email,
    neighborhood: 'Sacramento',
    role: 'director',
    goGetEnabled: false,
    joinRank: 1,
    accountStatus: 'active',
    bio: '',
    staffInteractionMode: 'staff',
  };

  if (DRY_RUN) {
    console.log('[dry-run] would upsert director profile:', row);
    return;
  }

  const { error } = await admin.from('users').upsert(row, { onConflict: 'uid' });
  if (error) throw error;
}

async function demoteOtherDirectors(keepUid) {
  if (DRY_RUN) {
    const { data } = await admin.from('users').select('uid, email').eq('role', 'director').neq('uid', keepUid);
    for (const row of data || []) {
      console.log(`[dry-run] would demote director ${row.email} (${row.uid}) to user`);
    }
    return;
  }

  const { error } = await admin
    .from('users')
    .update({ role: 'user' })
    .eq('role', 'director')
    .neq('uid', keepUid);
  if (error) throw error;
}

async function setJoinRankOne(directorUid) {
  if (DRY_RUN) {
    console.log(`[dry-run] would set joinRank=1 for ${directorUid} and shift other ranks`);
    return;
  }

  const { data: users, error } = await admin.from('users').select('uid, joinRank').neq('uid', directorUid);
  if (error) throw error;

  for (const user of users || []) {
    const rank = user.joinRank;
    if (rank == null) continue;
    await admin.from('users').update({ joinRank: rank + 1 }).eq('uid', user.uid);
  }

  await admin.from('users').update({ joinRank: 1 }).eq('uid', directorUid);
}

async function updateDirectorMessage(directorUid) {
  const patch = {
    directorName: DIRECTOR_DISPLAY_NAME,
    directorTitle: DIRECTOR_TITLE,
    updatedAt: new Date().toISOString(),
    updatedByUserId: directorUid,
  };

  if (DRY_RUN) {
    console.log('[dry-run] would update director_message:', patch);
    return;
  }

  const { error } = await admin.from('director_message').update(patch).eq('id', 'main');
  if (error) console.warn(`[director_message] ${error.message}`);
}

async function deleteSecondaryAccount(email) {
  const authUser = await findUserByEmail(email);
  if (!authUser) {
    console.log(`No auth account for ${email} — skipping delete.`);
    return;
  }

  console.log(`Deleting secondary account ${email} (${authUser.id})`);
  await purgeDirectorCommunityData(authUser.id);
  if (!DRY_RUN) {
    await admin.from('users').delete().eq('uid', authUser.id);
  }
  await deleteAuthUser(authUser.id);
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log(`Primary director email: ${PRIMARY_EMAIL}`);
  console.log(`Secondary emails to remove: ${SECONDARY_EMAILS.join(', ')}`);
  console.log('');

  let primary = await findUserByEmail(PRIMARY_EMAIL);

  if (!primary) {
    const secondaryWithAccount = [];
    for (const email of SECONDARY_EMAILS) {
      const user = await findUserByEmail(email);
      if (user) secondaryWithAccount.push({ email, user });
    }

    if (secondaryWithAccount.length === 0) {
      console.error(`No account found for ${PRIMARY_EMAIL}. Sign up first, then rerun.`);
      process.exit(1);
    }

    const { email, user } = secondaryWithAccount[0];
    console.log(`Primary not found — renaming ${email} → ${PRIMARY_EMAIL}`);
    if (!DRY_RUN) {
      const { data, error } = await admin.auth.admin.updateUserById(user.id, {
        email: PRIMARY_EMAIL,
        email_confirm: true,
      });
      if (error) throw error;
      primary = data.user;
      await admin.from('users').update({ email: PRIMARY_EMAIL }).eq('uid', user.id);
    } else {
      primary = user;
    }
  }

  const directorUid = primary.id;
  console.log(`Director UID: ${directorUid}`);

  await demoteOtherDirectors(directorUid);
  await purgeDirectorCommunityData(directorUid);
  await ensureProfile(directorUid, PRIMARY_EMAIL);
  await setJoinRankOne(directorUid);
  await updateDirectorMessage(directorUid);

  for (const email of SECONDARY_EMAILS) {
    if (email === PRIMARY_EMAIL) continue;
    await deleteSecondaryAccount(email);
  }

  // Also delete any secondary email that isn't in the list but shares the director UID
  for (const email of SECONDARY_EMAILS) {
    if (email === PRIMARY_EMAIL) continue;
    const orphan = await admin.from('users').select('uid, email').eq('email', email).maybeSingle();
    if (orphan.data?.uid && orphan.data.uid !== directorUid) {
      console.log(`Removing orphan profile ${email} (${orphan.data.uid})`);
      if (!DRY_RUN) {
        await admin.from('users').delete().eq('uid', orphan.data.uid);
      }
    }
  }

  console.log('');
  console.log('Done.');
  console.log(`Director account: ${PRIMARY_EMAIL}`);
  console.log(`Director UID:   ${directorUid}`);
  console.log(`Director title: ${DIRECTOR_TITLE}`);
  console.log('');
  console.log('If CHANGELOG_AUTHOR_UID in shared/changelogAuthor.ts differs, update it to:');
  console.log(`  export const CHANGELOG_AUTHOR_UID = '${directorUid}';`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
