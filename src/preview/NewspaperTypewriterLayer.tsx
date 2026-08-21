import { useEffect, useRef } from 'react';
import { useNewspaperExperience } from './NewspaperExperienceContext';
import { useNewspaperSkin } from './NewspaperSkinContext';

const IGNORED_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'Tab',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset'].includes(target.type);
  }
  return false;
}

/**
 * Optional typewriter keys while composing. Off unless the reader turns it on
 * in the Newspaper Experience settings; a held key never machine-guns.
 */
export default function NewspaperTypewriterLayer() {
  const { enabled } = useNewspaperSkin();
  const { prefs, play } = useNewspaperExperience();
  const lastPlayed = useRef(0);

  useEffect(() => {
    if (!enabled || !prefs.typewriterSounds) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (IGNORED_KEYS.has(event.key)) return;
      if (!isTextField(event.target)) return;

      const now = performance.now();
      if (now - lastPlayed.current < 28) return;
      lastPlayed.current = now;

      if (event.key === 'Enter') {
        // End of the line — the carriage returns and the bell rings.
        play('notifyImportant', 'typing');
      } else if (event.key === ' ') {
        play('keySpace', 'typing');
      } else {
        play('key', 'typing');
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: true });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, prefs.typewriterSounds, play]);

  return null;
}
