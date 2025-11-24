import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gruard.app',
  appName: 'Grúa RD',
  webDir: 'dist/public',
  
  server: {
    androidScheme: 'https',
    // DESARROLLO LOCAL: Para probar con backend local en emulador/dispositivo
    // Descomentar estas líneas solo durante desarrollo:
    // url: 'http://10.0.2.2:5000', // Para emulador Android
    // url: 'http://192.168.1.X:5000', // Para dispositivo físico (cambiar X por IP)
    // cleartext: true
    
    // PRODUCCIÓN: Comentar/eliminar las líneas anteriores y usar HTTPS
    // La app usará el contenido estático en dist/public
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
      // IMPORTANTE: Requiere configuración de Firebase (FCM) en Android
      // Ver MIGRACION_ANDROID.md sección "Firebase Cloud Messaging"
      // Necesitas:
      // 1. Crear proyecto Firebase
      // 2. Agregar google-services.json a android/app/
      // 3. Configurar Gradle con plugin google-services
    },

    Geolocation: {
      // Configuración de precisión alta para tracking GPS
      // Permisos requeridos en AndroidManifest.xml:
      // - ACCESS_FINE_LOCATION
      // - ACCESS_COARSE_LOCATION
      // - ACCESS_BACKGROUND_LOCATION (para tracking en segundo plano)
    },

    Network: {
      // Monitoreo de conectividad de red
    },

    App: {
      // Gestión del ciclo de vida de la aplicación
    }
  },

  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  }
};

export default config;
