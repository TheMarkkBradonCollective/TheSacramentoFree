import * as webPushImport from 'web-push';

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string | Buffer,
  ) => Promise<unknown>;
};

const webpushModule = ((webPushImport as { default?: WebPushModule }).default ??
  webPushImport) as WebPushModule;

let configured = false;

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '';
}

export function getVapidPrivateKey(): string {
  return process.env.VAPID_PRIVATE_KEY || '';
}

export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT || process.env.APP_URL || 'mailto:support@sacbuynothing.org';
}

export function isVapidConfigured(): boolean {
  return configured;
}

export function getWebPushModule(): WebPushModule {
  return webpushModule;
}

export async function getWebPushModuleAsync(): Promise<WebPushModule> {
  return webpushModule;
}

export async function configureVapidAsync(): Promise<boolean> {
  if (configured) return true;

  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;

  try {
    webpushModule.setVapidDetails(getVapidSubject(), publicKey, privateKey);
    configured = true;
    return true;
  } catch (err) {
    console.error('[push] configureVapid failed:', err);
    return false;
  }
}
