import { Home } from 'lucide-react';
import PublicPageShell from '../PublicPageShell';
import type { PublicRoute } from '../../../public/routes';

interface NotFoundPageProps {
  onNavigate: (route: PublicRoute) => void;
}

export default function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <PublicPageShell title="Page not found">
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <p className="text-6xl font-display font-black text-accent/30">404</p>
        <h2 className="text-2xl font-display font-bold text-app mt-4">We couldn&apos;t find that page</h2>
        <p className="text-muted mt-3 leading-relaxed">
          The link may be outdated or mistyped. Head back home to explore Sacramento Buy Nothing.
        </p>
        <button type="button" onClick={() => onNavigate('home')} className="sbn-btn sbn-btn-primary mt-8 mx-auto">
          <Home className="w-4 h-4" />
          Back to home
        </button>
      </div>
    </PublicPageShell>
  );
}
