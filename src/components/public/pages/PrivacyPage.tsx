import PrivacyPolicyContent from '../../PrivacyPolicyContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { PRIVACY } from '../../../siteContent';

export default function PrivacyPage() {
  return (
    <PublicPageShell
      title={PRIVACY.title}
      subtitle="How your information is handled — and where your data actually lives."
    >
      <PublicCard>
        <PrivacyPolicyContent />
      </PublicCard>
    </PublicPageShell>
  );
}
