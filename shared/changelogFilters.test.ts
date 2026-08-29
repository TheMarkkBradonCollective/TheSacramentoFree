import assert from 'node:assert/strict';
import test from 'node:test';
import { filterNews, filterUpdates, isReleaseChangelogEntry } from './changelogFilters';
import { FEATURE_APP_UPDATES, FEATURE_UPDATE_IDS } from './changelogFeatureUpdates';
import { SEEDED_APP_UPDATES, SEEDED_HELP_ANNOUNCEMENTS } from './changelogSeed';

test('APK / release ids stay out of the Updates tab', () => {
  assert.equal(isReleaseChangelogEntry('2026-08-26_apk-0057', 'TheSacramentoFree — beta v0.2.0.0057'), true);
  const updates = filterUpdates(SEEDED_APP_UPDATES);
  assert.equal(
    updates.some((row) => /apk-\d{4}/i.test(row.id)),
    false,
    'filterUpdates must strip apk-NNNN posts',
  );
});

test('Updates tab is one seed per user-facing feature, not a bundled dump', () => {
  const updates = filterUpdates(SEEDED_APP_UPDATES);
  assert.ok(updates.length >= 40, `expected a backfilled catalog, got ${updates.length}`);
  assert.equal(
    updates.some((row) => row.id === '2026-08-25_feed-listings-events-chat'),
    false,
    'bundled Aug 25 post must be split into per-feature seeds',
  );
  const ids = updates.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length, 'feature ids must be unique');
});

test('recent neighbor features stay in Updates', () => {
  const updates = filterUpdates(SEEDED_APP_UPDATES);
  const ids = new Set(updates.map((row) => row.id));
  for (const id of [
    '2026-08-28_list-counts-under-meta',
    '2026-08-28_event-card-count-bubbles',
    '2026-08-25_listing-view-counts',
    '2026-08-25_feed-view-counts',
    '2026-08-25_event-view-counts',
    '2026-08-25_chat-read-receipts',
    '2026-08-25_go-get-pickup',
    '2026-08-25_quiet-hours',
    '2026-05-19_photos-on-listings',
    '2026-06-09_free-community-events',
  ]) {
    assert.equal(ids.has(id), true, `missing feature seed ${id}`);
    assert.equal(FEATURE_UPDATE_IDS.has(id), true, `${id} should be marked Updates-only`);
  }
});

test('current APK seed remains in the full changelog seed for News / runit', () => {
  assert.ok(SEEDED_APP_UPDATES.some((row) => row.id === '2026-08-26_apk-0057'));
});

test('News keeps community announcements and drops product-change ids', () => {
  const news = filterNews(SEEDED_HELP_ANNOUNCEMENTS);
  assert.ok(news.some((row) => row.id === '2026-08-24_hosting-outage-resolved'));
  assert.equal(filterNews([{ id: '2026-08-25_listing-view-counts' }]).length, 0);
  assert.equal(filterNews([{ id: '2026-08-20_photo-upload-fix' }]).length, 0);
});

test('every feature seed has neighbor-facing body and Mark sign-off', () => {
  for (const row of FEATURE_APP_UPDATES) {
    assert.ok(row.title.trim(), row.id);
    assert.ok(row.body.trim(), row.id);
    assert.match(row.detail, /WHAT NEIGHBORS SEE/);
    assert.match(row.detail, /— Mark/);
    assert.equal(row.date.length, 10);
  }
});
