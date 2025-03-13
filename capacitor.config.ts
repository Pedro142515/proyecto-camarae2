import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.P1425.app',
  appName: 'proyectoCameraE2',
  webDir: 'dist/myapp/browser',
  plugins: {
    Camera: {
      androidPermissions: [
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES'
      ]
    },
    Filesystem: {
      androidPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE'
      ]
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
