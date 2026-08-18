import type { ComponentProps } from 'react';
import { trackAppDownloadFromHref } from '../lib/deviceTracking';

type TrackedDownloadLinkProps = Omit<ComponentProps<'a'>, 'href' | 'onClick'> & {
  href: string;
};

export default function TrackedDownloadLink({ href, onClick, ...rest }: TrackedDownloadLinkProps) {
  return (
    <a
      href={href}
      onClick={(event) => {
        void trackAppDownloadFromHref(href);
        onClick?.(event);
      }}
      {...rest}
    />
  );
}
