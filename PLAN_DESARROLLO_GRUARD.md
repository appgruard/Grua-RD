# 🚛 Plan de Desarrollo - Grúa RD
## Aplicación de Grúas Estilo Uber para República Dominicana

---

## 📋 Estado Actual del Proyecto

### ✅ Fase 1 - Core MVP - COMPLETADO
- [x] Entorno de desarrollo configurado (Node.js, TypeScript, React, Tailwind CSS)
- [x] Base de datos PostgreSQL creada
- [x] Componentes UI Shadcn instalados
- [x] Sistema de diseño base configurado
- [x] Google Maps API Key configurada
- [x] Blueprints disponibles: Database, WebSocket, Stripe
- [x] Schema completo con todas las tablas
- [x] Frontend para las 3 interfaces (Cliente, Conductor, Admin)
- [x] Backend con todos los endpoints
- [x] WebSocket para tracking en tiempo real
- [x] PWA configuration

### ✅ Fase 2 - Testing & Refinamiento - COMPLETADO
- [x] Playwright instalado y configurado
- [x] Tests E2E para Cliente (7 tests)
- [x] Tests E2E para Conductor (7 tests)
- [x] Tests E2E para Admin (9 tests)
- [x] Tests de integración completos (4 tests)
- [x] Documentación completa de testing
- [x] Validaciones mejoradas en formularios de autenticación
- [x] Estados de carga elegantes (Skeletons reutilizables)
- [x] Estados vacíos informativos (Empty States)
- [x] Diálogos de confirmación para acciones críticas
- [x] Manejo robusto de errores con mensajes descriptivos
- [x] Feedback visual mejorado en toda la aplicación
- [ ] Tests WebSocket (requiere backend más robusto para testing determinístico)

### ✅ Fase 3 - Integraciones Avanzadas - COMPLETADO
- [x] Chat en tiempo real entre Cliente y Conductor
  - [x] Tabla `mensajes_chat` en base de datos
  - [x] API endpoints para envío y lectura de mensajes
  - [x] WebSocket events para mensajes en tiempo real
  - [x] Componente ChatBox reutilizable
  - [x] Integración en página de tracking del cliente
  - [x] Integración en dashboard del conductor
- [x] Notificaciones Push (Web Push API)
  - [x] Tabla `push_subscriptions` en base de datos
  - [x] API endpoints (/api/push/subscribe, /api/push/unsubscribe, /api/push/subscriptions)
  - [x] Servicio backend de notificaciones (server/push-service.ts)
  - [x] Configuración VAPID segura (requiere claves en variables de entorno)
  - [x] Service Worker con listeners para push y notificationclick
  - [x] Hook usePushNotifications para gestión desde frontend
  - [x] Notificaciones automáticas en eventos clave:
    - [x] Servicio aceptado → Cliente recibe notificación
    - [x] Servicio iniciado → Cliente recibe notificación
    - [x] Servicio completado → Cliente recibe notificación
    - [x] Nueva solicitud → Conductores disponibles reciben notificación
    - [x] Nuevo mensaje de chat → Destinatario recibe notificación
  - [x] Documentación completa (NOTIFICACIONES_PUSH_README.md)
  - [ ] Configurar claves VAPID reales (pendiente del usuario)

### 🚧 Fase 4 - Producción - EN PROGRESO
Esta fase prepara la aplicación para lanzamiento en producción, organizando el trabajo en cuatro flujos (workstreams) que se ejecutarán de forma secuencial y parcialmente paralela.

#### **Workstream A: Identidad y Cumplimiento** (Prioridad ALTA) - ✅ 95% COMPLETADO
Implementar verificación de identidad robusta para cumplir con regulaciones locales.

- [x] **Validación de Cédula Dominicana** ✅ COMPLETO
  - [x] Servicio de validación de cédula (servidor) - `server/services/identity.ts`
  - [x] Validación local con algoritmo Luhn (checksum)
  - [x] API endpoint: `/api/identity/verify-cedula` con rate limiting
  - [x] Actualizar schema para almacenar cédula y estado de verificación
  - [x] Audit logging de intentos de verificación
  - [x] UI dedicada para verificación de cédula en wizard de onboarding
  - [ ] Tests E2E para flujo de verificación

