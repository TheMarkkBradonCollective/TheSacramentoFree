import { ABOUT, COMMON_ITEMS, SITE } from '../../../siteContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';

export default function AboutPage() {
  return (
    <PublicPageShell title={`🌎 ${ABOUT.title}`} subtitle={ABOUT.body}>
      <PublicCard>
        <p className="text-xs font-bold text-muted uppercase tracking-wider">Members can</p>
        <ul className="mt-3 space-y-2 text-sm text-muted font-semibold">
          {ABOUT.memberCan.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-accent">•</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm font-black text-accent">{SITE.freeRule}</p>
      </PublicCard>

      <PublicCard>
        <h2 className="text-lg font-black text-app">Common items shared</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {COMMON_ITEMS.map((item) => (
            <span
              key={item}
              className="px-3 py-1.5 rounded-full bg-inset border border-app text-xs font-bold text-muted"
            >
              {item}
            </span>
          ))}
        </div>
      </PublicCard>
    </PublicPageShell>
  );
}
