import LegalFooter from './LegalFooter';

interface PageScrollFooterProps {
  className?: string;
  /** Push the footer to the bottom when the parent is a min-h-full flex column. */
  pinToBottom?: boolean;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

/** Legal links strip — place as the last child inside a scrollable page. */
export default function PageScrollFooter({
  className = '',
  pinToBottom = false,
  onOpenPrivacy,
  onOpenTerms,
}: PageScrollFooterProps) {
  return (
    <LegalFooter
      className={`${pinToBottom ? 'mt-auto pt-8' : 'mt-8'} ${className}`.trim()}
      onOpenPrivacy={onOpenPrivacy}
      onOpenTerms={onOpenTerms}
    />
  );
}
