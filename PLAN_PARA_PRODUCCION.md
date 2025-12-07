# Plan para Producción - Grúa RD

Guía completa para desplegar Grúa RD en CapRover y configurar las apps móviles (iOS/Android) para conectarse al servidor.

---

## 📋 Requisitos Previos

1. **VPS con CapRover instalado** - Si no lo tienes, instala CapRover en tu VPS siguiendo su documentación oficial
2. **Dominio apuntando a tu VPS** - Por ejemplo: `app.gruard.com`
3. **Acceso al dashboard de CapRover** - Típicamente en `https://tudominio.com:3000`
4. **Certificado SSL** - CapRover lo genera automáticamente con Let's Encrypt
5. **Git remoto configurado** - Tu repositorio debe estar en GitHub

---

## 🚀 Paso 1: Preparar tu Repositorio Git

```bash
# En tu máquina local
git add .
git commit -m "Production deployment configuration"
git push
```

Tu repositorio debe tener:
- ✅ `Dockerfile` - Ya configurado con Node 20 Alpine
- ✅ `captain-definition` - Archivo de configuración para CapRover
- ✅ `.env.example` - Variables de referencia
- ✅ Todas tus fuentes (client/, server/, shared/)

---

## 🏗️ Paso 2: Crear la App en CapRover

1. Abre el dashboard: `https://tudominio.com:3000`
2. Ve a **Apps** → **Create App**
3. Ingresa el nombre: `gruard-rd`
4. Haz clic en **Create New App**

CapRover creará el contenedor y te permitirá configurar el deployment.

---

## 🔌 Paso 3: Conectar tu Repositorio Git

1. En la app `gruard-rd`, ve a **Deployment** → **Method**
2. Selecciona **GitHub**
3. Conecta tu cuenta GitHub (si no lo has hecho aún)
4. Selecciona tu repositorio
5. Elige la rama: `main` o `development`
6. Haz clic en **Save & Deploy**

CapRover clonará el repo, leerá el `Dockerfile` y construirá automáticamente la imagen Docker.

**Nota:** El primer deploy puede tardar 5-10 minutos.

---

## 🔐 Paso 4: Configurar Variables de Entorno

En la app `gruard-rd`, ve a **Environment Variables** y agrega TODAS estas:

### Base de Datos
```bash
DATABASE_URL=postgresql://user:password@neon-host/dbname
```

### Entorno General
```bash
NODE_ENV=production
```

### CORS - Dominios Permitidos (IMPORTANTE)
```bash
ALLOWED_ORIGINS=https://app.gruard.com,https://www.gruard.com
```

### Sesión
```bash
# Genera una cadena aleatoria segura de al menos 32 caracteres
SESSION_SECRET=your_random_secure_string_min_32_chars
```

### Push Notifications
```bash
# Genera con: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=BPN...
VITE_VAPID_PUBLIC_KEY=BBM...
```

### Mapbox
```bash
VITE_MAPBOX_ACCESS_TOKEN=pk_live_your_mapbox_token
```

### Stripe
```bash
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public
```

### API URL para Apps Móviles (CRÍTICO)
```bash
# Esta URL es lo que usan iOS/Android para conectarse
VITE_API_URL=https://app.gruard.com
```

### Otras Variables
```bash
# Twilio, Resend, y otras configuraciones específicas
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
# ... etc
```

**Importante:** Haz clic en **Update & Deploy** después de agregar las variables.

---

## 📝 Paso 5: Configurar SSL/HTTPS

1. En CapRover: **Settings** → **Force HTTPS**
2. Habilita: `Enable HTTPS`
3. CapRover automáticamente obtendrá un certificado Let's Encrypt

Esto es **obligatorio** para que las apps móviles funcionen correctamente.

---

## 📱 Paso 6: Compilar y Desplegar Apps Móviles

### Preparación

Antes de compilar, asegúrate de que:
- `capacitor.config.ts` tiene la configuración correcta
- `VITE_API_URL` está establecido en tu `.env`

### iOS (en macOS con Xcode):

```bash
# 1. Configura la URL de API
export VITE_API_URL=https://app.gruard.com

# 2. Construye la web app
npm run build

# 3. Sincroniza con Capacitor
npx cap sync

# 4. Abre Xcode
npx cap open ios

# 5. En Xcode:
#    - Selecciona el scheme "App"
#    - Conecta tu dispositivo o selecciona simulador
#    - Presiona Play (o Cmd+R) para compilar y ejecutar
#    - Para App Store: Product → Archive → Validate & Upload
```

