import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.P1425.app',
  appName: 'proyectoCameraE2',
  webDir: 'dist/myapp/browser',
  plugins: {
    Camera: {
      androidPermissions: ['android.permission.CAMERA', 'android.permission.READ_MEDIA_IMAGES'],
      androidExternalStorage: true
    },
    Filesystem: {
      androidPermissions: ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE']
    },
    PermissionsAndroid: {
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES'
      ]
    }
  }
};

export default config;
