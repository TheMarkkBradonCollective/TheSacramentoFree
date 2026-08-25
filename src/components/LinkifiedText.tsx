import type { ReactNode } from 'react';

const URL_PATTERN = /https?:\/\/[^\s]+|play\.google\.com\/[^\s]+/g;

function normalizeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function splitUrlSuffix(url: string): { href: string; suffix: string } {
  let href = url;
  let suffix = '';
  while (/[.,;:!?)}\]"']$/.test(href)) {
    suffix = href.slice(-1) + suffix;
    href = href.slice(0, -1);
  }
  return { href, suffix };
}

/** Plain text with https URLs as tappable, wrapping links. Preserves newlines via pre-wrap on the wrapper. */
export function linkifyPlainText(text: string, linkClassName?: string): ReactNode[] {
  if (!text) return [];

  const linkClass =
    linkClassName ??
    'text-accent underline underline-offset-2 break-all font-semibold';

  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    const { href, suffix } = splitUrlSuffix(raw);
    const normalizedHref = normalizeHref(href);
    nodes.push(
      <a
        key={`${start}-${normalizedHref}`}
        href={normalizedHref}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {href}
      </a>,
    );
    if (suffix) nodes.push(suffix);
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}

interface LinkifiedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

export default function LinkifiedText({ text, className = '', linkClassName }: LinkifiedTextProps) {
  const linkClass =
    linkClassName ??
    'text-accent underline underline-offset-2 break-all font-semibold';

  return (
    <span className={`break-words [overflow-wrap:anywhere] ${className}`.trim()}>
      {linkifyPlainText(text, linkClass)}
    </span>
  );
}
