import { ExternalLink } from 'lucide-react';
import { SITE, SUPPORT } from '../siteContent';

interface GoFundMeFooterProps {
  className?: string;
}

/** Compact support strip — same on every page footer. */
export default function GoFundMeFooter({ className = '' }: GoFundMeFooterProps) {
  return (
    <footer className={`border-t border-app bg-inset px-4 py-4 text-center space-y-2.5 ${className}`}>
      <p className="text-[10px] text-muted leading-relaxed max-w-sm mx-auto">{SUPPORT.gofundmeBlurb}</p>
      <p className="text-[10px] text-subtle leading-relaxed max-w-sm mx-auto">{SUPPORT.gofundmeCostsSummary}</p>
      <a
        href={SUPPORT.gofundmeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent hover:underline"
      >
        {SUPPORT.gofundmeButton}
        <ExternalLink className="w-3 h-3" aria-hidden />
      </a>
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider pt-1">{SITE.name}</p>
      <p className="text-[10px] text-subtle">{SITE.tagline}</p>
    </footer>
  );
}
