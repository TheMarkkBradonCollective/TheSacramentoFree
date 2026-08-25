import { SITE } from '../siteContent';
import { NEWSPAPER, withNewspaperName } from './newspaperBrand';
import { useNewspaperSkin } from './NewspaperSkinContext';

export function useBrand() {
  const { enabled: newspaper } = useNewspaperSkin();
  return {
    newspaper,
    name: NEWSPAPER.name,
    shortName: NEWSPAPER.title,
    tagline: NEWSPAPER.tagline,
    copy: withNewspaperName,
  };
}
