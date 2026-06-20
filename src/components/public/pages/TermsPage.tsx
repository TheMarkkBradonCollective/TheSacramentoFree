import TermsOfUseContent from '../../TermsOfUseContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { TERMS } from '../../../siteContent';

export default function TermsPage() {
  return (
    <PublicPageShell
      title={TERMS.title}
      subtitle="Rules for using Sacramento Buy Nothing — free local gifting by Markeith White."
    >
      <PublicCard>
        <TermsOfUseContent />
      </PublicCard>
    </PublicPageShell>
  );
}
