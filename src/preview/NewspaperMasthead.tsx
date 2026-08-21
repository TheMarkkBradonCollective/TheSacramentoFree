import { SITE_LOGO_SRC } from '../siteContent';
import { formatNewspaperDate, NEWSPAPER } from './newspaperBrand';
import { useNewspaperSkin } from './NewspaperSkinContext';

interface NewspaperMastheadProps {
  /** `front` is the full front-page crest; `banner` is the nameplate over every page. */
  variant?: 'front' | 'banner' | 'compact';
  className?: string;
  onHomeClick?: () => void;
}

function MastheadLockup({
  variant,
  onHomeClick,
}: {
  variant: NewspaperMastheadProps['variant'];
  onHomeClick?: () => void;
}) {
  const img = (
    <img
      src={SITE_LOGO_SRC}
      alt={NEWSPAPER.name}
      className={`tsf-masthead__lockup tsf-masthead__lockup--${variant ?? 'front'}`}
    />
  );

  if (onHomeClick) {
    return (
      <button
        type="button"
        className="tsf-masthead__wordmark"
        onClick={onHomeClick}
        aria-label={`${NEWSPAPER.name} home`}
      >
        {img}
      </button>
    );
  }

  return <div className="tsf-masthead__wordmark">{img}</div>;
}

/**
 * The nameplate for The Sacramento Free. Uses the uploaded lockup artwork so
 * the masthead title and slogan match the header logo exactly.
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
        <MastheadLockup variant={variant} onHomeClick={onHomeClick} />
      </div>

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
