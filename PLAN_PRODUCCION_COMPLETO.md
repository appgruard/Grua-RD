# Plan Completo para Producción - Grúa RD

**Fecha de Creación:** 1 de Diciembre, 2025  
**Estado:** Pendiente de Revisión  
**Prioridad:** Alta

---

## Resumen Ejecutivo

Después de una revisión exhaustiva de toda la aplicación Grúa RD, se han identificado los elementos pendientes para llevar la aplicación a producción. La aplicación tiene un estado de desarrollo muy avanzado (~90% completo), pero requiere configuración de servicios externos, ajustes menores y validación final.

---

## 1. Estado Actual de la Aplicación

### ✅ COMPLETADO

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Frontend React | ✅ 100% | 6 interfaces: Cliente, Conductor, Admin, Aseguradora, Socio, Empresa |
| Backend Express | ✅ 100% | API REST completa con 100+ endpoints |
| WebSockets | ✅ 100% | Tracking GPS y chat en tiempo real |
| Base de Datos Schema | ✅ 100% | 25+ tablas definidas con Drizzle ORM |
| Autenticación | ✅ 100% | Passport.js + bcrypt + sesiones |
| PWA Base | ✅ 90% | manifest.json + service worker funcional |
| Verificación Identidad | ✅ 100% | Cédula (Verifik OCR) + OTP SMS |
| Gestión Documentos | ✅ 100% | Upload/Download con Replit Object Storage |
| Notificaciones Push | ✅ 90% | Implementado, pendiente claves VAPID |
| Seguridad | ✅ 100% | Helmet, CORS, Rate Limiting, Audit Logging |
| Tests E2E | ✅ 100% | 7 archivos de tests Playwright |
| Documentación | ✅ 100% | DEPLOYMENT.md, ENV_VARS.md, API.md |

---

## 2. Elementos Pendientes

### 🔴 CRÍTICOS (Bloquean Producción)

#### 2.1 Base de Datos PostgreSQL
- **Estado:** No provisionada
- **Acción Requerida:**
  1. Crear base de datos PostgreSQL usando la herramienta de Replit
  2. Ejecutar migraciones: `npm run db:push`
  3. Verificar que todas las tablas se creen correctamente
- **Tiempo Estimado:** 15 minutos

#### 2.2 Claves VAPID (Push Notifications)
- **Estado:** No configuradas
- **Secrets Requeridos:**
  - `VITE_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
- **Acción Requerida:**
  ```bash
  npx web-push generate-vapid-keys
  ```
- **Tiempo Estimado:** 5 minutos

#### 2.3 Proveedor de Pagos
- **Estado:** Configuración mixta/incompleta
- **Análisis:**
  - Schema tiene campos para dLocal (dlocalPaymentId, etc.)
  - Variables de entorno tienen: `DLOCAL_X_LOGIN`, `DLOCAL_X_TRANS_KEY`, `DLOCAL_SECRET_KEY`
  - Script pre-deploy busca Stripe (obsoleto)
  - Componente `DLocalPaymentManager.tsx` existe
- **Decisión Requerida:** Confirmar si usar dLocal o Stripe
- **Secrets Requeridos (si dLocal):**
  - ✅ `DLOCAL_X_LOGIN` - Ya configurado
  - ✅ `DLOCAL_X_TRANS_KEY` - Ya configurado
  - ✅ `DLOCAL_SECRET_KEY` - Ya configurado
- **Secrets Requeridos (si Stripe):**
  - ❌ `STRIPE_SECRET_KEY`
  - ❌ `VITE_STRIPE_PUBLIC_KEY`
  - ❌ `STRIPE_WEBHOOK_SECRET`
- **Tiempo Estimado:** 30-60 minutos (depende del proveedor)

#### 2.4 Variable SESSION_SECRET
- **Estado:** Ya existe en secrets
- **Verificación Requerida:** Confirmar que tiene 32+ caracteres aleatorios
- **Tiempo Estimado:** 5 minutos

---

### 🟡 IMPORTANTES (Afectan Funcionalidad)

#### 2.5 Configuración ALLOWED_ORIGINS
- **Estado:** No configurado para producción
- **Acción Requerida:** Agregar dominios de producción
- **Formato:** `https://gruard.com,https://www.gruard.com,https://[repl-name].replit.app`
- **Archivo:** `server/index.ts` ya maneja esta configuración
- **Tiempo Estimado:** 10 minutos

