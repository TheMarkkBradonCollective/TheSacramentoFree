import { HOW_IT_WORKS } from '../../../siteContent';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { useNewspaperSkin } from '../../../preview/NewspaperSkinContext';

export default function HowItWorksPage() {
  const { enabled: newspaper } = useNewspaperSkin();
  return (
    <PublicPageShell
      title={newspaper ? 'How this paper works' : 'How it works'}
      subtitle={
        newspaper
          ? 'Four steps to give, request, and pick up — always 100% free, like the rest of the gazette.'
          : 'Four steps to give, request, and pick up — always 100% free.'
      }
    >
      <PublicCard>
        <ol className="space-y-6">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.step} className="text-sm">
              <p className="font-black text-accent text-base">
                {step.step}. {step.title}
              </p>
              <p className="text-muted mt-1 leading-relaxed">{step.body}</p>
              {'examples' in step && step.examples && (
                <p className="text-muted text-xs mt-2 bg-inset rounded-lg p-3 border border-app">
                  <span className="font-bold text-app">Examples: </span>
                  {step.examples.join(' · ')}
                </p>
              )}
              {'bullets' in step && step.bullets && (
                <ul className="mt-2 text-muted text-xs space-y-1 list-disc list-inside">
                  {step.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </PublicCard>
    </PublicPageShell>
  );
}
