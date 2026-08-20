import { FileText, Shield } from 'lucide-react';
import { PRIVACY, TERMS } from '../siteContent';
import { publicRouteHref } from '../public/routes';
import { useBrand } from '../preview/useBrand';
import { NEWSPAPER } from '../preview/newspaperBrand';

interface LegalFooterProps {
  className?: string;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export default function LegalFooter({ className = '', onOpenPrivacy, onOpenTerms }: LegalFooterProps) {
  const { newspaper, name: brandName, tagline } = useBrand();
  const openPrivacy = () => {
    if (onOpenPrivacy) {
      onOpenPrivacy();
      return;
    }
    window.location.hash = publicRouteHref('privacy');
  };

  const openTerms = () => {
    if (onOpenTerms) {
      onOpenTerms();
      return;
    }
    window.location.hash = publicRouteHref('terms');
  };

  return (
    <footer className={`w-full shrink-0 ${className}`.trim()}>
      <div className="w-full border-t border-app bg-inset px-4 py-5 text-center space-y-3">
        <p className="text-[10px] text-muted leading-relaxed max-w-md mx-auto">
          {brandName} is run by Markeith White. Your data is stored by Supabase. By using this app you agree to
          our terms and privacy policy.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={openPrivacy}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline"
          >
            <Shield className="w-3.5 h-3.5" />
            {PRIVACY.shortTitle}
          </button>
          <span className="text-subtle text-[10px]" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={openTerms}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline"
          >
            <FileText className="w-3.5 h-3.5" />
            {TERMS.shortTitle}
          </button>
        </div>

        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{brandName}</p>
        <p className="text-[10px] text-subtle">{newspaper ? NEWSPAPER.footerByline : tagline}</p>
      </div>
    </footer>
  );
}
