import { Bell, Download, MessageSquare, PackageCheck } from 'lucide-react';
import { PostType } from '../types';
import { getPostTypeLabel } from '../lib/postType';
import { isNativeApp } from '../lib/nativePlatform';
import { downloadPagePath } from '../public/routes';

interface ListingPostedReminderModalProps {
  listingTitle: string;
  listingType: PostType;
  onDismiss: () => void;
  onOpenNotifications?: () => void;
}

export default function ListingPostedReminderModal({
  listingTitle,
  listingType,
  onDismiss,
  onOpenNotifications,
}: ListingPostedReminderModalProps) {
  const typeLabel = getPostTypeLabel(listingType).toLowerCase();
  const inApp = isNativeApp();

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div
        className="sbn-card-elevated w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing_posted_reminder_title"
      >
        <div className="p-5 border-b border-app bg-accent-soft/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h4 id="listing_posted_reminder_title" className="font-display font-bold text-app leading-snug">
                Posted — &ldquo;{listingTitle}&rdquo;
              </h4>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Your {typeLabel} is live. Neighbors may send <strong className="text-app">requests</strong> or
                messages — not just comments — so check back often.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <ul className="space-y-3 text-sm text-muted leading-relaxed">
            <li className="flex gap-2.5">
              <MessageSquare className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden />
              <span>
                Watch <strong className="text-app">Messages</strong> and comments on your listing — respond when
                someone reaches out so nothing sits unanswered.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Bell className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden />
              <span>
                Turn on <strong className="text-app">notifications</strong> so you hear about requests, comments,
                and DMs right away.
              </span>
            </li>
            {!inApp ? (
              <li className="flex gap-2.5">
                <Download className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden />
                <span>
                  For the best experience, install the app and keep alerts on — neighbors get responses faster
                  that way.
                </span>
              </li>
            ) : null}
          </ul>

          <div className="flex flex-col gap-2 pt-1">
            {onOpenNotifications ? (
              <button
                type="button"
                onClick={() => {
                  onOpenNotifications();
                  onDismiss();
                }}
                className="sbn-btn sbn-btn-primary w-full justify-center"
              >
                Turn on notifications
              </button>
            ) : null}
            {!inApp ? (
              <a href={downloadPagePath()} className="sbn-btn sbn-btn-secondary w-full justify-center">
                Get the app
              </a>
            ) : null}
            <button type="button" onClick={onDismiss} className="sbn-btn sbn-btn-ghost w-full justify-center">
              Got it — I&apos;ll check back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
