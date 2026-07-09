import PrivacyPolicyContent from '../../PrivacyPolicyContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { PRIVACY } from '../../../siteContent';

export default function PrivacyPage() {
  return (
    <PublicPageShell
      title={PRIVACY.title}
      subtitle={`How your information is handled — last updated ${PRIVACY.lastUpdated}.`}
    >
      <PublicCard>
        <PrivacyPolicyContent showHeader={false} />
      </PublicCard>
    </PublicPageShell>
  );
}
