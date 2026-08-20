import { useEffect, useState } from 'react';
import { Navigation2, Volume2 } from 'lucide-react';
import type { GoGetRingPattern, PickupAvailabilitySchedule, UserProfile } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import {
  GO_GET_RING_PATTERN_LABELS,
  MAX_GO_GET_RING_DURATION,
  MIN_GO_GET_RING_DURATION,
  normalizeGoGetRingDuration,
  normalizeGoGetRingPattern,
} from '../lib/goGetRing';
import { getPickupAvailability } from '../lib/pickupAvailability';
import PickupAvailabilityEditor from './goget/PickupAvailabilityEditor';
import { useConfirm } from '../contexts/ConfirmContext';

interface GoGetSettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function GoGetSettings({ userProfile, onUpdateProfile }: GoGetSettingsProps) {
  const { alert } = useConfirm();
  const [enabled, setEnabled] = useState(userProfile.goGetEnabled === true);
  const [availability, setAvailability] = useState<PickupAvailabilitySchedule>(() =>
    getPickupAvailability(userProfile),
  );
  const [ringDuration, setRingDuration] = useState(
    normalizeGoGetRingDuration(userProfile.goGetRingDurationSeconds),
  );
  const [ringPattern, setRingPattern] = useState<GoGetRingPattern>(
    normalizeGoGetRingPattern(userProfile.goGetRingPattern),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setEnabled(userProfile.goGetEnabled === true);
    setAvailability(getPickupAvailability(userProfile));
    setRingDuration(normalizeGoGetRingDuration(userProfile.goGetRingDurationSeconds));
    setRingPattern(normalizeGoGetRingPattern(userProfile.goGetRingPattern));
  }, [userProfile.uid, userProfile.goGetEnabled, userProfile.pickupAvailability, userProfile.goGetRingDurationSeconds, userProfile.goGetRingPattern]);

  const persist = async (patch: Partial<UserProfile>, successMsg?: string) => {
    setSaving(true);
    setMsg('');
    setErr('');
    const updated: UserProfile = { ...userProfile, ...patch };
    const result = await upsertSupabaseProfile(updated);
    setSaving(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not save this setting.');
      return false;
    }
    onUpdateProfile(updated);
    if (successMsg) setMsg(successMsg);
    return true;
  };

  const handleToggle = async (next: boolean) => {
    if (next) {
      await alert({
        title: 'Turn on app pickup coordination?',
        message:
          'Neighbors can start Go Get with you when you both use the installed app and notifications. Incoming requests ring your phone (like a delivery alert) for the duration you choose below. You can set pickup hours and ring style anytime.',
        okLabel: 'Turn on',
      });
    }
    const ok = await persist(
      {
        goGetEnabled: next,
        pickupAvailability: next ? availability : userProfile.pickupAvailability,
        goGetRingDurationSeconds: ringDuration,
        goGetRingPattern: ringPattern,
      },
      next
        ? 'Pickup coordination is on — set your hours and ring style below.'
        : 'Opted out — you can still list and message neighbors without app pickup support.',
    );
    if (ok) setEnabled(next);
  };

  const saveAvailability = async () => {
    await persist({ pickupAvailability: availability }, 'Pickup hours saved.');
  };

  const saveRingPrefs = async () => {
    await persist(
      {
        goGetRingDurationSeconds: ringDuration,
        goGetRingPattern: ringPattern,
      },
      'Ring alert settings saved.',
    );
  };

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5" id="profile_goget_settings">
      <div className="flex items-start gap-2">
        <Navigation2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Go Get & pickup coordination</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Off by default. Turn on in the Android app to let neighbors use Go Get, Drop off, Meet up, and
            claim-at-pin on your listings during your pickup hours. Requires notifications.
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
            {enabled ? 'Using app pickup coordination' : 'Off — listing & chat only'}
          </p>
          <p className="text-[10px] text-muted mt-0.5 leading-snug">
            {enabled
              ? 'Go Get rings your phone for live requests; scheduling uses normal notifications. Confirmed pickups update listings and profiles.'
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

      {enabled && (
        <div className="space-y-4 pt-2 border-t border-app">
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-muted uppercase tracking-wider">Pickup availability</h5>
            <PickupAvailabilityEditor
              value={availability}
              onChange={setAvailability}
              disabled={saving}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAvailability()}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            >
              Save pickup hours
            </button>
          </div>

          <div className="space-y-2 border-t border-app pt-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-accent" />
              <h5 className="text-[10px] font-bold text-muted uppercase tracking-wider">
                Incoming Go Get ring
              </h5>
            </div>
            <p className="text-[10px] text-muted leading-snug">
              When someone wants you right now, your phone rings for this long ({MIN_GO_GET_RING_DURATION}–
              {MAX_GO_GET_RING_DURATION} seconds).
            </p>
            <label className="block text-xs text-muted">
              Ring duration: {ringDuration}s
              <input
                type="range"
                min={MIN_GO_GET_RING_DURATION}
                max={MAX_GO_GET_RING_DURATION}
                step={5}
                value={ringDuration}
                onChange={(e) => setRingDuration(normalizeGoGetRingDuration(Number(e.target.value)))}
                className="w-full mt-1"
                disabled={saving}
              />
            </label>
            <label className="block text-xs text-muted">
              Alert style
              <select
                value={ringPattern}
                onChange={(e) => setRingPattern(normalizeGoGetRingPattern(e.target.value))}
                className="sbn-input text-sm mt-1 w-full"
                disabled={saving}
              >
                {(Object.keys(GO_GET_RING_PATTERN_LABELS) as GoGetRingPattern[]).map((key) => (
                  <option key={key} value={key}>{GO_GET_RING_PATTERN_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveRingPrefs()}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            >
              Save ring settings
            </button>
          </div>
        </div>
      )}

      {msg && <p className="text-xs font-semibold text-emerald-500">{msg}</p>}
      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
    </section>
  );
}
