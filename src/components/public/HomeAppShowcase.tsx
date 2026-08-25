import AppScreenshotTour from './AppScreenshotTour';
import { isWebsiteBrowser } from '../../lib/installContext';

/** Full screenshot walkthrough on the public home page — normal browser tabs only (not PWA/APK). */
export default function HomeAppShowcase() {
  if (!isWebsiteBrowser()) return null;

  return (
    <section id="app_showcase" className="scroll-mt-8" aria-label="App screenshot tour">
      <AppScreenshotTour scrollToInstallId="home_get_app" />
    </section>
  );
}
