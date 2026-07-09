import { useState, useCallback } from 'react';
import type { UserProfile } from '../types';
import {
  roleRank,
  canStaffSuspend,
  canStaffBan,
  canStaffEditUser,
  canStaffDeleteAccount,
  isDirectorRole,
  canViewAuditLog,
  isStaffRole,
  normalizeUserRole,
} from '../lib/roles';

/**
 * Returns a `check` function. Call it before any privileged staff action —
 * it returns `true` if allowed, or `false` and opens the "No permission" modal.
 *
 * Also exports the modal open state + reason so the caller can render
 * `<NoPermissionModal open={noPermOpen} reason={noPermReason} onClose={closeNoPerm} />`.
 */
export function useStaffPermission(actor: UserProfile) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const deny = useCallback((msg?: string) => {
    setReason(msg);
    setOpen(true);
    return false;
  }, []);

  const close = useCallback(() => setOpen(false), []);

  /**
   * Generic permission gate. Returns `true` if `allowed` is truthy, otherwise
   * shows the modal with `denyMessage` and returns `false`.
   */
  const check = useCallback(
    (allowed: boolean, denyMessage?: string): boolean => {
      if (allowed) return true;
      return deny(denyMessage);
    },
    [deny],
  );

  // ---- Convenience wrappers ------------------------------------------------

  /** Can the actor take ANY moderation action on `target`? */
  const canActOn = useCallback(
    (target: Pick<UserProfile, 'uid' | 'role'>): boolean => {
      if (!isStaffRole(actor.role)) return false;
      // Cannot act on yourself
      if (target.uid === actor.uid) return false;
      // Cannot act on equals or higher-ranked staff
      if (roleRank(target.role) >= roleRank(actor.role)) return false;
      return true;
    },
    [actor.role, actor.uid],
  );

  const checkSuspend = useCallback(
    (target: Pick<UserProfile, 'uid' | 'role'>) => {
      if (!canActOn(target))
        return deny(
          target.uid === actor.uid
            ? "You can't moderate yourself."
            : roleRank(target.role) >= roleRank(actor.role)
              ? "You can't moderate someone at or above your rank."
              : "Your role can't perform this action.",
        );
      return check(canStaffSuspend(actor.role), 'Your role cannot suspend neighbors.');
    },
    [actor.role, actor.uid, canActOn, check, deny],
  );

  const checkBan = useCallback(
    (target: Pick<UserProfile, 'uid' | 'role'>) => {
      if (!canActOn(target))
        return deny(
          target.uid === actor.uid
            ? "You can't moderate yourself."
            : "You can't moderate someone at or above your rank.",
        );
      return check(canStaffBan(actor.role), 'Only City Administrator and above can ban neighbors.');
    },
    [actor.role, canActOn, check, deny],
  );

  const checkEditUser = useCallback(
    (target: Pick<UserProfile, 'uid' | 'role'>) => {
      if (!canActOn(target))
        return deny(
          target.uid === actor.uid
            ? "You can't edit your own profile here — use Account settings."
            : "You can't edit someone at or above your rank.",
        );
      return check(canStaffEditUser(actor.role), 'Only City Manager and above can edit profiles.');
    },
    [actor.role, canActOn, check, deny],
  );

  const checkDeleteAccount = useCallback(
    (target: Pick<UserProfile, 'uid' | 'role'>) => {
      if (!canActOn(target))
        return deny(
          target.uid === actor.uid
            ? "You can't delete your own account here — use Account settings."
            : "You can't delete someone at or above your rank.",
        );
      return check(
        canStaffDeleteAccount(actor.role),
        'Only City Manager and above can permanently delete accounts.',
      );
    },
    [actor.role, canActOn, check, deny],
  );

  const checkAssignRole = useCallback(
    (target: Pick<UserProfile, 'uid' | 'role'>, newRole: UserProfile['role']) => {
      if (!isDirectorRole(actor.role))
        return deny('Only the Director can assign roles.');
      if (target.uid === actor.uid)
        return deny("You can't change your own role.");
      // Prevent assigning the same or higher rank than the actor
      if (roleRank(newRole) >= roleRank(actor.role))
        return deny("You can't assign a role equal to or higher than your own.");
      return true;
    },
    [actor.role, actor.uid, deny],
  );

  const checkModeratePost = useCallback(() => {
    return check(
      isStaffRole(actor.role),
      'Only staff can moderate listings.',
    );
  }, [actor.role, check]);

  const checkAuditLog = useCallback(() => {
    return check(canViewAuditLog(actor.role), 'Only City Manager and above can view the audit log.');
  }, [actor.role, check]);

  const checkStaffTeam = useCallback(() => {
    return check(
      normalizeUserRole(actor.role) !== 'city_moderator',
      'City Administrator rank or above is required to access team management.',
    );
  }, [actor.role, check]);

  return {
    noPermOpen: open,
    noPermReason: reason,
    closeNoPerm: close,
    check,
    canActOn,
    checkSuspend,
    checkBan,
    checkEditUser,
    checkDeleteAccount,
    checkAssignRole,
    checkModeratePost,
    checkAuditLog,
    checkStaffTeam,
  };
}
