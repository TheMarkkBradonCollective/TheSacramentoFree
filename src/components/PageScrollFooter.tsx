import LegalFooter from './LegalFooter';

interface PageScrollFooterProps {
  className?: string;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

/** Legal links strip — place as the last child inside a scrollable page. */
export default function PageScrollFooter({
  className = '',
  onOpenPrivacy,
  onOpenTerms,
}: PageScrollFooterProps) {
  return (
    <LegalFooter
      className={`mt-8 ${className}`.trim()}
      onOpenPrivacy={onOpenPrivacy}
      onOpenTerms={onOpenTerms}
    />
  );
}
