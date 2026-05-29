import React from 'react';

interface PublicPageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function PublicPageShell({ title, subtitle, children }: PublicPageShellProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-12">
      <header className="sbn-page-header">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
