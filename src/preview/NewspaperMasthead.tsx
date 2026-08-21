import { formatNewspaperDate, NEWSPAPER } from './newspaperBrand';
import { useNewspaperSkin } from './NewspaperSkinContext';

interface NewspaperMastheadProps {
  /** `front` is the full front-page crest; `compact` fits narrow chrome. */
  variant?: 'front' | 'compact';
  className?: string;
}

/** Two rivers meeting — Sacramento and American — as an original flourish. */
function RiverMark() {
  return (
    <svg className="tsf-masthead__rivers" viewBox="0 0 220 18" aria-hidden="true" focusable="false">
      <path
        d="M2 11 C 28 3, 52 15, 78 9 S 130 4, 160 11 200 6, 218 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <path
        d="M2 14 C 36 18, 70 8, 104 14 S 168 18, 218 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * The front-page crest for The Sacramento Free: information strip, stacked
 * wordmark, river flourish, dateline, and the rules that frame them.
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
        <RiverMark />
        <h1 className="tsf-masthead__wordmark">
          <span className="tsf-masthead__the">{NEWSPAPER.the}</span>
          <span className="tsf-masthead__name">{NEWSPAPER.title.split(' ')[0]}</span>
          <span className="tsf-masthead__free">{NEWSPAPER.title.split(' ')[1]}</span>
        </h1>
        <RiverMark />
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
