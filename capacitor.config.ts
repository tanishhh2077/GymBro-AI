import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymbroai.app',
  appName: 'GymBro AI',
  webDir: 'dist',
  backgroundColor: '#05070d',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
      hidden: false,
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
