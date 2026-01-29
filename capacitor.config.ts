import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';

// Production API URL - set this to your CapRover deployed server
const API_URL = process.env.VITE_API_URL || 'https://app.gruard.com';

const config: CapacitorConfig = {
  appId: 'com.fouronesolutions.gruard',
  appName: 'Grúa RD',
  webDir: 'dist/public',
  
  server: {
    androidScheme: 'https',
    hostname: 'app.gruard.com',
    iosScheme: 'capacitor',
    
    // URL to the production server for native apps
    url: isProduction ? API_URL : undefined,
    cleartext: false,
    
    allowNavigation: [
      'gruard.com',
      '*.gruard.com',
      'app.gruard.com',
      'api.mapbox.com',
      '*.tiles.mapbox.com',
      'events.mapbox.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'api.azul.com.do',
      '*.azul.com.do',
      '*.waze.com',
      'waze.com'
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
      enabled: false
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
