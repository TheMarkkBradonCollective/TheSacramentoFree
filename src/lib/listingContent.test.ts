import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractPickupInstructionSections,
  listingHasPhoto,
  pickupNotesContainSensitiveDetails,
} from './listingContent';

test('extracts labeled pickup instruction lines', () => {
  const sections = extractPickupInstructionSections(
    '[PICKUP_NOTES]\nPark in the driveway on the right.\nItem is on the covered porch.\n[/PICKUP_NOTES]',
  );
  assert.ok(sections);
  assert.match(sections?.parking || '', /driveway/i);
  assert.match(sections?.porch || '', /porch/i);
});

test('treats gate codes as sensitive for voice, not display', () => {
  assert.equal(pickupNotesContainSensitiveDetails('Use the driveway on the right.'), false);
  assert.equal(pickupNotesContainSensitiveDetails('Gate code 4821 on the keypad.'), true);
});

test('listingHasPhoto uses imageUrl even when description photo tags are stripped', () => {
  assert.equal(
    listingHasPhoto({
      imageUrl: 'https://example.com/chair.jpg',
      description: 'Free chair on the porch',
    }),
    true,
  );
  assert.equal(listingHasPhoto({ description: 'No picture, just text' }), false);
});
