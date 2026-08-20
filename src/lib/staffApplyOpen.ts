let opener: (() => void) | null = null;

export function registerStaffApplyOpener(fn: (() => void) | null): void {
  opener = fn;
}

export function openStaffApplyPanel(): void {
  opener?.();
}
