import { SITE, RULES, WHY_IT_MATTERS } from '../siteContent';
import { Heart } from 'lucide-react';
import LegalFooter from './LegalFooter';

/** @deprecated Prefer LegalFooter directly. Kept for any legacy full footer usage. */
export default function CommunityFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <LegalFooter />;
  }

  return (
    <footer className="border-t border-app bg-surface rounded-2xl p-5 mt-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-accent-soft border border-accent/20 shrink-0">
          <Heart className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-black text-app">{SITE.name}</h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">{SITE.description}</p>
          <ul className="mt-2 space-y-0.5">
            {SITE.principles.map((line) => (
              <li key={line} className="text-[11px] font-semibold text-muted">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-inset border border-app">
          <p className="font-black text-emerald-400 uppercase tracking-wider text-[10px] mb-2">Allowed</p>
          <ul className="space-y-1 text-muted font-semibold">
            {RULES.allowed.map((item) => (
              <li key={item}>✅ {item}</li>
            ))}
          </ul>
        </div>
        <div className="p-3 rounded-xl bg-inset border border-app">
          <p className="font-black text-red-400 uppercase tracking-wider text-[10px] mb-2">Not Allowed</p>
          <ul className="space-y-1 text-muted font-semibold">
            {RULES.notAllowed.map((item) => (
              <li key={item}>❌ {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <LegalFooter className="rounded-xl border border-app" />

      <p className="text-xs text-muted font-semibold text-center border-t border-app pt-3">
        {WHY_IT_MATTERS.closing} · {SITE.tagline}
      </p>
    </footer>
  );
}
