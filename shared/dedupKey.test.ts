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