### Android (en cualquier OS con Android Studio):

```bash
# 1. Configura la URL de API
export VITE_API_URL=https://app.gruard.com

# 2. Construye la web app
npm run build

# 3. Sincroniza con Capacitor
npx cap sync

# 4. Abre Android Studio
npx cap open android

# 5. En Android Studio:
#    - Selecciona un dispositivo o emulador
#    - Haz clic en Play (o Shift+F10) para ejecutar
#    - Para Google Play: Build → Generate Signed Bundle/APK
```

---

## ✅ Paso 7: Verificar que Todo Funciona

### En CapRover

1. Abre `https://app.gruard.com/health` - Debe retornar status 200
2. Abre `https://app.gruard.com` - Debe cargar la app web
3. Ve a **Apps** → `gruard-rd` → **Logs** para revisar errores

### En las Apps Móviles

1. **Login** - Verifica que pueda conectarse a la base de datos
2. **Solicitud de Servicio** - Crea una solicitud y verifica que se guarda
3. **Tracking en Tiempo Real** - Si hay un driver asignado, verifica GPS en tiempo real
4. **Push Notifications** - Prueba que reciba notificaciones
5. **Chat** - Prueba mensajería en tiempo real si existe

---

## 🐛 Solución de Problemas Comunes

### Apps móviles no se conectan

**Síntomas:** Error de conexión, requests timeout en la app

**Soluciones:**
1. Verifica que `VITE_API_URL` está correctamente establecido
2. Confirma que compilaste con `npm run build` ANTES de sincronizar
3. Verifica que tu certificado SSL es válido (no autofirmado)
4. Revisa los logs en CapRover: **Apps** → **Logs**

### Base de datos no conecta

**Síntomas:** Error "connection refused" en los logs

**Soluciones:**
1. Verifica `DATABASE_URL` - debe ser válida y accesible
2. Si usas Neon, asegúrate de que está configurado para "Serverless"
3. Revisa que el usuario/contraseña sean correctos

### CORS bloqueado

**Síntomas:** Error "Access-Control-Allow-Origin" en navegador

**Soluciones:**
1. Agrega tu dominio a `ALLOWED_ORIGINS`
2. Para apps móviles, la configuración ya incluye `capacitor://` y `ionic://`
3. Haz clic en **Update & Deploy** después de cambiar `ALLOWED_ORIGINS`

### Push notifications no funcionan

**Síntomas:** No recibe notificaciones

**Soluciones:**
1. Genera nuevas VAPID keys: `npx web-push generate-vapid-keys`
2. Configúralas en variables de entorno
3. El usuario debe permitir notificaciones en la app
4. Verifica en browser console errores de Service Worker

### Deploys lentos o fallan

**Síntomas:** Timeout durante el build

**Soluciones:**
1. Revisa los logs: **Apps** → **Logs**
2. Aumenta el timeout en CapRover si es necesario
3. Asegúrate de que `npm run build` funciona localmente
4. Verifica que no tienes archivos muy grandes sin `.gitignore`

---

## 📊 Monitoreo Continuo

### Health Check

```bash
# Verifica que el servidor está online
curl https://app.gruard.com/health
```

### Logs

```bash
# En CapRover: Apps → gruard-rd → Logs
# Revisa regularmente para errores
```

### Performance

1. Monitorea uso de CPU y memoria en CapRover
2. Revisa velocidad de respuesta de la API
3. Verifica conexiones de WebSocket activas

---

## 🔄 Actualizaciones Futuras

Cuando hagas cambios en el código:

```bash
# 1. Commit y push a tu rama
git add .
git commit -m "Descripción del cambio"
git push

# 2. CapRover detectará cambios automáticamente
# 3. Revisa los logs en el dashboard
# 4. Para apps móviles, repite Paso 6
```

---

## 📞 Contacto y Soporte

- **CapRover Docs:** https://caprover.com/docs/
- **Capacitor Docs:** https://capacitorjs.com/docs
- **Neon Docs:** https://neon.tech/docs/

¡Tu app está lista para producción! 🚀
