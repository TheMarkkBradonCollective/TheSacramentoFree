import GoFundMeSupport from '../../GoFundMeSupport';
import PublicPageShell from '../PublicPageShell';
import { SUPPORT } from '../../../siteContent';

export default function GoFundMePage() {
  return (
    <PublicPageShell title={SUPPORT.gofundmeTitle} subtitle={SUPPORT.gofundmeBlurb}>
      <GoFundMeSupport showTitle={false} />
    </PublicPageShell>
  );
}
