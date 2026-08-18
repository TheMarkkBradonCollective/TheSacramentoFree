import { useEffect, useState } from 'react';
import { Navigation2 } from 'lucide-react';
import type { UserProfile } from '../types';
import { upsertSupabaseProfile } from '../supabase';

interface GoGetSettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function GoGetSettings({ userProfile, onUpdateProfile }: GoGetSettingsProps) {
  const [enabled, setEnabled] = useState(userProfile.goGetEnabled !== false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setEnabled(userProfile.goGetEnabled !== false);
  }, [userProfile.goGetEnabled, userProfile.uid]);

  const handleToggle = async (next: boolean) => {
    setSaving(true);
    setMsg('');
    setErr('');
    const updated: UserProfile = { ...userProfile, goGetEnabled: next };
    const result = await upsertSupabaseProfile(updated);
    setSaving(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not save this setting.');
      return;
    }
    setEnabled(next);
    onUpdateProfile(updated);
    setMsg(
      next
        ? 'Go Get & pickup coordination is on.'
        : 'Opted out — you can still list and message neighbors without app pickup support.',
    );
  };

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5" id="profile_goget_settings">
      <div className="flex items-start gap-2">
        <Navigation2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Go Get & pickup coordination</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            App-supported pickups (Go Get, Drop off, Meet up, claim-at-pin) only work in the Android app
            (APK or Play Store) with notifications on. Turn this off to list normally and arrange pickups
            yourself in chat — without live tracking or handoff prompts.
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={saving}
        onClick={() => void handleToggle(!enabled)}
        className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors disabled:opacity-60 ${
          enabled ? 'border-accent/40 bg-accent/10' : 'border-app bg-inset'
        }`}
        id="profile_goget_enabled_toggle"
      >
        <div className="text-left min-w-0">
          <p className="text-xs font-bold text-app">
            {enabled ? 'Using app pickup coordination' : 'Opted out — listing & chat only'}
          </p>
          <p className="text-[10px] text-muted mt-0.5 leading-snug">
            {enabled
              ? 'Full Go Get / Drop off flow — when pickup is confirmed, listings auto-mark given or fulfilled and both profiles update.'
              : 'Your posts stay up. Neighbors message you to arrange pickup independently.'}
          </p>
        </div>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
            enabled ? 'bg-accent' : 'bg-zinc-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </span>
      </button>

      {msg && <p className="text-xs font-semibold text-emerald-500">{msg}</p>}
      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
    </section>
  );
}
