import { ExternalLink, HeartHandshake } from 'lucide-react';
import { SUPPORT } from '../siteContent';

interface GoFundMeSupportProps {
  compact?: boolean;
}

export default function GoFundMeSupport({ compact = false }: GoFundMeSupportProps) {
  if (compact) {
    return (
      <div className="text-center space-y-2 py-2">
        <p className="text-[10px] text-muted leading-relaxed max-w-sm mx-auto">{SUPPORT.gofundmeBlurb}</p>
        <p className="text-[10px] text-subtle leading-relaxed max-w-sm mx-auto">
          Built with Cursor, Supabase, Vercel &amp; GoDaddy — each adds to the cost of keeping it free for
          everyone.
        </p>
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
    <div className="rounded-2xl border border-app bg-inset p-4 sm:p-5 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-soft border border-accent/20 text-accent mx-auto">
        <HeartHandshake className="w-5 h-5" aria-hidden />
      </div>
      <div className="space-y-2">
        <h3 className="font-display font-bold text-app text-sm">{SUPPORT.gofundmeTitle}</h3>
        <p className="text-xs text-muted leading-relaxed max-w-lg mx-auto">{SUPPORT.gofundmeBlurb}</p>
        <p className="text-xs text-muted leading-relaxed max-w-lg mx-auto">{SUPPORT.gofundmeDetail}</p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-lg mx-auto">
        {SUPPORT.costItems.map(({ name, role }) => (
          <li
            key={name}
            className="flex items-start gap-2 rounded-xl border border-app bg-surface px-3 py-2.5"
          >
            <span className="text-[10px] font-black uppercase tracking-wide text-accent shrink-0 mt-0.5">
              {name}
            </span>
            <span className="text-[11px] text-muted leading-snug">{role}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs font-semibold text-app max-w-md mx-auto">{SUPPORT.gofundmeClosing}</p>

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
