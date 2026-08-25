import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  /** Show interactive half-star picker */
  interactive?: boolean;
  onChange?: (value: number) => void;
  label?: string;
}

function starFillState(starIndex: number, value: number): 'empty' | 'half' | 'full' {
  const threshold = starIndex + 1;
  if (value >= threshold) return 'full';
  if (value >= threshold - 0.5) return 'half';
  return 'empty';
}

export default function StarRating({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  label,
}: StarRatingProps) {
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  const setRating = (next: number) => {
    if (!interactive || !onChange) return;
    onChange(Math.max(0, Math.min(max, Math.round(next * 2) / 2)));
  };

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={interactive ? 'slider' : 'img'}
      aria-label={label || `${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, index) => {
        const state = starFillState(index, value);

        if (!interactive) {
          return (
            <span key={index} className="relative inline-flex">
              <Star className={`${iconClass} text-muted/30`} aria-hidden />
              {state !== 'empty' && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: state === 'half' ? '50%' : '100%' }}
                >
                  <Star className={`${iconClass} text-accent fill-accent`} aria-hidden />
                </span>
              )}
            </span>
          );
        }

        return (
          <span key={index} className="relative inline-flex">
            <button
              type="button"
              className="absolute left-0 top-0 h-full w-1/2 z-10"
              aria-label={`${index + 0.5} stars`}
              onClick={() => setRating(index + 0.5)}
            />
            <button
              type="button"
              className="absolute right-0 top-0 h-full w-1/2 z-10"
              aria-label={`${index + 1} stars`}
              onClick={() => setRating(index + 1)}
            />
            <Star className={`${iconClass} text-muted/30 pointer-events-none`} aria-hidden />
            {state !== 'empty' && (
              <span
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: state === 'half' ? '50%' : '100%' }}
              >
                <Star className={`${iconClass} text-accent fill-accent`} aria-hidden />
              </span>
            )}
          </span>
        );
      })}
      {interactive && (
        <span className="ml-1.5 text-xs font-semibold text-muted tabular-nums">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
