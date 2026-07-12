import type { CapacitorConfig } from '@capacitor/cli';

// VOIDLING iOS shell. Build flow:
//   pnpm build && npx cap sync ios && npx cap open ios
const config: CapacitorConfig = {
  appId: 'com.voidling.game',
  appName: 'VOIDLING',
  webDir: 'dist',
  backgroundColor: '#14082B',
  ios: {
    contentInset: 'never',
    backgroundColor: '#14082B',
    preferredContentMode: 'mobile',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#14082B',
      overlaysWebView: true,
    },
  },
};

export default config;
