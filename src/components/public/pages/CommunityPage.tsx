import {
  COMMUNITY_FIRST,
  COMMUNITY_HIGHLIGHTS,
  COMMUNITY_VALUES,
  SITE,
  WHY_IT_MATTERS,
} from '../../../siteContent';
import { usePublicRoute } from '../../../public/usePublicRoute';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { useBrand } from '../../../preview/useBrand';
import { NEWSPAPER } from '../../../preview/newspaperBrand';

export default function CommunityPage() {
  const { navigate } = usePublicRoute();
  const { newspaper, copy } = useBrand();
  return (
    <PublicPageShell
      title={newspaper ? 'The community gazette' : 'Community'}
      subtitle={newspaper ? NEWSPAPER.tagline : SITE.tagline}
    >
      <PublicCard>
        <h2 className="text-lg font-black text-app">{copy(WHY_IT_MATTERS.title)}</h2>
        <p className="mt-2 text-sm text-muted font-semibold">{copy(WHY_IT_MATTERS.intro)}</p>
        <ul className="mt-3 text-sm text-muted space-y-1.5 font-semibold">
          {WHY_IT_MATTERS.points.map((point) => (
            <li key={point}>{copy(point)}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-app font-bold">{copy(WHY_IT_MATTERS.closing)}</p>
      </PublicCard>

      <PublicCard>
        <h2 className="text-lg font-black text-app">{COMMUNITY_FIRST.title}</h2>
        <p className="mt-2 text-sm text-muted">{COMMUNITY_FIRST.intro}</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMMUNITY_VALUES.map((value) => (
            <div
              key={value}
              className="px-3 py-2 text-center rounded-xl bg-inset border border-app text-xs font-black uppercase tracking-wider text-muted"
            >
              {value}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">{COMMUNITY_FIRST.closing}</p>
      </PublicCard>

      <PublicCard>
        <h2 className="text-lg font-black text-app">What&apos;s new</h2>
        <p className="mt-2 text-sm text-muted">
          See everything we&apos;ve shipped — features, fixes, and improvements — with dates.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('updates')}
            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
          >
            View updates
          </button>
          <button
            type="button"
            onClick={() => navigate('reviews')}
            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
          >
            Read reviews
          </button>
        </div>
      </PublicCard>

      <PublicCard>
        <h2 className="text-lg font-black text-app">What neighbors get</h2>
        <p className="mt-2 text-sm text-muted">Tools already in the app for free local gifting:</p>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COMMUNITY_HIGHLIGHTS.map((feature) => (
            <li
              key={feature}
              className="px-3 py-2 rounded-xl bg-inset border border-app text-xs font-semibold text-muted list-none"
            >
              {feature}
            </li>
          ))}
        </ul>
      </PublicCard>

      <PublicCard>
        <h2 className="text-lg font-black text-app">{newspaper ? 'Join the paper' : SITE.joinCta.title}</h2>
        {SITE.joinCta.lines.map((line) => (
          <p key={line} className="mt-2 text-sm text-muted font-semibold">
            {line}
          </p>
        ))}
        <button
          type="button"
          onClick={() => navigate('login')}
          className="sbn-btn sbn-btn-primary sbn-btn-sm mt-4"
        >
          Sign in or join
        </button>
      </PublicCard>
    </PublicPageShell>
  );
}
