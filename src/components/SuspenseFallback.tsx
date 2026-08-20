import BrandLogo from './BrandLogo';
import { SITE } from '../siteContent';

/**
 * Full-viewport loading state shown while a lazily-loaded top-level view
 * (Mobile/Tablet/Desktop shell) downloads its JS chunk. Mirrors AppBootSplash
 * so the transition from boot → signed-in shell feels seamless.
 */
export function FullScreenSuspenseFallback() {
  return (
    <div
      id="app_view_suspense_fallback"
      className="min-h-[100svh] flex flex-col items-center justify-center gap-5 px-6 text-center mesh-bg"
      aria-busy="true"
      aria-label={`Loading ${SITE.name}`}
    >
      <BrandLogo showTitle subtitle={SITE.tagline} />
      <div
        className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"
        aria-hidden
      />
    </div>
  );
}

/**
 * Compact spinner used as a Suspense fallback for modals/overlays that are
 * lazily loaded on demand (post modal, item detail, profile, etc). Sized to
 * avoid layout jank — most chunks resolve in a frame or two once cached.
 */
export function OverlaySuspenseFallback() {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        className="w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin"
        aria-hidden
      />
    </div>
  );
}
