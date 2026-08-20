import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import FilterLabeledSwitch from './FilterLabeledSwitch';

interface CollapsibleFilterSectionProps {
  id: string;
  title: string;
  icon?: LucideIcon;
  /** Non-default selections in this group (shown in master label when > 0). */
  activeCount?: number;
  /** When true, child toggles start visible. Defaults to true when activeCount > 0. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Master ON/OFF pill per filter group — expands or collapses the toggles underneath. */
export default function CollapsibleFilterSection({
  id,
  title,
  icon: Icon,
  activeCount = 0,
  defaultOpen,
  children,
}: CollapsibleFilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen ?? activeCount > 0);
  const masterLabel = activeCount > 0 ? `${title} · ${activeCount}` : title;

  return (
    <div className="space-y-1.5" id={id}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {Icon ? <Icon className="w-3 h-3 shrink-0 text-muted" aria-hidden /> : null}
        <FilterLabeledSwitch
          id={`${id}_master`}
          label={masterLabel}
          checked={open}
          onChange={setOpen}
          ariaLabel={`${open ? 'Hide' : 'Show'} ${title}`}
        />
      </div>
      {open ? children : null}
    </div>
  );
}
