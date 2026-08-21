import { isNativeApp } from './nativePlatform';

/** Full-viewport staff/tablet/desktop shell — fixed on native so safe-area padding clears system bars. */
export function workspaceShellClassName(): string {
  if (isNativeApp()) {
    return 'sbn-workspace-shell fixed inset-0 z-10 flex flex-col bg-app text-app overflow-hidden';
  }
  return 'sbn-workspace-shell flex h-screen bg-app text-app overflow-hidden';
}
