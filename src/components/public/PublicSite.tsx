import { useEffect, useRef } from 'react';
import PageScrollFooter from '../PageScrollFooter';
import { PublicScrollContainerContext } from '../../public/PublicScrollContext';
import { usePublicRoute } from '../../public/usePublicRoute';
import PublicNav from './PublicNav';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HowItWorksPage from './pages/HowItWorksPage';
import RulesPage from './pages/RulesPage';
import NeighborhoodsPage from './pages/NeighborhoodsPage';
import CommunityPage from './pages/CommunityPage';
import UpdatesPage from './pages/UpdatesPage';
import ReviewsPage from './pages/ReviewsPage';
import GoFundMePage from './pages/GoFundMePage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
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
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.location.hash) return;
    // Use the History API rather than location.replace/hash= — those trigger a
    // same-document navigation that dispatches a native `popstate` event, which
    // can race with other app-level popstate handling during auth transitions.
    try {
      window.history.replaceState(window.history.state, '', '#/');
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
      case 'gofundme':
        return <GoFundMePage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'terms':
        return <TermsPage />;
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
        return <NotFoundPage onNavigate={navigate} />;
      case 'home':
      default:
        return (
          <HomePage
            onNavigate={navigate}
            items={items}
            isItemsLoading={isItemsLoading}
            onViewListing={onViewListing}
            onRequireSignIn={onRequireSignIn}
          />
        );
    }
  };

  return (
    <div className="min-h-screen h-dvh bg-app text-app font-sans flex flex-col overflow-hidden">
      <PublicNav route={route} onNavigate={navigate} />
      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto">
        <PublicScrollContainerContext.Provider value={mainRef}>
          {renderPage()}
          <PageScrollFooter />
        </PublicScrollContainerContext.Provider>
      </main>
    </div>
  );
}
