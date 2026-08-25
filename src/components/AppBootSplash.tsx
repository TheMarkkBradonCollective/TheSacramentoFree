import BrandLogo from './BrandLogo';
import { NEWSPAPER } from '../preview/newspaperBrand';
import { getBetaVersionLabel } from '../lib/appVersion';
import { isNativeApp } from '../lib/nativePlatform';

export default function AppBootSplash() {
  const isNative = isNativeApp();
  const betaVersion = getBetaVersionLabel();
  const brandName = `${NEWSPAPER.the} ${NEWSPAPER.title}`;

  return (
    <div
      id="app_boot_splash"
      className="min-h-[100svh] flex flex-col items-center justify-center gap-6 px-6 text-center mesh-bg relative"
      aria-busy="true"
      aria-label={`Loading ${brandName}`}
    >
      <div className={`flex flex-col items-center gap-3 ${isNative ? 'sbn-boot-logo-glow' : ''}`}>
        <BrandLogo
          className="flex flex-col items-center"
          imgClassName={isNative ? 'h-16 w-16 object-cover rounded-2xl shadow-app' : 'h-11 w-11 object-cover rounded-xl'}
          showTitle={false}
        />
        <div className="text-center">
          <p className="font-display font-bold text-base text-app leading-tight">{brandName}</p>
          <p className="text-[11px] text-muted mt-0.5">{NEWSPAPER.tagline}</p>
        </div>
      </div>
      <div
        className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"
        aria-hidden
      />
      <p className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 text-[10px] tracking-[0.18em] uppercase text-subtle font-semibold">
        {betaVersion}
      </p>
    </div>
  );
}
