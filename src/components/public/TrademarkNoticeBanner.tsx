import { TRADEMARK_HOME_NOTICE } from '../../../shared/rebrandAnnouncement2026';

/** Professional trademark notice on the public home page — no rug pull. */
export default function TrademarkNoticeBanner() {
  return (
    <aside
      className="tsf-legal-notice mx-4 mb-4 max-w-3xl lg:max-w-none lg:mx-auto sbn-card border-l-4 border-l-accent px-4 py-4 sm:px-5"
      aria-labelledby="trademark_notice_title"
    >
      <p id="trademark_notice_title" className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        {TRADEMARK_HOME_NOTICE.title}
      </p>
      <p className="mt-2 text-sm text-muted leading-relaxed whitespace-pre-line">{TRADEMARK_HOME_NOTICE.body}</p>
    </aside>
  );
}
