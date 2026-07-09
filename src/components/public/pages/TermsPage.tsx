import TermsOfUseContent from '../../TermsOfUseContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { TERMS } from '../../../siteContent';

export default function TermsPage() {
  return (
    <PublicPageShell
      title={TERMS.title}
      subtitle={`Rules for using Sacramento Buy Nothing — last updated ${TERMS.lastUpdated}.`}
    >
      <PublicCard>
        <TermsOfUseContent showHeader={false} />
      </PublicCard>
    </PublicPageShell>
  );
}
