import { useNewspaperSkin } from './NewspaperSkinContext';

interface NewspaperSectionHeadProps {
  /** The section name, set in the style of a newspaper section front. */
  label: string;
  /** One-line description printed beside the label. */
  blurb?: string;
  /** Right-hand marker — page reference, count, or edition note. */
  index?: string;
}

/**
 * A section front: FREE, WANTED, COMMUNITY. Decorative only; it appears
 * alongside the existing headings rather than replacing them.
 */
export default function NewspaperSectionHead({ label, blurb, index }: NewspaperSectionHeadProps) {
  const { enabled } = useNewspaperSkin();
  if (!enabled) return null;

  return (
    <div className="tsf-section-head" aria-hidden="true">
      <span className="tsf-section-head__label">{label}</span>
      {blurb ? <span className="tsf-section-head__blurb">{blurb}</span> : null}
      {index ? <span className="tsf-section-head__index">{index}</span> : null}
    </div>
  );
}
