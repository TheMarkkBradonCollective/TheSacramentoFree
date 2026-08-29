import assert from 'node:assert/strict';
import test from 'node:test';
import { computeDedupKey } from './dedupKey';

test('computeDedupKey builds per-recipient claim key', () => {
  const key = computeDedupKey({
    eventType: 'item_claimed',
    recipientUserId: 'user_poster',
    tag: 'claimed-item_abc',
    data: { listingId: 'item_abc' },
  });
  assert.equal(key, 'item_claimed:item_abc:user_poster');
});

test('computeDedupKey uses message id from legacy tag', () => {
  const key = computeDedupKey({
    eventType: 'new_message',
    recipientUserId: 'user_recipient',
    tag: 'msg-msg_123',
    data: { conversationId: 'chat_789' },
  });
  assert.equal(key, 'new_message:msg_123:user_recipient');
});

test('computeDedupKey includes secondary entity for comments', () => {
  const key = computeDedupKey({
    eventType: 'feed_comment',
    recipientUserId: 'user_author',
    data: { postId: 'post_1', commentId: 'comment_9' },
  });
  assert.equal(key, 'feed_comment:post_1:comment_9:user_author');
});

test('computeDedupKey is stable for client and webhook paths', () => {
  const clientKey = computeDedupKey({
    eventType: 'claim_request',
    recipientUserId: 'user_owner',
    tag: 'claim-req-req_55',
    data: { listingId: 'item_99', claimRequestId: 'req_55' },
  });
  const webhookKey = computeDedupKey({
    eventType: 'claim_request',
    recipientUserId: 'user_owner',
    data: { listingId: 'item_99', claimRequestId: 'req_55' },
  });
  assert.equal(clientKey, webhookKey);
  assert.equal(clientKey, 'claim_request:req_55:user_owner');
});

test('production send path does not collapse every message in a chat', () => {
  const first = computeDedupKey({
    eventType: 'new_message',
    recipientUserId: 'user_recipient',
    tag: 'msg-msg_1',
    entityId: 'chat_789',
    data: { listingId: '', conversationId: 'chat_789', requestId: '', messageId: 'msg_1' },
  });
  const second = computeDedupKey({
    eventType: 'new_message',
    recipientUserId: 'user_recipient',
    tag: 'msg-msg_2',
    entityId: 'chat_789',
    data: { listingId: '', conversationId: 'chat_789', requestId: '', messageId: 'msg_2' },
  });
  assert.equal(first, 'new_message:msg_1:user_recipient');
  assert.equal(second, 'new_message:msg_2:user_recipient');
  assert.notEqual(first, second);

  const tagOnly = computeDedupKey({
    eventType: 'new_message',
    recipientUserId: 'user_recipient',
    tag: 'msg-msg_1',
    entityId: 'chat_789',
    data: { conversationId: 'chat_789' },
  });
  assert.equal(tagOnly, 'new_message:msg_1:user_recipient');
});

test('community chat keeps a unique key per message', () => {
  const first = computeDedupKey({
    eventType: 'community_chat',
    recipientUserId: 'neighbor_1',
    tag: 'community-msg-aaa',
    entityId: 'community-global',
    data: { conversationId: 'community-global', messageId: 'aaa' },
  });
  const second = computeDedupKey({
    eventType: 'community_chat',
    recipientUserId: 'neighbor_1',
    tag: 'community-msg-bbb',
    entityId: 'community-global',
    data: { conversationId: 'community-global', messageId: 'bbb' },
  });
  assert.notEqual(first, second);
  assert.match(first, /aaa/);
  assert.match(second, /bbb/);
});

test('listing comments stay unique when entityId is the listing', () => {
  const first = computeDedupKey({
    eventType: 'new_comment',
    recipientUserId: 'owner',
    tag: 'comment-c1',
    entityId: 'item_abc',
    data: { listingId: 'item_abc', commentId: 'c1' },
  });
  const second = computeDedupKey({
    eventType: 'new_comment',
    recipientUserId: 'owner',
    tag: 'comment-c2',
    entityId: 'item_abc',
    data: { listingId: 'item_abc', commentId: 'c2' },
  });
  assert.equal(first, 'new_comment:item_abc:c1:owner');
  assert.equal(second, 'new_comment:item_abc:c2:owner');
});

test('listing views stay unique per viewer', () => {
  const first = computeDedupKey({
    eventType: 'listing_viewed',
    recipientUserId: 'owner',
    tag: 'view-item_abc-viewer_1',
    entityId: 'item_abc',
    data: { listingId: 'item_abc', viewerUserId: 'viewer_1' },
  });
  const second = computeDedupKey({
    eventType: 'listing_viewed',
    recipientUserId: 'owner',
    tag: 'view-item_abc-viewer_2',
    entityId: 'item_abc',
    data: { listingId: 'item_abc', viewerUserId: 'viewer_2' },
  });
  assert.equal(first, 'listing_viewed:item_abc:viewer_1:owner');
  assert.equal(second, 'listing_viewed:item_abc:viewer_2:owner');
});

test('listing votes stay unique per voter and listing', () => {
  const first = computeDedupKey({
    eventType: 'listing_upvote',
    recipientUserId: 'owner',
    tag: 'vote-up-item_abc-voter_1',
    entityId: 'item_abc',
    data: { listingId: 'item_abc', actorUserId: 'voter_1' },
  });
  const second = computeDedupKey({
    eventType: 'listing_upvote',
    recipientUserId: 'owner',
    tag: 'vote-up-item_abc-voter_2',
    entityId: 'item_abc',
    data: { listingId: 'item_abc', actorUserId: 'voter_2' },
  });
  const otherListing = computeDedupKey({
    eventType: 'listing_upvote',
    recipientUserId: 'owner',
    tag: 'vote-up-item_zzz-voter_1',
    entityId: 'item_zzz',
    data: { listingId: 'item_zzz', actorUserId: 'voter_1' },
  });
  assert.notEqual(first, second);
  assert.notEqual(first, otherListing);
});
