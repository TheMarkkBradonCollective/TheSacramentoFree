import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100svh] flex flex-col items-center justify-center gap-4 px-6 text-center mesh-bg text-app">
          <h1 className="font-display text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted max-w-md">
            The app hit an unexpected error. Refresh the page or sign out and sign in again.
          </p>
          <button
            type="button"
            className="sbn-btn sbn-btn-secondary"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