- [x] **Verificación de Teléfono (OTP via SMS)** ✅ COMPLETO
  - [x] Integrar proveedor SMS - Twilio con fallback a Mock (`server/sms-service.ts`)
  - [x] Tabla `otp_tokens` con expiración y rate limiting (`server/schema-extensions.ts`)
  - [x] API endpoints implementados:
    - [x] `/api/auth/send-otp`, `/api/auth/verify-otp` (legacy)
    - [x] `/api/identity/send-phone-otp`, `/api/identity/verify-phone-otp` (nuevo)
    - [x] `/api/identity/status` (verificar estado completo)
  - [x] UI para ingreso de OTP con countdown timer (integrado en wizard)
  - [x] Rate limiting (3 intentos/hora para envío, 10 para verificación)
  - [x] Funciones: `createAndSendOTP`, `verifyOTP` con bcrypt hash
  - [x] Audit logging de intentos OTP
  - [x] UI de OTP integrada en wizard de onboarding
  - [ ] Tests E2E para flujo OTP completo

- [x] **Flujo de Onboarding Mejorado** ✅ COMPLETO
  - [x] Wizard multi-paso: Email → Cédula → Teléfono → Datos personales (`client/src/pages/auth/onboarding-wizard.tsx`)
    - [x] Paso 1: Email, Password, Nombre, Apellido, Teléfono, Tipo de usuario
    - [x] Paso 2: Verificación de Cédula dominicana
    - [x] Paso 3: Verificación de Teléfono con OTP (countdown timer, reenvío)
    - [x] Paso 4: Datos de la Grúa (conductores) o Confirmación (clientes)
    - [x] Persistencia de estado en sessionStorage
    - [x] Validaciones completas en cada paso
  - [x] Re-intentos y estados de error
  - [x] Auditoría de verificaciones en tabla `verification_audit` (`server/schema-extensions.ts`)
  - [x] Panel admin para ver estado de verificación de usuarios (`client/src/pages/admin/verifications.tsx`)
    - [x] Dashboard con estadísticas (total usuarios, verificados, pendientes)
    - [x] Tabla de usuarios con estado de verificación
    - [x] Filtros por estado y búsqueda
    - [x] Paginación
    - [x] Historial de verificación por usuario
  - [x] Endpoints admin: `/api/admin/verification-status`, `/api/admin/users/:id/verification-history`

**Archivos Backend Implementados:**
- `server/services/identity.ts` - Validación y verificación de cédula
- `server/sms-service.ts` - Servicio SMS con Twilio y funciones OTP
- `server/schema-extensions.ts` - Tablas `otp_tokens` y `verification_audit`
- `server/logger.ts` - Logging estructurado con Winston
- `server/routes.ts` - Endpoints de API con rate limiting
  - `/api/identity/verify-cedula` - Validar cédula dominicana
  - `/api/identity/send-phone-otp` - Enviar código OTP
  - `/api/identity/verify-phone-otp` - Verificar código OTP
  - `/api/identity/status` - Estado de verificación
  - `/api/admin/verification-status` - Lista de usuarios con verificación
  - `/api/admin/users/:id/verification-history` - Historial de verificación

**Archivos Frontend Implementados:**
- `client/src/pages/auth/onboarding-wizard.tsx` - Wizard completo de onboarding (4 pasos)
- `client/src/pages/admin/verifications.tsx` - Panel admin de verificaciones
- `client/src/pages/auth/verify-otp.tsx` - UI de verificación OTP standalone
- `client/src/pages/auth/register.tsx` - Registro con campos cédula y teléfono
- `client/src/pages/auth/forgot-password.tsx` - Recuperación con OTP
- `client/src/App.tsx` - Ruta `/onboarding` registrada, ruta `/admin/verifications` registrada

**Acceptance Criteria:**
- ✅ Usuarios solo pueden completar registro con cédula y teléfono verificados
- ✅ Admins pueden visualizar estado de verificación en panel de gestión
- ✅ Sistema previene abuso de OTP con rate limiting
- ✅ Wizard de onboarding funcional con 4 pasos y persistencia de estado
- ✅ Panel admin muestra estadísticas, filtros, búsqueda y paginación
- ⏳ Tests E2E para flujo completo (pendiente)

---

#### **Workstream B: Gestión Documental & Seguridad Operativa** (Prioridad ALTA) - ✅ 100% COMPLETADO

Implementar gestión de documentos y endurecer seguridad del sistema.

- [x] **Sistema de Upload de Documentos** ✅ COMPLETO
  - [x] Integración con Replit Object Storage (`server/services/object-storage.ts`)
  - [x] Tabla `documentos` en schema con todos los campos requeridos (`shared/schema.ts`)
  - [x] API endpoints implementados: `/api/documents/upload`, `/api/documents/my-documents`, `/api/documents/conductor/:conductorId`, `/api/documents/download/:documentId`, `/api/documents/:documentId` (DELETE), `/api/documents/:documentId/status` (PUT)
  - [x] Validación de formatos (jpg, png, pdf) y tamaño (máx 10MB)
  - [x] Componente de upload integrado en perfil de conductor
  - [x] Tipos de documentos: licencia, matrícula, póliza, seguro_grua, foto_vehiculo, foto_perfil, cedula_frontal, cedula_trasera

