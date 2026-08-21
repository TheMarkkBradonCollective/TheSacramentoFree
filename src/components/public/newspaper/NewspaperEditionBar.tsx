import { formatNewspaperDate, NEWSPAPER } from '../../../preview/newspaperBrand';
import { useNewspaperSkin } from '../../../preview/NewspaperSkinContext';

/** Decorative dateline strip — preview skin only; does not change app structure. */
export default function NewspaperEditionBar() {
  const { enabled } = useNewspaperSkin();
  if (!enabled) return null;

  return (
    <div className="tsf-edition-bar" aria-hidden="true">
      <div className="tsf-edition-bar__rule tsf-edition-bar__rule--thin" />
      <div className="tsf-edition-bar__inner">
        <span className="tsf-edition-bar__date">{formatNewspaperDate()}</span>
        <span className="tsf-edition-bar__city">{NEWSPAPER.city}</span>
        <span className="tsf-edition-bar__meta">
          Vol. I · No. 1 · {NEWSPAPER.price}
        </span>
      </div>
      <div className="tsf-edition-bar__rule tsf-edition-bar__rule--thick" />
    </div>
  );
}
