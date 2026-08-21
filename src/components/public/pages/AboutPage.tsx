import { ABOUT, COMMON_ITEMS, SITE } from '../../../siteContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { useBrand } from '../../../preview/useBrand';
import { NEWSPAPER } from '../../../preview/newspaperBrand';

export default function AboutPage() {
  const { newspaper, copy } = useBrand();
  const title = newspaper ? `What is ${NEWSPAPER.name}?` : `🌎 ${ABOUT.title}`;
  const subtitle = copy(ABOUT.body);
  return (
    <PublicPageShell title={title} subtitle={subtitle}>
      <PublicCard>
        <p className="text-xs font-bold text-muted uppercase tracking-wider">Members can</p>
        <ul className={`mt-3 space-y-2 text-sm text-muted font-semibold ${newspaper ? 'tsf-columns-2' : ''}`}>
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
