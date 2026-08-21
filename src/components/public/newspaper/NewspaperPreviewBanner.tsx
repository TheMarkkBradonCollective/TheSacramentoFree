import { NEWSPAPER } from '../../../preview/newspaperBrand';
import { shouldShowNewspaperPreviewBanner, useNewspaperSkin } from '../../../preview/NewspaperSkinContext';

export default function NewspaperPreviewBanner() {
  const { enabled, setEnabled } = useNewspaperSkin();
  if (!shouldShowNewspaperPreviewBanner(enabled)) return null;

  return (
    <div className="tsf-preview-banner" role="status">
      <p>
        <strong>{NEWSPAPER.previewLabel}.</strong> {NEWSPAPER.previewNote}
      </p>
      <button type="button" onClick={() => setEnabled(!enabled)}>
        {enabled ? NEWSPAPER.originalCta : NEWSPAPER.newspaperCta}
      </button>
    </div>
  );
}
