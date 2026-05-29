import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '../ThemeToggle';
import BrandLogo from '../BrandLogo';
import { PUBLIC_NAV, type PublicRoute } from '../../public/routes';

interface PublicNavProps {
  route: PublicRoute;
  onNavigate: (route: PublicRoute) => void;
}

export default function PublicNav({ route, onNavigate }: PublicNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (r: PublicRoute) =>
    `px-3 py-2 rounded-full text-sm font-medium transition-colors ${
      route === r ? 'bg-accent-soft text-accent' : 'text-muted hover:text-app hover:bg-inset'
    }`;

  return (
    <header className="sticky top-0 z-50 sbn-glass-nav">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button type="button" onClick={() => onNavigate('home')} className="shrink-0">
          <BrandLogo imgClassName="h-8 w-auto max-w-[130px] object-contain rounded-lg" />
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {PUBLIC_NAV.map(({ route: r, label }) => (
            <button key={r} type="button" onClick={() => onNavigate(r)} className={linkClass(r)}>
              {label}
            </button>
          ))}
          <button type="button" onClick={() => onNavigate('login')} className="sbn-btn sbn-btn-primary sbn-btn-sm ml-2">
            Sign in
          </button>
          <ThemeToggle />
        </nav>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-full border border-app text-app"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-app px-4 py-3 flex flex-col gap-1 bg-surface">
          {PUBLIC_NAV.map(({ route: r, label }) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onNavigate(r);
                setMenuOpen(false);
              }}
              className={linkClass(r)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onNavigate('login');
              setMenuOpen(false);
            }}
            className="sbn-btn sbn-btn-primary w-full mt-2"
          >
            Sign in / Join
          </button>
        </nav>
      )}
    </header>
  );
}
