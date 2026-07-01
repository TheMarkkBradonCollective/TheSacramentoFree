import { useState } from 'react';
import { Gift } from 'lucide-react';
import { APP_LOGO_SRC, IN_APP } from '../siteContent';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  showTitle?: boolean;
  subtitle?: string;
}

export default function BrandLogo({
  className = 'flex items-center gap-2.5 min-w-0',
  imgClassName = 'h-9 w-auto max-w-[140px] object-contain rounded-lg shrink-0',
  showTitle = false,
  subtitle,
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={className}>
        <div className="w-9 h-9 bg-accent text-on-accent rounded-lg flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        {showTitle && (
          <div className="text-left min-w-0">
            <p className="font-display font-bold text-sm text-app leading-tight">
              Sacramento <span className="text-accent">Buy Nothing</span>
            </p>
            <p className="text-[11px] text-muted truncate">{subtitle ?? IN_APP.brandSubtitle}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={APP_LOGO_SRC}
        alt="Sacramento Buy Nothing"
        className={imgClassName}
        onError={() => setFailed(true)}
      />
      {showTitle && (
        <div className="text-left min-w-0 hidden sm:block">
          <p className="font-display font-bold text-sm text-app leading-tight">
            Sacramento <span className="text-accent">Buy Nothing</span>
          </p>
          <p className="text-[11px] text-muted truncate">{subtitle ?? IN_APP.brandSubtitle}</p>
        </div>
      )}
    </div>
  );
}
