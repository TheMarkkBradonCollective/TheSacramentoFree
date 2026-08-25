import { APP_ORIGIN } from './apkDownload';
import { isNativeApp } from './nativePlatform';
import {
  PLAY_STORE_ASSETS_BASE_PATH,
  PLAY_STORE_FEATURE_GRAPHIC,
  PLAY_STORE_ICON,
  PLAY_STORE_PHONE_SCREENSHOTS,
} from '../../shared/playStoreAssets.mjs';

export { PLAY_STORE_ASSETS_BASE_PATH, PLAY_STORE_FEATURE_GRAPHIC, PLAY_STORE_ICON, PLAY_STORE_PHONE_SCREENSHOTS };

export type PlayStoreAssetLink = {
  file: string;
  label: string;
  href: string;
};

export function playStoreAssetUrl(fileName: string): string {
  const path = `${PLAY_STORE_ASSETS_BASE_PATH}/${fileName}`;
  if (typeof window === 'undefined' || isNativeApp()) {
    return `${APP_ORIGIN}${path}`;
  }
  return path;
}

export function playStoreAssetLinks(): PlayStoreAssetLink[] {
  const items: PlayStoreAssetLink[] = [
    { file: PLAY_STORE_ICON.file, label: PLAY_STORE_ICON.label, href: playStoreAssetUrl(PLAY_STORE_ICON.file) },
    {
      file: PLAY_STORE_FEATURE_GRAPHIC.file,
      label: PLAY_STORE_FEATURE_GRAPHIC.label,
      href: playStoreAssetUrl(PLAY_STORE_FEATURE_GRAPHIC.file),
    },
    ...PLAY_STORE_PHONE_SCREENSHOTS.map(([file, label]) => ({
      file,
      label,
      href: playStoreAssetUrl(file),
    })),
  ];
  return items;
}
