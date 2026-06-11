import { useEffect } from 'react';

/** Ignore tiny visualViewport jitter (toolbar show/hide). */
const KEYBOARD_OPEN_THRESHOLD_PX = 80;

function measureKeyboardInset(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

function applyKeyboardInset(inset: number): void {
  const open = inset >= KEYBOARD_OPEN_THRESHOLD_PX;
  const root = document.documentElement;
  root.style.setProperty('--sbn-keyboard-inset', open ? `${inset}px` : '0px');
  root.classList.toggle('sbn-keyboard-open', open);
}

/** Tracks on-screen keyboard height for the fixed mobile shell. */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyKeyboardInset(measureKeyboardInset()));
    };

    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      document.documentElement.style.removeProperty('--sbn-keyboard-inset');
      document.documentElement.classList.remove('sbn-keyboard-open');
    };
  }, []);
}

export function scrollInputIntoView(el: HTMLElement): void {
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    window.setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 280);
  });
}

/** Scroll focused inputs/textareas above the virtual keyboard on long forms. */
export function useScrollInputOnFocus(): void {
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (target.closest('.sbn-input-tray')) return;
      scrollInputIntoView(target);
    };

    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);
}
