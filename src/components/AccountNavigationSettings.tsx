import { Navigation2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import NavigationSettingsForm from './NavigationSettingsForm';
import {
  readNavigationSettings,
  subscribeNavigationSettings,
  writeNavigationSettings,
  type NavigationSettings,
} from '../lib/navigationSettings';

export default function AccountNavigationSettings() {
  const [settings, setSettings] = useState<NavigationSettings>(() => readNavigationSettings());

  useEffect(() => subscribeNavigationSettings(setSettings), []);

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5" id="profile_nav_settings">
      <div className="flex items-start gap-2">
        <Navigation2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Navigation</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Walking, biking, and driving change the route itself — not just the label. Edit these anytime;
            the same settings appear from the gear button during turn-by-turn.
          </p>
        </div>
      </div>
      <NavigationSettingsForm settings={settings} onChange={(patch) => writeNavigationSettings(patch)} />
    </section>
  );
}
