import type { ReactNode } from 'react';

export default function PublicCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`sbn-card p-5 md:p-6 ${className}`}>{children}</section>;
}
