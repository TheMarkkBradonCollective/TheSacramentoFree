import { Bell, BookOpen, Keyboard, Newspaper, Waves } from 'lucide-react';
import LabeledSwitch from '../components/LabeledSwitch';
import { useNewspaperExperience, type NewspaperExperiencePrefs } from './NewspaperExperienceContext';
import { useNewspaperSkin } from './NewspaperSkinContext';
import { playNewspaperSound, unlockNewspaperAudio } from './newspaperSound';

interface Control {
  key: keyof NewspaperExperiencePrefs;
  label: string;
  blurb: string;
  icon: typeof Bell;
}

const CONTROLS: Control[] = [
  {
    key: 'pageSounds',
    label: 'Page sounds',
    blurb: 'A sheet of newsprint turning as you move between sections.',
    icon: Newspaper,
  },
  {
    key: 'typewriterSounds',
    label: 'Typewriter keys',
    blurb: 'Every keystroke strikes a typebar, with a bell at the end of a line.',
    icon: Keyboard,
  },
  {
    key: 'notificationSounds',
    label: 'Notification bells',
    blurb: 'Carriage-return bells for alerts and new messages.',
    icon: Bell,
  },
  {
    key: 'immersiveMode',
    label: 'Immersive mode',
    blurb: 'Page-turn animation, ink washes, and press effects.',
    icon: BookOpen,
  },
  {
    key: 'reducedMotion',
    label: 'Reduced motion',
    blurb: 'Hold every page still. Follows your device until you change it.',
    icon: Waves,
  },
];

/**
 * The reader's control over how loud and how animated the paper gets.
 * Only rendered under the newspaper skin — the original app is untouched.
 */
export default function NewspaperExperienceSettings() {
  const { enabled } = useNewspaperSkin();
  const { prefs, setPref, motionReduced, compact } = useNewspaperExperience();

  if (!enabled) return null;

  const anySound = prefs.pageSounds || prefs.typewriterSounds || prefs.notificationSounds;

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5" id="newspaper_experience_settings">
      <div>
        <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Newspaper experience</h4>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Sound and motion for The Sacramento Free. Everything here is optional and saved to this device
          {compact ? '. Phones stay quieter by default.' : '.'}
        </p>
      </div>

      <ul className="tsf-experience-list">
        {CONTROLS.map(({ key, label, blurb, icon: Icon }) => {
          const isMotionOverridden = key === 'immersiveMode' && motionReduced;
          // Reduced motion shows the resolved state, which may come from the device.
          const checked = key === 'reducedMotion' ? motionReduced : Boolean(prefs[key]);
          return (
            <li key={key} className="tsf-experience-row">
              <span className="tsf-experience-row__icon" aria-hidden>
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="tsf-experience-row__label" id={`newspaper_experience_${key}_label`}>
                  {label}
                </p>
                <p className="tsf-experience-row__blurb">
                  {isMotionOverridden ? 'Paused while reduced motion is on.' : blurb}
                </p>
              </div>
              <LabeledSwitch
                id={`newspaper_experience_${key}_switch`}
                checked={checked}
                onChange={(next) => setPref(key, next)}
                ariaLabel={`${label} ${checked ? 'on' : 'off'}`}
              />
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          id="newspaper_experience_test_btn"
          disabled={!anySound}
          onClick={() => {
            unlockNewspaperAudio();
            playNewspaperSound('press', compact ? 0.6 : 1);
          }}
          className="sbn-btn sbn-btn-secondary sbn-btn-sm"
        >
          Hear the press
        </button>
        <p className="text-[11px] text-subtle">
          {anySound ? 'Sound plays only after you interact with the page.' : 'All sounds are currently off.'}
        </p>
      </div>
    </section>
  );
}
