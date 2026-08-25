import { useEffect, useRef, useState } from 'react';
import { requestCompassPermission, subscribeDeviceCompass } from '../lib/navHeading';
import { readNavigationSettings, subscribeNavigationSettings } from '../lib/navigationSettings';

/** Subscribes to device compass when GPS settings allow it. */
export function usePhoneCompassHeading(
  active: boolean,
  usePhoneCompass: boolean,
  onHeading: (degrees: number) => void,
): void {
  const onHeadingRef = useRef(onHeading);
  onHeadingRef.current = onHeading;

  useEffect(() => {
    if (!active || !usePhoneCompass) return undefined;
    void requestCompassPermission();
    return subscribeDeviceCompass((degrees) => {
      onHeadingRef.current(degrees);
    });
  }, [active, usePhoneCompass]);
}

/** Live value of Navigation settings → use phone compass. */
export function usePhoneCompassSetting(): boolean {
  const [enabled, setEnabled] = useState(() => readNavigationSettings().usePhoneCompass);

  useEffect(() => subscribeNavigationSettings((settings) => setEnabled(settings.usePhoneCompass)), []);

  return enabled;
}
