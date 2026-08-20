interface FilterLabeledSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  compact?: boolean;
}

/** Compact pill toggle — filter name on the track; ON/OFF only inside the thumb circle. */
export default function FilterLabeledSwitch({
  id,
  label,
  checked,
  onChange,
  ariaLabel,
  compact = false,
}: FilterLabeledSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      onClick={() => onChange(!checked)}
      className={`sbn-filter-switch shrink-0 ${checked ? 'sbn-filter-switch-on' : ''} ${
        compact ? 'sbn-filter-switch-compact' : ''
      }`}
    >
      <span className="sbn-filter-switch-name">{label}</span>
      <span className="sbn-filter-switch-thumb" aria-hidden>
        {checked ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
