import { CheckCircle2, XCircle } from 'lucide-react';
import { RULES } from '../../../siteContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { useNewspaperSkin } from '../../../preview/NewspaperSkinContext';

export default function RulesPage() {
  const { enabled: newspaper } = useNewspaperSkin();
  return (
    <PublicPageShell
      title={newspaper ? 'House rules' : 'Community rules'}
      subtitle={
        newspaper
          ? 'Keep the gazette safe, generous, and free for everyone in Sacramento.'
          : 'Keep the circle safe, generous, and free for everyone in Sacramento.'
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PublicCard>
          <h2 className="text-base font-black flex items-center gap-2 text-app">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Allowed
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted font-semibold">
            {RULES.allowed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PublicCard>
        <PublicCard>
          <h2 className="text-base font-black flex items-center gap-2 text-app">
            <XCircle className="w-4 h-4 text-red-500" />
            Not allowed
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted font-semibold">
            {RULES.notAllowed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PublicCard>
      </div>
      <PublicCard>
        <p className="text-sm text-muted font-semibold leading-relaxed">{RULES.postReminder}</p>
      </PublicCard>
    </PublicPageShell>
  );
}
