import { formatNewspaperDate, NEWSPAPER } from './newspaperBrand';
import { useNewspaperSkin } from './NewspaperSkinContext';

interface NewspaperMastheadProps {
  /** `front` is the full front-page crest; `banner` is the nameplate over every page. */
  variant?: 'front' | 'banner' | 'compact';
  className?: string;
  onHomeClick?: () => void;
}

/** Two rivers meeting — Sacramento and American — as an original flourish. */
function RiverMark() {
  return (
    <svg className="tsf-masthead__rivers" viewBox="0 0 280 28" aria-hidden="true" focusable="false">
      <path
        d="M4 12 C 36 4, 68 20, 102 11 S 170 5, 210 14 256 8, 276 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
      />
      <path
        d="M4 18 C 48 24, 90 10, 132 18 S 210 24, 276 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.95"
        opacity="0.75"
      />
      <circle cx="140" cy="14.5" r="1.7" fill="currentColor" />
    </svg>
  );
}

/**
 * The nameplate for The Sacramento Free. The publication title is not a page
 * headline — the lead story carries the h1.
 */
export default function NewspaperMasthead({
  variant = 'front',
  className = '',
  onHomeClick,
}: NewspaperMastheadProps) {
  const { enabled } = useNewspaperSkin();
  if (!enabled) return null;

  return (
    <header className={`tsf-masthead tsf-masthead--${variant} ${className}`.trim()}>
      {variant === 'front' && (
        <>
          <div className="tsf-masthead__strip">
            <span className="tsf-masthead__strip-item">{NEWSPAPER.edition}</span>
            <span className="tsf-masthead__strip-item tsf-masthead__strip-item--center">{NEWSPAPER.motto}</span>
            <span className="tsf-masthead__strip-item tsf-masthead__strip-item--end">{NEWSPAPER.volume}</span>
          </div>
          <div className="tsf-masthead__rule tsf-masthead__rule--hair" />
        </>
      )}

      <div className="tsf-masthead__crest">
        <RiverMark />
        {onHomeClick ? (
          <button
            type="button"
            className="tsf-masthead__wordmark"
            onClick={onHomeClick}
            aria-label={`${NEWSPAPER.name} home`}
          >
            <span className="tsf-masthead__the">{NEWSPAPER.the}</span>
            <span className="tsf-masthead__name">{NEWSPAPER.title.split(' ')[0]}</span>
            <span className="tsf-masthead__free">{NEWSPAPER.title.split(' ')[1]}</span>
          </button>
        ) : (
          <p className="tsf-masthead__wordmark">
            <span className="tsf-masthead__the">{NEWSPAPER.the}</span>
            <span className="tsf-masthead__name">{NEWSPAPER.title.split(' ')[0]}</span>
            <span className="tsf-masthead__free">{NEWSPAPER.title.split(' ')[1]}</span>
          </p>
        )}
        <RiverMark />
      </div>

      <p className="tsf-masthead__tagline">{NEWSPAPER.tagline}</p>

      {variant === 'front' && (
        <>
          <div className="tsf-masthead__rule tsf-masthead__rule--double" />
          <div className="tsf-masthead__dateline">
            <span>{NEWSPAPER.cityLine}</span>
            <span className="tsf-masthead__dateline-date">{formatNewspaperDate()}</span>
            <span className="tsf-masthead__dateline-price">{NEWSPAPER.price}</span>
          </div>
          <div className="tsf-masthead__rule tsf-masthead__rule--hair" />
        </>
      )}
    </header>
  );
}
