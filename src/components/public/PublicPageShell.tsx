import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePublicRoute } from '../../public/usePublicRoute';

interface PublicPageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** When false, hide the back button even on sub-pages (e.g. login). */
  showBack?: boolean;
}

export default function PublicPageShell({ title, subtitle, children, showBack = true }: PublicPageShellProps) {
  const { route, navigate } = usePublicRoute();
  const canGoBack = showBack && route !== 'home';

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate('home');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-12">
      <div className="sbn-page-content">
        {canGoBack && (
          <button type="button" onClick={goBack} className="sbn-back-btn" aria-label="Go back">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <header className="sbn-page-header">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
