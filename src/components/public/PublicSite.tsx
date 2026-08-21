import { useCallback, useEffect, useRef } from 'react';
import PageScrollFooter, { ScrollPage } from '../PageScrollFooter';
import { usePublicRoute } from '../../public/usePublicRoute';
import { useNewspaperSkin } from '../../preview/NewspaperSkinContext';
import { triggerNewspaperPageTurn } from '../../preview/pageTurn';
import PublicNav from './PublicNav';
import NewspaperPreviewBanner from './newspaper/NewspaperPreviewBanner';
import NewspaperEditionBar from './newspaper/NewspaperEditionBar';
import NewspaperMasthead from '../../preview/NewspaperMasthead';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HowItWorksPage from './pages/HowItWorksPage';
import RulesPage from './pages/RulesPage';
import NeighborhoodsPage from './pages/NeighborhoodsPage';
import CommunityPage from './pages/CommunityPage';
import UpdatesPage from './pages/UpdatesPage';
import ReviewsPage from './pages/ReviewsPage';
import DownloadPage from './pages/DownloadPage';
import GoFundMePage from './pages/GoFundMePage';
import PrivacyPage from './pages/PrivacyPage';
import DeleteAccountPage from './pages/DeleteAccountPage';
import TermsPage from './pages/TermsPage';
import ChildSafetyPage from './pages/ChildSafetyPage';
import NotFoundPage from './pages/NotFoundPage';
import AuthPage from './AuthPage';
import { ItemPost } from '../../types';

interface PublicSiteProps {
  onEmailSignIn: (email: string, password: string) => Promise<boolean>;
  onEmailSignUp: (
    email: string,
    password: string,
    displayName: string,
    neighborhood: string,
    bio: string,
    acceptedLegal?: boolean,
  ) => Promise<boolean>;
  errorMsg?: string;
  isAuthLoading?: boolean;
  items?: ItemPost[];
  isItemsLoading?: boolean;
  onViewListing?: (item: ItemPost) => void;
  onRequireSignIn?: () => void;
}

export default function PublicSite({
  onEmailSignIn,
  onEmailSignUp,
  errorMsg,
  isAuthLoading,
  items = [],
  isItemsLoading = false,
  onViewListing,
  onRequireSignIn,
}: PublicSiteProps) {
  const { route, navigate } = usePublicRoute();
  const { enabled: newspaper } = useNewspaperSkin();
  const mainRef = useRef<HTMLDivElement>(null);

  const navigateSection = useCallback<typeof navigate>(
    (next) => {
      if (next !== route) triggerNewspaperPageTurn();
      navigate(next);
    },
    [navigate, route],
  );

  useEffect(() => {
    if (window.location.hash) return;
    try {
      window.history.replaceState(window.history.state, '', `${window.location.search}#/`);
    } catch {
      window.location.hash = '#/';
    }
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  const renderPage = () => {
    switch (route) {
      case 'about':
        return <AboutPage />;
      case 'how-it-works':
        return <HowItWorksPage />;
      case 'rules':
        return <RulesPage />;
      case 'neighborhoods':
        return <NeighborhoodsPage />;
      case 'community':
        return <CommunityPage />;
      case 'updates':
        return <UpdatesPage onRequireSignIn={onRequireSignIn} />;
      case 'reviews':
        return <ReviewsPage onRequireSignIn={onRequireSignIn} />;
      case 'download':
        return <DownloadPage />;
      case 'gofundme':
        return <GoFundMePage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'delete-account':
        return <DeleteAccountPage />;
      case 'terms':
        return <TermsPage />;
      case 'child-safety':
        return <ChildSafetyPage />;
      case 'login':
        return (
          <AuthPage
            onEmailSignIn={onEmailSignIn}
            onEmailSignUp={onEmailSignUp}
            errorMsg={errorMsg}
            isAuthLoading={isAuthLoading}
          />
        );
      case 'not-found':
        return <NotFoundPage onNavigate={navigateSection} />;
      case 'home':
      default:
        return (
          <HomePage
            onNavigate={navigateSection}
            items={items}
            isItemsLoading={isItemsLoading}
            onViewListing={onViewListing}
            onRequireSignIn={onRequireSignIn}
          />
        );
    }
  };

  const paperChrome = (
    <>
      <NewspaperEditionBar />
      {newspaper && (
        route === 'home' ? (
          <div className="hidden lg:block">
            <NewspaperMasthead variant="front" onHomeClick={() => navigateSection('home')} />
          </div>
        ) : (
          <NewspaperMasthead variant="banner" onHomeClick={() => navigateSection('home')} />
        )
      )}
      <PublicNav
        route={route}
        onNavigate={navigateSection}
        hideBrandOnLarge={newspaper && route === 'home'}
      />
      <main className="flex-1 min-h-0 overflow-hidden">
        <ScrollPage ref={mainRef} footer={<PageScrollFooter />}>
          {renderPage()}
        </ScrollPage>
      </main>
    </>
  );

  return (
    <div
      className={`min-h-screen h-dvh bg-app text-app flex flex-col overflow-hidden ${
        newspaper ? 'tsf-root' : 'font-sans'
      }`}
    >
      <NewspaperPreviewBanner />
      {newspaper ? (
        <div className="tsf-desk">
          <div className="tsf-paper">{paperChrome}</div>
        </div>
      ) : (
        paperChrome
      )}
    </div>
  );
}
