import { APP_UPDATES } from '../../../siteContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';

function formatUpdateDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UpdatesPage() {
  return (
    <PublicPageShell
      title="Updates"
      subtitle="What’s new in Sacramento Buy Nothing — short notes on features and fixes."
    >
      <ul className="space-y-3">
        {APP_UPDATES.map((update) => (
          <li key={`${update.date}-${update.title}`}>
            <PublicCard>
              <time dateTime={update.date} className="text-xs font-bold text-accent uppercase tracking-wider">
                {formatUpdateDate(update.date)}
              </time>
              <h2 className="mt-1 text-base font-black text-app">{update.title}</h2>
              <p className="mt-2 text-sm text-muted font-semibold leading-relaxed">{update.body}</p>
            </PublicCard>
          </li>
        ))}
      </ul>
    </PublicPageShell>
  );
}