#### 2.6 Actualizar Script pre-deploy-check.ts
- **Estado:** Obsoleto (busca Google Maps, debería buscar Mapbox)
- **Problemas Identificados:**
  1. Línea 29: Busca `VITE_GOOGLE_MAPS_API_KEY` pero app usa Mapbox
  2. Función `checkGoogleMapsAPI()` debe cambiarse a `checkMapboxAPI()`
  3. Debe agregar verificación de dLocal si es el proveedor elegido
- **Tiempo Estimado:** 30 minutos

#### 2.7 Actualizar CSP (Content Security Policy)
- **Estado:** Configurado para Google Maps, debería incluir Mapbox
- **Archivo:** `server/index.ts` líneas 17-62
- **Dominios a agregar:**
  - `https://api.mapbox.com`
  - `https://*.tiles.mapbox.com`
  - `https://events.mapbox.com`
- **Tiempo Estimado:** 15 minutos

#### 2.8 Integraciones Replit Pendientes
- **Estado:** 5 integraciones marcadas como "NEEDS SETUP"
- **Lista:**
  1. `javascript_stripe==1.0.0` - Solo si se usa Stripe
  2. `javascript_database==1.0.0` - Configurar con base de datos
  3. `javascript_websocket==1.0.0` - Ya funcional, solo formalizar setup
  4. `twilio==1.0.0` - Configurar credenciales Twilio
  5. `resend==1.0.0` - Configurar credenciales Resend
- **Tiempo Estimado:** 20-30 minutos

---

### 🟢 MENORES (Mejoras de Calidad)

#### 2.9 Iconos PWA
- **Estado:** Solo usa favicon.png para todos los tamaños
- **Problema:** manifest.json declara múltiples tamaños pero todos apuntan al mismo archivo
- **Solución Ideal:** Crear iconos en tamaños: 48x48, 72x72, 96x96, 144x144, 192x192, 512x512
- **Alternativa Temporal:** Mantener favicon.png (funciona pero no es óptimo)
- **Tiempo Estimado:** 30-60 minutos (si se crean iconos)

#### 2.10 Screenshots PWA
- **Estado:** Usa favicon.png como screenshot (incorrecto)
- **Archivo:** `client/public/manifest.json` línea 51-58
- **Solución:** Crear screenshots reales de la app (540x720 narrow, 1024x768 wide)
- **Tiempo Estimado:** 30 minutos

#### 2.11 Service Worker - Referencia a Icono
- **Estado:** Referencia `icon-192.png` que no existe
- **Archivo:** `client/public/sw.js` líneas 169-170
- **Corrección:** Cambiar a `/favicon.png`
- **Tiempo Estimado:** 5 minutos

---

## 3. Variables de Entorno Requeridas

### Secrets (Confidenciales)

| Variable | Estado | Crítico | Notas |
|----------|--------|---------|-------|
| `DATABASE_URL` | ⏳ Pendiente DB | ✅ Sí | Auto-configurado al crear DB |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | ⏳ Pendiente DB | ✅ Sí | Auto-configurados |
| `SESSION_SECRET` | ✅ Existe | ✅ Sí | Verificar longitud 32+ chars |
| `MAPBOX_ACCESS_TOKEN` | ✅ Existe | ✅ Sí | Backend |
| `VITE_MAPBOX_ACCESS_TOKEN` | ✅ Existe | ✅ Sí | Frontend |
| `VERIFIK_API_KEY` | ✅ Existe | ✅ Sí | Validación de cédula |
| `DLOCAL_X_LOGIN` | ✅ Existe | ⚠️ Si dLocal | Pagos |
| `DLOCAL_X_TRANS_KEY` | ✅ Existe | ⚠️ Si dLocal | Pagos |
| `DLOCAL_SECRET_KEY` | ✅ Existe | ⚠️ Si dLocal | Pagos |
| `VITE_VAPID_PUBLIC_KEY` | ❌ Falta | ✅ Sí | Push notifications |
| `VAPID_PRIVATE_KEY` | ❌ Falta | ✅ Sí | Push notifications |

### Variables de Entorno (Públicas)

| Variable | Estado | Crítico | Notas |
|----------|--------|---------|-------|
| `NODE_ENV` | Auto | ⚠️ Recomendado | Establecer `production` |
| `ALLOWED_ORIGINS` | ❌ Falta | ✅ Sí | Dominios de producción |
| `PORT` | Auto | No | Default 5000 |
| `LOG_LEVEL` | Opcional | No | Default `info` |

---

## 4. Checklist de Acciones

### Fase 1: Infraestructura (30 min)
- [ ] Crear base de datos PostgreSQL
- [ ] Ejecutar migraciones (`npm run db:push`)
- [ ] Verificar conexión a base de datos

