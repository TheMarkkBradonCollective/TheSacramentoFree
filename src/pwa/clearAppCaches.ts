/** Drop Cache Storage entries left by older service workers. */
export async function clearAppAssetCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('sac-buy-nothing'))
        .map((key) => caches.delete(key)),
    );
  } catch {
    // Private mode / WebView may reject Cache Storage.
  }
}
