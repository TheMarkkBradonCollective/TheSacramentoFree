import { ArrowRight, FileText, Heart, MapPin, Shield, Users } from 'lucide-react';
import BrandLogo from '../../BrandLogo';
import LeadershipMessagesCarousel from '../../LeadershipMessagesCarousel';
import CommunityReviews from '../../CommunityReviews';
import CommunityStatsBar from '../../CommunityStatsBar';
import GuestListingPreview from '../GuestListingPreview';
import HomeScrollStage, { DepthPanel, DepthSection } from '../HomeScrollStage';
import { SITE } from '../../../siteContent';
import type { PublicRoute } from '../../../public/routes';
import { ItemPost } from '../../../types';

interface HomePageProps {
  onNavigate: (route: PublicRoute) => void;
  items?: ItemPost[];
  isItemsLoading?: boolean;
  onViewListing?: (item: ItemPost) => void;
  onRequireSignIn?: () => void;
}

const EXPLORE_LINKS: { route: PublicRoute; title: string; blurb: string; icon: typeof Heart }[] = [
  { route: 'about', title: 'What we are', blurb: 'Local free gifting — no money, just neighbors.', icon: Heart },
  { route: 'how-it-works', title: 'How it works', blurb: 'Post, connect, porch pickup — four simple steps.', icon: Users },
  { route: 'rules', title: 'Community rules', blurb: "What's allowed and what isn't.", icon: Shield },
  { route: 'privacy', title: 'Privacy & data', blurb: 'Your data is stored by Supabase — never sold.', icon: Shield },
  { route: 'terms', title: 'Terms of use', blurb: 'User agreement for free local gifting in Sacramento.', icon: FileText },
  { route: 'neighborhoods', title: 'Sacramento areas', blurb: 'Midtown, Elk Grove, Davis, Roseville, and 34+ areas.', icon: MapPin },
];

export default function HomePage({
  onNavigate,
  items = [],
  isItemsLoading = false,
  onViewListing,
  onRequireSignIn,
}: HomePageProps) {
  return (
    <HomeScrollStage>
      <DepthSection depth={1} className="sbn-page-content sbn-hero-glow pb-4">
        <BrandLogo imgClassName="h-14 w-auto max-w-[220px] object-contain rounded-xl mb-6" />

        <span className="sbn-badge sbn-badge-give">
          <Heart className="w-3 h-3 inline mr-1" />
          {SITE.name}
        </span>

        <h1 className="mt-6 font-display text-4xl md:text-5xl font-extrabold text-app leading-[1.1] tracking-tight">
          Give freely.
          <br />
          <span className="text-accent">Ask kindly.</span>
        </h1>

        <p className="mt-5 text-base text-muted leading-relaxed max-w-lg">{SITE.description}</p>

        <ul className="mt-6 flex flex-wrap gap-2">
          {SITE.principles.map((line) => (
            <li key={line} className="sbn-chip text-xs">
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => onNavigate('login')} className="sbn-btn sbn-btn-primary">
            Sign in or join
          </button>
          <button type="button" onClick={() => onNavigate('about')} className="sbn-btn sbn-btn-secondary">
            Learn more
          </button>
        </div>

        <p className="mt-5 text-sm font-semibold text-accent">{SITE.freeRule}</p>
      </DepthSection>

      <DepthSection depth={2} className="mt-6">
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">Community at a glance</p>
        <DepthPanel className="sbn-card p-1">
          <CommunityStatsBar items={items} variant="full" />
        </DepthPanel>
      </DepthSection>

      {onViewListing && onRequireSignIn && (
        <DepthSection depth={3} id="guest_listing_preview">
          <GuestListingPreview
            items={items}
            isLoading={isItemsLoading}
            onViewItem={onViewListing}
            onRequireSignIn={onRequireSignIn}
            embedded
          />
        </DepthSection>
      )}

      <DepthSection depth={2} className="mt-6">
        <DepthPanel>
          <LeadershipMessagesCarousel onRequireSignIn={onRequireSignIn} />
        </DepthPanel>
      </DepthSection>

      <DepthSection depth={2} className="mt-6">
        <DepthPanel>
          <CommunityReviews
            preview
            onRequireSignIn={onRequireSignIn}
            onSeeAll={() => onNavigate('reviews')}
          />
        </DepthPanel>
      </DepthSection>

      <DepthSection depth={2} className="mt-14">
        <h2 className="font-display text-xl font-bold text-app">About the community</h2>
        <p className="mt-1 text-sm text-muted">Learn how we keep gifting local and free.</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXPLORE_LINKS.map(({ route, title, blurb, icon: Icon }, index) => (
            <DepthPanel key={route} floatDelay={index * 6}>
              <button
                type="button"
                onClick={() => onNavigate(route)}
                className="sbn-card p-5 text-left hover:shadow-app transition-shadow group w-full h-full"
              >
                <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <p className="font-display font-bold text-app">{title}</p>
                <p className="mt-1 text-sm text-muted leading-relaxed">{blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:gap-2 transition-all">
                  Read more <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </DepthPanel>
          ))}
        </div>

        <DepthPanel className="mt-4" floatDelay={12}>
          <button
            type="button"
            onClick={() => onNavigate('community')}
            className="w-full sbn-card p-5 text-left hover:border-accent/40 transition-colors"
          >
            <p className="font-display font-bold text-app">Why community matters</p>
            <p className="mt-1 text-sm text-muted">Trust, mutual aid, and less waste in Sacramento.</p>
          </button>
        </DepthPanel>
      </DepthSection>
    </HomeScrollStage>
  );
}
