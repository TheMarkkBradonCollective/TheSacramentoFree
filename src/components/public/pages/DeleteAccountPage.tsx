import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import { DELETE_ACCOUNT } from '../../../siteContent';
import { publicRouteHref } from '../../../public/routes';

export default function DeleteAccountPage() {
  return (
    <PublicPageShell
      title={DELETE_ACCOUNT.title}
      subtitle={`How to request account deletion — last updated ${DELETE_ACCOUNT.lastUpdated}.`}
    >
      <PublicCard>
        <div className="space-y-6 text-app">
          <p className="text-muted leading-relaxed">{DELETE_ACCOUNT.summary}</p>

          <section>
            <h2 className="text-lg font-bold text-app mb-3">How to delete your account</h2>
            <ol className="list-decimal pl-5 space-y-2 text-muted">
              {DELETE_ACCOUNT.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-app mb-3">Data deleted with your account</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted">
              {DELETE_ACCOUNT.deletedData.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-app mb-3">Data that may be kept</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted">
              {DELETE_ACCOUNT.retainedData.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-muted leading-relaxed">{DELETE_ACCOUNT.retentionNote}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-app mb-3">Need help?</h2>
            <p className="text-muted leading-relaxed">{DELETE_ACCOUNT.supportNote}</p>
          </section>

          <p className="text-sm text-subtle">
            <a href={publicRouteHref('privacy')} className="text-accent hover:underline">
              {DELETE_ACCOUNT.privacyLinkLabel}
            </a>
          </p>
        </div>
      </PublicCard>
    </PublicPageShell>
  );
}
