import GoFundMeSupport from '../../GoFundMeSupport';
import PublicPageShell from '../PublicPageShell';
import { SUPPORT } from '../../../siteContent';
import { useBrand } from '../../../preview/useBrand';

export default function GoFundMePage() {
  const { newspaper, copy } = useBrand();
  return (
    <PublicPageShell
      title={newspaper ? 'Keep the presses running' : SUPPORT.gofundmeTitle}
      subtitle={copy(SUPPORT.gofundmeBlurb)}
    >
      <GoFundMeSupport showTitle={false} />
    </PublicPageShell>
  );
}
