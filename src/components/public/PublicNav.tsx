import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '../ThemeToggle';
import { SITE } from '../../siteContent';
import { PUBLIC_NAV, type PublicRoute } from '../../public/routes';

interface PublicNavProps {
  route: PublicRoute;
  onNavigate: (route: PublicRoute) => void;
}

export default function PublicNav({ route, onNavigate }: PublicNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (r: PublicRoute) =>
    `px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
      route === r ? 'bg-[#FF4500]/15 text-accent' : 'text-muted hover:text-app hover:bg-inset'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-app bg-surface/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-sm font-black text-app truncate hover:text-accent transition-colors"
        >
          {SITE.shortName}
        </button>

        <nav className="hidden md:flex items-center gap-1 flex-wrap justify-end">
          {PUBLIC_NAV.map(({ route: r, label }) => (
            <button key={r} type="button" onClick={() => onNavigate(r)} className={linkClass(r)}>
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="ml-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-xs font-black uppercase tracking-wide"
          >
            Sign In
          </button>
          <ThemeToggle />
        </nav>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-lg border border-app text-app"
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
            className="mt-1 w-full py-3 rounded-lg bg-accent text-on-accent text-xs font-black uppercase"
          >
            Sign In / Join
          </button>
        </nav>
      )}
    </header>
  );
}
