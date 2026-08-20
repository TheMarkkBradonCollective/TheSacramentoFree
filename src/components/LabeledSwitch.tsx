interface LabeledSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Label shown when checked (default ON). */
  onLabel?: string;
  /** Label shown when unchecked (default OFF). */
  offLabel?: string;
  /** Accessible name when no visible row label is associated. */
  ariaLabel?: string;
  disabled?: boolean;
}

export default function LabeledSwitch({
  id,
  checked,
  onChange,
  onLabel = 'ON',
  offLabel = 'OFF',
  ariaLabel,
  disabled = false,
}: LabeledSwitchProps) {
  const customLabels = onLabel !== 'ON' || offLabel !== 'OFF';

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? (checked ? onLabel : offLabel)}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`sbn-labeled-switch shrink-0 ${checked ? 'sbn-labeled-switch-on' : ''} ${customLabels ? 'sbn-labeled-switch-custom' : ''}`}
    >
      <span className="sbn-labeled-switch-label sbn-labeled-switch-label-on" aria-hidden>
        {onLabel}
      </span>
      <span className="sbn-labeled-switch-label sbn-labeled-switch-label-off" aria-hidden>
        {offLabel}
      </span>
      <span className="sbn-labeled-switch-thumb" aria-hidden />
    </button>
  );
}
