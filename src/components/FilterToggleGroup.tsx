export interface FilterToggleOption<T extends string> {
  value: T;
  label: string;
  id?: string;
}

interface FilterToggleGroupProps<T extends string> {
  id: string;
  ariaLabel: string;
  options: FilterToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  compact?: boolean;
  wrap?: boolean;
}

/** Mutually exclusive filter pills — same ON/OFF thumb design as FilterLabeledSwitch. */
export default function FilterToggleGroup<T extends string>({
  id,
  ariaLabel,
  options,
  value,
  onChange,
  className = '',
  compact = false,
  wrap = false,
}: FilterToggleGroupProps<T>) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`sbn-filter-toggle-group ${wrap ? 'sbn-filter-toggle-group-wrap' : ''} ${className}`.trim()}
    >
      {options.map(({ value: optionValue, label, id: optionId }) => {
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            id={optionId ?? `${id}_${optionValue}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optionValue)}
            className={`sbn-filter-switch shrink-0 ${selected ? 'sbn-filter-switch-on' : ''} ${
              compact ? 'sbn-filter-switch-compact' : ''
            }`}
          >
            <span className="sbn-filter-switch-name">{label}</span>
            <span className="sbn-filter-switch-thumb" aria-hidden>
              {selected ? 'ON' : 'OFF'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
