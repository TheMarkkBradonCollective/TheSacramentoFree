import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary';
import { ThemeProvider } from './theme/ThemeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { initCapacitorApp } from './capacitor/init';
import { isNativeApp } from './lib/nativePlatform';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import './index.css';

void initCapacitorApp();

if (!isNativeApp()) {
  registerServiceWorker();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
