/** Facebook ad pack: video ads + the same phone screenshots as Play Console. */

import { PLAY_STORE_PHONE_SCREENSHOTS } from './playStoreAssets.mjs';

export const FACEBOOK_PROMO_BASE_PATH = '/downloads/facebook';
export const FACEBOOK_PROMO_ZIP_PATH = '/downloads/facebook-promo.zip';
export const FACEBOOK_PROMO_ZIP_NAME = 'facebook-promo.zip';

/** Same 1080×1920 captures as Play Console — not framed posters. */
export const FACEBOOK_PROMO_IMAGES = PLAY_STORE_PHONE_SCREENSHOTS;

export const FACEBOOK_PROMO_VIDEOS = [
  ['ad-portrait.mp4', 'Facebook feed ad 1080×1350 (4:5) — live app footage'],
  ['ad-square.mp4', 'Facebook feed ad 1080×1080 — live app footage'],
];

export const FACEBOOK_PROMO_DOCS = [
  ['README.txt', 'How to post the ad on Facebook'],
  ['POST-COPY.txt', 'Ready-to-paste Facebook caption'],
];