### Fase 2: Secrets y Configuración (30 min)
- [ ] Generar claves VAPID y agregarlas como secrets
- [ ] Confirmar proveedor de pagos (dLocal vs Stripe)
- [ ] Configurar credenciales del proveedor de pagos elegido
- [ ] Verificar SESSION_SECRET tiene 32+ caracteres
- [ ] Configurar ALLOWED_ORIGINS para producción

### Fase 3: Correcciones de Código (45 min)
- [ ] Actualizar script pre-deploy-check.ts para Mapbox
- [ ] Actualizar CSP en server/index.ts para Mapbox
- [ ] Corregir referencia a icono en service worker
- [ ] (Opcional) Crear iconos PWA en múltiples tamaños
- [ ] (Opcional) Crear screenshots reales para manifest.json

### Fase 4: Integraciones Replit (20 min)
- [ ] Configurar integración de base de datos
- [ ] Configurar integración de Twilio
- [ ] Configurar integración de Resend
- [ ] (Opcional) Configurar integración de Stripe si aplica

### Fase 5: Validación (30 min)
- [ ] Ejecutar script pre-deploy: `tsx scripts/pre-deploy-check.ts`
- [ ] Ejecutar build: `npm run build`
- [ ] Verificar type-checking: `npm run check`
- [ ] Ejecutar tests E2E: `npx playwright test`
- [ ] Probar health check: `curl /health`

### Fase 6: Deployment (15 min)
- [ ] Configurar deployment en Replit
- [ ] Verificar health check en producción
- [ ] Configurar webhooks de pagos (si aplica)
- [ ] Probar flujo completo en producción

---

## 5. Decisiones Pendientes del Usuario

1. **¿Usar dLocal o Stripe como proveedor de pagos?**
   - dLocal ya tiene credenciales configuradas
   - Stripe requiere configuración adicional
   - El código soporta ambos

2. **¿Crear iconos PWA en múltiples tamaños?**
   - Mejora la experiencia de instalación
   - Requiere diseño/creación de assets

3. **¿Crear screenshots para manifest.json?**
   - Mejora la presentación en tiendas de apps
   - Requiere capturas de la app funcionando

4. **¿Dominio personalizado?**
   - Por defecto será `[repl-name].replit.app`
   - Se puede configurar dominio custom después

---

## 6. Estimación de Tiempo Total

| Fase | Tiempo Estimado |
|------|-----------------|
| Fase 1: Infraestructura | 30 min |
| Fase 2: Secrets y Configuración | 30 min |
| Fase 3: Correcciones de Código | 45 min |
| Fase 4: Integraciones Replit | 20 min |
| Fase 5: Validación | 30 min |
| Fase 6: Deployment | 15 min |
| **TOTAL** | **~3 horas** |

*Nota: Si se incluye creación de iconos PWA y screenshots, agregar 1-2 horas adicionales.*

---

## 7. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Credenciales de pagos incorrectas | Alto | Probar en sandbox/test primero |
| Base de datos no sincroniza | Alto | Usar `npm run db:push` y verificar |
| VAPID keys inválidas | Medio | Regenerar con web-push |
| CORS bloquea requests | Medio | Verificar ALLOWED_ORIGINS |
| Service Worker cacheando versión vieja | Bajo | Incrementar VERSION en sw.js |

---

## 8. Próximos Pasos Recomendados

1. **Inmediato:** Revisar este plan y aprobar el enfoque
2. **Decidir:** Confirmar proveedor de pagos (dLocal recomendado - ya tiene credenciales)
3. **Ejecutar:** Fases 1-6 en orden
4. **Verificar:** Pruebas completas antes de anunciar producción

---

**Notas Finales:**
- La aplicación está muy cerca de estar lista para producción
- La mayoría de los pendientes son de configuración, no de código
- Se recomienda hacer un soft-launch con usuarios beta antes del lanzamiento completo

---

## 9. Integración de Capacitor para Apps Móviles Nativas

### 9.1 Objetivo
Convertir la PWA en aplicaciones móviles nativas para iOS y Android usando Capacitor, manteniendo la funcionalidad PWA intacta.

### 9.2 Configuración Base

| Elemento | Valor |
|----------|-------|
| App ID | `com.fouronesolutions.gruard` |
| App Name | `Grúa RD` |
| Web Dir | `dist/public` |
| Plataformas | Android, iOS |

### 9.3 Plugins Nativos Requeridos