- [x] **Panel Admin de Aprobación** ✅ COMPLETO
  - [x] Vista completa de documentos con preview de imágenes y PDFs (`client/src/pages/admin/documents.tsx`)
  - [x] Acciones: Aprobar / Rechazar con notas de rechazo
  - [x] Filtros por estado (pendiente, aprobado, rechazado) y tipo de documento
  - [x] Búsqueda por conductor
  - [x] Notificaciones push automáticas al conductor cuando documento es aprobado/rechazado
  - [x] Historial y auditoría de cambios de estado

- [x] **Endurecimiento de Seguridad** ✅ COMPLETO
  - [x] Helmet configurado con CSP, HSTS y headers de seguridad (`server/index.ts`)
  - [x] CORS configurado con whitelist de dominios
  - [x] Rate limiting implementado en endpoints críticos (identity verification, OTP, authentication)
  - [x] Audit logging completo con Winston para todas las operaciones críticas
  - [x] Health check endpoint: `/health` y `/api/health` con monitoreo de DB y Object Storage
  - [x] Métricas incluidas: response time, estado de dependencias

**Archivos Implementados:**
- Backend:
  - `server/services/object-storage.ts` - Servicio completo de Object Storage con upload, download, delete
  - `shared/schema.ts` - Tabla `documentos` con relaciones
  - `server/routes.ts` - Endpoints completos de gestión de documentos
  - `server/index.ts` - Helmet, CORS, rate limiting, health check
- Frontend:
  - `client/src/pages/admin/documents.tsx` - Panel admin completo (507 líneas)
  - `client/src/pages/driver/profile.tsx` - Sección de upload de documentos
  - `client/src/pages/driver/dashboard.tsx` - Validación de documentos para disponibilidad

**Acceptance Criteria:**
- ✅ Conductor no puede activar disponibilidad sin documentos aprobados
- ✅ Health check devuelve estado de todas las dependencias
- ✅ Logs estructurados en Winston para todas las operaciones
- ✅ Rate limiting previene abuso en endpoints de autenticación
- ✅ Object Storage con gestión robusta de errores y fallback gracioso

---

#### **Workstream C: Pagos y Cumplimiento Financiero** (Prioridad MEDIA) - ✅ 100% COMPLETADO

Completar sistema de pagos con comisiones y recibos.

- [x] **Stripe Connect para Split de Comisiones** ✅ COMPLETO
  - [x] Configurar Stripe Connect Standard (70% conductor, 30% plataforma)
  - [x] Tabla `conductor_stripe_accounts` con campos de estado (`server/schema-extensions.ts`)
  - [x] Flow de onboarding Stripe para conductores
  - [x] API endpoints: POST `/api/drivers/stripe-onboarding`, GET `/api/drivers/stripe-account-status`
  - [x] Servicio `server/services/stripe-connect.ts` con funciones de creación, onboarding, status
  - [x] Tabla `service_receipts` para recibos PDF
  - [x] Webhook handler para `account.updated` y `payout.paid`
  - [x] Transfers automáticos con `stripe.transfers.create()` al completar servicio

- [x] **Gestión de Métodos de Pago** ✅ COMPLETO
  - [x] Tabla `payment_methods` para guardar métodos recurrentes
  - [x] API endpoints: POST/GET/DELETE `/api/payment-methods`, PUT `/api/payment-methods/:id/default`
  - [x] Integración con Stripe Payment Methods API
  - [x] Soporte para múltiples tarjetas con marcado de predeterminada
  - [x] UI completa para agregar/eliminar tarjetas con Stripe Elements (`client/src/components/PaymentMethodsManager.tsx`)
  - [x] Integración en perfil del cliente (`client/src/pages/client/profile.tsx`)
  - [x] Fallback a efectivo si pago con tarjeta falla (ya implementado en flujo de pago)

- [x] **Generación de Recibos PDF** ✅ COMPLETO
  - [x] Servicio de generación PDF con `pdfkit` (`server/services/pdf-service.ts`)
  - [x] Template de recibo con branding Grúa RD (colores, logo, footer)
  - [x] Datos completos: servicio, costo, comisión 70/30, conductor, cliente
  - [x] Números de recibo únicos con formato `GRD-{timestamp}-{random}`
  - [x] Tabla `service_receipts` en base de datos
  - [x] API endpoint `/api/servicios/:id/recibo` actualizado (genera PDF en memoria)
  - [x] Botón de descarga en historial del cliente (`client/src/pages/client/history.tsx`)
  - [x] Botón de descarga en historial del conductor (`client/src/pages/driver/history.tsx`)

