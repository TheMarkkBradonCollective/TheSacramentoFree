import { useState } from 'react';
import { Gift } from 'lucide-react';
import { APP_LOGO_SRC, SITE_LOGO_SRC, SITE } from '../siteContent';
import { NEWSPAPER } from '../preview/newspaperBrand';
import { useNewspaperSkin } from '../preview/NewspaperSkinContext';
import { isNativeApp } from '../lib/nativePlatform';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  showTitle?: boolean;
  /** Defaults to SITE.tagline */
  subtitle?: string;
  /** Square logo + name/slogan stack — fits mobile headers */
  compact?: boolean;
}

function BrandTitleBlock({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <div className="text-left min-w-0">
      <p
        className={`font-display font-bold text-app leading-tight truncate ${
          compact ? 'text-[13px] tracking-tight' : 'text-sm'
        }`}
      >
        {title}
      </p>
      <p className={`text-muted truncate ${compact ? 'text-[10px] leading-snug mt-0.5' : 'text-[11px]'}`}>
        {subtitle}
      </p>
    </div>
  );
}

export default function BrandLogo({
  className = 'flex items-center gap-2.5 min-w-0',
  imgClassName = 'h-9 w-auto max-w-[140px] object-contain rounded-lg shrink-0',
  showTitle = false,
  subtitle,
  compact = false,
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const { enabled: newspaper } = useNewspaperSkin();
  const title = newspaper ? NEWSPAPER.name : SITE.name;
  const tagline = subtitle ?? (newspaper ? NEWSPAPER.tagline : SITE.tagline);
  const useSiteLockup = !compact && !isNativeApp();
  const src = useSiteLockup ? SITE_LOGO_SRC : APP_LOGO_SRC;
  const logoClass = compact
    ? 'h-8 w-8 object-cover rounded-lg shrink-0'
    : imgClassName;

  if (failed) {
    return (
      <div className={className}>
        <div className="w-9 h-9 bg-accent text-on-accent rounded-lg flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        {showTitle && <BrandTitleBlock title={title} subtitle={tagline} compact={compact} />}
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={src}
        alt={newspaper ? NEWSPAPER.name : 'Sacramento Buy Nothing'}
        className={logoClass}
        onError={() => setFailed(true)}
      />
      {showTitle && <BrandTitleBlock title={title} subtitle={tagline} compact={compact} />}
    </div>
  );
}
