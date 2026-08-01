import type { ReactNode } from 'react';

interface HomeScrollStageProps {
  children: ReactNode;
}

/** Layout wrapper for the public home page (no scroll/pointer 3D effects). */
export default function HomeScrollStage({ children }: HomeScrollStageProps) {
  return (
    <div className="home-scroll-stage relative max-w-5xl lg:max-w-6xl mx-auto px-4 py-8 md:py-16">
      <div className="home-scroll-stage__content">{children}</div>
    </div>
  );
}

interface DepthSectionProps {
  children: ReactNode;
  /** Kept for call-site compatibility; no longer drives 3D transforms. */
  depth?: number;
  className?: string;
  id?: string;
}

/** Plain section wrapper (depth prop retained for compatibility). */
export function DepthSection({ children, className = '', id }: DepthSectionProps) {
  return (
    <section id={id} className={`home-scroll-stage__section ${className}`.trim()}>
      {children}
    </section>
  );
}
