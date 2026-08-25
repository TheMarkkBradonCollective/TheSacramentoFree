import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary';
import { ThemeProvider } from './theme/ThemeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { NewspaperSkinProvider } from './preview/NewspaperSkinContext';
import { NewspaperExperienceProvider } from './preview/NewspaperExperienceContext';
import NewspaperExperienceLayer from './preview/NewspaperExperienceLayer';
import PlayStoreDemoApp from './preview/PlayStoreDemoApp';
import { isPlayStoreDemo } from './preview/playStoreDemo';
import { initCapacitorApp } from './capacitor/init';
import { recordInstalledWebVersion } from './lib/installContext';
import { isNativeApp } from './lib/nativePlatform';
import { startAppUpdateWatcher } from './pwa/appUpdateWatcher';
import { clearAppAssetCaches } from './pwa/clearAppCaches';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import './index.css';

void initCapacitorApp();
void recordInstalledWebVersion();
void clearAppAssetCaches();

if (isNativeApp()) {
  startAppUpdateWatcher();
} else {
  void registerServiceWorker();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <NewspaperSkinProvider>
          <NewspaperExperienceProvider>
            <ConfirmProvider>
              {isPlayStoreDemo() ? <PlayStoreDemoApp /> : <App />}
              <NewspaperExperienceLayer />
            </ConfirmProvider>
          </NewspaperExperienceProvider>
        </NewspaperSkinProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
