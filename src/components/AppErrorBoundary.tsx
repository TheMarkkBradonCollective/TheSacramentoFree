import { Component, type ErrorInfo, type ReactNode } from 'react';
import { supabase } from '../supabase';
import { clearSessionCache } from '../lib/sessionCache';
import { clearAllLocalNativeSessionIds } from '../lib/nativeAppSession';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export default class AppErrorBoundary extends Component<Props, State> {
  declare readonly props: Readonly<Props>;
  state: State = { error: null };
  private signingOut = false;

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] render error:', error, info.componentStack);
  }

  handleSignOut = async () => {
    if (this.signingOut) return;
    this.signingOut = true;
    try {
      clearSessionCache();
      clearAllLocalNativeSessionIds();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[app] sign-out from error screen failed:', err);
    } finally {
      window.location.assign('/');
    }
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100svh] flex flex-col items-center justify-center gap-4 px-6 text-center mesh-bg text-app">
          <h1 className="font-display text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted max-w-md">
            The app hit an unexpected error. Refresh the page, or sign out and sign in again.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="sbn-btn sbn-btn-secondary"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
            <button
              type="button"
              className="sbn-btn sbn-btn-primary"
              onClick={() => void this.handleSignOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
