# 🤖 Guía de Migración a Android APK con Capacitor

## 📋 Tabla de Contenidos
1. [Prerrequisitos](#prerrequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Build para Android](#build-para-android)
4. [Permisos de Android](#permisos-de-android)
5. [Testing en Emulador/Dispositivo](#testing-en-emuladordispositivo)
6. [Build Release (APK/AAB para Play Store)](#build-release-apkaab-para-play-store)
7. [Troubleshooting](#troubleshooting)

---

## 📦 Prerrequisitos

### Software Requerido

1. **Node.js** (ya instalado) ✅
2. **Android Studio** (necesario instalar)
   - Descargar de: https://developer.android.com/studio
   - Incluye Android SDK, emulador y herramientas de build

3. **Java Development Kit (JDK) 17+**
   - Android Studio lo incluye
   - O instalar manualmente: https://www.oracle.com/java/technologies/downloads/

4. **Configurar Variables de Entorno**
   ```bash
   # Linux/Mac - Agregar a ~/.bashrc o ~/.zshrc
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   
   # Windows - Variables de entorno del sistema
   ANDROID_HOME=C:\Users\TuUsuario\AppData\Local\Android\Sdk
   Path=%Path%;%ANDROID_HOME%\platform-tools
   ```

### Verificar Instalación
```bash
# Verificar Java
java -version

# Verificar Android SDK
adb --version

# Verificar Capacitor CLI
npx cap --version
```

---

## ⚙️ Configuración Inicial

### 1. El proyecto ya tiene Capacitor instalado ✅

Los siguientes paquetes ya están en `package.json`:
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/android`
- `@capacitor/geolocation`
- `@capacitor/network`
- `@capacitor/push-notifications`

### 2. Archivo de Configuración ✅

El archivo `capacitor.config.ts` ya está creado con:
- **appId**: `com.gruard.app`
- **appName**: Grúa RD
- **webDir**: `dist/public`
- **Plugins configurados**: SplashScreen, PushNotifications, Geolocation, etc.

### 3. Inicializar Plataforma Android

```bash
# Crear carpeta android/ con proyecto nativo
npx cap add android
```

Esto creará:
```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml  # Permisos y configuración
│   │       ├── res/                  # Recursos (iconos, splash screen)
│   │       └── java/                 # Código nativo (opcional)
│   └── build.gradle
├── gradle/
└── build.gradle
```

---

## 🏗️ Build para Android

### Proceso Completo de Build

```bash
# 1. Build del frontend (React + Vite)
npm run build

# 2. Sincronizar assets con Android
npx cap sync android

# 3. Abrir Android Studio
npx cap open android
```

### Comandos Útiles

```bash
# Sync sin abrir Android Studio
npx cap sync android

# Copiar solo web assets (más rápido)
npx cap copy android

# Actualizar plugins nativos
npx cap update android

# Limpiar y rebuild
npx cap sync android --clean
```

---

## 🔐 Permisos de Android

### Editar `android/app/src/main/AndroidManifest.xml`

Los siguientes permisos son necesarios para Grúa RD:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permisos de Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Permisos de Ubicación GPS (crítico para tracking) -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <!-- Permisos de Notificaciones Push -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <!-- Permisos de Cámara (para foto de perfil - opcional) -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    
    <!-- Permisos de Estado del Teléfono (opcional) -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        
        <!-- IMPORTANTE: usesCleartextTraffic solo para desarrollo local -->
        <!-- Para producción, ELIMINAR esta línea o cambiar a false -->
        <!-- android:usesCleartextTraffic="true" -->
        
        <!-- Actividad principal -->
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:label="@string/app_name"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### Permisos en Tiempo de Ejecución

Algunos permisos (ubicación, notificaciones) requieren confirmación del usuario. Capacitor maneja esto automáticamente.

### Tracking GPS en Background (Conductores)

Para tracking GPS continuo cuando la app está en segundo plano:

1. **Solicitar permiso de ubicación en background**:
```typescript
import { Geolocation } from '@capacitor/geolocation';

// Primero solicitar ubicación normal
const permissions = await Geolocation.requestPermissions();

// Luego, para Android 10+, solicitar background location
// (el usuario verá un segundo diálogo después)
```

2. **Implementar Foreground Service** (recomendado para tracking continuo):
   - Cuando el conductor active "disponible", iniciar un foreground service
   - Mostrar una notificación persistente: "Grúa RD: Estás disponible"
   - Esto previene que Android mate el proceso

3. **Código de ejemplo** (en el frontend):
```typescript
// Al activar disponibilidad del conductor
const watchId = await Geolocation.watchPosition(
  { 
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000 
  },
  (position) => {
    // Enviar ubicación al backend via WebSocket
    updateLocationToServer(position.coords);
  }
);
```

**Nota importante**: Android limita severamente el tracking en background. Para una experiencia óptima, considera:
- Usar un foreground service con notificación visible
- Pedir al usuario deshabilitar optimizaciones de batería para tu app
- En Android 12+, explicar claramente por qué necesitas ubicación precisa en background

---

## 🔔 Configuración de Firebase Cloud Messaging (Push Notifications)

### ⚠️ CRÍTICO: Sin Firebase, las notificaciones push NO funcionarán en Android

Las notificaciones push en Android requieren Firebase Cloud Messaging (FCM). Sigue estos pasos:

### Paso 1: Crear Proyecto Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear nuevo proyecto o usar uno existente
3. Nombrar proyecto: `Grúa RD` o similar
4. Desactivar Google Analytics (opcional para este caso)

### Paso 2: Agregar App Android a Firebase

1. En Firebase Console, click "Agregar app" → Android
2. Datos requeridos:
   - **Package name**: `com.gruard.app` (debe coincidir con `appId` en `capacitor.config.ts`)
   - **App nickname**: Grúa RD (opcional)
   - **SHA-1**: Opcional para notificaciones (requerido para Google Sign-In)

3. Descargar `google-services.json`

### Paso 3: Configurar google-services.json

1. Copiar `google-services.json` a `android/app/`
   ```bash
   # Después de npx cap add android
   cp /ruta/descarga/google-services.json android/app/
   ```

2. Verificar ubicación:
   ```
   android/
   └── app/
       ├── google-services.json  ← Aquí
       └── src/
   ```

### Paso 4: Actualizar Gradle para Firebase

Editar `android/build.gradle` (raíz del proyecto):
```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath 'com.google.gms:google-services:4.4.0'  // ← Agregar
    }
}
```

Editar `android/app/build.gradle`:
```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'  // ← Agregar al final

android {
    ...
}

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.3.1'  // ← Agregar
    ...
}
```

### Paso 5: Verificar Configuración

Después de hacer sync en Android Studio:
1. Build → Rebuild Project
2. Verificar que no hay errores de `google-services.json`
3. Revisar logs de Logcat: buscar "Firebase" para confirmar inicialización

### Paso 6: Testing de Notificaciones

1. Ejecutar app en emulador/dispositivo
2. Aceptar permisos de notificaciones
3. Usar Firebase Console → Cloud Messaging → "Send your first message"
4. Target: Tu app instalada
5. Verificar que llega la notificación

### Variables de Entorno para Backend

El backend de Grúa RD ya usa `web-push` con VAPID keys, pero para completitud:

```bash
# .env (backend)
VAPID_PRIVATE_KEY=tu_clave_privada
VITE_VAPID_PUBLIC_KEY=tu_clave_publica
```

**Nota**: Si decides migrar de `web-push` (Web Push API) a FCM en el backend, necesitarás:
1. Usar `firebase-admin` SDK en Node.js
2. Descargar service account JSON de Firebase
3. Cambiar lógica de envío de notificaciones

### Troubleshooting Firebase

**Error: "google-services.json missing"**
- Verificar que está en `android/app/`
- Ejecutar `npx cap sync android`

**Error: "Failed to resolve: firebase-messaging"**
- Verificar conexión a internet
- Invalidar cache de Gradle: Android Studio → File → Invalidate Caches

**Notificaciones no llegan**
- Verificar permisos en AndroidManifest.xml
- Revisar que `google-services.json` tiene el package name correcto
- Verificar en Firebase Console → Cloud Messaging que el servidor está habilitado

---

## 📱 Testing en Emulador/Dispositivo

### Opción 1: Emulador Android Studio

1. Abrir Android Studio
2. Tools → Device Manager
3. Create Virtual Device
4. Seleccionar: **Pixel 6 Pro** con **Android 13 (API 33)**
5. Iniciar emulador
6. En Android Studio: Run → Run 'app'

### Opción 2: Dispositivo Físico

1. Habilitar **Modo Desarrollador** en Android:
   - Configuración → Acerca del teléfono
   - Tap 7 veces en "Número de compilación"
   
2. Habilitar **Depuración USB**:
   - Configuración → Opciones de desarrollador
   - Activar "Depuración USB"

3. Conectar dispositivo vía USB

4. Verificar conexión:
   ```bash
   adb devices
   ```

5. En Android Studio: Run → Run 'app'

### Testing de Funcionalidades Clave

- ✅ Login/Registro
- ✅ Solicitud de permisos de ubicación
- ✅ Mapa de Google Maps se carga correctamente
- ✅ WebSocket conecta (verificar en logs)
- ✅ Notificaciones push funcionan
- ✅ Tracking GPS en tiempo real
- ✅ Formularios y navegación

---

## 🚀 Build Release (APK/AAB para Play Store)

### Paso 1: Generar Keystore (Firma de la App)

```bash
# Crear keystore (solo una vez)
keytool -genkey -v -keystore gruard-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias gruard-key

# Información requerida:
# - Contraseña del keystore
# - Nombre, Organización, Ciudad, País
# - Contraseña de la key (puede ser la misma)
```

**⚠️ IMPORTANTE**: Guarda el archivo `.jks` y las contraseñas de forma segura. Si los pierdes, no podrás actualizar la app en Play Store.

### Paso 2: Configurar Gradle para Release

Editar `android/app/build.gradle`:

```gradle
android {
    ...
    
    signingConfigs {
        release {
            storeFile file('../gruard-release-key.jks')
            storePassword 'TU_PASSWORD_KEYSTORE'
            keyAlias 'gruard-key'
            keyPassword 'TU_PASSWORD_KEY'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Nota de Seguridad**: No commitar contraseñas en Git. Usa variables de entorno o `gradle.properties` local.

### Paso 3: Build APK para Testing

```bash
cd android
./gradlew assembleRelease

# APK generado en:
# android/app/build/outputs/apk/release/app-release.apk
```

### Paso 4: Build AAB para Google Play Store

```bash
cd android
./gradlew bundleRelease

# AAB generado en:
# android/app/build/outputs/bundle/release/app-release.aab
```

### Diferencia APK vs AAB

- **APK**: Archivo directo instalable, útil para distribución manual
- **AAB** (Android App Bundle): Formato optimizado para Play Store, Google genera APKs específicos por dispositivo (menor tamaño de descarga)

---

## 📲 Publicar en Google Play Store

### Requisitos

1. **Cuenta de Google Play Developer** ($25 USD, pago único)
   - https://play.google.com/console/signup

2. **Información de la App**
   - Nombre: Grúa RD - Servicio de Grúas
   - Descripción corta y larga
   - Capturas de pantalla (mínimo 2, tamaños específicos)
   - Icono 512x512 PNG
   - Feature Graphic 1024x500 PNG
   - Categoría: Mapas y navegación
   - Clasificación de contenido
   - Política de privacidad (URL requerida)

3. **Archivos**
   - AAB firmado (`app-release.aab`)
   - Keystore backup seguro

### Proceso de Publicación

1. Crear app en Play Console
2. Completar información de la tienda
3. Configurar precios y distribución (República Dominicana)
4. Subir AAB a "Producción" o "Prueba cerrada"
5. Completar cuestionario de privacidad de datos
6. Enviar para revisión (puede tomar 1-7 días)

---

## 🐛 Troubleshooting

### Error: "JAVA_HOME no está configurado"

```bash
# Linux/Mac
export JAVA_HOME=/path/to/jdk
export PATH=$JAVA_HOME/bin:$PATH

# Verificar
echo $JAVA_HOME
```

### Error: "SDK location not found"

Crear `android/local.properties`:
```properties
sdk.dir=/Users/TuUsuario/Library/Android/sdk
```

### Google Maps no se muestra en Android

1. Verificar que `VITE_GOOGLE_MAPS_API_KEY` esté configurada
2. En Google Cloud Console, habilitar:
   - Maps SDK for Android
   - Agregar package name: `com.gruard.app`
   - Agregar SHA-1 fingerprint del keystore:
     ```bash
     keytool -list -v -keystore gruard-release-key.jks -alias gruard-key
     ```

### WebSocket no conecta

1. Verificar que el backend esté accesible desde el dispositivo
2. Si usas `localhost` en desarrollo, cambiarlo a:
   - Emulador: `10.0.2.2:5000`
   - Dispositivo real: IP local de tu PC (ej: `192.168.1.100:5000`)

3. Actualizar en `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.100:5000',
     cleartext: true // Solo para desarrollo
   }
   ```

### Permisos de ubicación no funcionan

1. Verificar `AndroidManifest.xml` tiene los permisos
2. Solicitar permisos explícitamente en código:
   ```typescript
   import { Geolocation } from '@capacitor/geolocation';
   
   const permissions = await Geolocation.requestPermissions();
   ```

### Error de build: "Duplicate class"

Limpiar cache de Gradle:
```bash
cd android
./gradlew clean
./gradlew build
```

---

## 📊 Rendimiento y Optimizaciones

### Reducir Tamaño del APK

1. **Habilitar code shrinking** (ya configurado en build.gradle)
2. **Optimizar imágenes**: Usar WebP en lugar de PNG
3. **Lazy loading**: Cargar componentes bajo demanda
4. **Tree shaking**: Vite ya lo hace automáticamente

### Mejorar Velocidad de Carga

1. **Precache assets críticos** en Service Worker
2. **Comprimir responses** del backend (gzip)
3. **Usar CDN** para assets estáticos
4. **Optimizar queries** a base de datos

---

## 🔗 Recursos Adicionales

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Android Developer Guide](https://developer.android.com/guide)
- [Google Play Console](https://play.google.com/console)
- [Material Design for Android](https://m3.material.io/)

---

## 📝 Checklist Pre-Publicación

- [ ] App probada en emulador y dispositivo real
- [ ] Todos los permisos configurados correctamente
- [ ] Google Maps funciona con API key de producción
- [ ] WebSocket conecta al backend de producción
- [ ] Notificaciones push funcionan
- [ ] Iconos y splash screen configurados
- [ ] Versión incrementada en `android/app/build.gradle` (`versionCode` y `versionName`)
- [ ] Keystore generado y guardado de forma segura
- [ ] AAB firmado generado
- [ ] Política de privacidad publicada
- [ ] Capturas de pantalla tomadas
- [ ] Descripción de la app escrita
- [ ] Cuenta de Play Console activa
- [ ] Backend en producción estable

---

**Última actualización**: Noviembre 2025  
**Versión de Capacitor**: 7.x  
**Android Target SDK**: 34 (Android 14)
