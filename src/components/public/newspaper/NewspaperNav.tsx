import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import ThemeToggle from '../../ThemeToggle';
import { PUBLIC_NAV, type PublicRoute } from '../../../public/routes';
import { isNativeApp } from '../../../lib/nativePlatform';
import { NEWSPAPER } from '../../../preview/newspaperBrand';
import NewspaperPreviewBanner from './NewspaperPreviewBanner';

interface NewspaperNavProps {
  route: PublicRoute;
  onNavigate: (route: PublicRoute) => void;
}

const ALL_COMMUNITY_LINKS: { route: PublicRoute; label: string }[] = [
  { route: 'community', label: 'Community' },
  { route: 'reviews', label: 'Letters' },
  { route: 'updates', label: 'Dispatches' },
  { route: 'download', label: 'Get the paper' },
];

const MORE_LINKS: { route: PublicRoute; label: string }[] = [
  { route: 'privacy', label: 'Privacy' },
  { route: 'terms', label: 'Terms' },
  { route: 'gofundme', label: 'Public notices' },
];

const PRIMARY_NAV = PUBLIC_NAV.filter(({ route: r }) => r !== 'community').map((item) =>
  item.route === 'home' ? { ...item, label: 'Front page' } : item,
);

function isCommunityRoute(route: PublicRoute): boolean {
  return route === 'community' || route === 'updates' || route === 'reviews' || route === 'download';
}

function isMoreRoute(route: PublicRoute): boolean {
  return route === 'privacy' || route === 'terms' || route === 'gofundme';
}

function useDropdownMenu(onClose: () => void) {
  const menuId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return menuId;
}

export default function NewspaperNav({ route, onNavigate }: NewspaperNavProps) {
  const COMMUNITY_LINKS = useMemo(
    () => (isNativeApp() ? ALL_COMMUNITY_LINKS.filter((l) => l.route !== 'download') : ALL_COMMUNITY_LINKS),
    [],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const communityRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const communityMenuId = useDropdownMenu(() => setCommunityOpen(false));
  const moreMenuId = useDropdownMenu(() => setMoreOpen(false));

  useEffect(() => {
    if (!communityOpen && !moreOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (communityOpen && !communityRef.current?.contains(event.target as Node)) {
        setCommunityOpen(false);
      }
      if (moreOpen && !moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [communityOpen, moreOpen]);

  const linkClass = (r: PublicRoute) => `tsf-nav-link${route === r ? ' tsf-nav-link-active' : ''}`;

  const mobileLinkClass = (r: PublicRoute) =>
    `w-full text-left px-3 py-2.5 text-sm font-semibold ${
      route === r ? 'bg-accent-soft text-accent' : 'text-muted hover:text-app hover:bg-inset'
    }`;

  const navigateMobile = (r: PublicRoute) => {
    onNavigate(r);
    setMenuOpen(false);
  };

  const navigateDesktop = (r: PublicRoute) => {
    onNavigate(r);
    setCommunityOpen(false);
    setMoreOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 tsf-nav-shell sbn-safe-top">
      <NewspaperPreviewBanner />
      <div className="tsf-nav-bar">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-label={`${NEWSPAPER.name} front page`}
          className="tsf-nav-wordmark shrink-0"
        >
          <span className="tsf-nav-wordmark-the">{NEWSPAPER.the}</span> {NEWSPAPER.title}
        </button>

        <nav className="hidden lg:flex items-center gap-0.5 min-w-0">
          {PRIMARY_NAV.map(({ route: r, label }) => (
            <button key={r} type="button" onClick={() => onNavigate(r)} className={linkClass(r)}>
              {label}
            </button>
          ))}

          <div className="relative" ref={communityRef}>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setCommunityOpen((open) => !open);
              }}
              className={`tsf-nav-link inline-flex items-center gap-1 ${isCommunityRoute(route) ? 'tsf-nav-link-active' : ''}`}
              aria-expanded={communityOpen}
              aria-haspopup="menu"
              aria-controls={communityMenuId}
            >
              Community
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${communityOpen ? 'rotate-180' : ''}`} />
            </button>
            {communityOpen && (
              <div
                id={communityMenuId}
                role="menu"
                className="absolute left-0 top-[calc(100%+0.35rem)] min-w-[11rem] border border-app bg-surface py-1.5 z-50 tsf-menu"
              >
                {COMMUNITY_LINKS.map(({ route: linkRoute, label }) => (
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

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => {
                setCommunityOpen(false);
                setMoreOpen((open) => !open);
              }}
              className={`tsf-nav-link inline-flex items-center gap-1 ${isMoreRoute(route) ? 'tsf-nav-link-active' : ''}`}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-controls={moreMenuId}
            >
              More
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div
                id={moreMenuId}
                role="menu"
                className="absolute right-0 top-[calc(100%+0.35rem)] min-w-[10.5rem] border border-app bg-surface py-1.5 z-50 tsf-menu"
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

          <button type="button" onClick={() => onNavigate('login')} className="sbn-btn sbn-btn-primary sbn-btn-sm ml-2">
            {NEWSPAPER.subscribeCta}
          </button>
          <ThemeToggle />
        </nav>

        <div className="flex lg:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 border border-app text-app hover:bg-inset transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="lg:hidden border-t border-app px-4 py-3 flex flex-col gap-1 bg-surface">
          {PRIMARY_NAV.map(({ route: r, label }) => (
            <button key={r} type="button" onClick={() => navigateMobile(r)} className={mobileLinkClass(r)}>
              {label}
            </button>
          ))}

          <p
            className={`px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider ${
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

          <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-subtle">Legal & support</p>
          {MORE_LINKS.map(({ route: linkRoute, label }) => (
            <button
              key={linkRoute}
              type="button"
              onClick={() => navigateMobile(linkRoute)}
              className={`${mobileLinkClass(linkRoute)} pl-5`}
            >
              {label}
            </button>
          ))}

          <button type="button" onClick={() => navigateMobile('login')} className="sbn-btn sbn-btn-primary w-full mt-2">
            {NEWSPAPER.subscribeCta}
          </button>
        </nav>
      )}
    </header>
  );
}
