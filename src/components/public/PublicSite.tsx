import { useEffect } from 'react';
import { SITE } from '../../siteContent';
import { usePublicRoute } from '../../public/usePublicRoute';
import PublicNav from './PublicNav';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HowItWorksPage from './pages/HowItWorksPage';
import RulesPage from './pages/RulesPage';
import NeighborhoodsPage from './pages/NeighborhoodsPage';
import CommunityPage from './pages/CommunityPage';
import AuthPage from './AuthPage';

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
}

export default function PublicSite({
  onEmailSignIn,
  onEmailSignUp,
  errorMsg,
  isAuthLoading,
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
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-app text-app font-sans flex flex-col">
      <PublicNav route={route} onNavigate={navigate} />
      <main className="flex-1">{renderPage()}</main>
      <footer className="border-t border-app bg-surface py-6 text-center text-xs text-subtle">
        <p>
          © {new Date().getFullYear()} {SITE.name} · {SITE.tagline}
        </p>
      </footer>
    </div>
  );
}
