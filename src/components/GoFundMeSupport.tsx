import { ExternalLink, HeartHandshake } from 'lucide-react';
import { SUPPORT } from '../siteContent';

export default function GoFundMeSupport({ showTitle = true }: { showTitle?: boolean }) {
  return (
    <div className="rounded-2xl border border-app bg-inset p-4 sm:p-6 text-center space-y-5">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-soft border border-accent/20 text-accent mx-auto">
        <HeartHandshake className="w-5 h-5" aria-hidden />
      </div>
      <div className="space-y-2 max-w-xl mx-auto">
        {showTitle && (
          <h3 className="font-display font-bold text-app text-base">{SUPPORT.gofundmeTitle}</h3>
        )}
        <p className="text-sm text-muted leading-relaxed">{SUPPORT.gofundmeBlurb}</p>
        <p className="text-sm text-muted leading-relaxed">{SUPPORT.gofundmeDetail}</p>
      </div>

      <ul className="space-y-3 text-left max-w-xl mx-auto">
        {SUPPORT.costItems.map(({ name, title, description }) => (
          <li key={name} className="rounded-xl border border-app bg-surface px-4 py-3.5 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-xs font-black uppercase tracking-wide text-accent">{name}</span>
              <span className="text-xs font-semibold text-app">{title}</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">{description}</p>
          </li>
        ))}
      </ul>

      <p className="text-sm font-semibold text-app max-w-md mx-auto leading-relaxed">{SUPPORT.gofundmeClosing}</p>

      <a
        href={SUPPORT.gofundmeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sbn-btn sbn-btn-primary inline-flex items-center gap-1.5"
      >
        {SUPPORT.gofundmeButton}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
