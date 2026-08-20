import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import LegalFooter from './LegalFooter';

interface PageScrollFooterProps {
  className?: string;
  /** Push the footer to the bottom when the parent is a min-h-full flex column. */
  pinToBottom?: boolean;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

/** Legal links strip — last child of a `.sbn-scroll-page-body` (or any min-h-full flex column). */
export default function PageScrollFooter({
  className = '',
  pinToBottom = false,
  onOpenPrivacy,
  onOpenTerms,
}: PageScrollFooterProps) {
  return (
    <LegalFooter
      className={`sbn-page-end-footer ${pinToBottom ? 'sbn-page-end-footer--below-fold' : ''} pt-8 ${className}`.trim()}
      onOpenPrivacy={onOpenPrivacy}
      onOpenTerms={onOpenTerms}
    />
  );
}

type ScrollPageProps = {
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  /** Extra scroll height on short pages so the legal footer sits below the fold. */
  pinToBottom?: boolean;
} & HTMLAttributes<HTMLDivElement>;

/**
 * Scrollport with a document-flow footer. Top/bottom app chrome stays fixed;
 * this column is at least as tall as the viewport so the legal footer sits at
 * the visual bottom on short pages and after the last section on long pages.
 */
export const ScrollPage = forwardRef<HTMLDivElement, ScrollPageProps>(function ScrollPage(
  { children, footer, pinToBottom = false, className = '', contentClassName = '', ...rest },
  ref,
) {
  return (
    <div ref={ref} className={`sbn-scroll-page ${className}`.trim()} {...rest}>
      <div
        className={`sbn-scroll-page-body ${pinToBottom ? 'sbn-scroll-page-body--below-fold' : ''}`.trim()}
      >
        <div className={`sbn-scroll-page-content ${contentClassName}`.trim()}>{children}</div>
        {footer}
      </div>
    </div>
  );
});
