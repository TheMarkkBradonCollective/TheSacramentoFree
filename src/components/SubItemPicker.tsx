import { ListingSubItem } from '../types';

interface SubItemPickerProps {
  subitems: ListingSubItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export default function SubItemPicker({ subitems, selectedIds, onChange, disabled }: SubItemPickerProps) {
  const available = subitems.filter((s) => s.status === 'available');

  if (available.length === 0) {
    return <p className="text-xs text-muted">Nothing left to claim on this listing.</p>;
  }

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <ul className="space-y-1.5">
      {available.map((sub) => {
        const checked = selectedIds.includes(sub.id);
        return (
          <li key={sub.id}>
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                checked ? 'border-accent bg-accent/5' : 'border-app bg-surface'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-inset/50'}`}
            >
              <input
                type="checkbox"
                className="rounded border-app text-accent focus:ring-accent"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(sub.id)}
              />
              <span className="text-sm text-app font-medium">{sub.label}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function SubItemAvailabilityList({ subitems }: { subitems: ListingSubItem[] }) {
  if (subitems.length === 0) return null;

  const claimed = subitems.filter((s) => s.status === 'claimed').length;

  return (
    <section className="sbn-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Items in this post</h3>
        <span className="text-[10px] font-bold text-muted">
          {claimed}/{subitems.length} claimed
        </span>
      </div>
      <ul className="space-y-1">
        {subitems.map((sub) => (
          <li
            key={sub.id}
            className={`text-sm flex items-center justify-between gap-2 py-1 ${
              sub.status === 'claimed' ? 'text-muted line-through' : 'text-app'
            }`}
          >
            <span>{sub.label}</span>
            <span
              className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                sub.status === 'claimed'
                  ? 'bg-muted/20 text-muted'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}
            >
              {sub.status === 'claimed' ? 'Claimed' : 'Available'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
