import LabeledSwitch from './LabeledSwitch';

interface FeedFilterSwitchRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function FeedFilterSwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
}: FeedFilterSwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-app bg-inset px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-semibold text-app cursor-pointer">
          {label}
        </label>
        {description ? (
          <p className="text-[11px] text-muted mt-0.5 leading-snug">{description}</p>
        ) : null}
      </div>
      <LabeledSwitch id={id} checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  );
}
