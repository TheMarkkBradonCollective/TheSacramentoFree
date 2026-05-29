import BrandLogo from './BrandLogo';
import { SITE } from '../siteContent';

export default function AppBootSplash() {
  return (
    <div
      id="app_boot_splash"
      className="min-h-[100svh] flex flex-col items-center justify-center gap-5 px-6 text-center mesh-bg"
      aria-busy="true"
      aria-label="Loading Sacramento Buy Nothing"
    >
      <BrandLogo showTitle subtitle={SITE.tagline} />
      <div
        className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"
        aria-hidden
      />
    </div>
  );
}
