/**
 * Shared shimmer skeleton primitives. Use these instead of ad hoc
 * "Loading…" text or one-off pulse divs so every loading state in the app
 * shares the same shimmer motion and theme-aware coloring.
 */

interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <div className={`sbn-skeleton ${className}`} aria-hidden="true" />;
}

/** Placeholder matching the shape of an ItemCard in the feed grid. */
export function ItemCardSkeleton() {
  return (
    <div className="sbn-card overflow-hidden" aria-hidden="true">
      <SkeletonBlock className="w-full aspect-[4/3]" />
      <div className="p-3 space-y-2.5">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <SkeletonBlock className="h-6 w-6 rounded-full shrink-0" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

/** Grid of ItemCard skeletons matching ItemGrid's responsive grid layout. */
export function ItemGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-5"
      id="feed_loading_skeleton"
      role="status"
      aria-label="Loading community listings"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <ItemCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** Placeholder matching the shape of an EventCard in the events grid. */
export function EventCardSkeleton() {
  return (
    <div className="sbn-card overflow-hidden" aria-hidden="true">
      <SkeletonBlock className="w-full aspect-[16/9]" />
      <div className="p-3 space-y-2.5">
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-3 w-1/3" />
        <SkeletonBlock className="h-3 w-full" />
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-5"
      id="events_loading_skeleton"
      role="status"
      aria-label="Loading events"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <EventCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** Placeholder row matching a staff data table / list row. */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-app" aria-hidden="true">
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className={i === 0 ? 'w-1/4' : 'flex-1'}>
          <SkeletonBlock className="h-4" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading" className="rounded-xl border border-app overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <TableRowSkeleton columns={columns} />
        </div>
      ))}
    </div>
  );
}
