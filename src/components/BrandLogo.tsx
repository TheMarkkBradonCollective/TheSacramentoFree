import { useState } from 'react';
import { Gift } from 'lucide-react';
import { APP_LOGO_SRC, SITE_LOGO_SRC, SITE } from '../siteContent';
import { NEWSPAPER } from '../preview/newspaperBrand';
import { useNewspaperSkin } from '../preview/NewspaperSkinContext';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  showTitle?: boolean;
  /** Defaults to SITE.tagline */
  subtitle?: string;
  /** Square app icon only — collapsed rail, native chrome, launcher contexts. */
  compact?: boolean;
}

/** Keep the uploaded masthead intact — no square crop, rounding, or extra ink frame. */
function siteLockupClass(imgClassName: string) {
  const parts = imgClassName.split(/\s+/).filter(Boolean);
  const hasExplicitSquareCap =
    parts.some((p) => p.startsWith('max-h-')) && parts.some((p) => p.startsWith('max-w-'));
  const next: string[] = [];
  for (const part of parts) {
    if (part === 'object-cover') {
      next.push('object-contain');
      continue;
    }
    if (part.startsWith('rounded-') || part.startsWith('shadow-')) continue;
    if (!hasExplicitSquareCap && /^w-(7|8|9|10|11|12|16)$/.test(part)) {
      next.push('w-auto');
      continue;
    }
    next.push(part);
  }
  if (!hasExplicitSquareCap && !next.some((p) => p.startsWith('max-w-'))) next.push('max-w-[8.5rem]');
  if (!next.includes('object-contain')) next.push('object-contain');
  next.push('tsf-lockup');
  return next.join(' ');
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
        className={`font-bold text-app leading-tight truncate ${
          compact ? 'text-[13px] tracking-tight' : 'text-sm'
        } tsf-brand-wordmark`}
      >
        {title}
      </p>
      <p
        className={`text-muted truncate tsf-brand-slogan ${
          compact ? 'text-[10px] leading-snug mt-0.5' : 'text-[11px]'
        }`}
      >
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
  const iconOnly = compact;
  const useSiteLockup = newspaper && !iconOnly;
  const src = useSiteLockup ? SITE_LOGO_SRC : APP_LOGO_SRC;
  const logoClass = iconOnly
    ? 'h-8 w-8 object-cover rounded-lg shrink-0'
    : useSiteLockup
      ? siteLockupClass(imgClassName)
      : imgClassName;
  // Lockup image already includes the wordmark — avoid duplicate header text.
  const showTitleBlock = showTitle && !useSiteLockup;

  if (failed) {
    return (
      <div className={className}>
        <div className="w-9 h-9 bg-accent text-on-accent rounded-lg flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        {showTitleBlock && <BrandTitleBlock title={title} subtitle={tagline} compact={compact} />}
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
      {showTitleBlock && <BrandTitleBlock title={title} subtitle={tagline} compact={compact} />}
    </div>
  );
}
