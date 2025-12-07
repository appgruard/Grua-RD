# Grúa RD - Guía Completa de Producción

Esta guía cubre todo lo necesario para desplegar el servidor en CapRover y compilar las apps móviles (APK e IPA) para cliente y conductor.

---

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Despliegue en CapRover](#despliegue-en-caprover)
3. [Compilación de Apps Móviles](#compilación-de-apps-móviles)
4. [Variables de Entorno](#variables-de-entorno)
5. [Base de Datos](#base-de-datos)
6. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos Previos

### Para el Servidor (CapRover)
- Un VPS con Ubuntu 20.04+ (DigitalOcean, Linode, AWS EC2, Hetzner, etc.)
- Mínimo 2GB RAM, 2 vCPU
- Docker instalado
- CapRover instalado
- Un dominio configurado (ej: app.gruard.com)

### Para Apps Android (APK)
- Node.js 18+
- Android Studio (con Android SDK API 24+)
- JDK 17
- Keystore para firmar apps (ver sección de generación)

### Para Apps iOS (IPA)
- macOS con Xcode 14+
- CocoaPods instalado (`sudo gem install cocoapods`)
- Cuenta de desarrollador Apple ($99/año)
- Certificados y provisioning profiles configurados

---

## Despliegue en CapRover

### Paso 1: Instalar CapRover en tu VPS

```bash
# En tu VPS
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar CapRover
docker run -p 80:80 -p 443:443 -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  caprover/caprover
```

Accede a: `http://TU-IP-VPS:3000` y configura CapRover.

### Paso 2: Crear la Aplicación

1. En el dashboard de CapRover, crea una nueva app: `gruard-rd`
2. Ve a **HTTP Settings** y configura:
   - Container HTTP Port: `80`
   - Enable HTTPS (Let's Encrypt automático)

### Paso 3: Configurar Variables de Entorno

En CapRover → App Variables, agrega TODAS las siguientes:

```bash
# Base de datos (REQUERIDO)
DATABASE_URL=postgresql://usuario:password@host:5432/gruard_db

# Entorno
NODE_ENV=production

# CORS - Dominios permitidos (separados por coma)
ALLOWED_ORIGINS=https://app.gruard.com,https://www.gruard.com

# Sesión (genera un string aleatorio de 32+ caracteres)
SESSION_SECRET=tu_secret_muy_largo_y_seguro_32_chars

# Push Notifications (genera con: npx web-push generate-vapid-keys)
VAPID_PRIVATE_KEY=tu_vapid_private_key
VITE_VAPID_PUBLIC_KEY=tu_vapid_public_key

# Mapbox (para mapas)
VITE_MAPBOX_ACCESS_TOKEN=pk.xxxxxx

# Resend (para emails)
RESEND_API_KEY=re_xxxxx

# Twilio (para SMS)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# URL de la API (CRÍTICO para apps móviles)
VITE_API_URL=https://app.gruard.com

# Object Storage (Replit - opcional si no usas)
REPLIT_OBJECT_STORAGE_PROJECT_ID=xxxxx
REPLIT_OBJECT_STORAGE_TOKEN=xxxxx
```

### Paso 4: Desplegar

**Opción A: Deploy desde GitHub (Recomendado)**

1. En CapRover → Deployment → GitHub Integration
2. Conecta tu repositorio
3. Selecciona rama `main`
4. Habilita Auto Deploy

**Opción B: Deploy con CapRover CLI**

```bash
# Instala CapRover CLI
npm install -g caprover

# Login
caprover login

# Deploy
caprover deploy -a gruard-rd
```

### Paso 5: Verificar Despliegue

```bash
# Verificar que el servidor responde
curl https://tu-dominio.com/health

# Debería retornar algo como:
# {"status":"ok","database":"connected"}
```

### Archivos de Configuración (ya incluidos)

- `Dockerfile` - Build multi-stage optimizado
- `captain-definition` - Configuración de CapRover

---

## Compilación de Apps Móviles

### Apps Disponibles

Solo se compilan dos apps móviles:

| App | App ID | Descripción |
|-----|--------|-------------|
| **Cliente** | `com.fouronesolutions.gruard.cliente` | Para usuarios que solicitan grúas |
| **Conductor** | `com.fouronesolutions.gruard.conductor` | Para conductores que aceptan servicios |

> **Nota**: Admin, Empresa, Aseguradoras y Socios acceden solo via web.

### Prerrequisitos

Antes de compilar, asegúrate de tener instalado:

```bash
# Verificar Node.js
node --version  # v18+

# Verificar que Capacitor está instalado
npx cap --version

# Instalar dependencias
npm install
```

### Compilar APK para Android

El script de build hace backup de los archivos de configuración, genera la app específica, y restaura los archivos originales al finalizar. Esto permite compilar ambas apps sin conflictos.

#### Cliente (APK)

```bash
# Opción 1: Script rápido
./scripts/build-cliente-apk.sh

# Opción 2: Script completo con opciones
npx tsx scripts/build-mobile-app.ts cliente android
```

#### Conductor (APK)

```bash
# Opción 1: Script rápido
./scripts/build-conductor-apk.sh

# Opción 2: Script completo
npx tsx scripts/build-mobile-app.ts conductor android
```

#### Ubicación del APK generado

Los APKs se copian automáticamente a la carpeta `builds/`:

```
# Cliente
builds/cliente/android/gruard-cliente-debug-latest.apk
builds/cliente/android/gruard-cliente-release-latest.apk

# Conductor
builds/conductor/android/gruard-conductor-debug-latest.apk
builds/conductor/android/gruard-conductor-release-latest.apk
```

También se crean versiones con timestamp para historial.

#### Generar Keystore para Play Store (primera vez)

```bash
keytool -genkey -v \
  -keystore gruard-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias gruard

# IMPORTANTE: Guarda este archivo y las contraseñas en un lugar seguro
```

#### Configurar Variables para Firma

```bash
export ANDROID_KEYSTORE_PATH=/ruta/a/gruard-release.jks
export ANDROID_KEYSTORE_PASSWORD=tu_password
export ANDROID_KEY_ALIAS=gruard
export ANDROID_KEY_PASSWORD=tu_password

# Luego ejecuta el build
./scripts/build-cliente-apk.sh
```

### Compilar IPA para iOS

> **Requisito**: macOS con Xcode 14+

#### Cliente (iOS)

```bash
./scripts/build-cliente-ios.sh
```

#### Conductor (iOS)

```bash
./scripts/build-conductor-ios.sh
```

#### Generar IPA en Xcode

1. **Abrir proyecto:**
   ```bash
   npx cap open ios
   ```

2. **Configurar Signing:**
   - Abre el proyecto en Xcode
   - Ve a **Signing & Capabilities**
   - Selecciona tu **Team** de desarrollador
   - Verifica el **Bundle Identifier**:
     - Cliente: `com.fouronesolutions.gruard.cliente`
     - Conductor: `com.fouronesolutions.gruard.conductor`

3. **Generar Archive:**
   - Selecciona "Any iOS Device (arm64)" como destino
   - **Product → Archive**
   - En Organizer, selecciona **Distribute App**
   - Elige "App Store Connect" o "Ad Hoc" según necesites

#### Generar IPA desde terminal (alternativa)

```bash
cd ios/App

# Build archive
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ExportOptions.plist
```

---

## Variables de Entorno

### Tabla Completa de Variables

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | URL de conexión a PostgreSQL |
| `NODE_ENV` | Sí | `production` para producción |
| `SESSION_SECRET` | Sí | Secret para sesiones (32+ chars) |
| `ALLOWED_ORIGINS` | Sí | Dominios permitidos para CORS |
| `VITE_API_URL` | Sí | URL del servidor para apps móviles |
| `VAPID_PRIVATE_KEY` | Sí | Clave privada para push notifications |
| `VITE_VAPID_PUBLIC_KEY` | Sí | Clave pública VAPID |
| `VITE_MAPBOX_ACCESS_TOKEN` | Sí | Token de Mapbox para mapas |
| `RESEND_API_KEY` | No | API key de Resend para emails |
| `TWILIO_ACCOUNT_SID` | No | SID de Twilio para SMS |
| `TWILIO_AUTH_TOKEN` | No | Token de Twilio |
| `TWILIO_PHONE_NUMBER` | No | Número de Twilio |

### Generar VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Esto generará:
- `VAPID_PRIVATE_KEY` (backend)
- `VITE_VAPID_PUBLIC_KEY` (frontend y backend)

---

## Base de Datos

### Configuración SSL

El servidor está configurado para aceptar conexiones con certificados SSL auto-firmados. Esto está en `server/db.ts`:

```typescript
// Permite SSL con certificados auto-firmados
const sslConfig = { rejectUnauthorized: false };
```

**NO modificar esta configuración** si tu base de datos usa certificados auto-firmados.

### Opciones de Base de Datos

#### Opción 1: Neon (Recomendado)

1. Crea cuenta en https://neon.tech
2. Crea un proyecto y base de datos
3. Copia la connection string: `postgresql://user:pass@host/db`

#### Opción 2: PostgreSQL en tu VPS

```bash
# Instalar PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Crear base de datos
sudo -u postgres createdb gruard_db
sudo -u postgres psql -c "CREATE USER gruard WITH PASSWORD 'tu_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gruard_db TO gruard;"
```

### Inicializar Tablas

Las tablas se crean automáticamente al iniciar el servidor. Para forzar una migración:

```bash
npx drizzle-kit push
```

---

## Solución de Problemas

### Error: "Cannot connect to database"

1. Verifica que `DATABASE_URL` es correcta
2. Verifica que la base de datos está accesible desde tu VPS
3. Si usas SSL auto-firmado, la configuración ya permite esto

### Error: "CORS blocked"

1. Agrega tu dominio a `ALLOWED_ORIGINS`
2. Las apps móviles usan `capacitor://` y `ionic://` que ya están permitidos

### Error: "WebSocket connection failed"

1. Verifica que `ALLOWED_ORIGINS` incluye tu dominio
2. Verifica que no hay firewall bloqueando WebSocket

### Error en Android: "net::ERR_CLEARTEXT_NOT_PERMITTED"

El servidor usa HTTPS, esto no debería ocurrir. Verifica que `VITE_API_URL` usa `https://`.

### Error en iOS: "App Transport Security policy"

El proyecto ya está configurado para permitir conexiones HTTPS. Verifica Info.plist.

### El APK no se instala

1. Para APK de debug: Habilita "Instalar apps desconocidas" en el dispositivo
2. Para APK de release: Verifica que está firmado correctamente

### Health check falla en CapRover

1. Verifica los logs: CapRover → Logs
2. El endpoint `/health` debe retornar status 200
3. Verifica que la base de datos está conectada

---

## Checklist Pre-Producción

### Servidor
- [ ] Base de datos PostgreSQL configurada
- [ ] Variables de entorno configuradas en CapRover
- [ ] HTTPS habilitado (Let's Encrypt)
- [ ] Dominio apuntando al VPS
- [ ] Health check pasando (`/health`)
- [ ] WebSockets funcionando
- [ ] Notificaciones push configuradas (VAPID keys)
- [ ] Backups de base de datos configurados

### Apps Móviles
- [ ] `VITE_API_URL` apuntando al servidor de producción
- [ ] Keystore de Android generado y guardado
- [ ] Certificados de iOS configurados
- [ ] Versiones incrementadas (versionCode/versionName)
- [ ] Íconos y splash screens actualizados
- [ ] Probar login/registro en dispositivos reales
- [ ] Probar solicitud de servicio completa
- [ ] Probar notificaciones push
- [ ] Probar tracking de ubicación

### Play Store (Android)
- [ ] App Bundle (AAB) generado: `./gradlew bundleRelease`
- [ ] Screenshots preparados
- [ ] Descripción en español
- [ ] Política de privacidad URL
- [ ] Categoría: Travel & Local o Auto & Vehicles

### App Store (iOS)
- [ ] Archive generado en Xcode
- [ ] Screenshots para todos los tamaños de dispositivo
- [ ] Descripción en español
- [ ] Política de privacidad URL
- [ ] Categoría: Travel o Utilities

---

## Comandos Rápidos

```bash
# === SERVIDOR ===
# Verificar salud del servidor
curl https://tu-dominio.com/health

# Ver logs en CapRover
# CapRover Dashboard → Apps → gruard-rd → Logs

# === ANDROID ===
# Build Cliente APK
./scripts/build-cliente-apk.sh

# Build Conductor APK
./scripts/build-conductor-apk.sh

# Abrir en Android Studio
npx cap open android

# Generar AAB para Play Store
cd android && ./gradlew bundleRelease

# === iOS ===
# Preparar Cliente iOS
./scripts/build-cliente-ios.sh

# Preparar Conductor iOS
./scripts/build-conductor-ios.sh

# Abrir en Xcode
npx cap open ios

# === UTILIDADES ===
# Generar VAPID keys
npx web-push generate-vapid-keys

# Verificar configuración de Capacitor
npx cap doctor

# Sincronizar cambios
npm run build && npx cap sync
```

---

## Estructura de Archivos Importantes

```
gruard-rd/
├── Dockerfile                 # Build para CapRover
├── captain-definition         # Config de CapRover
├── capacitor.config.ts        # Config de Capacitor (se genera por script)
├── scripts/
│   ├── build-mobile-app.ts    # Script principal de build
│   ├── build-cliente-apk.sh   # Build rápido Cliente Android
│   ├── build-conductor-apk.sh # Build rápido Conductor Android
│   ├── build-cliente-ios.sh   # Build rápido Cliente iOS
│   └── build-conductor-ios.sh # Build rápido Conductor iOS
├── android/                   # Proyecto Android (Capacitor)
├── ios/                       # Proyecto iOS (Capacitor)
├── server/
│   ├── db.ts                  # Conexión a DB (SSL config aquí)
│   └── index.ts               # Punto de entrada del servidor
└── client/                    # Frontend React
```

---

## Contacto y Soporte

Si tienes problemas:
1. Revisa los logs en CapRover
2. Verifica las variables de entorno
3. Ejecuta `npx cap doctor` para verificar Capacitor
4. Prueba el build local: `npm run build`

---

*Última actualización: Diciembre 2024*
