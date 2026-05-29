import { ArrowRight, Heart, MapPin, Shield, Users } from 'lucide-react';
import { SITE } from '../../../siteContent';
import type { PublicRoute } from '../../../public/routes';

interface HomePageProps {
  onNavigate: (route: PublicRoute) => void;
}

const EXPLORE_LINKS: { route: PublicRoute; title: string; blurb: string; icon: typeof Heart }[] = [
  { route: 'about', title: 'What we are', blurb: 'Local free gifting — no money, just neighbors.', icon: Heart },
  { route: 'how-it-works', title: 'How it works', blurb: 'Post, connect, porch pickup — four simple steps.', icon: Users },
  { route: 'rules', title: 'Community rules', blurb: "What's allowed and what isn't.", icon: Shield },
  { route: 'neighborhoods', title: 'Sacramento areas', blurb: 'Midtown, Land Park, Natomas, and more.', icon: MapPin },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-accent text-xs font-bold uppercase tracking-wider">
        <Heart className="w-3.5 h-3.5" />
        {SITE.name}
      </div>

      <h1 className="mt-5 text-3xl md:text-4xl font-black text-app leading-tight tracking-tight">
        Give freely. Ask kindly.
        <span className="block text-accent mt-1">Neighbors helping neighbors.</span>
      </h1>

      <p className="mt-4 text-sm md:text-base text-muted leading-relaxed max-w-xl">
        {SITE.description}
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {SITE.principles.map((line) => (
          <li
            key={line}
            className="px-3 py-1 rounded-full bg-inset border border-app text-xs font-bold text-muted"
          >
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="px-6 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-sm font-black uppercase tracking-wide"
        >
          Sign in or join
        </button>
        <button
          type="button"
          onClick={() => onNavigate('about')}
          className="px-6 py-3.5 rounded-xl border border-app bg-surface text-app text-sm font-bold hover:bg-inset transition-colors"
        >
          Learn about the project
        </button>
      </div>

      <p className="mt-6 text-xs font-bold text-accent">{SITE.freeRule}</p>

      <h2 className="mt-12 text-lg font-black text-app">Explore before you join</h2>
      <p className="mt-1 text-sm text-muted">No account needed to read about the community.</p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPLORE_LINKS.map(({ route, title, blurb, icon: Icon }) => (
          <button
            key={route}
            type="button"
            onClick={() => onNavigate(route)}
            className="text-left p-4 rounded-2xl bg-surface border border-app hover:border-[#FF4500]/40 transition-colors group"
          >
            <Icon className="w-5 h-5 text-accent mb-2" />
            <p className="font-black text-app text-sm">{title}</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">{blurb}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent group-hover:gap-2 transition-all">
              Read more <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onNavigate('community')}
        className="mt-3 w-full p-4 rounded-2xl bg-inset border border-app text-left hover:border-[#FF4500]/30 transition-colors"
      >
        <p className="font-black text-sm text-app">Why community matters</p>
        <p className="mt-1 text-xs text-muted">Trust, mutual aid, and less waste in Sacramento.</p>
      </button>
    </div>
  );
}
