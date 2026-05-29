import React from 'react';

interface PublicPageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function PublicPageShell({ title, subtitle, children }: PublicPageShellProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-app tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted leading-relaxed">{subtitle}</p>}
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
