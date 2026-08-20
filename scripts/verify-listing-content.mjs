import { pathToFileURL } from 'node:url';

async function main() {
  const mod = await import(pathToFileURL('/workspace/src/lib/listingContent.ts').href);
  const {
    plainListingDescription,
    extractListingImageUrls,
    isPersistableListingImageUrl,
    appendPhotosToDescription,
    getListingDetailsText,
  } = mod;

  const dump = `[DETAILS]\nWood table without chairs.\n[/DETAILS]\n[PICKUP_NOTES]\nCurb.\n[/PICKUP_NOTES]\n\n[PHOTOS: ${'data:image/jpeg;base64,' + 'A'.repeat(80_000)}]`;
  const plain = plainListingDescription(dump);
  if (plain.includes('data:image')) throw new Error('plainListingDescription kept data URL');
  if (!plain.includes('Wood table')) throw new Error('plainListingDescription dropped details');
  if (plain.length > 500) throw new Error(`plainListingDescription too long: ${plain.length}`);

  const details = getListingDetailsText(dump);
  if (details !== 'Wood table without chairs.') throw new Error(`details text: ${details}`);

  if (isPersistableListingImageUrl('data:image/jpeg;base64,abc')) {
    throw new Error('data URL should not persist');
  }
  if (!isPersistableListingImageUrl('https://example.com/p.jpg')) {
    throw new Error('https URL should persist');
  }

  const urls = extractListingImageUrls({
    imageUrl: 'https://cdn.example/a.jpg',
    description: '[PHOTOS: https://cdn.example/b.jpg|data:image/jpeg;base64,xxxx]',
  });
  if (urls.join() !== 'https://cdn.example/a.jpg,https://cdn.example/b.jpg') {
    throw new Error(`extractListingImageUrls: ${urls.join()}`);
  }

  const appended = appendPhotosToDescription('Hello', ['https://cdn.example/c.jpg', 'data:image/jpeg;base64,nope']);
  if (!appended.includes('https://cdn.example/c.jpg') || appended.includes('data:image')) {
    throw new Error(`appendPhotosToDescription: ${appended}`);
  }

  const gpsDump = `[DETAILS]\nOil.\n[/DETAILS]\n[LOCATION: public]\n[GPS: 12.5,34.6]\n\n[PHOTOS: data:image/jpeg;base64,${'B'.repeat(50_000)}]`;
  const gpsPlain = plainListingDescription(gpsDump);
  if (!gpsPlain.includes('[GPS: 12.5,34.6]')) throw new Error('GPS must stay when photos are stripped');

  console.log('listingContent checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
