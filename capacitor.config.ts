import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';

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
      'gruard.app',
      '*.gruard.app',
      'api.mapbox.com',
      '*.tiles.mapbox.com',
      'events.mapbox.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'api.stripe.com',
      '*.stripe.com'
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
    },
    
    CapacitorCookies: {
      enabled: true
    },
    
    CapacitorHttp: {
      enabled: true
    }
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH,
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
      keystoreAlias: process.env.ANDROID_KEY_ALIAS || 'gruard',
      keystoreAliasPassword: process.env.ANDROID_KEY_PASSWORD,
      releaseType: 'AAB',
      signingType: 'apksigner'
    },
    webContentsDebuggingEnabled: !isProduction
  },

  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile'
  }
};

export default config;
