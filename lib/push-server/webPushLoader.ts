type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string | Buffer,
  ) => Promise<unknown>;
};

let webpushModule: WebPushModule | null = null;
let webpushLoad: Promise<WebPushModule> | null = null;
let configured = false;

async function loadWebPushModule(): Promise<WebPushModule> {
  if (webpushModule) return webpushModule;
  if (!webpushLoad) {
    webpushLoad = import('web-push').then((webPushImport) => {
      webpushModule = ((webPushImport as { default?: WebPushModule }).default ??
        webPushImport) as WebPushModule;
      return webpushModule;
    });
  }
  return webpushLoad;
}

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

export async function getWebPushModuleAsync(): Promise<WebPushModule> {
  return loadWebPushModule();
}

export async function configureVapidAsync(): Promise<boolean> {
  if (configured) return true;

  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;

  try {
    const webpush = await loadWebPushModule();
    webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
    configured = true;
    return true;
  } catch (err) {
    console.error('[push] configureVapid failed:', err);
    return false;
  }
}
