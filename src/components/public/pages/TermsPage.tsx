import TermsOfUseContent from '../../TermsOfUseContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { TERMS } from '../../../siteContent';
import { useBrand } from '../../../preview/useBrand';

export default function TermsPage() {
  const { copy } = useBrand();
  return (
    <PublicPageShell
      title={TERMS.title}
      subtitle={copy(`Rules for using Sacramento Buy Nothing — last updated ${TERMS.lastUpdated}.`)}
    >
      <PublicCard>
        <TermsOfUseContent showHeader={false} />
      </PublicCard>
    </PublicPageShell>
  );
}
