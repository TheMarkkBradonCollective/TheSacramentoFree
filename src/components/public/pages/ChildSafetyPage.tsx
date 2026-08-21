import ChildSafetyContent from '../../ChildSafetyContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { CHILD_SAFETY } from '../../../siteContent';

export default function ChildSafetyPage() {
  return (
    <PublicPageShell
      title={CHILD_SAFETY.title}
      subtitle={`Standards against child sexual abuse and exploitation (CSAE) — last updated ${CHILD_SAFETY.lastUpdated}.`}
    >
      <PublicCard>
        <ChildSafetyContent showHeader={false} />
      </PublicCard>
    </PublicPageShell>
  );
}
