import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doitnow.users',
  appName: 'HomeHelp',
  webDir: 'www/browser',
  // Backend currently serves over HTTP. This allows Android webview/native HTTP
  // to reach the API until HTTPS is enabled on backend.
  server: {
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    GoogleAuth: {
      // Plugin compatibility note:
      // This plugin uses `androidClientId` as requestIdToken(serverClientId) on Android.
      // For backend token verification flow, Google requires a WEB client ID here.
      androidClientId: '27260261148-rjud9f2k5o23makdpk6g425jpitnn5he.apps.googleusercontent.com',
      clientId: '27260261148-rjud9f2k5o23makdpk6g425jpitnn5he.apps.googleusercontent.com',
      serverClientId: '27260261148-rjud9f2k5o23makdpk6g425jpitnn5he.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
    },
  },
};

export default config;