**Archivos Implementados:**
- Backend:
  - `server/services/stripe-connect.ts` - Servicio Stripe Connect (creación cuentas, onboarding, transfers)
  - `server/services/pdf-service.ts` - Servicio generación PDFs con template profesional
  - `server/schema-extensions.ts` - Tablas: `conductor_stripe_accounts`, `payment_methods`, `service_receipts`
  - `server/routes.ts` - Endpoints Stripe Connect, métodos de pago, webhooks mejorados
- Frontend:
  - `client/src/components/PaymentMethodsManager.tsx` - Componente completo de gestión de tarjetas
  - `client/src/pages/client/profile.tsx` - Integración de PaymentMethodsManager
  - `client/src/pages/driver/profile.tsx` - Sección "Cuenta de Pagos" con UI onboarding Stripe Connect
  - `client/src/pages/client/history.tsx` - Botón de descarga de recibos para clientes
  - `client/src/pages/driver/history.tsx` - Botón de descarga de recibos para conductores

**Acceptance Criteria:**
- ✅ Cada servicio completado crea payout automático al conductor (implementado en webhook)
- ✅ Comisión 70/30 registrada correctamente en base de datos (tabla `comisiones`)
- ✅ Recibo PDF descargable desde historial (cliente y conductor)
- ✅ UI completa para gestión de métodos de pago
- ✅ Webhooks de Stripe manejados correctamente (`payment_intent.succeeded`, `account.updated`, `payout.paid`)

---

#### **Workstream D: Preparación Producción & Deployabilidad** (Prioridad ALTA)
Optimizar, monitorear y preparar para deployment.

- [ ] **Gestión de Entornos y Secrets**
  - [ ] Documentar todas las variables de entorno requeridas
  - [ ] Configurar secrets de producción (Stripe, SMS, VAPID)
  - [ ] Checklist de infraestructura: SSL, dominio, reverse proxy
  - [ ] Session secret robusto generado

- [ ] **Pipeline CI/CD y Testing**
  - [ ] Script de lint: `npm run lint`
  - [ ] Script de build: `npm run build`
  - [ ] Tests automatizados en CI
  - [ ] Smoke tests post-deployment
  - [ ] Ambiente de staging replicado

- [ ] **Optimización PWA y Monitoreo**
  - [ ] Auditoría Lighthouse (objetivo: ≥90 en todas las métricas)
  - [ ] Optimización de bundle size (code splitting, lazy loading)
  - [ ] Mejoras de caching offline
  - [ ] Integrar Sentry o LogRocket para monitoreo de errores
  - [ ] Dashboard de métricas básicas (uptime, errores, latencia)

- [ ] **Preparación Capacitor para APK**
  - [ ] Actualizar `capacitor.config.ts` con configuración de producción
  - [ ] Iconos y splash screens para Android
  - [ ] Configurar firmado de APK
  - [ ] Build de APK debug para testing
  - [ ] Documentación de proceso de build
  - [ ] Play Store assets (descripción, screenshots)

**Acceptance Criteria:**
- ✅ Deployment reproducible con un comando
- ✅ Métricas de monitoreo activas en producción
- ✅ APK debug funcional y testeado en dispositivo real
- ✅ Lighthouse score ≥ 90 en todas las métricas
- ✅ Error tracking activo con alertas configuradas

---

#### **Secuenciamiento de Workstreams:**
1. **Primero:** Workstream A (identidad es prerequisito para aprobaciones)
2. **Segundo:** Workstream B (requiere identidad verificada para documentos)
3. **Tercero:** Workstream C (requiere identidad verificada para pagos)
4. **Paralelo:** Workstream D puede ejecutarse en paralelo con B y C

**Nota:** Algunos elementos de seguridad del Workstream B (helmet, rate limiting) pueden implementarse en paralelo con Workstream A.

---

## 🎯 Objetivos del Proyecto

Construir una **Progressive Web App (PWA)** instalable en móviles que:
1. Permita a clientes solicitar servicios de grúa en tiempo real
2. Permita a conductores recibir y aceptar solicitudes
3. Incluya tracking GPS en tiempo real
4. Procese pagos (efectivo y tarjeta vía Stripe)
5. Tenga un panel administrativo completo
6. Sea convertible a APK usando Capacitor en el futuro

---

## 🏗️ Arquitectura del Sistema

