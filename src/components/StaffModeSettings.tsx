import { useEffect, useState } from 'react';
import { Shield, UserRound } from 'lucide-react';
import type { UserProfile } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import { isStaffRole } from '../lib/roles';
import {
  DEFAULT_STAFF_INTERACTION_MODE,
  normalizeStaffInteractionMode,
  type StaffInteractionMode,
} from '../lib/staffInteractionMode';

interface StaffModeSettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function StaffModeSettings({ userProfile, onUpdateProfile }: StaffModeSettingsProps) {
  const [mode, setMode] = useState<StaffInteractionMode>(
    normalizeStaffInteractionMode(userProfile.staffInteractionMode ?? DEFAULT_STAFF_INTERACTION_MODE),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setMode(normalizeStaffInteractionMode(userProfile.staffInteractionMode ?? DEFAULT_STAFF_INTERACTION_MODE));
  }, [userProfile.staffInteractionMode, userProfile.uid]);

  if (!isStaffRole(userProfile.role)) return null;

  const handleSelect = async (next: StaffInteractionMode) => {
    if (next === mode || saving) return;
    setSaving(true);
    setMsg('');
    setErr('');
    const updated: UserProfile = { ...userProfile, staffInteractionMode: next };
    const result = await upsertSupabaseProfile(updated);
    setSaving(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not save this setting.');
      return;
    }
    setMode(next);
    onUpdateProfile(updated);
    setMsg(
      next === 'staff'
        ? 'Staff mode on — comments show your title and neighbor pickup flows stay off.'
        : 'Neighbor mode on — you can message, navigate, and Go Get like any neighbor. Your staff tools stay available.',
    );
  };

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5" id="profile_staff_mode_settings">
      <div className="flex items-start gap-2">
        <Shield className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Staff participation mode</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Choose how you show up in the community feed, listings, events, and chats. Staff tools and the
            moderation sidebar stay available either way.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSelect('staff')}
          className={`text-left p-3 rounded-xl border transition-colors disabled:opacity-60 ${
            mode === 'staff' ? 'border-accent/40 bg-accent/10' : 'border-app bg-inset hover:border-accent/30'
          }`}
          id="profile_staff_mode_official"
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <p className="text-xs font-bold text-app">Staff mode</p>
          </div>
          <p className="text-[10px] text-muted leading-snug">
            Comments show your staff title. Use Staff chat on listings and events. No private neighbor DMs,
            navigate, or Go Get.
          </p>
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSelect('neighbor')}
          className={`text-left p-3 rounded-xl border transition-colors disabled:opacity-60 ${
            mode === 'neighbor' ? 'border-accent/40 bg-accent/10' : 'border-app bg-inset hover:border-accent/30'
          }`}
          id="profile_staff_mode_neighbor"
        >
          <div className="flex items-center gap-2 mb-1">
            <UserRound className="w-4 h-4 text-accent shrink-0" />
            <p className="text-xs font-bold text-app">Neighbor mode</p>
          </div>
          <p className="text-[10px] text-muted leading-snug">
            Participate like a regular neighbor — message, navigate, claim, and Go Get. Comments post
            without your staff badge.
          </p>
        </button>
      </div>

      {msg ? <p className="text-xs text-emerald-400">{msg}</p> : null}
      {err ? <p className="text-xs text-red-400">{err}</p> : null}
    </section>
  );
}
