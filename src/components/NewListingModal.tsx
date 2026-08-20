import { useState } from 'react';
import { CalendarDays, Package, X } from 'lucide-react';
import { CommunityEvent, ItemPost, UserProfile } from '../types';
import PostItemModal from './PostItemModal';
import PostEventModal from './PostEventModal';

type ListingKind = 'stuff' | 'event';

export type NewListingModalMode = 'both' | 'stuff' | 'event';

interface NewListingModalProps {
  userProfile: UserProfile;
  canAccessEvents: boolean;
  allEvents: CommunityEvent[];
  mode: NewListingModalMode;
  onClose: () => void;
  onStuffSuccess: (item: ItemPost) => void;
  onEventSuccess: () => void;
}

function resolveKind(mode: NewListingModalMode): ListingKind {
  return mode === 'event' ? 'event' : 'stuff';
}

export default function NewListingModal({
  userProfile,
  canAccessEvents,
  allEvents,
  mode,
  onClose,
  onStuffSuccess,
  onEventSuccess,
}: NewListingModalProps) {
  const [kind, setKind] = useState<ListingKind>(() => resolveKind(mode));
  const showKindToggle = mode === 'both' && canAccessEvents;
  const activeKind = showKindToggle ? kind : resolveKind(mode);
  const title = activeKind === 'event' ? 'New event' : 'New stuff';
  const TitleIcon = activeKind === 'event' ? CalendarDays : Package;

  return (
    <div id="new_listing_modal_overlay" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 py-8">
        <div
          className="relative flex w-full max-w-lg max-h-[92dvh] flex-col overflow-hidden sbn-card-elevated"
          id="new_listing_modal_box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new_listing_modal_title"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-app bg-accent-soft/50 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center rounded-xl bg-accent p-1.5 text-on-accent">
                <TitleIcon className="h-4 w-4" />
              </div>
              <h3 id="new_listing_modal_title" className="font-display text-base font-bold text-app">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="cursor-pointer rounded-xl p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-app"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {showKindToggle ? (
            <div className="shrink-0 border-b border-app px-6 pb-4 pt-4">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted">
                What are you posting?
              </span>
              <div className="grid grid-cols-2 gap-2" id="listing_kind_toggle">
                <button
                  type="button"
                  onClick={() => setKind('stuff')}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    kind === 'stuff'
                      ? 'border-accent bg-accent text-white shadow-xs'
                      : 'border-app bg-inset text-muted hover:bg-surface-hover'
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Stuff
                </button>
                <button
                  type="button"
                  onClick={() => setKind('event')}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    kind === 'event'
                      ? 'border-accent bg-accent text-white shadow-xs'
                      : 'border-app bg-inset text-muted hover:bg-surface-hover'
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Event
                </button>
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeKind === 'stuff' ? (
              <PostItemModal
                embedded
                userProfile={userProfile}
                onClose={onClose}
                onSuccess={onStuffSuccess}
              />
            ) : (
              <PostEventModal
                embedded
                userProfile={userProfile}
                allEvents={allEvents}
                onClose={onClose}
                onSuccess={onEventSuccess}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
