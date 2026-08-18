interface FilterLabeledSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

/** Compact pill toggle — filter name + ON/OFF written on the control (chip-like row). */
export default function FilterLabeledSwitch({
  id,
  label,
  checked,
  onChange,
  ariaLabel,
}: FilterLabeledSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      onClick={() => onChange(!checked)}
      className={`sbn-filter-switch shrink-0 ${checked ? 'sbn-filter-switch-on' : ''}`}
    >
      <span className="sbn-filter-switch-state sbn-filter-switch-state-on" aria-hidden>
        ON
      </span>
      <span className="sbn-filter-switch-name">{label}</span>
      <span className="sbn-filter-switch-state sbn-filter-switch-state-off" aria-hidden>
        OFF
      </span>
      <span className="sbn-filter-switch-thumb" aria-hidden />
    </button>
  );
}