### Frontend (React + TypeScript)
```
client/
├── src/
│   ├── pages/
│   │   ├── auth/           # Login/Registro (Cliente, Conductor, Admin)
│   │   ├── client/         # Interfaz del Cliente
│   │   │   ├── home.tsx          # Mapa principal + solicitud
│   │   │   ├── tracking.tsx      # Seguimiento en tiempo real
│   │   │   ├── history.tsx       # Historial de servicios
│   │   │   └── profile.tsx       # Perfil del usuario
│   │   ├── driver/         # Interfaz del Conductor
│   │   │   ├── dashboard.tsx     # Dashboard con toggle disponibilidad
│   │   │   ├── requests.tsx      # Solicitudes cercanas
│   │   │   ├── active-job.tsx    # Servicio activo
│   │   │   └── history.tsx       # Historial
│   │   └── admin/          # Panel Administrativo
│   │       ├── dashboard.tsx     # Estadísticas
│   │       ├── users.tsx         # Gestión usuarios
│   │       ├── drivers.tsx       # Gestión conductores
│   │       ├── services.tsx      # Todos los servicios
│   │       ├── pricing.tsx       # Configuración de tarifas
│   │       └── monitoring.tsx    # Tracking en tiempo real
│   ├── components/
│   │   ├── maps/           # Componentes de mapas
│   │   ├── layout/         # Layouts (MobileLayout, AdminLayout)
│   │   └── shared/         # Componentes compartidos
│   └── lib/
│       ├── websocket.ts    # Cliente WebSocket
│       ├── maps.ts         # Utilidades Google Maps
│       └── geolocation.ts  # Utilidades GPS
```

### Backend (Node.js + Express + WebSocket)
```
server/
├── routes.ts          # API REST endpoints
├── websocket.ts       # Servidor WebSocket para tracking
├── db.ts              # Conexión PostgreSQL
└── storage.ts         # Capa de datos (DatabaseStorage)
```

### Base de Datos (PostgreSQL)
```
shared/
└── schema.ts          # Esquemas Drizzle ORM
```

---

## 📊 Modelo de Datos (Base de Datos)

### Tablas Principales

#### 1. **users**
```typescript
{
  id: uuid (PK)
  email: string (unique)
  phone: string (unique, nullable)
  password_hash: string
  user_type: enum ('cliente', 'conductor', 'admin')
  nombre: string
  apellido: string
  foto_url: string (nullable)
  calificacion_promedio: decimal (nullable)
  created_at: timestamp
}
```

#### 2. **conductores** (extiende users)
```typescript
{
  id: uuid (PK)
  user_id: uuid (FK -> users)
  licencia: string
  placa_grua: string
  marca_grua: string
  modelo_grua: string
  disponible: boolean (default: false)
  ubicacion_lat: decimal (nullable)
  ubicacion_lng: decimal (nullable)
  ultima_ubicacion_update: timestamp (nullable)
}
```

#### 3. **servicios**
```typescript
{
  id: uuid (PK)
  cliente_id: uuid (FK -> users)
  conductor_id: uuid (FK -> users, nullable)
  origen_lat: decimal
  origen_lng: decimal
  origen_direccion: string
  destino_lat: decimal
  destino_lng: decimal
  destino_direccion: string
  distancia_km: decimal
  costo_total: decimal
  estado: enum ('pendiente', 'aceptado', 'en_progreso', 'completado', 'cancelado')
  metodo_pago: enum ('efectivo', 'tarjeta')
  stripe_payment_id: string (nullable)
  created_at: timestamp
  aceptado_at: timestamp (nullable)
  iniciado_at: timestamp (nullable)
  completado_at: timestamp (nullable)
  cancelado_at: timestamp (nullable)
}
```

#### 4. **tarifas**
```typescript
{
  id: uuid (PK)
  nombre: string
  precio_base: decimal
  tarifa_por_km: decimal
  tarifa_nocturna_multiplicador: decimal (default: 1.5)
  hora_inicio_nocturna: time (default: '20:00')
  hora_fin_nocturna: time (default: '06:00')
  zona: string (nullable) // Para tarifas por zona
  activo: boolean (default: true)
  created_at: timestamp
}
```

#### 5. **calificaciones**
```typescript
{
  id: uuid (PK)
  servicio_id: uuid (FK -> servicios)
  puntuacion: integer (1-5)
  comentario: text (nullable)
  created_at: timestamp
}
```

#### 6. **ubicaciones_tracking** (para tracking en tiempo real)
```typescript
{
  id: uuid (PK)
  servicio_id: uuid (FK -> servicios)
  conductor_id: uuid (FK -> conductores)
  lat: decimal
  lng: decimal
  timestamp: timestamp
}
```

