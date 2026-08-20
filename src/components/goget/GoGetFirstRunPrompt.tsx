import { useState } from 'react';
import { Navigation2 } from 'lucide-react';
import type { UserProfile } from '../../types';
import { persistUserGoGetSettings } from '../../lib/goGetPrefs';
import { markGoGetFirstRunPromptSeen } from '../../lib/goGetFirstRunState';

interface GoGetFirstRunPromptProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenNotificationSettings?: () => void;
}

export default function GoGetFirstRunPrompt({
  userProfile,
  onUpdateProfile,
  onOpenNotificationSettings,
}: GoGetFirstRunPromptProps) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const saveChoice = async (enabled: boolean) => {
    setSaving(true);
    setErr('');
    const result = await persistUserGoGetSettings(userProfile, { goGetEnabled: enabled });
    setSaving(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not save your choice. Try again in Account.');
      return;
    }
    markGoGetFirstRunPromptSeen();
    if (result.profile) onUpdateProfile(result.profile);
    if (enabled) onOpenNotificationSettings?.();
  };

  return (
    <div className="fixed inset-0 z-[126] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div
        className="sbn-card w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="goget_first_run_title"
      >
        <div className="p-5 border-b border-app">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
              <Navigation2 className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h4 id="goget_first_run_title" className="font-display font-bold text-app leading-snug">
                Go Get & pickup coordination
              </h4>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                App-supported pickups (Go Get, Drop off, Meet up, claim-at-pin) only work in this installed
                app with notifications on. Turn this off to list normally and arrange pickups yourself in chat
                — without live tracking or handoff prompts.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-muted leading-relaxed">
            When you finish a pickup in the app, the listing is marked <strong className="text-app">given</strong>{' '}
            or <strong className="text-app">fulfilled</strong> automatically — and both neighbors&apos; profile counts
            update (items given / items claimed). You can change this anytime in Account.
          </p>

          {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

          <button
            type="button"
            disabled={saving}
            onClick={() => void saveChoice(true)}
            className="sbn-btn sbn-btn-primary w-full justify-center"
            id="goget_first_run_enable_btn"
          >
            Turn on pickup coordination
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveChoice(false)}
            className="sbn-btn sbn-btn-secondary w-full justify-center"
            id="goget_first_run_opt_out_btn"
          >
            List & chat only — no Go Get
          </button>
        </div>
      </div>
    </div>
  );
}
