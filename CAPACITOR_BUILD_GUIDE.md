# Guía de Compilación y Despliegue con Capacitor - Grúa RD

Esta guía detalla cómo compilar, sincronizar y desplegar la aplicación móvil nativa de Grúa RD para Android e iOS utilizando Capacitor.

## Requisitos Previos

### Para Android
- **Android Studio** Arctic Fox o superior
- **JDK 17** (incluido con Android Studio)
- **Android SDK** con API level 24 o superior
- **Gradle** (manejado por Android Studio)

### Para iOS (solo macOS)
- **Xcode 14** o superior
- **CocoaPods** (`sudo gem install cocoapods`)
- **Cuenta de desarrollador Apple** (para publicar)

### Herramientas Generales
- **Node.js 18+**
- **npm** o **yarn**

## Configuración del Proyecto

### Información de la App

| Campo | Valor |
|-------|-------|
| App Name | Grúa RD |
| App ID | `com.fouronesolutions.gruard` |
| Android Package | `com.fouronesolutions.gruard` |
| iOS Bundle ID | `com.fouronesolutions.gruard` |
| Version | 1.0.0 |

## Flujo de Trabajo de Desarrollo

### 1. Compilar la Web App

Antes de sincronizar con las plataformas nativas, compila el frontend:

```bash
npm run build
```

Esto genera los archivos en `dist/public/` que Capacitor copiará a las apps nativas.

### 2. Sincronizar con Plataformas Nativas

Después de cada cambio en el código web:

```bash
# Sincronizar ambas plataformas
npx cap sync

# O sincronizar plataformas individuales
npx cap sync android
npx cap sync ios
```

El comando `sync` hace lo siguiente:
1. Copia los archivos web compilados a las carpetas nativas
2. Actualiza los plugins de Capacitor
3. Actualiza las dependencias nativas

### 3. Copiar Assets (sin actualizar dependencias)

Si solo necesitas actualizar los archivos web:

```bash
npx cap copy
```

## Desarrollo para Android

### Abrir en Android Studio

```bash
npx cap open android
```

### Compilar APK de Debug

1. En Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. El APK se genera en: `android/app/build/outputs/apk/debug/app-debug.apk`

### Compilar APK de Release

1. Genera una keystore (primera vez):
```bash
keytool -genkey -v -keystore gruard-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias gruard
```

2. Configura las variables de firma en `android/gradle.properties`:
```properties
GRUARD_RELEASE_STORE_FILE=gruard-release-key.jks
GRUARD_RELEASE_STORE_PASSWORD=tu_password
GRUARD_RELEASE_KEY_ALIAS=gruard
GRUARD_RELEASE_KEY_PASSWORD=tu_password
```

3. Actualiza `android/app/build.gradle`:
```groovy
android {
    signingConfigs {
        release {
            storeFile file(GRUARD_RELEASE_STORE_FILE)
            storePassword GRUARD_RELEASE_STORE_PASSWORD
            keyAlias GRUARD_RELEASE_KEY_ALIAS
            keyPassword GRUARD_RELEASE_KEY_PASSWORD
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

4. Compila:
```bash
cd android && ./gradlew assembleRelease
```

El APK de release se genera en: `android/app/build/outputs/apk/release/app-release.apk`

### Compilar Android App Bundle (AAB) para Play Store

```bash
cd android && ./gradlew bundleRelease
```

El AAB se genera en: `android/app/build/outputs/bundle/release/app-release.aab`

## Desarrollo para iOS

### Abrir en Xcode

```bash
npx cap open ios
```

### Instalar CocoaPods Dependencies

```bash
cd ios/App && pod install
```

### Configurar Signing

1. En Xcode, selecciona el proyecto **App**
2. Ve a **Signing & Capabilities**
3. Selecciona tu **Team** (cuenta de desarrollador)
4. Verifica que el **Bundle Identifier** sea `com.fouronesolutions.gruard`

### Compilar para Simulador

1. Selecciona un simulador en la barra superior de Xcode
2. Presiona **Cmd + B** para compilar
3. Presiona **Cmd + R** para ejecutar

### Compilar para Dispositivo Físico

1. Conecta el dispositivo iOS
2. Selecciona el dispositivo en Xcode
3. Presiona **Cmd + R** para compilar y ejecutar

### Generar Archive para App Store

1. Selecciona **Any iOS Device (arm64)** como destino
2. **Product > Archive**
3. Una vez completado, usa el **Organizer** para distribuir a App Store Connect

## Plugins Nativos Configurados

### Plugins de Capacitor Instalados

| Plugin | Uso |
|--------|-----|
| `@capacitor/camera` | Tomar fotos de vehículos y documentos |
| `@capacitor/filesystem` | Guardar archivos localmente |
| `@capacitor/geolocation` | Obtener ubicación del usuario |
| `@capacitor/push-notifications` | Notificaciones push |
| `@capacitor/network` | Detectar estado de conexión |
| `@capacitor/app` | Eventos de ciclo de vida |

### Plugin Personalizado: LocationTracking

Se ha creado un plugin personalizado para tracking de ubicación en segundo plano:

**Android:** `android/app/src/main/java/com/fouronesolutions/gruard/plugins/LocationTrackingPlugin.java`
- Usa `FusedLocationProviderClient` para ubicación precisa
- Implementa `ForegroundService` para tracking en segundo plano
- Notificación persistente mientras está activo

**iOS:** `ios/App/App/Plugins/LocationTracking/LocationTrackingPlugin.swift`
- Usa `CLLocationManager` con `allowsBackgroundLocationUpdates`
- Soporta `significantLocationChanges` para ahorro de batería
- Permisos configurados para "Always" y "When In Use"

**API del Plugin:**

```typescript
import { LocationTracking } from '@/lib/capacitor';

