import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { TRADEMARK_HOME_NOTICE } from '../../../shared/rebrandAnnouncement2026';
import { isPlayStoreDemo } from '../../preview/playStoreDemo';
import { dismissTrademarkNotice, hasDismissedTrademarkNotice } from '../../lib/trademarkNoticeState';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';

/** Upcoming link change — modal on public home page load (TheSacramentoFree edition). */
export default function TrademarkNoticeBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isPlayStoreDemo()) return;
    if (hasDismissedTrademarkNotice()) return;
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    dismissTrademarkNotice();
    setOpen(false);
  }, []);

  useDismissOnEscape(close, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="sbn-card-elevated w-full max-w-lg max-h-[min(90vh,36rem)] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trademark_notice_title"
      >
        <div className="p-5 border-b border-app bg-accent-soft/20 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-accent" aria-hidden />
            </div>
            <div className="min-w-0">
              <p
                id="trademark_notice_title"
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted"
              >
                {TRADEMARK_HOME_NOTICE.title}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 overflow-y-auto">
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{TRADEMARK_HOME_NOTICE.body}</p>
        </div>

        <div className="p-5 pt-0 shrink-0">
          <button type="button" onClick={close} className="sbn-btn sbn-btn-primary w-full">
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
