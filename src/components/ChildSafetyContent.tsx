import { Shield } from 'lucide-react';
import { CHILD_SAFETY, SITE } from '../siteContent';

interface ChildSafetyContentProps {
  compact?: boolean;
  showHeader?: boolean;
}

export default function ChildSafetyContent({ compact = false, showHeader = true }: ChildSafetyContentProps) {
  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {showHeader && (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-display font-bold text-app text-lg">{CHILD_SAFETY.title}</h2>
            <p className="text-xs text-muted mt-1">Last updated {CHILD_SAFETY.lastUpdated}</p>
          </div>
        </div>
      )}

      <p className="text-sm text-muted font-semibold leading-relaxed">{CHILD_SAFETY.summary}</p>

      <div className="space-y-5">
        {CHILD_SAFETY.sections.map((section) => (
          <section key={section.heading}>
            <h3 className="text-sm font-bold text-app mb-2">{section.heading}</h3>
            {'body' in section && section.body ? (
              <p className="text-sm text-muted font-semibold leading-relaxed">{section.body}</p>
            ) : null}
            {'bullets' in section && section.bullets ? (
              <ul className="mt-2 space-y-2 text-sm text-muted font-semibold leading-relaxed list-disc pl-5">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p className="text-xs text-subtle font-semibold leading-relaxed border-t border-app pt-4">
        {SITE.name} — published child safety standards against CSAE.
      </p>
    </div>
  );
}
