import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ModerationAuditEntry, UserProfile } from '../../types';
import { getModerationAuditLog } from '../../supabase';
import { canViewAuditLog, roleLabel } from '../../lib/roles';
import { debounceRealtime, subscribePostgresChanges } from '../../lib/supabaseRealtime';

interface StaffAuditViewProps {
  actor: UserProfile;
}

export default function StaffAuditView({ actor }: StaffAuditViewProps) {
  const [audit, setAudit] = useState<ModerationAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const canAudit = canViewAuditLog(actor.role);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getModerationAuditLog(150);
    setAudit(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canAudit) void load();
  }, [canAudit, load]);

  useEffect(() => {
    if (!canAudit) return;
    const refresh = debounceRealtime(() => void load(), 100);
    const unsub = subscribePostgresChanges(
      { channelName: 'staff-live-audit', table: 'moderation_audit_log', event: 'INSERT' },
      refresh,
    );
    return () => unsub();
  }, [canAudit, load]);

  if (!canAudit) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div>
          <h3 className="font-display font-bold text-app text-lg">No permission</h3>
          <p className="text-sm text-muted mt-1">Audit log is visible to City Manager and Director only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-app shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono">Staff Panel</p>
            <h2 className="font-display font-bold text-app text-lg">Audit Log</h2>
            <p className="text-xs text-muted mt-0.5">Moderation action history</p>
          </div>
          <button type="button" onClick={() => void load()} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : audit.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted">No moderation actions recorded yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          <ul className="space-y-2">
            {audit.map((entry) => {
              const actorLabel = entry.actorRole
                ? `${roleLabel(entry.actorRole as UserProfile['role'])} ${entry.actorName}`
                : entry.actorName;
              return (
                <li key={entry.id} className="sbn-help-card text-sm">
                  <div className="flex flex-wrap justify-between gap-1">
                    <span className="font-semibold text-app capitalize">{entry.action.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-muted">{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    <span className="text-app font-medium">{actorLabel}</span>
                    {' → '}
                    <span className="text-app font-medium">{entry.targetName}</span>
                  </p>
                  {entry.detail && <p className="text-xs text-subtle mt-1 leading-snug">{entry.detail}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
