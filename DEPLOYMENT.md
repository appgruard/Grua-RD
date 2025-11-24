# Guía de Deployment - Grúa RD

Esta guía detalla el proceso completo para desplegar Grúa RD en producción, desde la preparación hasta el deployment final.

## 📋 Índice
- [Pre-requisitos](#pre-requisitos)
- [Checklist Pre-Deployment](#checklist-pre-deployment)
- [Deployment a Replit](#deployment-a-replit)
- [Build de APK Android](#build-de-apk-android)
- [Troubleshooting](#troubleshooting)
- [Post-Deployment](#post-deployment)

---

## Pre-requisitos

### Servicios Externos Configurados

#### 1. PostgreSQL (Neon)
- [x] Base de datos de producción creada
- [x] Conexión verificada
- [x] Schema aplicado con `npm run db:push`
- [x] Backup configurado

#### 2. Stripe
- [x] Cuenta de producción activada
- [x] Claves LIVE obtenidas (`sk_live_...`, `pk_live_...`)
- [x] Webhook endpoint configurado: `https://tudominio.com/api/stripe-webhook`
- [x] Webhook secret guardado
- [x] Stripe Connect activado
- [x] Eventos suscritos:
  - `payment_intent.succeeded`
  - `account.updated`
  - `payout.paid`

#### 3. Google Maps Platform
- [x] Proyecto creado en Google Cloud Console
- [x] APIs habilitadas:
  - Maps JavaScript API
  - Geocoding API
  - Distance Matrix API
  - Places API
- [x] API Key con restricciones configuradas:
  - HTTP referrers para frontend
  - IP addresses para backend
- [x] Billing activado

#### 4. Twilio (SMS/OTP)
- [x] Cuenta verificada
- [x] Número de teléfono adquirido (+1809... formato E.164)
- [x] Créditos suficientes
- [x] Account SID y Auth Token guardados
- [x] Número verificado para SMS

#### 5. Web Push (VAPID)
- [x] VAPID keys generadas:
  ```bash
  npx web-push generate-vapid-keys
  ```
- [x] Keys guardadas en secrets

#### 6. Replit Object Storage
- [x] Integración activada
- [x] Permisos configurados
- [x] Health check pasando

---

## Checklist Pre-Deployment

### 1. Variables de Entorno

Ejecutar validación:
```bash
bash scripts/validate-env.sh
```

**Variables requeridas:**
- [x] `DATABASE_URL` (PostgreSQL production)
- [x] `SESSION_SECRET` (32+ caracteres aleatorios)
- [x] `NODE_ENV=production`
- [x] `ALLOWED_ORIGINS` (dominios de producción)
- [x] `STRIPE_SECRET_KEY` (sk_live_...)
- [x] `VITE_STRIPE_PUBLIC_KEY` (pk_live_...)
- [x] `STRIPE_WEBHOOK_SECRET` (whsec_...)
- [x] `VITE_GOOGLE_MAPS_API_KEY`
- [x] `TWILIO_ACCOUNT_SID`
- [x] `TWILIO_AUTH_TOKEN`
- [x] `TWILIO_PHONE_NUMBER`
- [x] `VITE_VAPID_PUBLIC_KEY`
- [x] `VAPID_PRIVATE_KEY`

Ver [ENV_VARS.md](ENV_VARS.md) para detalles completos.

---

### 2. Pre-Deployment Check

Ejecutar verificación completa:
```bash
tsx scripts/pre-deploy-check.ts
```

Este script verifica:
- ✅ Variables de entorno
- ✅ Conexión a base de datos
- ✅ Schema de base de datos completo
- ✅ Configuración de Stripe
- ✅ Google Maps API key
- ✅ VAPID keys
- ✅ Seguridad (session secret, CORS)

**Resultado esperado:**
```
✅ ALL CHECKS PASSED - Ready for deployment!
```

---

### 3. Type Checking

```bash
npm run check
```

Debe completar sin errores de tipos.

---

### 4. Build

```bash
npm run build
```

**Verifica:**
- [x] Build completa sin errores
- [x] Archivos generados en `dist/public/` (frontend)
- [x] Archivo `dist/index.js` (backend)
- [x] Tamaño de chunks < 500KB (advertencia aceptable por ahora)

---

### 5. Testing

```bash
# Tests E2E
npx playwright test

# Tests específicos críticos
npx playwright test e2e/01-client-flow.spec.ts
npx playwright test e2e/02-driver-flow.spec.ts
npx playwright test e2e/03-admin-flow.spec.ts
npx playwright test e2e/06-onboarding-wizard.spec.ts
npx playwright test e2e/07-stripe-connect-payment-flow.spec.ts
```

---

## Deployment a Replit

### Opción 1: Replit Deployments (Recomendado)

1. **Configurar Secrets**
   - Ir a "Secrets" en Replit
   - Agregar todas las variables de entorno de producción
   - Verificar con `bash scripts/validate-env.sh`

2. **Crear Deployment**
   - Click en "Deploy" en Replit
   - Seleccionar "Production Deployment"
   - Configurar dominio personalizado (opcional)
   - Deploy automático desde main branch

3. **Verificar Deployment**
   ```bash
   # Health check
   curl https://tu-dominio.replit.app/health
   
   # Debe retornar:
   {
     "status": "healthy",
     "environment": "production",
     "database": { "status": "healthy" },
     "objectStorage": { "status": "healthy" }
   }
   ```

4. **Configurar Webhooks de Stripe**
   - Ir a Stripe Dashboard > Webhooks
   - Agregar endpoint: `https://tu-dominio.replit.app/api/stripe-webhook`
   - Seleccionar eventos:
     - `payment_intent.succeeded`
     - `account.updated`
     - `payout.paid`
   - Copiar webhook secret a Replit Secrets

---

### Opción 2: Manual Start

```bash
# 1. Build
npm run build

# 2. Start producción
NODE_ENV=production npm start
```

---

## Build de APK Android

### Pre-requisitos

1. **Java JDK 17**
   ```bash
   java -version  # Verificar versión
   ```

2. **Android Studio** instalado con:
   - Android SDK
   - Android SDK Platform-Tools
   - Android SDK Build-Tools

3. **Variables de entorno**
   ```bash
   export ANDROID_SDK_ROOT=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_SDK_ROOT/tools
   export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
   ```

---

### Build Debug APK

```bash
# 1. Build del frontend
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Abrir en Android Studio
npx cap open android

# 4. Build APK
# En Android Studio:
# - Build > Build Bundle(s) / APK(s) > Build APK(s)
# - El APK estará en: android/app/build/outputs/apk/debug/app-debug.apk
```

**APK de Debug:**
- **Ubicación**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Uso**: Testing en dispositivos
- **Instalación**: `adb install app-debug.apk`

---

### Build Release APK (Firmado)

#### 1. Generar Keystore

```bash
keytool -genkey -v \
  -keystore gruard-release-key.keystore \
  -alias gruard \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Guardar seguramente:**
- `gruard-release-key.keystore` (archivo)
- Alias: `gruard`
- Passwords del keystore y alias

⚠️ **CRÍTICO**: Backup del keystore en ubicación segura. Si lo pierdes, no podrás actualizar la app en Play Store.

---

#### 2. Configurar Signing en Gradle

Editar `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("/ruta/a/gruard-release-key.keystore")
            storePassword "TU_PASSWORD_KEYSTORE"
            keyAlias "gruard"
            keyPassword "TU_PASSWORD_ALIAS"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Alternativa segura (NO hardcodear passwords):**

Crear `android/keystore.properties`:
```properties
storePassword=TU_PASSWORD_KEYSTORE
keyPassword=TU_PASSWORD_ALIAS
keyAlias=gruard
storeFile=/ruta/a/gruard-release-key.keystore
```

Agregar a `android/.gitignore`:
```
keystore.properties
*.keystore
```

Modificar `build.gradle`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
}
```

---

#### 3. Build Release

```bash
cd android
./gradlew assembleRelease

# APK firmado estará en:
# android/app/build/outputs/apk/release/app-release.apk
```

---

#### 4. Verificar Signing

```bash
jarsigner -verify -verbose -certs app-release.apk
```

Debe mostrar: "jar verified"

---

### Firebase Cloud Messaging (Push Notifications)

Para que las notificaciones push funcionen en Android:

1. **Crear proyecto Firebase**
   - https://console.firebase.google.com/
   - Agregar app Android
   - Package name: `com.gruard.app`

2. **Descargar `google-services.json`**
   - Colocar en: `android/app/google-services.json`

3. **Configurar Gradle**
   
   `android/build.gradle`:
   ```gradle
   buildscript {
       dependencies {
           classpath 'com.google.gms:google-services:4.4.0'
       }
   }
   ```

   `android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   
   dependencies {
       implementation platform('com.google.firebase:firebase-bom:32.7.0')
       implementation 'com.google.firebase:firebase-messaging'
   }
   ```

4. **Rebuild**
   ```bash
   npx cap sync android
   ./gradlew assembleDebug
   ```

---

## Troubleshooting

### Error: "DATABASE_URL not set"
**Solución**: Verificar que la variable esté en Replit Secrets
```bash
bash scripts/validate-env.sh
```

### Error: "Stripe webhook signature verification failed"
**Solución**: 
1. Verificar que `STRIPE_WEBHOOK_SECRET` sea correcto
2. Revisar endpoint en Stripe Dashboard
3. Verificar eventos suscritos

### Error: Build de Capacitor falla
**Solución**:
```bash
# Limpiar y rebuild
npx cap sync android
cd android
./gradlew clean
./gradlew build
```

### APK no instala en dispositivo
**Solución**:
1. Verificar que "Install from Unknown Sources" esté habilitado
2. Verificar firma: `jarsigner -verify app-release.apk`
3. Revisar compatibilidad de SDK (min SDK: 22)

### Service Worker no actualiza
**Solución**:
```javascript
// En navegador:
// 1. DevTools > Application > Service Workers
// 2. Click "Unregister"
// 3. Hard reload (Ctrl+Shift+R)

// O programáticamente:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

---

## Post-Deployment

### 1. Verificación de Salud

```bash
# Health check
curl https://tu-dominio.com/health

# Debe retornar 200 con:
{
  "status": "healthy",
  "database": { "status": "healthy" },
  "objectStorage": { "status": "healthy" }
}
```

### 2. Smoke Tests

```bash
# Test login
curl -X POST https://tu-dominio.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Test servicios endpoint
curl https://tu-dominio.com/api/servicios \
  -H "Cookie: connect.sid=..."
```

### 3. Monitoring

**Verificar logs:**
```bash
# En Replit: Ver logs en consola
# Buscar errores:
grep "ERROR" logs/error.log
grep "WARN" logs/combined.log
```

**Métricas a monitorear:**
- Tasa de errores (< 1%)
- Latencia promedio (< 500ms)
- Uptime (> 99%)
- Database connection pool

### 4. Stripe Webhooks

Verificar en Stripe Dashboard > Webhooks:
- ✅ Endpoint activo
- ✅ Eventos llegando
- ✅ Sin errores de verificación

### 5. Google Maps Usage

Monitorear en Google Cloud Console:
- Requests por día
- Errores API
- Costos estimados

### 6. SEO Meta Tags

**URLs Dinámicas**: La aplicación usa un script (`client/public/seo-meta.js`) que actualiza automáticamente las meta tags SEO basándose en el hostname actual:
- Canonical URL
- Open Graph URL
- Twitter Card URL
- Absolute image URLs

**Funcionamiento**:
- **Development**: Usa `http://localhost:5000`
- **Staging**: Usa `https://staging.gruard.com` (o el hostname configurado)
- **Production**: Usa `https://gruard.com` (o dominio custom)

No es necesario cambiar configuración entre ambientes.

---

## Checklist Final

### Deployment Completado

- [x] Pre-deployment check pasado
- [x] Build exitoso
- [x] Deployment a producción completado
- [x] Health check retorna "healthy"
- [x] Tests de humo pasados
- [x] Stripe webhooks funcionando
- [x] Google Maps cargando correctamente
- [x] Notificaciones push funcionando
- [x] Service Worker cacheando correctamente
- [x] Logs sin errores críticos

### Documentación

- [x] Variables de entorno documentadas
- [x] Secrets guardados de forma segura
- [x] Keystore de Android respaldado
- [x] Credenciales de servicios documentadas
- [x] Proceso de rollback documentado

### Seguridad

- [x] SESSION_SECRET único y fuerte
- [x] HTTPS habilitado
- [x] CORS configurado correctamente
- [x] Rate limiting activo
- [x] Helmet headers configurados
- [x] Secrets nunca en código

---

## Rollback

En caso de problemas críticos:

### Replit Deployments
```bash
# En Replit Dashboard:
# 1. Ir a "Deployments"
# 2. Seleccionar deployment anterior estable
# 3. Click "Promote to Production"
```

### Manual
```bash
# 1. Revertir a commit anterior
git revert HEAD
git push

# 2. O checkout a tag estable
git checkout v1.0.0
npm install
npm run build
npm start
```

---

## Recursos

- [ENV_VARS.md](ENV_VARS.md) - Variables de entorno
- [SCRIPTS.md](SCRIPTS.md) - Scripts disponibles
- [API.md](API.md) - Documentación de API
- [MIGRACION_ANDROID.md](MIGRACION_ANDROID.md) - Guía de Android
- [CAPACITOR_QUICKSTART.md](CAPACITOR_QUICKSTART.md) - Quickstart Capacitor

---

**Última actualización**: Noviembre 24, 2025  
**Versión**: 1.0.0 - Workstream D