// Iniciar tracking
await LocationTracking.startTracking({
  interval: 5000,      // ms entre actualizaciones
  minDistance: 10      // metros mínimos de cambio
});

// Escuchar actualizaciones
LocationTracking.addListener('locationUpdate', (location) => {
  console.log(location.latitude, location.longitude);
});

// Detener tracking
await LocationTracking.stopTracking();

// Obtener última ubicación
const location = await LocationTracking.getLastLocation();
```

## Permisos Configurados

### Android (AndroidManifest.xml)

```xml
<!-- Ubicación -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Servicio en primer plano -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- Cámara -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Almacenamiento -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- Notificaciones -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### iOS (Info.plist)

```xml
<!-- Ubicación -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Grúa RD necesita acceder a tu ubicación...</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Grúa RD necesita acceso continuo...</string>

<!-- Cámara -->
<key>NSCameraUsageDescription</key>
<string>Grúa RD necesita acceso a la cámara...</string>

<!-- Fotos -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Grúa RD necesita acceso a tu galería...</string>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>fetch</string>
    <string>remote-notification</string>
</array>
```

## Publicación en Tiendas

### Google Play Store

1. **Preparar Assets:**
   - Ícono de app (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (mínimo 2 por tipo de dispositivo)

2. **Crear Release:**
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew bundleRelease
   ```

3. **Subir a Play Console:**
   - Crea una nueva aplicación en [Play Console](https://play.google.com/console)
   - Sube el AAB en **Production > Create new release**
   - Completa la información de la tienda
   - Envía para revisión

### Apple App Store

1. **Preparar Assets:**
   - Ícono de app (1024x1024 PNG sin transparencia)
   - Screenshots para cada tamaño de dispositivo

2. **Crear Archive:**
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   # En Xcode: Product > Archive
   ```

3. **Subir a App Store Connect:**
   - Usa el **Organizer** de Xcode
   - Selecciona **Distribute App > App Store Connect**
   - Completa la información en App Store Connect
   - Envía para revisión

## Solución de Problemas

### Error: "pod install" falla en iOS

```bash
cd ios/App
pod repo update
pod install --repo-update
```

### Error: Plugins no se registran

Verifica que el plugin esté registrado en `MainActivity.java`:

```java
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocationTrackingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### Error: Ubicación en segundo plano no funciona en Android

Verifica que el servicio esté declarado en `AndroidManifest.xml`:

```xml
<service
    android:name=".services.LocationTrackingService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="location" />
```

### Error: La app se cierra al abrir la cámara

Asegúrate de que los permisos están configurados y que usas `CameraResultType.Uri` en lugar de `Base64` para imágenes grandes.

## Variables de Entorno para Producción

Antes de compilar para producción, asegúrate de configurar:

```env
# Mapbox
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx

# API Backend
VITE_API_URL=https://api.gruard.com

# Push Notifications
VITE_VAPID_PUBLIC_KEY=xxx
```

## Comandos Rápidos

```bash
# Desarrollo completo
npm run build && npx cap sync && npx cap open android

# Solo actualizar web
npm run build && npx cap copy

# Verificar configuración
npx cap doctor

# Listar plugins
npx cap ls
```

## Estructura de Archivos Importantes

```
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/fouronesolutions/gruard/
│   │   │   │   ├── MainActivity.java
│   │   │   │   ├── plugins/LocationTrackingPlugin.java
│   │   │   │   ├── services/LocationTrackingService.java
│   │   │   │   └── receivers/BootReceiver.java
│   │   │   └── res/
│   │   └── build.gradle
│   └── capacitor.config.json
├── ios/
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist
│   │   │   └── Plugins/LocationTracking/
│   │   │       ├── LocationTrackingPlugin.swift
│   │   │       └── LocationTrackingPlugin.m
│   │   └── Podfile
│   └── capacitor.config.json
├── capacitor.config.ts
└── client/src/lib/capacitor.ts
```

## Notas Finales

- La PWA sigue funcionando en paralelo con las apps nativas
- El código detecta automáticamente si está en Capacitor o navegador
- Los plugins nativos solo se activan en las apps nativas
- El tracking en segundo plano consume batería; optimiza el intervalo según las necesidades
