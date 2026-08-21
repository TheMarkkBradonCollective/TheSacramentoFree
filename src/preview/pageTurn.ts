/**
 * Imperative trigger for the page-turn transition.
 *
 * Kept outside React so any navigation handler can fire it with a single call
 * without threading a context through the component tree.
 */

export type PageTurnDirection = 'forward' | 'back';

type Listener = (direction: PageTurnDirection) => void;

const listeners = new Set<Listener>();

let lastTurnAt = 0;
/** Rapid taps on a tab bar should not stack up transitions. */
const MIN_INTERVAL_MS = 260;

export function triggerNewspaperPageTurn(direction: PageTurnDirection = 'forward'): void {
  const now = Date.now();
  if (now - lastTurnAt < MIN_INTERVAL_MS) return;
  lastTurnAt = now;
  listeners.forEach((listener) => listener(direction));
}

export function onNewspaperPageTurn(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
