import { Navigation2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UserProfile } from '../types';
import NavigationSettingsForm from './NavigationSettingsForm';
import {
  mergeNavigationPrefsIntoProfile,
  persistUserNavigationSettings,
  subscribeStoredNavPrefs,
} from '../lib/navPrefs';
import { normalizeNavigationSettings, type NavigationSettings } from '../lib/navigationSettings';

interface AccountNavigationSettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function AccountNavigationSettings({
  userProfile,
  onUpdateProfile,
}: AccountNavigationSettingsProps) {
  const resolveSettings = (profile: UserProfile): NavigationSettings =>
    normalizeNavigationSettings(mergeNavigationPrefsIntoProfile(profile).navigationSettings);

  const [settings, setSettings] = useState<NavigationSettings>(() => resolveSettings(userProfile));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setSettings(resolveSettings(userProfile));
  }, [userProfile.uid]);

  useEffect(() => subscribeStoredNavPrefs(userProfile.uid, (stored) => {
    if (stored) setSettings(stored.settings);
  }), [userProfile.uid]);

  const handleChange = (patch: Partial<NavigationSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setMsg('');
    setErr('');
  };

  const saveSettings = async () => {
    setSaving(true);
    setMsg('');
    setErr('');
    const result = await persistUserNavigationSettings(userProfile, settings);
    setSaving(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not save navigation settings.');
      return;
    }
    if (result.profile) onUpdateProfile(result.profile);
    setMsg('Navigation settings saved to your account.');
  };

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5" id="profile_nav_settings">
      <div className="flex items-start gap-2">
        <Navigation2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Navigation</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Walking, biking, and driving change the route itself — not just the label. Saved to your account
            so the same choices follow you on any device.
          </p>
        </div>
      </div>
      <NavigationSettingsForm settings={settings} onChange={handleChange} />
      <button
        type="button"
        disabled={saving}
        onClick={() => void saveSettings()}
        className="sbn-btn sbn-btn-secondary sbn-btn-sm"
      >
        Save navigation settings
      </button>
      {msg && <p className="text-xs font-semibold text-emerald-500">{msg}</p>}
      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
    </section>
  );
}
