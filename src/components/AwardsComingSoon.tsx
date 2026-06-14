import { Award, Gift, Sparkles } from 'lucide-react';
import { AWARDS } from '../siteContent';

export default function AwardsComingSoon() {
  return (
    <div className="space-y-6 text-center max-w-md mx-auto py-6" id="awards_coming_soon">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-soft border border-accent/30 sbn-awards-glow-btn">
        <Award className="w-8 h-8 text-accent" />
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-2xl font-bold text-app">{AWARDS.comingSoonTitle}</h3>
        <p className="text-sm text-muted leading-relaxed">{AWARDS.comingSoonBody}</p>
      </div>

      <div className="sbn-card p-4 text-left space-y-3">
        <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          What to expect
        </p>
        <ul className="space-y-2 text-sm text-muted">
          {AWARDS.comingSoonBullets.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Gift className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-subtle leading-relaxed">{AWARDS.comingSoonNote}</p>
    </div>
  );
}
