import { GOGET_TOUR_STEPS, WEBSITE_TOUR_SHOTS, appScreenshotSrc } from '../../lib/appScreenshotTour';
import { SITE } from '../../siteContent';
import PublicCard from './PublicCard';

function PhoneShot({
  file,
  title,
  size = 'sm',
}: {
  file: string;
  title: string;
  size?: 'sm' | 'md';
}) {
  const width = size === 'md' ? 'w-[200px] sm:w-[228px]' : 'w-[148px] sm:w-[168px]';
  return (
    <div className={`${width} shrink-0`}>
      <div className="rounded-[1.35rem] overflow-hidden border border-app shadow-lg bg-black/5">
        <img
          src={appScreenshotSrc(file)}
          alt={title}
          width={1080}
          height={1920}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default function AppScreenshotTour() {
  return (
    <div className="space-y-4" id="download_app_tour">
      <PublicCard>
        <p className="text-[10px] font-black uppercase tracking-widest text-accent">Website or app?</p>
        <h2 className="text-lg font-black text-app mt-1">See what you get before you install</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          {SITE.shortName} in the browser is the free Sacramento giveaway community: browse Stuff, post, message
          neighbors, and arrange a porch pickup yourselves. The <strong className="text-app">Android app</strong> is
          that same community plus live Go Get pickup — both people locked onto a map, like Uber, until the item
          changes hands. Scroll the shots, then decide. If you only want to browse and chat, stay on the website.
        </p>
        <button
          type="button"
          onClick={() => {
            document.getElementById('download_install')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="inline-flex mt-3 text-xs font-bold text-accent hover:underline"
        >
          Skip to install
        </button>
      </PublicCard>

      <PublicCard>
        <h2 className="text-sm font-black text-app">On the website — no download needed</h2>
        <p className="text-xs text-muted mt-1 mb-4 leading-relaxed">
          Sign in from any browser. Give, ask, map, events, and messages all work here. You will not get the locked
          Uber-style trip screens — those are Android-app only. These eight shots are the community you already have.
        </p>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {WEBSITE_TOUR_SHOTS.map((shot) => (
            <figure key={shot.file} className="snap-start shrink-0 w-[148px] sm:w-[168px]">
              <PhoneShot file={shot.file} title={shot.title} />
              <figcaption className="mt-2">
                <p className="text-xs font-bold text-app">{shot.title}</p>
                <p className="text-[11px] text-muted leading-snug mt-0.5">{shot.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </PublicCard>

      <PublicCard>
        <p className="text-[10px] font-black uppercase tracking-widest text-accent">Android app only</p>
        <h2 className="text-sm font-black text-app mt-1">How Go Get works — both sides of the trip</h2>
        <p className="text-xs text-muted mt-2 mb-5 leading-relaxed">
          This is the difference. One neighbor heads over (turn-by-turn, like an Uber driver). The other waits at the
          pin and watches them arrive (live map, like an Uber rider). Both stay on that screen until they cancel or
          confirm the handoff. Fictional neighbors in these shots — never live member data.
        </p>
        <ol className="space-y-8">
          {GOGET_TOUR_STEPS.map((step, index) => (
            <li
              key={step.file}
              className={`flex flex-col sm:flex-row gap-4 sm:gap-6 items-start ${
                index % 2 === 1 ? 'sm:flex-row-reverse' : ''
              }`}
            >
              <PhoneShot file={step.file} title={step.title} size="md" />
              <div className="min-w-0 sm:pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Step {index + 1} of 8</p>
                <p className="text-sm font-black text-app leading-snug mt-1">{step.title}</p>
                <p className="text-xs text-muted mt-2 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-app font-semibold mt-6 leading-relaxed bg-inset border border-app rounded-xl px-4 py-3">
          Want that live pickup? Install the Android app below. Happy to keep using the site? You already can — skip
          the download and stay in the browser.
        </p>
      </PublicCard>
    </div>
  );
}
