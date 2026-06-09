type WebPushDefault = typeof import('web-push')['default'];

let webpushModule: WebPushDefault | null = null;
let webpushLoad: Promise<WebPushDefault> | null = null;
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

export async function getWebPushModule(): Promise<WebPushDefault> {
  if (webpushModule) return webpushModule;
  if (!webpushLoad) {
    webpushLoad = import('web-push').then((mod) => {
      const resolved = mod.default ?? (mod as unknown as WebPushDefault);
      webpushModule = resolved;
      return resolved;
    });
  }
  return webpushLoad;
}

export async function configureVapidAsync(): Promise<boolean> {
  if (configured) return true;

  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;

  try {
    const webpush = await getWebPushModule();
    webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
    configured = true;
    return true;
  } catch {
    return false;
  }
}
