import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = (process.env.CAPACITOR_SERVER_URL || process.env.VITE_APP_URL || '').trim().replace(/\/$/, '');

const config: CapacitorConfig = {
  appId: 'org.sacramentobuynothing.app',
  appName: 'SacramentoBuyNothing',
  webDir: 'dist',
  android: {
    adjustMarginsForEdgeToEdge: 'force',
  },
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
      }
    : {
        androidScheme: 'https',
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0b0b0c',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
