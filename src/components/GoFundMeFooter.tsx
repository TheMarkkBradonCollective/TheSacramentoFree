import { ChevronRight } from 'lucide-react';
import { SITE, SUPPORT } from '../siteContent';

interface GoFundMeFooterProps {
  className?: string;
  onOpenDetails?: () => void;
}

/** Compact support strip — tap to open the full GoFundMe page. */
export default function GoFundMeFooter({ className = '', onOpenDetails }: GoFundMeFooterProps) {
  const openDetails = () => {
    if (onOpenDetails) {
      onOpenDetails();
      return;
    }
    window.location.hash = '#/gofundme';
  };

  return (
    <footer className={className}>
      <button
        type="button"
        onClick={openDetails}
        className="w-full border-t border-app bg-inset px-4 py-4 text-center space-y-2.5 hover:bg-inset/80 transition-colors"
      >
        <p className="text-[10px] text-muted leading-relaxed max-w-sm mx-auto">{SUPPORT.gofundmeBlurb}</p>
        <p className="text-[10px] text-subtle leading-relaxed max-w-sm mx-auto">{SUPPORT.gofundmeCostsSummary}</p>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent">
          Tap for full details
          <ChevronRight className="w-3 h-3" aria-hidden />
        </span>
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider pt-1">{SITE.name}</p>
        <p className="text-[10px] text-subtle">{SITE.tagline}</p>
      </button>
    </footer>
  );
}
