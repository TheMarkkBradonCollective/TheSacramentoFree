import { Heart, Shield } from 'lucide-react';
import { DIRECTOR_MESSAGE } from '../siteContent';

interface DirectorMessageProps {
  /** Tighter spacing when embedded in a scrollable feed */
  compact?: boolean;
}

export default function DirectorMessage({ compact = false }: DirectorMessageProps) {
  return (
    <section
      className={`sbn-card border-l-4 border-l-amber-500/70 overflow-hidden ${
        compact ? 'p-4' : 'p-5 md:p-6'
      }`}
      aria-labelledby="director_message_heading"
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 font-display font-bold text-sm"
          aria-hidden
        >
          MW
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/90">
            {DIRECTOR_MESSAGE.headline}
          </p>
          <h2
            id="director_message_heading"
            className="font-display font-bold text-app text-lg leading-snug mt-0.5"
          >
            {DIRECTOR_MESSAGE.name}
          </h2>
          <p className="text-xs text-muted font-medium">{DIRECTOR_MESSAGE.title}</p>
        </div>
        <Shield className="w-5 h-5 text-amber-500/60 shrink-0 mt-1" aria-hidden />
      </div>

      <p className="mt-4 text-sm text-app leading-relaxed">{DIRECTOR_MESSAGE.goal}</p>

      <ul className="mt-4 space-y-2">
        {DIRECTOR_MESSAGE.promises.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-muted leading-relaxed">
            <Heart className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm font-semibold text-accent">{DIRECTOR_MESSAGE.closing}</p>
    </section>
  );
}
