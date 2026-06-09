import { useEffect } from 'react';
import PageScrollFooter from '../PageScrollFooter';
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

  useEffect(() => {
    if (!window.location.hash) {
      window.location.replace('#/');
    }
  }, []);

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
        return <UpdatesPage />;
      case 'reviews':
        return <ReviewsPage onRequireSignIn={onRequireSignIn} />;
      case 'gofundme':
        return <GoFundMePage />;
      case 'login':
        return (
          <AuthPage
            onEmailSignIn={onEmailSignIn}
            onEmailSignUp={onEmailSignUp}
            errorMsg={errorMsg}
            isAuthLoading={isAuthLoading}
          />
        );
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
      <main className="flex-1 min-h-0 overflow-y-auto">
        {renderPage()}
        <PageScrollFooter />
      </main>
    </div>
  );
}
