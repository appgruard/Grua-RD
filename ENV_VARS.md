# Variables de Entorno - Grúa RD

Este documento detalla todas las variables de entorno requeridas para ejecutar Grúa RD en desarrollo y producción.

## 📋 Índice
- [Variables Críticas (Requeridas)](#variables-críticas-requeridas)
- [Variables de Servicios Externos](#variables-de-servicios-externos)
- [Variables de Configuración](#variables-de-configuración)
- [Configuración por Ambiente](#configuración-por-ambiente)
- [Guía de Configuración](#guía-de-configuración)

---

## Variables Críticas (Requeridas)

### 🔐 Seguridad y Sesiones

#### `SESSION_SECRET`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared (Development + Production)
- **Requerido**: ✅ Sí
- **Descripción**: Clave secreta para firmar cookies de sesión de Express
- **Formato**: String aleatorio de mínimo 32 caracteres
- **Generación**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Ejemplo**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **Uso**: `server/routes.ts` - Configuración de express-session
- **Nota**: ⚠️ NUNCA usar valores por defecto en producción

---

### 🗄️ Base de Datos

#### `DATABASE_URL`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Managed by Replit (auto-configured)
- **Requerido**: ✅ Sí
- **Descripción**: URL de conexión a PostgreSQL (Neon)
- **Formato**: `postgresql://user:password@host:port/database?sslmode=require`
- **Ejemplo**: `postgresql://gruard_user:pass123@db.neon.tech:5432/gruard_db?sslmode=require`
- **Uso**: `server/db.ts` - Configuración de Drizzle ORM y pool de conexiones
- **Nota**: Automáticamente configurado por Replit Database integration

#### Variables PostgreSQL (Auto-configuradas)
Las siguientes variables son configuradas automáticamente por Replit Database:
- `PGHOST` - Host del servidor PostgreSQL
- `PGPORT` - Puerto (generalmente 5432)
- `PGUSER` - Usuario de la base de datos
- `PGPASSWORD` - Contraseña del usuario
- `PGDATABASE` - Nombre de la base de datos

---

## Variables de Servicios Externos

### 💳 dLocal (Pagos)

#### `DLOCAL_X_LOGIN`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ✅ Sí
- **Descripción**: X-Login para autenticación con API de dLocal
- **Obtención**: https://dashboard.dlocal.com/
- **Uso**: 
  - `server/services/dlocal-payment.ts` - Procesamiento de pagos
- **Seguridad**: ⚠️ NUNCA exponer en frontend

#### `DLOCAL_X_TRANS_KEY`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ✅ Sí
- **Descripción**: X-Trans-Key para autenticación con API de dLocal
- **Obtención**: https://dashboard.dlocal.com/
- **Uso**: 
  - `server/services/dlocal-payment.ts` - Autenticación de transacciones
- **Seguridad**: ⚠️ NUNCA exponer en frontend

#### `DLOCAL_SECRET_KEY`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ✅ Sí
- **Descripción**: Clave secreta para firmar peticiones a dLocal
- **Obtención**: https://dashboard.dlocal.com/
- **Uso**: 
  - `server/services/dlocal-payment.ts` - Firma de peticiones
- **Seguridad**: ⚠️ NUNCA exponer en frontend

#### `DLOCAL_API_KEY` (Opcional)
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ⚠️ Opcional
- **Descripción**: API Key adicional para algunas operaciones de dLocal
- **Obtención**: https://dashboard.dlocal.com/
- **Uso**: 
  - `server/services/dlocal-payment.ts` - Operaciones adicionales

**Endpoints webhook dLocal:**
- `/api/dlocal/webhook` - Notificaciones de pagos
- `/api/dlocal/payout-webhook` - Notificaciones de pagos a operadores

---

### 📱 Twilio (SMS/OTP)

#### `TWILIO_ACCOUNT_SID`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ⚠️ Opcional (fallback a mock en desarrollo)
- **Descripción**: Account SID de Twilio
- **Formato**: `AC...` (34 caracteres)
- **Obtención**: https://console.twilio.com/
- **Uso**: `server/sms-service.ts` - Envío de códigos OTP

#### `TWILIO_AUTH_TOKEN`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ⚠️ Opcional (fallback a mock en desarrollo)
- **Descripción**: Auth Token de Twilio
- **Formato**: String de 32 caracteres
- **Obtención**: https://console.twilio.com/
- **Uso**: `server/sms-service.ts` - Autenticación con API de Twilio

#### `TWILIO_PHONE_NUMBER`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ⚠️ Opcional (fallback a mock en desarrollo)
- **Descripción**: Número de teléfono Twilio verificado
- **Formato**: Formato E.164: `+18095551234`
- **Obtención**: https://console.twilio.com/phone-numbers
- **Uso**: `server/sms-service.ts` - Número remitente de SMS
- **Nota**: Debe estar verificado en Twilio y habilitado para SMS

---

### 🗺️ Mapbox

#### `MAPBOX_ACCESS_TOKEN`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ✅ Sí
- **Descripción**: Token de acceso de Mapbox para el servidor
- **Obtención**: https://account.mapbox.com/access-tokens/
- **APIs utilizadas**:
  - Directions API (cálculo de rutas y distancias)
  - Geocoding API (conversión de direcciones a coordenadas)
- **Uso**:
  - Backend: `server/routes.ts` - Cálculo de distancias y geocoding
- **Formato**: `pk.eyJ1Ijo...`
- **Nota**: Tier gratuito incluye 100,000 peticiones/mes de direcciones

#### `VITE_MAPBOX_ACCESS_TOKEN`
- **Tipo**: Environment Variable (Semi-público)
- **Ambiente**: Shared
- **Requerido**: ✅ Sí
- **Descripción**: Token de acceso de Mapbox para el frontend
- **Obtención**: https://account.mapbox.com/access-tokens/
- **APIs utilizadas**:
  - Mapbox GL JS (renderizado de mapas)
  - Geocoding API (reverse geocoding en clicks del mapa)
- **Uso**:
  - Frontend: `client/src/components/maps/MapboxMap.tsx` - Renderizado de mapas
  - Frontend: `client/src/pages/admin/analytics.tsx` - Mapa de calor
- **Formato**: `pk.eyJ1Ijo...`
- **Nota**: Prefijo `VITE_` es necesario para acceso desde frontend. Tier gratuito incluye 50,000 cargas de mapa/mes

---

### 🔔 Web Push (Notificaciones)

#### `VITE_VAPID_PUBLIC_KEY`
- **Tipo**: Environment Variable (Público)
- **Ambiente**: Shared
- **Requerido**: ✅ Sí
- **Descripción**: Clave VAPID pública para Web Push
- **Generación**:
  ```bash
  npx web-push generate-vapid-keys
  ```
- **Formato**: String base64 de ~87 caracteres
- **Uso**: 
  - `client/src/lib/usePushNotifications.ts`
  - `server/push-service.ts`

#### `VAPID_PRIVATE_KEY`
- **Tipo**: Secret (Confidencial)
- **Ambiente**: Shared
- **Requerido**: ✅ Sí
- **Descripción**: Clave VAPID privada para Web Push
- **Generación**: Mismo comando que la clave pública
- **Formato**: String base64 de ~43 caracteres
- **Uso**: `server/push-service.ts` - Firma de notificaciones push
- **Seguridad**: ⚠️ NUNCA exponer o commitear

---

## Variables de Configuración

### 🌐 Servidor y Red

#### `PORT`
- **Tipo**: Environment Variable
- **Ambiente**: Production
- **Requerido**: ⚠️ Opcional
- **Descripción**: Puerto donde corre el servidor Express
- **Default**: `5000`
- **Uso**: `server/index.ts`
- **Nota**: Replit puede asignar puerto automáticamente

#### `NODE_ENV`
- **Tipo**: Environment Variable
- **Ambiente**: Auto-detected
- **Requerido**: ⚠️ Opcional
- **Descripción**: Ambiente de ejecución
- **Valores**: `development` | `production`
- **Default**: `development`
- **Uso**: Multiple archivos para comportamiento condicional
- **Efectos**:
  - Seguridad de cookies (secure flag)
  - CORS policies
  - Logging level
  - Mock services (Twilio)

#### `ALLOWED_ORIGINS`
- **Tipo**: Environment Variable
- **Ambiente**: Production
- **Requerido**: ✅ Sí (en producción)
- **Descripción**: Lista de orígenes permitidos para CORS
- **Formato**: URLs separadas por comas
- **Ejemplo**: `https://gruard.com,https://www.gruard.com,https://gruard.replit.app`
- **Uso**: 
  - `server/index.ts` - Configuración CORS
  - `server/services/dlocal-payment.ts` - Return URLs
- **Default desarrollo**: `http://localhost:5000`

#### `LOG_LEVEL`
- **Tipo**: Environment Variable
- **Ambiente**: Shared
- **Requerido**: ⚠️ Opcional
- **Descripción**: Nivel de logging con Winston
- **Valores**: `error` | `warn` | `info` | `debug`
- **Default**: `info`
- **Uso**: `server/logger.ts`
- **Recomendación**: `info` en producción, `debug` en desarrollo

---

### 🔧 Variables Replit (Auto-configuradas)

Estas variables son automáticamente configuradas por Replit:

#### `REPLIT_DOMAINS`
- **Descripción**: Dominio(s) de la Repl
- **Uso**: Replit platform

#### `REPLIT_DEV_DOMAIN`
- **Descripción**: Dominio de desarrollo de la Repl
- **Uso**: Replit platform

#### `REPL_ID`
- **Descripción**: ID único de la Repl
- **Uso**: Replit platform

---

## Configuración por Ambiente

### 🧪 Development (Desarrollo)

**Mínimas requeridas:**
```bash
# Base de datos (auto-configurada por Replit)
DATABASE_URL=postgresql://...

# Sesión (usar default SOLO en dev)
SESSION_SECRET=dev-secret-change-in-production

# Mapbox (requerida)
MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijo...
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijo...

# dLocal (usar claves de sandbox)
DLOCAL_X_LOGIN=sandbox_login
DLOCAL_X_TRANS_KEY=sandbox_trans_key
DLOCAL_SECRET_KEY=sandbox_secret

# Web Push (generar con web-push)
VITE_VAPID_PUBLIC_KEY=BC...
VAPID_PRIVATE_KEY=...

# Twilio (OPCIONAL - fallback a mock)
# TWILIO_ACCOUNT_SID=AC...
# TWILIO_AUTH_TOKEN=...
# TWILIO_PHONE_NUMBER=+1...
```

**Comportamiento en desarrollo:**
- CORS permite localhost:5000
- Cookies sin secure flag
- Mock SMS si Twilio no está configurado
- Logs en nivel `debug` o `info`

---

### 🚀 Production (Producción)

**Todas requeridas:**
```bash
# Base de datos
DATABASE_URL=postgresql://... (Neon production)

# Seguridad
SESSION_SECRET=<GENERAR-SECRETO-FUERTE-32-CHARS>
NODE_ENV=production

# Red
PORT=5000
ALLOWED_ORIGINS=https://gruard.com,https://www.gruard.com

# Mapbox (requerida)
MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijo...
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijo...

# dLocal (usar claves de producción)
DLOCAL_X_LOGIN=production_login
DLOCAL_X_TRANS_KEY=production_trans_key
DLOCAL_SECRET_KEY=production_secret

# Twilio (REQUERIDO en producción)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1809...

# Web Push
VITE_VAPID_PUBLIC_KEY=BC...
VAPID_PRIVATE_KEY=...

# Logging
LOG_LEVEL=info
```

**Requerimientos adicionales:**
- SSL/TLS habilitado (HTTPS)
- Session secret único y fuerte
- CORS estrictamente configurado
- Rate limiting activo
- dLocal webhooks configurados
- Twilio account con créditos

---

## Guía de Configuración

### 🔧 Configurar en Replit

1. **Secrets (Variables confidenciales)**
   - Ir a "Secrets" en el panel izquierdo
   - Click "Add new secret"
   - Agregar cada secret con su valor

2. **Environment Variables (Variables públicas)**
   - Usar la herramienta de configuración de Replit
   - O definir en `.env` (NO commitear)

### ✅ Checklist Pre-Deploy

- [ ] `SESSION_SECRET` generado con 32+ caracteres aleatorios
- [ ] `DATABASE_URL` apunta a base de datos de producción
- [ ] dLocal keys son claves de producción
- [ ] dLocal webhooks configurados y endpoints verificados
- [ ] Twilio configurado con número verificado y créditos
- [ ] `MAPBOX_ACCESS_TOKEN` y `VITE_MAPBOX_ACCESS_TOKEN` configurados
- [ ] VAPID keys generadas y guardadas de forma segura
- [ ] `ALLOWED_ORIGINS` incluye todos los dominios de producción
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info` (no debug en producción)

### 🧪 Validar Configuración

Ejecutar health check:
```bash
curl http://localhost:5000/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-24T...",
  "environment": "production",
  "database": {
    "status": "healthy",
    "responseTime": 45
  },
  "objectStorage": {
    "status": "healthy",
    "responseTime": 120
  }
}
```

### 🔐 Seguridad

**NUNCA:**
- ❌ Commitear secrets en Git
- ❌ Usar valores por defecto en producción
- ❌ Compartir secrets en canales inseguros
- ❌ Usar claves de desarrollo en producción
- ❌ Exponer VAPID private key o dLocal secret keys

**SIEMPRE:**
- ✅ Usar Replit Secrets para datos confidenciales
- ✅ Rotar secrets regularmente
- ✅ Generar SESSION_SECRET único por ambiente
- ✅ Configurar restricciones en Mapbox API
- ✅ Usar HTTPS en producción
- ✅ Verificar webhooks de dLocal con signature

---

## 📞 Soporte

Si tienes dudas sobre la configuración de variables de entorno:
1. Revisa la documentación de cada servicio externo
2. Verifica los logs en `logs/combined.log` y `logs/error.log`
3. Usa el endpoint `/health` para diagnóstico

---

**Última actualización**: Diciembre 3, 2025  
**Versión**: 1.2.0 - Migración de Stripe a dLocal
