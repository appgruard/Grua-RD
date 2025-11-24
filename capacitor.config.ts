import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gruard.app',
  appName: 'Grúa RD',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  
  server: {
    androidScheme: 'https',
    hostname: 'gruard.app',
    iosScheme: 'ionic',
    
    allowNavigation: [
      'gruard.com',
      '*.gruard.com',
      'maps.googleapis.com',
      '*.googleapis.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ]
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0F2947',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#F5A623',
      splashFullScreen: true,
      splashImmersive: true
    },
    
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },

    Geolocation: {
    },

    Network: {
    },

    App: {
    }
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
      signingType: 'jarsigner'
    },
    webContentsDebuggingEnabled: false
  },

  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff'
  }
};

export default config;
