import { SITE } from '../siteContent';
import { NEWSPAPER, withNewspaperName } from './newspaperBrand';
import { useNewspaperSkin } from './NewspaperSkinContext';

export function useBrand() {
  const { enabled: newspaper } = useNewspaperSkin();
  if (!newspaper) {
    return {
      newspaper: false,
      name: SITE.name,
      shortName: SITE.shortName,
      tagline: SITE.tagline,
      copy: (text: string) => text,
    };
  }
  return {
    newspaper: true,
    name: NEWSPAPER.name,
    shortName: NEWSPAPER.title,
    tagline: NEWSPAPER.tagline,
    copy: withNewspaperName,
  };
}
