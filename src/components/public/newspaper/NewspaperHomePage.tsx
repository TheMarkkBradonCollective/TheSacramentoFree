import { ArrowRight, FileText, HandHeart, Heart, MapPin, Shield, Sparkles, Star, Users } from 'lucide-react';
import LeadershipMessagesCarousel from '../../LeadershipMessagesCarousel';
import CommunityReviews from '../../CommunityReviews';
import CommunityStatsBar from '../../CommunityStatsBar';
import HomeDownloadButtons from '../HomeDownloadButtons';
import NewspaperMasthead from './NewspaperMasthead';
import NewspaperClassifieds from './NewspaperClassifieds';
import { SITE, SUPPORT, HOW_IT_WORKS } from '../../../siteContent';
import { NEWSPAPER } from '../../../preview/newspaperBrand';
import type { PublicRoute } from '../../../public/routes';
import { ItemPost } from '../../../types';

interface NewspaperHomePageProps {
  onNavigate: (route: PublicRoute) => void;
  items?: ItemPost[];
  isItemsLoading?: boolean;
  onViewListing?: (item: ItemPost) => void;
  onRequireSignIn?: () => void;
}

const EXPLORE_LINKS: { route: PublicRoute; title: string; blurb: string; icon: typeof Heart; section: string }[] = [
  { route: 'about', title: 'What we are', blurb: 'Local free gifting — no money, just neighbors.', icon: Heart, section: 'A1' },
  { route: 'how-it-works', title: 'How it works', blurb: 'Post, connect, porch pickup — four simple steps.', icon: Users, section: 'A2' },
  { route: 'rules', title: 'House rules', blurb: "What's allowed and what isn't.", icon: Shield, section: 'A3' },
  { route: 'community', title: 'Why it matters', blurb: 'Trust, mutual aid, and less waste in Sacramento.', icon: Users, section: 'B1' },
  { route: 'reviews', title: 'Letters', blurb: 'See what members think of the paper and our team.', icon: Star, section: 'B2' },
  { route: 'updates', title: 'Dispatches', blurb: 'Features, fixes, and improvements — with dates.', icon: Sparkles, section: 'B3' },
  { route: 'privacy', title: 'Privacy & data', blurb: 'Your data is stored by Supabase — never sold.', icon: Shield, section: 'C1' },
  { route: 'terms', title: 'Terms of use', blurb: 'User agreement for free local gifting in Sacramento.', icon: FileText, section: 'C2' },
  { route: 'gofundme', title: 'Keep the presses running', blurb: 'Help keep The Sacramento Free — no ads, ever.', icon: HandHeart, section: 'C3' },
  { route: 'neighborhoods', title: 'The city desk', blurb: 'Midtown, Elk Grove, Davis, Roseville, and 39 areas.', icon: MapPin, section: 'D1' },
];

export default function NewspaperHomePage({
  onNavigate,
  items = [],
  isItemsLoading = false,
  onViewListing,
  onRequireSignIn,
}: NewspaperHomePageProps) {
  return (
    <div className="tsf-edition">
      <NewspaperMasthead />

      <div className="tsf-front">
        <article className="tsf-lead">
          <p className="tsf-kicker">{NEWSPAPER.kicker}</p>
          <h2 className="tsf-lead-hed">
            Give freely.
            <br />
            Ask kindly.
          </h2>
          <p className="tsf-lead-deck">{NEWSPAPER.leadDeck}</p>
          <div className="tsf-lead-body">
            <p>{SITE.description}</p>
            <p>
              {SITE.principles.join(' ')} {SITE.freeRule}
            </p>
          </div>
          <ul className="tsf-principles">
            {SITE.principles.map((line) => (
              <li key={line}>{line.replace(/\.$/, '')}</li>
            ))}
          </ul>
          <div className="tsf-lead-actions">
            <button type="button" onClick={() => onNavigate('login')} className="sbn-btn sbn-btn-primary">
              {NEWSPAPER.subscribeCta}
            </button>
            <button type="button" onClick={() => onNavigate('about')} className="sbn-btn sbn-btn-secondary">
              {NEWSPAPER.learnCta}
            </button>
          </div>
          <HomeDownloadButtons onNavigate={onNavigate} />
        </article>

        <aside className="tsf-rail">
          <section className="tsf-rail-box">
            <h3 className="tsf-rail-hed">{NEWSPAPER.weatherHed}</h3>
            <CommunityStatsBar items={items} variant="stacked" />
          </section>
          <section className="tsf-rail-box">
            <h3 className="tsf-rail-hed">How this paper works</h3>
            <ol className="tsf-briefs">
              {HOW_IT_WORKS.map((step) => (
                <li key={step.step}>
                  <span>{String(step.step).padStart(2, '0')}</span>
                  <div>
                    <p>{step.title}</p>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="tsf-rail-box tsf-subscribe-box">
            <h3 className="tsf-rail-hed">{NEWSPAPER.subscribeHed}</h3>
            <p>{NEWSPAPER.subscribeBody}</p>
            <button type="button" onClick={() => onNavigate('login')} className="sbn-btn sbn-btn-primary w-full mt-3">
              {NEWSPAPER.subscribeCta}
            </button>
          </section>
        </aside>
      </div>

      {onViewListing && onRequireSignIn && (
        <NewspaperClassifieds
          items={items}
          isLoading={isItemsLoading}
          onViewItem={onViewListing}
          onRequireSignIn={onRequireSignIn}
        />
      )}

      <section className="tsf-section">
        <p className="tsf-kicker">Opinion</p>
        <h2 className="tsf-section-hed">{NEWSPAPER.editorHed}</h2>
        <div className="tsf-rule-block">
          <LeadershipMessagesCarousel onRequireSignIn={onRequireSignIn} />
        </div>
      </section>

      <section className="tsf-section">
        <p className="tsf-kicker">Correspondence</p>
        <h2 className="tsf-section-hed">{NEWSPAPER.lettersHed}</h2>
        <div className="tsf-rule-block">
          <CommunityReviews preview onRequireSignIn={onRequireSignIn} onSeeAll={() => onNavigate('reviews')} />
        </div>
      </section>

      <section className="tsf-section">
        <button type="button" onClick={() => onNavigate('gofundme')} className="tsf-notice w-full text-left group">
          <p className="tsf-kicker">{NEWSPAPER.noticesHed}</p>
          <h2 className="tsf-section-hed">{SUPPORT.gofundmeTitle}</h2>
          <p className="tsf-section-dek">{SUPPORT.gofundmeBlurb.replace('Sacramento Buy Nothing', NEWSPAPER.name)}</p>
          <p className="mt-2 text-xs text-subtle leading-relaxed">{SUPPORT.gofundmeCostsSummary}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:gap-2 transition-all">
            See how to help the presses <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </section>

      <section className="tsf-section">
        <p className="tsf-kicker">Index</p>
        <h2 className="tsf-section-hed">{NEWSPAPER.insideHed}</h2>
        <p className="tsf-section-dek">Jump to the sections that keep this community gazette running.</p>
        <div className="tsf-index">
          {EXPLORE_LINKS.map(({ route, title, blurb, section }) => (
            <button key={route} type="button" onClick={() => onNavigate(route)} className="tsf-index-item">
              <span className="tsf-index-folio">{section}</span>
              <span className="tsf-index-title">{title}</span>
              <span className="tsf-index-blurb">{blurb}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
