import { useEffect } from 'react';

/** Close overlay panels when the user presses Escape (desktop) or expects dismiss shortcuts. */
export function useDismissOnEscape(onDismiss: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onDismiss();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onDismiss]);
}
