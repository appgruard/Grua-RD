import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fouronesolutions.gruard',
  appName: 'Grúa RD',
  webDir: 'dist/public',
  
  server: {
    androidScheme: 'https',
    hostname: 'gruard.app',
    iosScheme: 'capacitor',
    
    allowNavigation: [
      'gruard.com',
      '*.gruard.com',
      'api.mapbox.com',
      '*.tiles.mapbox.com',
      'events.mapbox.com',
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
      permissions: {
        android: {
          enableHighAccuracy: true
        },
        ios: {
          enableHighAccuracy: true
        }
      }
    },

    Camera: {
      promptLabelHeader: 'Grúa RD - Cámara',
      promptLabelCancel: 'Cancelar',
      promptLabelPhoto: 'Galería',
      promptLabelPicture: 'Tomar Foto'
    },

    Filesystem: {
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
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile'
  }
};

export default config;
