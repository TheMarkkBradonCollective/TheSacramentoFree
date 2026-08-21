import { ArrowRight, FileText, HandHeart, Heart, MapPin, MessageCircle, MessageSquare, PackageCheck, Shield, Sparkles, Star, Users } from 'lucide-react';
import BrandLogo from '../../BrandLogo';
import LeadershipMessagesCarousel from '../../LeadershipMessagesCarousel';
import CommunityReviews from '../../CommunityReviews';
import CommunityStatsBar from '../../CommunityStatsBar';
import GuestListingPreview from '../GuestListingPreview';
import HomeDownloadButtons from '../HomeDownloadButtons';
import HomeScrollStage, { DepthSection } from '../HomeScrollStage';
import { SITE, SUPPORT } from '../../../siteContent';
import { useBrand } from '../../../preview/useBrand';
import { NEWSPAPER } from '../../../preview/newspaperBrand';
import NewspaperSectionHead from '../../../preview/NewspaperSectionHead';
import type { PublicRoute } from '../../../public/routes';
import { ItemPost } from '../../../types';
import { extractListingImageUrls } from '../../../lib/listingContent';
import ListingImage from '../../ListingImage';

const HERO_FEATURES: { icon: typeof PackageCheck; title: string; blurb: string }[] = [
  { icon: PackageCheck, title: 'Post in seconds', blurb: 'Snap a photo, write a few words, done.' },
  { icon: MessageCircle, title: 'Chat safely', blurb: 'Message right in the app — no phone numbers needed.' },
  { icon: MapPin, title: 'Meet nearby', blurb: 'Filter by neighborhood, coordinate porch pickup.' },
];

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
  { route: 'community', title: 'Why community matters', blurb: 'Trust, mutual aid, and less waste in Sacramento.', icon: Users },
  { route: 'reviews', title: 'Neighbor reviews', blurb: 'See what members think of the app and our team.', icon: Star },
  { route: 'updates', title: 'App updates', blurb: 'Features, fixes, and improvements — with dates.', icon: Sparkles },
  { route: 'privacy', title: 'Privacy & data', blurb: 'Your data is stored by Supabase — never sold.', icon: Shield },
  { route: 'terms', title: 'Terms of use', blurb: 'User agreement for free local gifting in Sacramento.', icon: FileText },
  { route: 'gofundme', title: 'Support the app', blurb: 'Help keep Sacramento Buy Nothing free — no ads, ever.', icon: HandHeart },
  { route: 'neighborhoods', title: 'Sacramento areas', blurb: 'Midtown, Elk Grove, Davis, Roseville, and 39 areas.', icon: MapPin },
];

export default function HomePage(props: HomePageProps) {
  const { newspaper } = useBrand();
  if (newspaper) return <NewspaperFrontPage {...props} />;
  return <OriginalHomePage {...props} />;
}