| Plugin | Uso |
|--------|-----|
| `@capacitor/camera` | Captura de fotos de vehículos y documentos |
| `@capacitor/filesystem` | Gestión de archivos locales |
| `@capacitor/push-notifications` | Notificaciones push nativas |
| `@capacitor/geolocation` | Ubicación GPS |
| `@capacitor/network` | Estado de conexión |
| `@capacitor/app` | Lifecycle de la app |
| Plugin Custom Tracking | Tracking GPS en background |

### 9.4 Permisos Nativos

#### Android
- `ACCESS_FINE_LOCATION` - Ubicación precisa
- `ACCESS_COARSE_LOCATION` - Ubicación aproximada
- `ACCESS_BACKGROUND_LOCATION` - Ubicación en background
- `FOREGROUND_SERVICE` - Servicio en primer plano
- `FOREGROUND_SERVICE_LOCATION` - Servicio de ubicación
- `CAMERA` - Cámara
- `READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES` - Lectura de archivos
- `POST_NOTIFICATIONS` - Notificaciones (Android 13+)

#### iOS
- `NSLocationWhenInUseUsageDescription` - Ubicación en uso
- `NSLocationAlwaysAndWhenInUseUsageDescription` - Ubicación siempre
- `NSLocationAlwaysUsageDescription` - Ubicación always (legacy)
- `NSCameraUsageDescription` - Cámara
- `NSPhotoLibraryUsageDescription` - Galería de fotos
- `UIBackgroundModes` - location, fetch, remote-notification

### 9.5 Plugin de Tracking en Background

Se implementará un plugin nativo personalizado con los siguientes métodos:
- `startTracking()` - Inicia tracking GPS en background
- `stopTracking()` - Detiene tracking
- `onLocationUpdate(callback)` - Recibe actualizaciones de ubicación
- `getLastLocation()` - Obtiene última ubicación conocida

### 9.6 Estructura de Archivos Capacitor

```
/
├── android/                          # Proyecto Android Studio
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/.../plugins/     # Plugin nativo tracking
│   │   │   ├── AndroidManifest.xml   # Permisos
│   │   │   └── res/                  # Recursos
│   │   └── build.gradle
│   └── capacitor.settings.gradle
├── ios/                              # Proyecto Xcode
│   └── App/
│       ├── App/
│       │   ├── Plugins/              # Plugin nativo tracking
│       │   └── Info.plist            # Permisos
│       └── App.xcodeproj
├── capacitor.config.ts               # Configuración Capacitor
└── client/src/
    └── capacitor/
        └── tracking.ts               # Wrapper JS del plugin
```

### 9.7 Detección Capacitor vs PWA

El frontend detectará automáticamente el entorno:
- **Capacitor Nativo:** Usa plugins nativos para tracking, cámara, etc.
- **PWA/Browser:** Usa Web APIs (Geolocation, MediaDevices, etc.)

### 9.8 Checklist de Implementación

- [x] Configurar capacitor.config.ts con appId correcto
- [x] Instalar plugins de Capacitor
- [x] Añadir plataforma Android
- [x] Añadir plataforma iOS
- [x] Configurar permisos Android (AndroidManifest.xml)
- [x] Configurar permisos iOS (Info.plist)
- [x] Crear plugin nativo tracking Android
- [x] Crear plugin nativo tracking iOS
- [x] Crear wrapper JS para tracking
- [x] Actualizar frontend para detectar Capacitor
- [x] Crear guía de build CAPACITOR_BUILD_GUIDE.md
- [ ] Probar en dispositivos reales
- [ ] Generar APK de prueba
- [ ] Generar IPA de prueba

### 9.9 Guía de Build Rápida

```bash
# 1. Build del frontend
npm run build

# 2. Sincronizar con plataformas nativas
npx cap sync

# 3. Abrir en IDE
npx cap open android   # Android Studio
npx cap open ios       # Xcode

# 4. Compilar desde el IDE
```

Ver `CAPACITOR_BUILD_GUIDE.md` para instrucciones detalladas.

---

## 10. Estimación de Tiempo Total Actualizada

| Fase | Tiempo Estimado |
|------|-----------------|
| Fase 1: Infraestructura | 30 min |
| Fase 2: Secrets y Configuración | 30 min |
| Fase 3: Correcciones de Código | 45 min |
| Fase 4: Integraciones Replit | 20 min |
| Fase 5: Validación | 30 min |
| Fase 6: Deployment Web | 15 min |
| **Fase 7: Capacitor (nuevo)** | **2 horas** |
| **TOTAL** | **~5 horas** |

---

*Documento generado el 1 de Diciembre, 2025*
*Actualizado: Integración de Capacitor añadida*
*Próxima revisión: Después de aprobación del plan*
