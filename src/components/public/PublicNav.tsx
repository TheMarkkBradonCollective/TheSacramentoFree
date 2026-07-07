import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ThemeToggle from '../ThemeToggle';
import BrandLogo from '../BrandLogo';
import { PUBLIC_NAV, type PublicRoute } from '../../public/routes';

interface PublicNavProps {
  route: PublicRoute;
  onNavigate: (route: PublicRoute) => void;
}

const COMMUNITY_LINKS: { route: PublicRoute; label: string }[] = [
  { route: 'community', label: 'Community' },
  { route: 'reviews', label: 'Reviews' },
  { route: 'updates', label: 'Updates' },
];

const MORE_LINKS: { route: PublicRoute; label: string }[] = [
  { route: 'updates', label: 'Updates' },
  { route: 'reviews', label: 'Reviews' },
  { route: 'privacy', label: 'Privacy' },
  { route: 'terms', label: 'Terms' },
];

function isCommunityRoute(route: PublicRoute): boolean {
  return route === 'community' || route === 'updates' || route === 'reviews';
}

// Reviews/Updates are grouped under "Community" for active-state purposes, so only
// Privacy/Terms should light up the desktop "More" trigger — otherwise both "Community"
// and "More" appear active at once when viewing Reviews or Updates.
function isMoreRoute(route: PublicRoute): boolean {
  return route === 'privacy' || route === 'terms';
}

export default function PublicNav({ route, onNavigate }: PublicNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [moreOpen]);

  const linkClass = (r: PublicRoute) =>
    `sbn-nav-tab ${(r === 'community' ? isCommunityRoute(route) : route === r) ? 'sbn-nav-tab-active' : ''}`;

  const mobileLinkClass = (r: PublicRoute) =>
    `w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
      route === r ? 'bg-accent-soft text-accent border-l-2 border-l-accent' : 'text-muted hover:text-app hover:bg-inset'
    }`;

  const navigateMobile = (r: PublicRoute) => {
    onNavigate(r);
    setMenuOpen(false);
  };

  const navigateDesktop = (r: PublicRoute) => {
    onNavigate(r);
    setMoreOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 sbn-glass-nav sbn-safe-top">
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

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={`sbn-nav-tab inline-flex items-center gap-1 ${isMoreRoute(route) ? 'sbn-nav-tab-active' : ''}`}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              More
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+0.35rem)] min-w-[10.5rem] rounded-xl border border-app bg-surface shadow-xl py-1.5 z-50"
              >
                {MORE_LINKS.map(({ route: linkRoute, label }) => (
                  <button
                    key={linkRoute}
                    type="button"
                    role="menuitem"
                    onClick={() => navigateDesktop(linkRoute)}
                    className={`w-full text-left px-3.5 py-2 text-sm font-semibold transition-colors ${
                      route === linkRoute ? 'text-accent bg-accent-soft' : 'text-app hover:bg-inset'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={() => onNavigate('gofundme')} className={linkClass('gofundme')}>
            GoFundMe
          </button>
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
            className="p-2 rounded-lg border border-app text-app hover:bg-inset transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-app px-4 py-3 flex flex-col gap-1 bg-surface">
          {PUBLIC_NAV.map(({ route: r, label }) => {
            if (r === 'community') {
              return (
                <div key="community-group" className="flex flex-col gap-0.5">
                  <p
                    className={`px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wider ${
                      isCommunityRoute(route) ? 'text-accent' : 'text-subtle'
                    }`}
                  >
                    Community
                  </p>
                  {COMMUNITY_LINKS.map(({ route: linkRoute, label: linkLabel }) => (
                    <button
                      key={linkRoute}
                      type="button"
                      onClick={() => navigateMobile(linkRoute)}
                      className={`${mobileLinkClass(linkRoute)} pl-5`}
                    >
                      {linkLabel}
                    </button>
                  ))}
                </div>
              );
            }
            return (
              <button key={r} type="button" onClick={() => navigateMobile(r)} className={mobileLinkClass(r)}>
                {label}
              </button>
            );
          })}

          <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-subtle">Legal</p>
          <button type="button" onClick={() => navigateMobile('privacy')} className={`${mobileLinkClass('privacy')} pl-5`}>
            Privacy
          </button>
          <button type="button" onClick={() => navigateMobile('terms')} className={`${mobileLinkClass('terms')} pl-5`}>
            Terms
          </button>

          <button
            type="button"
            onClick={() => navigateMobile('gofundme')}
            className={mobileLinkClass('gofundme')}
          >
            GoFundMe
          </button>
          <button type="button" onClick={() => navigateMobile('login')} className="sbn-btn sbn-btn-primary w-full mt-2">
            Sign in / Join
          </button>
        </nav>
      )}
    </header>
  );
}