#### 7. **mensajes_chat** (chat en tiempo real)
```typescript
{
  id: uuid (PK)
  servicio_id: uuid (FK -> servicios)
  remitente_id: uuid (FK -> users)
  contenido: text
  leido: boolean (default: false)
  created_at: timestamp
}
```

---

## 🔌 API Endpoints (Backend)

### Autenticación
- `POST /api/auth/register` - Registro (cliente, conductor, admin)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuario actual

### Cliente
- `POST /api/services/request` - Solicitar grúa
- `GET /api/services/available-drivers` - Ver conductores disponibles cerca
- `GET /api/services/my-services` - Historial de servicios
- `GET /api/services/:id` - Detalles de un servicio
- `POST /api/services/:id/cancel` - Cancelar servicio
- `POST /api/services/:id/rate` - Calificar servicio

### Conductor
- `PUT /api/drivers/availability` - Cambiar disponibilidad
- `PUT /api/drivers/location` - Actualizar ubicación
- `GET /api/drivers/nearby-requests` - Solicitudes cercanas
- `POST /api/services/:id/accept` - Aceptar servicio
- `POST /api/services/:id/start` - Iniciar servicio
- `POST /api/services/:id/complete` - Completar servicio

### Administración
- `GET /api/admin/dashboard` - Estadísticas generales
- `GET /api/admin/users` - Listar usuarios
- `GET /api/admin/drivers` - Listar conductores
- `GET /api/admin/services` - Todos los servicios
- `PUT /api/admin/users/:id` - Actualizar usuario
- `DELETE /api/admin/users/:id` - Eliminar usuario
- `GET /api/admin/pricing` - Listar tarifas
- `POST /api/admin/pricing` - Crear tarifa
- `PUT /api/admin/pricing/:id` - Actualizar tarifa

### Tarifas
- `GET /api/pricing/calculate` - Calcular costo de servicio
- `GET /api/pricing/active` - Obtener tarifa activa

### Pagos (Stripe)
- `POST /api/payments/create-intent` - Crear intención de pago
- `POST /api/payments/confirm` - Confirmar pago

### Google Maps
- `POST /api/maps/calculate-route` - Calcular distancia/duración
- `POST /api/maps/geocode` - Convertir dirección a coordenadas

### Chat
- `GET /api/chat/:servicioId` - Obtener mensajes de un servicio
- `POST /api/chat/send` - Enviar mensaje
- `POST /api/chat/:servicioId/mark-read` - Marcar mensajes como leídos

---

## 🔄 WebSocket Events (Tracking en Tiempo Real)

### Cliente → Servidor
- `join_service` - Cliente se une a sala de servicio
- `request_location_update` - Solicitar actualización de ubicación

### Conductor → Servidor
- `update_location` - Actualizar ubicación GPS
- `join_service` - Conductor se une a sala de servicio

### Servidor → Cliente/Conductor
- `driver_location_update` - Nueva ubicación del conductor
- `service_status_change` - Cambio de estado del servicio
- `new_request` - Nueva solicitud para conductor
- `request_accepted` - Solicitud aceptada por conductor

### Admin → Servidor
- `join_monitoring` - Admin se une a sala de monitoreo

### Servidor → Admin
- `all_active_drivers` - Ubicaciones de todos los conductores activos
- `driver_status_change` - Cambio de disponibilidad de conductor

### Chat (Cliente ↔ Conductor)
- `send_message` - Enviar mensaje de chat
- `new_message` - Notificación de nuevo mensaje
- `message_read` - Mensaje marcado como leído

---

## 🎨 Diseño UI/UX (Siguiendo design_guidelines.md)

### Paleta de Colores
- **Primary:** Azul (`210 85% 45%`) - Botones principales, acciones
- **Destructive:** Rojo (`0 72% 42%`) - Cancelar, rechazar
- **Muted:** Gris (`210 6% 92%`) - Fondos sutiles
- **Background:** Blanco/Negro según modo

### Componentes Clave
1. **Mapa de pantalla completa** con pins y tracking
2. **Bottom sheets** para solicitudes en móvil
3. **Floating action buttons** para acciones principales
4. **Cards** para historial y conductores
5. **Toggle switch** grande para disponibilidad (conductores)
6. **Stat cards** para admin dashboard
7. **Badges** para estados (pendiente, activo, completado)

### Layout Responsivo
- **Cliente/Conductor:** Mobile-first, bottom navigation
- **Admin:** Desktop-first, sidebar navigation (Shadcn Sidebar)

---

## 📱 PWA Features

