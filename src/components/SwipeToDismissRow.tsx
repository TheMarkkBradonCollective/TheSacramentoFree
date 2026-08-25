import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

const DISMISS_THRESHOLD_PX = 96;

interface SwipeToDismissRowProps {
  children: ReactNode;
  onDismiss: () => void;
  disabled?: boolean;
  dismissLabel?: string;
}

/** Swipe left to clear — per-user dismiss for notification rows. */
export default function SwipeToDismissRow({
  children,
  onDismiss,
  disabled = false,
  dismissLabel = 'Clear',
}: SwipeToDismissRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const offsetRef = useRef(0);
  const tracking = useRef(false);

  const finishDrag = () => {
    setDragging(false);
    tracking.current = false;
    if (offsetRef.current <= -DISMISS_THRESHOLD_PX) {
      onDismiss();
    }
    offsetRef.current = 0;
    setOffsetX(0);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    startX.current = e.clientX;
    startOffset.current = offsetRef.current;
    tracking.current = true;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!tracking.current) return;
    const delta = e.clientX - startX.current;
    if (!dragging && Math.abs(delta) < 8) return;
    if (!dragging) {
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const next = Math.min(0, startOffset.current + delta);
    offsetRef.current = next;
    setOffsetX(next);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!tracking.current) return;
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    finishDrag();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-y-0 right-0 flex min-w-[5.5rem] items-center justify-center bg-red-500/90 px-3 text-xs font-bold text-white"
        aria-hidden
      >
        {dismissLabel}
      </div>
      <div
        className={`relative touch-pan-y ${dragging ? 'cursor-grabbing' : ''} ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        }`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
