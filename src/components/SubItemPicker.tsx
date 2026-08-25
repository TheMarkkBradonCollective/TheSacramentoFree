import { ListingSubItem } from '../types';

interface SubItemPickerProps {
  subitems: ListingSubItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Claimers pick one item per trip; posters confirming can pick one at a time. */
  selectionMode?: 'single' | 'multiple';
}

export default function SubItemPicker({
  subitems,
  selectedIds,
  onChange,
  disabled,
  selectionMode = 'single',
}: SubItemPickerProps) {
  const available = subitems.filter((s) => s.status === 'available');

  if (available.length === 0) {
    return <p className="text-xs text-muted">Nothing left to claim on this listing.</p>;
  }

  const selectOne = (id: string) => {
    if (disabled) return;
    onChange([id]);
  };

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      {selectionMode === 'single' && available.length > 1 && (
        <p className="text-xs text-muted">Pick the one item you took — you can come back for others later.</p>
      )}
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
                  type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                  name={selectionMode === 'single' ? 'subitem-pick' : undefined}
                  className={
                    selectionMode === 'single'
                      ? 'border-app text-accent focus:ring-accent'
                      : 'rounded border-app text-accent focus:ring-accent'
                  }
                  checked={checked}
                  disabled={disabled}
                  onChange={() => (selectionMode === 'single' ? selectOne(sub.id) : toggle(sub.id))}
                />
                <span className="text-sm text-app font-medium">{sub.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function subItemStatusLabel(status: ListingSubItem['status']): string {
  if (status === 'claimed') return 'Claimed';
  if (status === 'pending_pickup') return 'Pending';
  return 'Available';
}

function subItemStatusClass(status: ListingSubItem['status']): string {
  if (status === 'claimed') return 'bg-muted/20 text-muted';
  if (status === 'pending_pickup') return 'bg-accent/10 text-accent';
  return 'bg-emerald-500/10 text-emerald-500';
}

export function SubItemAvailabilityList({ subitems }: { subitems: ListingSubItem[] }) {
  if (subitems.length === 0) return null;

  const claimed = subitems.filter((s) => s.status === 'claimed').length;
  const pending = subitems.filter((s) => s.status === 'pending_pickup').length;

  return (
    <section className="sbn-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Items in this post</h3>
        <span className="text-[10px] font-bold text-muted">
          {claimed}/{subitems.length} claimed
          {pending > 0 ? ` · ${pending} pending` : ''}
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
              className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${subItemStatusClass(sub.status)}`}
            >
              {subItemStatusLabel(sub.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
