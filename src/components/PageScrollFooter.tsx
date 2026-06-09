import GoFundMeFooter from './GoFundMeFooter';

interface PageScrollFooterProps {
  className?: string;
  onOpenDetails?: () => void;
}

/** GoFundMe strip — place as the last child inside a scrollable page. */
export default function PageScrollFooter({ className = '', onOpenDetails }: PageScrollFooterProps) {
  return <GoFundMeFooter className={`mt-8 ${className}`.trim()} onOpenDetails={onOpenDetails} />;
}