### Configuración PWA
```json
// public/manifest.json
{
  "name": "Grúa RD - Servicio de Grúas",
  "short_name": "Grúa RD",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (Workbox)
- Cache estratégico de assets estáticos
- Funcionamiento offline básico
- Precarga de componentes críticos

---

## 🔮 Migración Futura a APK (Post-PWA)

### Opción 1: Capacitor (Recomendado)
```bash
# Pasos para convertir a APK:
1. npm install @capacitor/core @capacitor/cli @capacitor/android
2. npx cap init
3. npm run build
4. npx cap add android
5. npx cap sync
6. npx cap open android
7. Build APK desde Android Studio
```

### Opción 2: PWA Builder
1. Ir a https://www.pwabuilder.com/
2. Ingresar URL de tu PWA publicada
3. Generar APK automáticamente
4. Firmar y publicar en Play Store

### Opción 3: Trusted Web Activity (TWA)
- Google permite publicar PWAs directamente en Play Store
- Requiere configuración de Digital Asset Links

---

## 🚀 Plan de Implementación (3 Fases)

### **Fase 1: Schema & Frontend Completo** ⏱️ Mayor esfuerzo
**Objetivo:** Diseño visual excepcional y componentes React completos

1. **Configurar Design System**
   - Actualizar `tailwind.config.ts` con colores del tema
   - Actualizar `index.html` con meta tags PWA y fonts
   - Revisar `design_guidelines.md` en detalle

2. **Definir Schemas de Datos Completos** (`shared/schema.ts`)
   - Tabla `users` con tipos de usuario
   - Tabla `conductores` con datos del vehículo
   - Tabla `servicios` con estados y tracking
   - Tabla `tarifas` con configuraciones
   - Tabla `calificaciones`
   - Tabla `ubicaciones_tracking`
   - Relaciones entre tablas con Drizzle

3. **Construir TODAS las Páginas y Componentes React**
   
   **Autenticación:**
   - Login/Registro universal
   - Selección de tipo de usuario
   
   **Interfaz Cliente:**
   - Home con Google Maps integrado
   - Selección origen/destino en mapa
   - Cálculo de costo en tiempo real
   - Vista de grúas cercanas disponibles
   - Confirmación de solicitud
   - Tracking en tiempo real durante servicio
   - Historial de servicios
   - Perfil y calificaciones
   - Página de pago (Stripe Elements)
   
   **Interfaz Conductor:**
   - Dashboard con toggle de disponibilidad
   - Mapa con solicitudes cercanas
   - Aceptar/rechazar solicitudes
   - Vista de servicio activo con navegación
   - Completar servicio
   - Historial
   - Perfil y datos de grúa
   
   **Panel Admin:**
   - Dashboard con estadísticas (charts)
   - Gestión de usuarios (tabla + filtros)
   - Gestión de conductores (tabla + aprobación)
   - Lista de servicios en tiempo real
   - Configuración de tarifas (CRUD)
   - Monitoreo en tiempo real (mapa con todas las grúas)
   - Reportes filtrados
   
   **Componentes Compartidos:**
   - MapComponent (Google Maps wrapper)
   - LocationPicker (selección en mapa)
   - DriverCard (info de conductor)
   - ServiceCard (card de servicio)
   - RatingStars (sistema de calificación)
   - StatusBadge (badges de estado)
   - PriceDisplay (visualización de precios)
   - MobileLayout (layout para cliente/conductor)
   - AdminLayout (layout con sidebar para admin)

   **Énfasis en Calidad Visual:**
   - Animaciones suaves en transiciones
   - Estados de carga con skeletons
   - Empty states bien diseñados
   - Error states informativos
   - Spacing consistente
   - Touch targets mínimos de 44px
   - Contraste WCAG AA
   - Modo oscuro completo

### **Fase 2: Backend Completo**
**Objetivo:** API REST funcional + WebSocket + Base de datos

1. **Configurar Base de Datos**
   - Ejecutar `npm run db:push` para crear tablas
   - Implementar `DatabaseStorage` en `server/storage.ts`
   - Métodos CRUD para todas las tablas

2. **Implementar API REST** (`server/routes.ts`)
   - Endpoints de autenticación (con JWT)
   - Endpoints de cliente
   - Endpoints de conductor
   - Endpoints de admin
   - Endpoints de tarifas
   - Integración con Google Maps Distance Matrix API
   - Integración con Stripe (cuando tengas las keys)

3. **Implementar WebSocket** (`server/websocket.ts`)
   - Servidor WebSocket en `/ws`
   - Salas por servicio
   - Broadcast de ubicaciones
   - Notificaciones en tiempo real

4. **Servicios Externos**
   - Cliente Google Maps para cálculo de rutas
   - Cliente Stripe para pagos
   - Manejo de errores robusto

### **Fase 3: Integración & Testing**
**Objetivo:** Conectar todo y asegurar calidad

1. **Conectar Frontend con Backend**
   - React Query para todas las llamadas API
   - WebSocket client conectado
   - Manejo de estados de carga
   - Manejo de errores con toasts
   - Invalidación de cache apropiada

2. **Testing E2E con Playwright**
   - Flujo completo de cliente: solicitar → tracking → completar
   - Flujo de conductor: aceptar → navegar → completar
   - Flujo admin: monitorear → gestionar tarifas
   - Testing de estados edge

3. **PWA Final**
   - Configurar `manifest.json`
   - Implementar service worker
   - Testear instalación en móvil
   - Verificar funcionamiento offline básico

4. **Documentación de API**
   - Documentar todos los endpoints
   - Ejemplos de request/response
   - Guía de WebSocket events

---

## 📝 Checklist de Completitud MVP

### Funcionalidades Core
- [x] Registro/Login (Cliente, Conductor, Admin)
- [x] Cliente puede solicitar grúa desde mapa
- [x] Sistema calcula costo automáticamente
- [x] Conductor ve solicitudes cercanas
- [x] Conductor puede aceptar/rechazar
- [x] Tracking GPS en tiempo real (ambas partes)
- [x] Completar servicio
- [x] Pago en efectivo (registro manual)
- [x] Pago con tarjeta (Stripe) - implementado, requiere API keys para testing
- [x] Calificar servicio
- [x] Historial completo
- [x] Toggle disponibilidad conductor
- [x] Admin: Dashboard con stats
- [x] Admin: Gestión usuarios/conductores
- [x] Admin: Configuración tarifas
- [x] Admin: Monitoreo en tiempo real
- [x] Chat en tiempo real (Cliente ↔ Conductor)
- [x] Notificaciones Push - implementado, requiere claves VAPID

### Calidad Técnica
- [x] Responsive design perfecto (Mobile-first)
- [x] Modo oscuro funcional
- [x] Estados de carga elegantes (Skeletons)
- [x] Manejo de errores robusto
- [x] Validación de formularios
- [x] WebSocket reconexión automática
- [x] PWA instalable (manifest.json + service worker)
- [x] Tests E2E completos (Playwright - 27 tests)
- [ ] Rendimiento optimizado (pendiente Lighthouse audit en Fase 4)

---

## 🔐 Secrets Requeridos

### Configurados ✅
- `DATABASE_URL` - PostgreSQL
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps

### Pendientes ⏳
- `STRIPE_SECRET_KEY` - Para pagos backend
- `VITE_STRIPE_PUBLIC_KEY` - Para pagos frontend
- `SESSION_SECRET` - Para sesiones Express (se puede generar)

---

## 📚 Recursos y Referencias

### Documentación Técnica
- [Stripe API](https://stripe.com/docs/api)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Google Distance Matrix API](https://developers.google.com/maps/documentation/distance-matrix)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Shadcn UI](https://ui.shadcn.com/)

### Ejemplos de Código
Ver blueprints incluidos:
- `javascript_database` - Setup PostgreSQL
- `javascript_websocket` - WebSocket real-time
- `javascript_stripe` - Integración Stripe

---

## 🎯 Próximos Pasos Inmediatos

1. **Configurar Google Maps API Key de forma segura** ✅ (ya proporcionada)
2. **Crear task list del desarrollo** (siguiente paso)
3. **Fase 1:** Implementar todos los schemas y componentes React
4. **Fase 2:** Implementar backend completo
5. **Fase 3:** Integrar y testear

---

## 💡 Notas Importantes

- **Seguridad:** Nunca compartir API keys en el chat, usar sistema de secrets
- **PWA primero:** Funcional en móviles inmediatamente
- **Migración APK:** Usar Capacitor cuando el PWA esté completo
- **Google Maps:** Ya configurado, listo para usar
- **Stripe:** Se puede implementar la UI, pero pagos reales requieren las keys
- **Testing:** E2E con Playwright antes de finalizar
- **Design Guidelines:** Seguir `design_guidelines.md` religiosamente

---

## 📞 Soporte

Si necesitas ayuda en cualquier fase:
1. Revisa este documento
2. Consulta los blueprints
3. Revisa `design_guidelines.md` para decisiones de UI
4. Consulta la documentación oficial de cada tecnología

---

**Fecha de creación:** 2025-01-XX  
**Versión:** 1.0  
**Próxima actualización:** Al completar Fase 1
