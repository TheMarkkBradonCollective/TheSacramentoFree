import { formatNewspaperDate, NEWSPAPER } from './newspaperBrand';
import { useNewspaperSkin } from './NewspaperSkinContext';

interface NewspaperMastheadProps {
  /** `front` is the full front-page crest; `compact` fits narrow chrome. */
  variant?: 'front' | 'compact';
  className?: string;
}

/**
 * The front-page crest for The Sacramento Free: information strip, engraved
 * wordmark, dateline, and the rules that frame them.
 */
export default function NewspaperMasthead({ variant = 'front', className = '' }: NewspaperMastheadProps) {
  const { enabled } = useNewspaperSkin();
  if (!enabled) return null;

  return (
    <header className={`tsf-masthead tsf-masthead--${variant} ${className}`.trim()}>
      <div className="tsf-masthead__strip">
        <span className="tsf-masthead__strip-item">{NEWSPAPER.edition}</span>
        <span className="tsf-masthead__strip-item tsf-masthead__strip-item--center">{NEWSPAPER.motto}</span>
        <span className="tsf-masthead__strip-item tsf-masthead__strip-item--end">{NEWSPAPER.volume}</span>
      </div>

      <div className="tsf-masthead__rule tsf-masthead__rule--hair" />

      <div className="tsf-masthead__crest">
        <span className="tsf-masthead__ornament" aria-hidden />
        <h1 className="tsf-masthead__wordmark">
          <span className="tsf-masthead__the">{NEWSPAPER.the}</span>
          <span className="tsf-masthead__name">{NEWSPAPER.title}</span>
        </h1>
        <span className="tsf-masthead__ornament" aria-hidden />
      </div>

      <p className="tsf-masthead__tagline">{NEWSPAPER.tagline}</p>

      <div className="tsf-masthead__rule tsf-masthead__rule--double" />

      <div className="tsf-masthead__dateline">
        <span>{NEWSPAPER.cityLine}</span>
        <span className="tsf-masthead__dateline-date">{formatNewspaperDate()}</span>
        <span className="tsf-masthead__dateline-price">{NEWSPAPER.price}</span>
      </div>

      <div className="tsf-masthead__rule tsf-masthead__rule--hair" />
    </header>
  );
}
