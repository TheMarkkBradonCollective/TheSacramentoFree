import type { ReactNode } from 'react';

export type DetailFooterButton = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
  className?: string;
};

interface DetailActionFooterProps {
  actions: DetailFooterButton[];
  id?: string;
  /** Pinned bar at bottom of sheet, or inline action cluster in scroll content. */
  layout?: 'pinned' | 'inline';
}

export default function DetailActionFooter({
  actions,
  id = 'detail_primary_action_footer',
  layout = 'pinned',
}: DetailActionFooterProps) {
  if (actions.length === 0) return null;

  const primary = actions.filter((a) => a.variant !== 'secondary' && a.variant !== 'ghost');
  const secondary = actions.filter((a) => a.variant === 'secondary' || a.variant === 'ghost');

  return (
    <div
      id={id}
      className={
        layout === 'pinned'
          ? 'shrink-0 p-3 sm:p-4 sbn-glass-nav border-t border-app safe-area-pb'
          : 'space-y-2'
      }
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-2">
        {primary.length > 0 && (
          <div className={primary.length > 1 ? 'grid grid-cols-2 gap-2' : ''}>
            {primary.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`sbn-btn sbn-btn-primary w-full justify-center disabled:opacity-50 ${action.className ?? ''}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
        {secondary.length > 0 && (
          <div className={secondary.length > 1 ? 'grid grid-cols-2 gap-2' : ''}>
            {secondary.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`sbn-btn ${
                  action.variant === 'ghost' ? 'sbn-btn-ghost' : 'sbn-btn-secondary'
                } w-full justify-center disabled:opacity-50 ${action.className ?? ''}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
