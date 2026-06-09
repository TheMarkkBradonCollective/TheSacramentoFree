import { ExternalLink, HeartHandshake } from 'lucide-react';
import { SUPPORT } from '../siteContent';

interface GoFundMeSupportProps {
  compact?: boolean;
}

export default function GoFundMeSupport({ compact = false }: GoFundMeSupportProps) {
  if (compact) {
    return (
      <div className="text-center space-y-2 py-2">
        <p className="text-[10px] text-muted leading-relaxed max-w-xs mx-auto">{SUPPORT.gofundmeBlurb}</p>
        <a
          href={SUPPORT.gofundmeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent hover:underline"
        >
          {SUPPORT.gofundmeButton}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-app bg-inset p-4 sm:p-5 text-center space-y-3">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-soft border border-accent/20 text-accent mx-auto">
        <HeartHandshake className="w-5 h-5" aria-hidden />
      </div>
      <div>
        <h3 className="font-display font-bold text-app text-sm">{SUPPORT.gofundmeTitle}</h3>
        <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-md mx-auto">{SUPPORT.gofundmeBlurb}</p>
      </div>
      <a
        href={SUPPORT.gofundmeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sbn-btn sbn-btn-primary sbn-btn-sm inline-flex items-center gap-1.5"
      >
        {SUPPORT.gofundmeButton}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