function NewspaperFrontPage({
  onNavigate,
  items = [],
  isItemsLoading = false,
  onViewListing,
  onRequireSignIn,
}: HomePageProps) {
  const { copy } = useBrand();
  const description = copy(SITE.description);
  const principles = SITE.principles.map((line) => copy(line));
  const freeRule = copy(SITE.freeRule);
  const plate = items.find((item) => {
    if (item.status !== 'active') return false;
    return Boolean((item.imageUrls?.length ? item.imageUrls : extractListingImageUrls(item))[0]);
  });
  const plateSrc = plate
    ? (plate.imageUrls?.length ? plate.imageUrls : extractListingImageUrls(plate))[0]
    : undefined;

  return (
    <HomeScrollStage>
      <p className="tsf-folio">{NEWSPAPER.standfirst}</p>

      <section className="tsf-front">
        <article>
          <p className="tsf-kicker">Lead story · {NEWSPAPER.edition}</p>
          <h1 className="tsf-front-page-hed mt-2 font-display font-bold text-app">
            Give freely.
            <br />
            <span className="text-accent">Ask kindly.</span>
          </h1>
          {plate && plateSrc && onViewListing && (
            <figure className="tsf-plate">
              <button type="button" onClick={() => onViewListing(plate)} className="tsf-plate__btn">
                <ListingImage src={plateSrc} alt={plate.title} width={960} className="tsf-plate__img" />
              </button>
              <figcaption className="tsf-plate__cap">{plate.title}</figcaption>
            </figure>
          )}
          <p className="tsf-lede mt-5 text-base lg:text-lg text-muted leading-relaxed">{description}</p>
          <ul className="tsf-front__principles">
            {principles.map((line) => (
              <li key={line}>{line}</li>
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
          <HomeDownloadButtons onNavigate={onNavigate} />
          <p className="mt-5 text-sm font-semibold text-accent">{freeRule}</p>
        </article>

        <aside className="tsf-front__rail">
          <p className="tsf-kicker">Live in Sacramento</p>
          <CommunityStatsBar items={items} variant="stacked" />
          {HERO_FEATURES.map(({ title, blurb }) => (
            <div className="tsf-brief" key={title}>
              <p className="tsf-brief__hed">{title}</p>
              <p className="tsf-brief__dek">{blurb}</p>
            </div>
          ))}
        </aside>
      </section>

      <p className="tsf-pull-quote">“{copy(SITE.tagline)}”</p>

      {onViewListing && onRequireSignIn && (
        <section id="guest_listing_preview">
          <NewspaperSectionHead label="Classifieds" blurb="Give. Get. Share." index="Today's edition" />
          <GuestListingPreview
            items={items}
            isLoading={isItemsLoading}
            onViewItem={onViewListing}
            onRequireSignIn={onRequireSignIn}
            embedded
          />
        </section>
      )}

      <div className="tsf-front-deck">
        <section>
          <NewspaperSectionHead label="From the desk" blurb="Notes from the community team." />
          <LeadershipMessagesCarousel onRequireSignIn={onRequireSignIn} />
        </section>
        <section>
          <NewspaperSectionHead label="Letters" blurb="What neighbors are saying." />
          <CommunityReviews
            preview
            onRequireSignIn={onRequireSignIn}
            onSeeAll={() => onNavigate('reviews')}
          />
        </section>
        <section id="home_support_section">
          <NewspaperSectionHead label="Public notices" blurb="Keeping the paper free to print." />
          <button type="button" onClick={() => onNavigate('gofundme')} className="tsf-notice">
            <p className="tsf-kicker">Community support</p>
            <h2 className="tsf-notice__hed">{copy(SUPPORT.gofundmeTitle)}</h2>
            <p className="tsf-notice__body">{copy(SUPPORT.gofundmeBlurb)}</p>
            <p className="tsf-notice__meta">{copy(SUPPORT.gofundmeCostsSummary)}</p>
            <span className="tsf-notice__cta">
              See how to help <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </section>
      </div>

      <section className="mt-10">
        <NewspaperSectionHead label="Sections" blurb="An index to the rest of the paper." />
        <nav className="tsf-index" aria-label="Paper sections">
          {EXPLORE_LINKS.map(({ route, title, blurb }) => (
            <button key={route} type="button" onClick={() => onNavigate(route)} className="tsf-index__row">
              <span className="tsf-index__title">{title}</span>
              <span className="tsf-index__leader" aria-hidden="true" />
              <span className="tsf-index__blurb">{copy(blurb)}</span>
            </button>
          ))}
          <button type="button" onClick={() => onNavigate('login')} className="tsf-index__row">
            <span className="tsf-index__title">Ready to join?</span>
            <span className="tsf-index__leader" aria-hidden="true" />
            <span className="tsf-index__blurb">Sign in to post, message, and claim items.</span>
          </button>
        </nav>
      </section>
    </HomeScrollStage>
  );
}

function OriginalHomePage({
  onNavigate,
  items = [],
  isItemsLoading = false,
  onViewListing,
  onRequireSignIn,
}: HomePageProps) {
  const { name, tagline, copy } = useBrand();
  const description = copy(SITE.description);
  const principles = SITE.principles.map((line) => copy(line));
  const freeRule = copy(SITE.freeRule);

  return (
    <HomeScrollStage>
      <section className="px-4 sbn-hero-glow pb-4">
        <div className="lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:items-center max-w-3xl lg:max-w-none mx-auto">
          <div>
            <div className="tsf-hero-masthead">
              <BrandLogo imgClassName="h-14 w-auto max-w-[220px] object-contain rounded-xl" />
              <p className="tsf-masthead-tagline">{tagline}</p>
            </div>

            <span className="sbn-badge sbn-badge-give">
              <Heart className="w-3 h-3 inline mr-1" />
              {name}
            </span>

            <h1 className="tsf-front-page-hed mt-6 font-display text-4xl md:text-5xl lg:text-6xl font-bold text-app leading-[1.08] tracking-tight">
              Give freely.
              <br />
              <span className="text-accent">Ask kindly.</span>
            </h1>

            <p className="mt-5 text-base lg:text-lg text-muted leading-relaxed max-w-lg">{description}</p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {principles.map((line) => (
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

            <HomeDownloadButtons onNavigate={onNavigate} />

            <p className="mt-5 text-sm font-semibold text-accent">{freeRule}</p>
          </div>

          <div className="hidden lg:block">
            <div className="sbn-hero-preview-card">
              <p className="text-[11px] font-black uppercase tracking-widest text-accent">Live in Sacramento</p>
              <div className="mt-2">
                <CommunityStatsBar items={items} variant="stacked" />
              </div>
              <div className="mt-5 pt-1">
                {HERO_FEATURES.map(({ icon: Icon, title, blurb }) => (
                  <div className="sbn-hero-preview-feature" key={title}>
                    <span className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-app">{title}</p>
                      <p className="text-xs text-muted">{blurb}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <DepthSection depth={2} className="mt-6 lg:hidden">
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">Community at a glance</p>
        <div className="sbn-card p-1">
          <CommunityStatsBar items={items} variant="full" />
        </div>
      </DepthSection>

      {onViewListing && onRequireSignIn && (
        <DepthSection depth={3} id="guest_listing_preview">
          <NewspaperSectionHead label="Classifieds" blurb="Give. Get. Share." index="Today's edition" />
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
        <NewspaperSectionHead label="From the desk" blurb="Notes from the community team." />
        <div className="sbn-card p-1">
          <LeadershipMessagesCarousel onRequireSignIn={onRequireSignIn} />
        </div>
      </DepthSection>

      <DepthSection depth={2} className="mt-6">
        <NewspaperSectionHead label="Letters" blurb="What neighbors are saying." />
        <div className="sbn-card p-1">
          <CommunityReviews
            preview
            onRequireSignIn={onRequireSignIn}
            onSeeAll={() => onNavigate('reviews')}
          />
        </div>
      </DepthSection>

      <DepthSection depth={2} className="mt-6" id="home_support_section">
        <NewspaperSectionHead label="Public notices" blurb="Keeping the paper free to print." />
        <button
          type="button"
          onClick={() => onNavigate('gofundme')}
          className="sbn-card p-6 text-left w-full hover:border-accent/40 transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
              <HandHeart className="w-6 h-6 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-accent uppercase tracking-widest">Community support</p>
              <h2 className="mt-1 font-display text-xl font-bold text-app">{copy(SUPPORT.gofundmeTitle)}</h2>
              <p className="mt-2 text-sm text-muted leading-relaxed">{copy(SUPPORT.gofundmeBlurb)}</p>
              <p className="mt-2 text-xs text-subtle leading-relaxed">{copy(SUPPORT.gofundmeCostsSummary)}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:gap-2 transition-all">
                See how to help <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </button>
      </DepthSection>

      <DepthSection depth={2} className="mt-14">
        <h2 className="font-display text-xl font-bold text-app">About the community</h2>
        <p className="mt-1 text-sm text-muted">Learn how we keep gifting local and free.</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPLORE_LINKS.map(({ route, title, blurb, icon: Icon }) => (
            <button
              key={route}
              type="button"
              onClick={() => onNavigate(route)}
              className="sbn-card p-5 text-left hover:shadow-app hover:border-accent/30 transition-all group w-full h-full"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <p className="font-display font-bold text-app">{title}</p>
              <p className="mt-1 text-sm text-muted leading-relaxed">{copy(blurb)}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:gap-2 transition-all">
                Read more <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="mt-4 w-full sbn-card p-5 text-left hover:border-accent/40 transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-display font-bold text-app">Ready to join?</p>
              <p className="mt-1 text-sm text-muted">Sign in or create a free account to post, message, and claim items.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:gap-2 transition-all">
                Get started <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </button>
      </DepthSection>
    </HomeScrollStage>
  );
}
