interface LabeledSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name when no visible row label is associated. */
  ariaLabel?: string;
  disabled?: boolean;
}

export default function LabeledSwitch({
  id,
  checked,
  onChange,
  ariaLabel,
  disabled = false,
}: LabeledSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`sbn-labeled-switch shrink-0 ${checked ? 'sbn-labeled-switch-on' : ''}`}
    >
      <span className="sbn-labeled-switch-label sbn-labeled-switch-label-on" aria-hidden>
        ON
      </span>
      <span className="sbn-labeled-switch-label sbn-labeled-switch-label-off" aria-hidden>
        OFF
      </span>
      <span className="sbn-labeled-switch-thumb" aria-hidden />
    </button>
  );
}
