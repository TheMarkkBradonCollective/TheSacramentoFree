import React from 'react';

export default function PublicCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-surface border border-app rounded-2xl p-5 md:p-6 ${className}`}>{children}</section>
  );
}
