import { NEWSPAPER, formatNewspaperDate } from '../../../preview/newspaperBrand';

export default function NewspaperMasthead() {
  return (
    <header className="tsf-masthead" aria-label={`${NEWSPAPER.name} masthead`}>
      <div className="tsf-masthead-meta">
        <span>{NEWSPAPER.city}</span>
        <span>{NEWSPAPER.volume}</span>
        <span>{NEWSPAPER.price}</span>
      </div>
      <div className="tsf-masthead-rules" aria-hidden>
        <span />
        <span />
      </div>
      <p className="tsf-masthead-the">{NEWSPAPER.the}</p>
      <h1 className="tsf-masthead-name">{NEWSPAPER.title}</h1>
      <div className="tsf-masthead-rules" aria-hidden>
        <span />
        <span />
      </div>
      <div className="tsf-masthead-meta tsf-masthead-meta-bottom">
        <span>{formatNewspaperDate()}</span>
        <span className="tsf-masthead-tagline">{NEWSPAPER.tagline}</span>
        <span>{NEWSPAPER.established}</span>
      </div>
    </header>
  );
}
