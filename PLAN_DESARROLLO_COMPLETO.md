# Plan de Desarrollo Completo - Grúa RD
**Plataforma de Servicios de Grúa - República Dominicana**

---

## 📊 Estado Actual del Proyecto (Actualizado: 29 Noviembre 2025)

### ✅ FASE 0 - FUNDAMENTOS DE PLATAFORMA (100% COMPLETO)
- ✅ Autenticación con Passport.js (email/contraseña)
- ✅ 3 roles de usuario: Cliente, Conductor, Admin
- ✅ Estructura de base de datos PostgreSQL con Drizzle ORM
- ✅ WebSocket para tracking en tiempo real
- ✅ Validación de cédula dominicana (11 dígitos, algoritmo Luhn)
- ✅ Verificación OTP por SMS (Twilio con fallback mock)
- ✅ Sistema de gestión de documentos (Replit Object Storage)
- ✅ Integración Azul Payment Gateway (pagos y comisiones 70/30)
- ✅ PWA configurado con manifest y service worker
- ✅ Sistema de sesiones con cookies
- ✅ Rutas protegidas por rol
- ✅ Logging estructurado con Winston
- ✅ Security hardening (Helmet.js, rate limiting, CORS)

### ✅ FASE 1 - MVP OPERACIONAL (100% COMPLETO)
- ✅ Módulo Cliente: Solicitar grúa con selección de vehículo, ubicación, pago
- ✅ Módulo Cliente: Seguimiento en tiempo real con mapa y ETA
- ✅ Módulo Cliente: Historial de servicios y recibos PDF
- ✅ Módulo Operadores: Registro multi-paso con documentos
- ✅ Módulo Operadores: Toggle de disponibilidad y solicitudes cercanas
- ✅ Módulo Operadores: Estados granulares del servicio (7 estados)
- ✅ Módulo Operadores: Panel de ganancias y comisiones
- ✅ Módulo Admin: Dashboard con mapa en tiempo real
- ✅ Módulo Admin: Validación de seguros/aseguradoras
- ✅ Módulo Admin: Gestión de tarifas dinámicas

### ✅ FASE 2 - AUTOMATIZACIONES Y PORTALES AVANZADOS (100% COMPLETO)
- ✅ Integración APIs de aseguradoras dominicanas (Módulo 2.1)
- ✅ Portal web para aseguradoras con nuevo rol (Módulo 2.2)
- ✅ Analítica avanzada con gráficas y KPIs (Módulo 2.3)
- ✅ Azul Payment Gateway Integration (Módulo 2.4) - DataVault, HOLD/POST, comisiones automáticas
- ✅ Portal de socios/inversores (Módulo 2.5) - Dashboard ROI, distribuciones, PDF estados financieros
- ✅ Sistema de validaciones anuales de documentos (Módulo 2.6)
- ✅ Centro de soporte con tickets (Módulo 2.7)
- ✅ Mensajes predefinidos en chat (Módulo 2.8) - Mensajes diferenciados por rol cliente/conductor

### ✅ FASE 3 - CALIDAD, TESTING Y OPTIMIZACIÓN (100% COMPLETO)
- ✅ Sistema de calificaciones (Módulo 3.3) - POST /api/services/:id/calificar, StarRating, RatingModal, ranking visual
- ✅ PWA optimización final (Módulo 3.4) - SW v5.0 Background Sync, InstallPWA, UpdateAvailable, OfflineIndicator
- ✅ Seguridad y compliance (Módulo 3.5) - Auth en /api/maps, rate limiting pricing, política de privacidad
- ✅ Monitoreo y alertas (Módulo 3.6) - Health checks detallados (/api/health/db, /api/health/payments, /api/health/alerts)
- ✅ Documentación completa (Módulo 3.7) - API.md, DEPLOYMENT.md, ENV_VARS.md, replit.md actualizados
- ✅ Preparación para producción (Módulo 3.8) - Scripts de seed data y checklist de producción

### 🚀 PROYECTO LISTO PARA LANZAMIENTO
El proyecto Grúa RD ha completado todas las fases de desarrollo planificadas y está listo para despliegue en producción. Scripts de validación disponibles en `/scripts/`.

---

## 🎯 Estrategia de Desarrollo - 3 Fases

---

# FASE 0: FUNDAMENTOS DE PLATAFORMA
**Duración estimada: 3-4 semanas**
**Objetivo: Consolidar infraestructura base y cerrar brechas críticas**

## 0.1 Identidad y Autenticación (República Dominicana)

### Tareas:
1. **Agregar campo de cédula al registro**
   - Modificar schema: agregar `cedula` a tabla `users`
   - Validación formato cédula RD (11 dígitos, algoritmo de verificación)
   - Campo obligatorio para clientes y conductores

2. **Integración SMS/WhatsApp para OTP**
   - Decisión de proveedor:
     - Opción A: Twilio (SMS + WhatsApp)
     - Opción B: Infobip (popular en LATAM)
     - Opción C: MessageBird
   - Implementar endpoints:
     - `POST /api/auth/send-otp` - Enviar código
     - `POST /api/auth/verify-otp` - Validar código
   - Tabla en DB: `verification_codes` (código, teléfono, expira_en, intentos)
   - Flujo completo:
     1. Usuario ingresa teléfono
     2. Sistema envía código de 6 dígitos
     3. Usuario ingresa código
     4. Sistema valida y activa cuenta

3. **Recuperación de contraseña**
   - Endpoint `POST /api/auth/forgot-password`
   - Enviar código por SMS
   - Endpoint `POST /api/auth/reset-password`
   - Validar código y actualizar contraseña

4. **Mejoras en flujo de registro**
   - Registro multi-paso para conductores:
     - Paso 1: Datos personales + cédula + teléfono
     - Paso 2: Verificación OTP
     - Paso 3: Datos del vehículo
     - Paso 4: Documentos (siguiente fase)
   - Estado de cuenta: `pendiente_verificacion`, `activo`, `suspendido`, `rechazado`

### Criterios de aceptación:
- ✅ Usuario puede registrarse con cédula válida RD
- ✅ Sistema envía OTP por SMS/WhatsApp
- ✅ Usuario puede verificar teléfono con OTP
- ✅ Recuperación de contraseña funcional
- ✅ Registro multi-paso para conductores

---

## 0.2 Comunicaciones en Tiempo Real

### Tareas:
1. **Fortalecer WebSocket existente**
   - Implementar rooms por servicio
   - Manejo de reconexión automática
   - Heartbeat para detectar desconexiones
   - Autenticación de conexiones WebSocket

2. **Sistema de notificaciones push mejorado**
   - Configurar VAPID keys
   - Implementar service worker completo
   - Notificaciones por evento:
     - Nuevo servicio (para conductores)
     - Servicio aceptado (para clientes)
     - Conductor llegó al punto
     - Servicio completado
     - Mensaje de chat nuevo
   - Tabla `push_subscriptions` ya existe, mejorar lógica

3. **Chat en tiempo real**
   - Tabla `mensajes_chat` ya existe
   - Endpoints:
     - `GET /api/chat/:servicioId` ✅ Ya existe
     - `POST /api/chat/send` ✅ Ya existe
     - Mejorar con WebSocket para mensajes instantáneos
   - UI de chat en cliente y conductor
   - Mensajes predefinidos:
     - "¿Cuánto falta?"
     - "Ya llegué"
     - "Gracias"
     - Etc.

### Criterios de aceptación:
- ✅ WebSocket estable con reconexión automática
- ✅ Notificaciones push funcionan en todos los eventos
- ✅ Chat en tiempo real entre cliente y conductor
- ✅ Mensajes predefinidos disponibles

---

## 0.3 Gestión de Documentos y Archivos

### Tareas:
1. **Sistema de almacenamiento de archivos**
   - Decisión de storage:
     - Opción A: AWS S3
     - Opción B: Cloudinary (mejor para imágenes)
     - Opción C: Replit Object Storage
   - Configurar buckets/folders:
     - `/usuarios/{userId}/foto-perfil`
     - `/conductores/{conductorId}/documentos/`
     - `/vehiculos/{vehiculoId}/fotos/`
     - `/servicios/{servicioId}/aseguradora/`

2. **Nuevo schema para documentos**
   ```typescript
   export const documentos = pgTable("documentos", {
     id: varchar("id").primaryKey(),
     tipo: documentoTipoEnum("tipo"), // licencia, matricula, poliza, seguro_grua, foto_vehiculo, etc.
     usuarioId: varchar("usuario_id").references(() => users.id),
     conductorId: varchar("conductor_id").references(() => conductores.id),
     servicioId: varchar("servicio_id").references(() => servicios.id),
     url: text("url").notNull(),
     nombreArchivo: text("nombre_archivo"),
     estado: documentoEstadoEnum("estado"), // pendiente, aprobado, rechazado
     validoHasta: timestamp("valido_hasta"), // Para seguros anuales
     revisadoPor: varchar("revisado_por").references(() => users.id),
     motivoRechazo: text("motivo_rechazo"),
     createdAt: timestamp("created_at").defaultNow(),
   });
   ```

3. **Endpoints de documentos**
   - `POST /api/upload` - Subir archivo (multipart/form-data)
   - `GET /api/documentos/:id` - Obtener documento
   - `DELETE /api/documentos/:id` - Eliminar documento
   - `PUT /api/documentos/:id/aprobar` - Aprobar documento (admin)
   - `PUT /api/documentos/:id/rechazar` - Rechazar documento (admin)

4. **Frontend para subida de archivos**
   - Componente `FileUpload` reutilizable
   - Preview de imágenes
   - Drag & drop
   - Validación de tipos (PDF, JPG, PNG)
   - Límite de tamaño (5MB por archivo)

### Criterios de aceptación:
- ✅ Sistema de storage configurado y funcional
- ✅ Usuarios pueden subir documentos
- ✅ Documentos se guardan con metadata en DB
- ✅ Admin puede aprobar/rechazar documentos
- ✅ Sistema valida fechas de expiración

---

## 0.4 Integración de Pagos (Azul Payment Gateway)

### Tareas:
1. **Configurar Azul Payment Gateway para República Dominicana** ✅ COMPLETADO
   - Verificar disponibilidad de Azul en RD
   - Configurar cuenta Azul
   - Obtener credenciales (MerchantID, AuthKey)
   - Configurar webhooks para confirmación de pagos
   - Moneda: DOP (Peso Dominicano)

2. **Implementar HOLD/POST flow para pagos con tarjeta** ✅ COMPLETADO
   - Endpoint `POST /api/payments/create-intent` → Crea HOLD
   - Endpoint `POST /api/payments/webhook` → Recibe confirmación y procesa POST
   - Servicio `server/services/azul-payment.ts` con métodos:
     - `holdFunds()` - Reserva de fondos
     - `captureHold()` - Captura del HOLD
     - `processPayment()` - Pago SALE directo
     - `refundTransaction()` - Devoluciones
     - `voidTransaction()` - Anulación de transacciones
     - `createDataVaultToken()` - Tokenización para conductores

3. **Sistema de comisiones automático** ✅ COMPLETADO
   - Tabla actualizada con campos Azul:
   ```typescript
   export const comisiones = pgTable("comisiones", {
     id: varchar("id").primaryKey(),
     servicioId: varchar("servicio_id").references(() => servicios.id),
     montoTotal: decimal("monto_total"),
     montoOperador: decimal("monto_operador"), // 70%
     montoEmpresa: decimal("monto_empresa"), // 30%
     porcentajeOperador: decimal("porcentaje_operador").default("70.00"),
     porcentajeEmpresa: decimal("porcentaje_empresa").default("30.00"),
     estadoPagoOperador: estadoPagoEnum("estado_pago_operador"),
     estadoPagoEmpresa: estadoPagoEnum("estado_pago_empresa"),
     azulTransactionId: text("azul_transaction_id"),
     fechaPagoOperador: timestamp("fecha_pago_operador"),
     fechaPagoEmpresa: timestamp("fecha_pago_empresa"),
     createdAt: timestamp("created_at").defaultNow(),
   });
   ```
   - Webhook automáticamente:
     - Crea comisión 70/30
     - Intenta pago automático a conductor si tiene token Azul

4. **DataVault para conductores** ✅ COMPLETADO
   - Tabla conductores actualizada:
   ```typescript
   azulMerchantId: text("azul_merchant_id"),
   azulCardToken: text("azul_card_token"),
   ```
   - Endpoint `POST /api/payments/create-setup-intent` para registrar tarjeta
   - Tokenización segura con DataVault de Azul

5. **Recibos digitales**
   - Generar PDF con datos del servicio
   - Información fiscal básica
   - Endpoint `GET /api/servicios/:id/recibo`

### Variables de Entorno Requeridas:
```
AZUL_MERCHANT_ID=tu_merchant_id
AZUL_AUTH_KEY=tu_auth_key
AZUL_API_URL=https://api.azul.com.do/webservices/API_Operation/processTransaction
```

### Criterios de aceptación:
- ✅ Azul configurado para RD con DOP
- ✅ Cliente puede pagar con tarjeta (HOLD creado)
- ✅ Webhook recibe confirmación y procesa POST
- ✅ Sistema registra comisiones 70/30 automáticamente
- ✅ Conductor recibe payout automático si tiene token
- ✅ Recibo digital generado automáticamente

---

## 0.5 Monitoreo y Logging

### Tareas:
1. **Sistema de logs estructurado**
   - Usar Winston o Pino para logging
   - Niveles: error, warn, info, debug
   - Logs de:
     - Autenticación (intentos fallidos)
     - Transacciones (pagos)
     - Servicios (creación, estados)
     - Errores (stack traces)

2. **Monitoreo básico**
   - Health check endpoint: `GET /api/health`
   - Métricas básicas:
     - Servicios activos
     - Conductores online
     - Errores en última hora

### Criterios de aceptación:
- ✅ Sistema de logs configurado (Winston con niveles: error, warn, info, debug)
- ✅ Errores se loggean con contexto (categorías: auth, transaction, service, document, system)
- ✅ Health check endpoint funcional (GET /api/health con métricas en tiempo real)
- ✅ Logging integrado en puntos críticos (autenticación, transacciones, servicios, documentos)
- ✅ Log rotation configurado (archivos de 5MB máximo, últimos 5 archivos)

**Fecha de completación**: 23 de Noviembre, 2025

---

# FASE 1: MVP OPERACIONAL
**Duración estimada: 6-8 semanas**
**Objetivo: Flujo completo de solicitud y prestación de servicio de grúa**

---

## 1.1 MÓDULO CLIENTE - Solicitar Grúa

### Tareas:

#### 1.1.1 Selección de tipo de vehículo
1. **Actualizar schema**
   - Modificar tabla `servicios`:
   ```typescript
   tipoVehiculo: tipoVehiculoEnum("tipo_vehiculo"), // carro, motor, jeep, camion
   ```

2. **Frontend - Pantalla de solicitud**
   - Componente `VehicleTypeSelector`
   - Cards con iconos para cada tipo
   - Mostrar tarifa estimada por tipo

#### 1.1.2 Sistema de ubicación mejorado
1. **Mapa interactivo con Google Maps**
   - Integrar Google Maps JavaScript API (ya iniciado)
   - Geolocation API del navegador
   - Marker draggable para origen
   - Autocomplete para búsqueda de direcciones
   - Geocoding para obtener dirección de coordenadas

2. **Selección de destino (opcional)**
   - Campo "Punto de destino"
   - Cálculo de distancia con Distance Matrix API
   - Mostrar distancia y precio estimado

#### 1.1.3 Modalidad de pago
1. **UI de selección de pago**
   - Radio buttons:
     - 💵 Efectivo
     - 💳 Tarjeta
     - 🏢 Aseguradora
   
2. **Flujo de aseguradora**
   - Formulario de datos de aseguradora:
     - Nombre de aseguradora (dropdown)
     - Número de póliza
     - Tipo de cobertura
   - Subida de documentos:
     - Foto de la póliza
     - Matrícula del vehículo
     - Licencia de conducir
   - Estado inicial: `pendiente_validacion_aseguradora`

3. **Actualizar schema**
   ```typescript
   export const servicios = pgTable("servicios", {
     // ... campos existentes
     tipoVehiculo: tipoVehiculoEnum("tipo_vehiculo"),
     aseguradoraNombre: text("aseguradora_nombre"),
     aseguradoraPoliza: text("aseguradora_poliza"),
     aseguradoraEstado: aseguradoraEstadoEnum("aseguradora_estado"), // pendiente, aprobado, rechazado
   });
   ```

#### 1.1.4 Confirmación y envío de solicitud
1. **Pantalla de resumen**
   - Mostrar:
     - Tipo de vehículo
     - Ubicación origen/destino
     - Distancia
     - Precio estimado
     - Método de pago
   - Botón "Solicitar Grúa"

2. **Backend - Crear servicio**
   - Endpoint ya existe: `POST /api/services/request`
   - Mejorar para:
     - Validar datos de aseguradora si aplica
     - Calcular precio según tipo de vehículo
     - Notificar a conductores cercanos
     - Crear registro de comisión

### Criterios de aceptación:
- ✅ Cliente puede seleccionar tipo de vehículo
- ✅ Cliente puede ajustar pin de ubicación en mapa
- ✅ Cliente puede seleccionar método de pago
- ✅ Si elige aseguradora, puede subir documentos
- ✅ Solicitud se crea y notifica a conductores

---

## 1.2 MÓDULO CLIENTE - Seguimiento del Servicio

### Tareas:

#### 1.2.1 Pantalla de tracking
1. **Información del conductor asignado**
   - Card con:
     - Foto del conductor
     - Nombre completo
     - Calificación promedio ⭐
     - Placa del vehículo
     - Marca y modelo de la grúa
     - Botón de llamar (si disponible)

2. **Mapa en tiempo real**
   - Mostrar:
     - 📍 Ubicación del cliente (azul)
     - 🚛 Ubicación del conductor (rojo/naranja)
     - 🛣️ Ruta entre conductor y cliente
   - Actualización cada 5-10 segundos vía WebSocket
   - Animación suave del movimiento

3. **ETA (Tiempo estimado de llegada)**
   - Calcular con Distance Matrix API
   - Mostrar: "Llegará en 8 minutos"
   - Actualizar en tiempo real

4. **Estados del servicio visibles**
   - Indicadores visuales:
     - 🔍 Buscando conductor...
     - ✅ Conductor asignado
     - 🚛 En camino
     - 📍 Conductor ha llegado
     - 🔧 Cargando vehículo
     - 🛣️ En ruta al destino
     - ✅ Servicio completado

#### 1.2.2 Chat con el conductor
   - Reutilizar componente de chat de Fase 0.3
   - Botones de mensajes rápidos
   - Notificación de nuevos mensajes

### Criterios de aceptación:
- ✅ Cliente ve datos del conductor asignado
- ✅ Mapa se actualiza en tiempo real
- ✅ ETA se calcula y muestra correctamente
- ✅ Cliente puede chatear con conductor

---

## 1.3 MÓDULO CLIENTE - Historial y Pagos

### Tareas:

#### 1.3.1 Historial de servicios
1. **Lista de servicios pasados**
   - Endpoint ya existe: `GET /api/services/my-services`
   - UI mejorada:
     - Card por servicio con:
       - Fecha y hora
       - Estado (badge con color)
       - Origen → Destino
       - Precio pagado
       - Conductor
     - Filtros:
       - Todos / Completados / Cancelados
       - Rango de fechas

2. **Detalle de servicio**
   - Pantalla con toda la información:
     - Resumen del viaje
     - Mapa con ruta tomada
     - Desglose de costos
     - Datos del conductor
     - Botón "Descargar recibo"

#### 1.3.2 Proceso de pago
1. **Pago con tarjeta (Stripe)**
   - Después de completar servicio
   - Pantalla de confirmación de monto
   - Stripe Elements para ingresar tarjeta
   - Confirmación de pago
   - Actualizar estado a `pagado`

2. **Pago en efectivo**
   - Conductor marca "Pago recibido en efectivo"
   - Sistema registra pero no procesa pago
   - Estado: `pagado_efectivo`

3. **Recibo digital**
   - Generar PDF con:
     - Logo de Grúa RD
     - Fecha y hora
     - Cliente y conductor
     - Desglose de costos
     - Método de pago
     - Número de factura
   - Endpoint: `GET /api/servicios/:id/recibo`

### Criterios de aceptación:
- ✅ Cliente ve historial completo
- ✅ Cliente puede filtrar servicios
- ✅ Cliente puede pagar con tarjeta
- ✅ Cliente puede descargar recibo en PDF

---

## 1.4 MÓDULO OPERADORES - Registro y Validación

### Tareas:

#### 1.4.1 Registro completo de operador
1. **Datos del vehículo (ya existe parcialmente)**
   - Campos actuales: `licencia`, `placaGrua`, `marcaGrua`, `modeloGrua`
   - Agregar:
     - `tipoGrua`: "Plataforma", "Gancho", "Dollies"
     - `capacidadToneladas`: número
     - `año`: integer

2. **Documentos requeridos**
   - Al registrarse, solicitar:
     - ✅ Licencia de conducir (foto)
     - ✅ Matrícula del vehículo
     - ✅ Seguro de transportista
     - ✅ Permiso DGTT (si aplica en RD)
     - ✅ Fotos de la grúa (mínimo 3)
   
3. **Estado de validación**
   - Agregar campo a conductores:
   ```typescript
   estadoValidacion: validacionEstadoEnum("estado_validacion"), 
   // pendiente, aprobado, rechazado, requiere_documentos
   motivoRechazo: text("motivo_rechazo"),
   ```

4. **Proceso de aprobación**
   - Conductor sube documentos
   - Admin los revisa en panel
   - Admin aprueba o rechaza
   - Si rechaza, enviar notificación con motivo
   - Solo conductores aprobados pueden recibir solicitudes

### Criterios de aceptación:
- ✅ Conductor puede subir todos los documentos requeridos
- ✅ Sistema valida documentos obligatorios
- ✅ Solo conductores aprobados aparecen en búsquedas
- ✅ Conductor recibe notificación de aprobación/rechazo

---

## 1.5 MÓDULO OPERADORES - Disponibilidad y Solicitudes

### Tareas:

#### 1.5.1 Sistema ON/OFF LINE
1. **Toggle de disponibilidad**
   - Campo ya existe: `disponible: boolean`
   - Endpoint ya existe: `PUT /api/drivers/availability`
   - UI mejorada:
     - Switch grande y visible
     - Estados:
       - 🟢 EN LÍNEA (verde)
       - 🔴 FUERA DE LÍNEA (gris)
     - Al activar, pedir permisos de ubicación

2. **Actualización de ubicación GPS**
   - Endpoint ya existe: `PUT /api/drivers/location`
   - Frontend:
     - Enviar ubicación cada 30 segundos mientras está online
     - Usar Geolocation API
     - Manejar errores de GPS

#### 1.5.2 Solicitudes cercanas
1. **Lista de solicitudes**
   - Endpoint ya existe: `GET /api/drivers/nearby-requests`
   - Mejorar para calcular distancia real
   - UI:
     - Card por solicitud con:
       - 📍 Distancia (km)
       - 🚗 Tipo de vehículo
       - 💰 Ganancia estimada (70%)
       - 💵 Método de pago
       - 🕐 Hace cuánto se solicitó
       - Botón "ACEPTAR" (verde, grande)
       - Botón "Rechazar" (pequeño, gris)

2. **Notificaciones de nuevas solicitudes**
   - Push notification cuando hay nueva solicitud cerca
   - Sonido de alerta
   - Badge en app

#### 1.5.3 Aceptar solicitud
1. **Flujo de aceptación**
   - Endpoint ya existe: `POST /api/services/:id/accept`
   - Al aceptar:
     - Asignar conductor al servicio
     - Actualizar estado a `aceptado`
     - Notificar al cliente
     - Ocultar solicitud para otros conductores
     - Iniciar navegación

### Criterios de aceptación:
- ✅ Conductor puede activar/desactivar disponibilidad
- ✅ Sistema actualiza ubicación del conductor
- ✅ Conductor ve solicitudes ordenadas por cercanía
- ✅ Conductor puede aceptar solicitud
- ✅ Solo un conductor puede aceptar cada servicio

---

## 1.6 MÓDULO OPERADORES - Servicio en Curso

### Tareas:

#### 1.6.1 Navegación al cliente
1. **Integración con Google Maps / Waze**
   - Botón "Iniciar navegación"
   - Abrir app de navegación externa:
     - Android: Intent a Google Maps / Waze
     - iOS: URL scheme
   - Fallback: navegación web de Google Maps

2. **Botones de estado**
   - UI con botones grandes:
     - 🚛 "HE LLEGADO AL PUNTO" → Estado: `conductor_en_sitio`
     - 🔧 "CARGANDO VEHÍCULO" → Estado: `cargando`
     - 🛣️ "EN RUTA AL DESTINO" → Estado: `en_progreso`
     - ✅ "ENTREGA REALIZADA" → Estado: `completado`
   
3. **Endpoints de cambio de estado**
   - Ya existe: `POST /api/services/:id/start`
   - Ya existe: `POST /api/services/:id/complete`
   - Agregar:
     - `POST /api/services/:id/arrived` → Llegué al sitio
     - `POST /api/services/:id/loading` → Cargando vehículo

4. **Notificaciones al cliente**
   - Cada cambio de estado → Push al cliente
   - Actualización en tiempo real en mapa

### Criterios de aceptación:
- ✅ Conductor puede navegar al cliente
- ✅ Conductor puede actualizar estado del servicio
- ✅ Cliente recibe notificaciones de cada cambio
- ✅ Mapa se actualiza en tiempo real

---

## 1.7 MÓDULO OPERADORES - Comisiones y Pagos

### Tareas:

#### 1.7.1 Sistema de comisiones 70/30
1. **Cálculo automático**
   - Al completar servicio:
     - `montoTotal` = precio del servicio
     - `montoOperador` = montoTotal * 0.70
     - `montoEmpresa` = montoTotal * 0.30
   - Crear registro en tabla `comisiones`

2. **Para pago en EFECTIVO**
   - Cliente paga en efectivo al conductor
   - Conductor debe pagar su 30% a la empresa
   - Opciones:
     - **Opción A (Manual)**: Conductor transfiere luego
     - **Opción B (Automática)**: Cargo a tarjeta del conductor
   - Implementar Opción A primero (MVP)
   - Estado: `pendiente_pago_empresa`

3. **Para pago con TARJETA**
   - Stripe captura el 100%
   - Sistema separa automáticamente:
     - 70% va a cuenta del conductor (Stripe Connect)
     - 30% queda en cuenta de la empresa
   - Requiere Stripe Connect (Fase 2)

#### 1.7.2 Panel de ganancias del conductor
1. **Vista de comisiones**
   - Endpoint: `GET /api/drivers/earnings`
   - Filtros:
     - Hoy
     - Esta semana
     - Este mes
     - Rango personalizado
   
2. **Detalle de ganancias**
   - Lista de servicios completados
   - Por cada uno:
     - Fecha
     - Cliente
     - Monto total
     - Tu ganancia (70%)
     - Estado de pago

3. **Estadísticas**
   - Total ganado (período seleccionado)
   - Promedio por servicio
   - Total de servicios completados
   - Gráfica simple de ingresos

### Criterios de aceptación:
- ✅ Sistema calcula comisiones automáticamente
- ✅ Conductor ve sus ganancias en tiempo real
- ✅ Sistema registra servicios pagados en efectivo
- ✅ Conductor puede ver historial de pagos

---

## 1.8 MÓDULO ADMIN - Dashboard Principal

### Tareas:

#### 1.8.1 Métricas en tiempo real
1. **Cards de estadísticas**
   - Endpoint ya existe: `GET /api/admin/dashboard`
   - Mejorar para incluir:
     - 👥 Total clientes
     - 🚛 Total conductores
     - ✅ Servicios completados (hoy/semana/mes)
     - 💰 Ingresos totales
     - 🚛 Conductores online AHORA
     - 📋 Servicios activos AHORA
     - ⏳ Servicios pendientes de asignación

2. **Mapa en tiempo real**
   - Google Maps con:
     - Marcador por cada conductor online
     - Color según estado:
       - 🟢 Disponible
       - 🟡 En servicio
     - Click en marcador → info del conductor
     - Servicios activos con ruta

#### 1.8.2 Gestión de clientes
1. **Lista de clientes**
   - Endpoint ya existe: `GET /api/admin/users`
   - Tabla con:
     - Nombre completo
     - Cédula
     - Email
     - Teléfono
     - Fecha de registro
     - Total de servicios
     - Estado de cuenta
   - Filtros y búsqueda

2. **Detalle de cliente**
   - Ver perfil completo
   - Historial de servicios
   - Total gastado
   - Botones:
     - Suspender cuenta
     - Eliminar cuenta (con confirmación)

#### 1.8.3 Gestión de conductores
1. **Lista de conductores**
   - Endpoint ya existe: `GET /api/admin/drivers`
   - Tabla con:
     - Nombre
     - Cédula
     - Placa
     - Estado de validación
     - Total servicios completados
     - Calificación promedio
     - Estado (online/offline)
   
2. **Validación de documentos**
   - Página: `/admin/conductores/:id/validar`
   - Ver todos los documentos del conductor
   - Para cada documento:
     - Preview de imagen/PDF
     - Botón "Aprobar" (verde)
     - Botón "Rechazar" (rojo)
   - Si rechaza, formulario con motivo
   - Al aprobar todos → Activar conductor

3. **Gestión de conductor**
   - Ver perfil completo
   - Historial de servicios
   - Ganancias totales
   - Botones:
     - Suspender (temporal)
     - Eliminar cuenta
     - Ver documentos

### Criterios de aceptación:
- ✅ Admin ve métricas actualizadas en dashboard
- ✅ Admin ve mapa con conductores en tiempo real
- ✅ Admin puede gestionar clientes
- ✅ Admin puede validar documentos de conductores
- ✅ Admin puede activar/suspender conductores

---

## 1.9 MÓDULO ADMIN - Validación de Aseguradoras (Manual)

### Tareas:

#### 1.9.1 Cola de validación
1. **Lista de servicios pendientes**
   - Endpoint: `GET /api/admin/servicios/pendientes-aseguradora`
   - Filtrar servicios con:
     - `metodoPago` = 'aseguradora'
     - `aseguradoraEstado` = 'pendiente'
   
2. **UI de validación**
   - Tabla con:
     - ID servicio
     - Cliente
     - Aseguradora
     - N° póliza
     - Fecha de solicitud
     - Botón "Revisar"

#### 1.9.2 Proceso de validación manual
1. **Pantalla de revisión**
   - Mostrar:
     - Datos del cliente
     - Datos del servicio
     - Documentos subidos:
       - Póliza (PDF o imagen)
       - Matrícula
       - Licencia
   - Formulario de validación:
     - ✅ Aprobar
     - ❌ Rechazar
     - Campo: Motivo (si rechaza)

2. **Endpoints**
   - `POST /api/admin/servicios/:id/aseguradora/aprobar`
   - `POST /api/admin/servicios/:id/aseguradora/rechazar`
   
3. **Acciones al aprobar**
   - Actualizar `aseguradoraEstado` = 'aprobado'
   - Notificar al cliente
   - Activar servicio para asignación a conductor

4. **Acciones al rechazar**
   - Actualizar `aseguradoraEstado` = 'rechazado'
   - Guardar motivo
   - Notificar al cliente
   - Cliente puede corregir y volver a enviar

### Criterios de aceptación:
- ✅ Admin ve servicios pendientes de validación
- ✅ Admin puede revisar documentos
- ✅ Admin puede aprobar/rechazar
- ✅ Cliente recibe notificación del resultado

---

## 1.10 MÓDULO ADMIN - Gestión de Tarifas

### Tareas:

#### 1.10.1 CRUD de tarifas
1. **Tabla de tarifas existente**
   - Ya existe schema: tabla `tarifas`
   - Endpoints ya existen:
     - `GET /api/admin/pricing` ✅
     - `POST /api/admin/pricing` ✅
     - `PUT /api/admin/pricing/:id` ✅

2. **UI mejorada para tarifas**
   - Lista de tarifas configuradas
   - Formulario de edición:
     - Nombre de tarifa
     - Precio base (DOP)
     - Tarifa por km (DOP)
     - Multiplicador nocturno (ej: 1.5 = +50%)
     - Hora inicio nocturna (ej: 20:00)
     - Hora fin nocturna (ej: 06:00)
     - Zona (opcional)
     - Estado: Activo/Inactivo
   
3. **Tarifas por tipo de vehículo**
   - Extender tabla:
   ```typescript
   tipoVehiculo: tipoVehiculoEnum("tipo_vehiculo"), // null = todas
   ```
   - Crear tarifas específicas:
     - Carro
     - Motor
     - Jeep
     - Camión

#### 1.10.2 Cálculo dinámico de precios
1. **Endpoint de cotización**
   - Ya existe: `POST /api/pricing/calculate`
   - Mejorar lógica:
     - Recibir: `tipoVehiculo`, `distanciaKm`, `hora`
     - Buscar tarifa activa que aplique
     - Calcular:
       - Base + (distancia * tarifaPorKm)
       - Si es nocturno → aplicar multiplicador
     - Retornar precio estimado

2. **Uso en frontend**
   - Al seleccionar destino → mostrar precio estimado
   - Actualizar en tiempo real al mover pin
   - Mostrar desglose:
     - Tarifa base: X DOP
     - Distancia (Y km): Z DOP
     - Tarifa nocturna (+50%): W DOP
     - Total: XXX DOP

### Criterios de aceptación:
- ✅ Admin puede crear/editar tarifas
- ✅ Tarifas por tipo de vehículo funcionan
- ✅ Sistema calcula precio correcto
- ✅ Tarifa nocturna se aplica automáticamente
- ✅ Cliente ve precio estimado antes de solicitar

---

# FASE 2: AUTOMATIZACIONES Y PORTALES AVANZADOS
**Duración estimada: 8-10 semanas**
**Objetivo: Automatizar procesos, integrar APIs externas, portales especializados**

---

## 2.1 Integración con APIs de Aseguradoras

### Investigación previa necesaria:
1. **Identificar aseguradoras dominicanas con API**
   - Principales aseguradoras en RD:
     - Seguros Reservas
     - ARS Palic
     - Mapfre BHD
     - Universal Seguros
     - La Colonial
   - Contactar para preguntar sobre:
     - ¿Tienen API pública?
     - ¿Qué endpoints exponen?
     - ¿Proceso de obtener credenciales?

### Tareas (si hay APIs disponibles):

#### 2.1.1 Integración API de aseguradoras
1. **Sistema de conectores**
   - Crear módulo `server/integrations/aseguradoras/`
   - Adapter pattern para cada aseguradora
   - Interfaz común:
   ```typescript
   interface AseguradoraConnector {
     validarPoliza(numeroPoliza: string, cedula: string): Promise<PolizaValidacion>;
     verificarCobertura(poliza: string, tipoServicio: string): Promise<Cobertura>;
     registrarSiniestro(datos: DatosSiniestro): Promise<string>;
   }
   ```

2. **Validación automática**
   - Al subir datos de póliza:
     - Llamar API de la aseguradora
     - Validar que póliza esté activa
     - Verificar cobertura de grúa
     - Retornar aprobación/rechazo instantáneo
   - Solo si falla API → cola manual

3. **Tabla de configuración**
   ```typescript
   export const aseguradoras = pgTable("aseguradoras", {
     id: varchar("id").primaryKey(),
     nombre: text("nombre"),
     apiUrl: text("api_url"),
     apiKey: text("api_key"), // Encriptado
     activo: boolean("activo"),
     configuracion: jsonb("configuracion"),
   });
   ```

### Criterios de aceptación:
- ✅ Sistema se conecta a API de al menos 1 aseguradora
- ✅ Validación automática de pólizas funciona
- ✅ Si falla API, cae en validación manual
- ✅ Admin puede configurar aseguradoras

---

## 2.2 MÓDULO ASEGURADORAS - Portal Web

### Tareas:

#### 2.2.1 Autenticación de aseguradoras
1. **Nuevo rol de usuario**
   - Agregar `aseguradora` a enum de userType
   - Usuarios de aseguradora pueden:
     - Ver solo sus servicios
     - Aprobar/rechazar solicitudes
     - Ver reportes de sus servicios

2. **Gestión de usuarios de aseguradora**
   - Admin puede crear usuarios de aseguradora
   - Asignar a qué aseguradora pertenecen
   - Permisos limitados

#### 2.2.2 Dashboard de aseguradora
1. **Servicios pendientes de aprobación**
   - Vista similar a admin pero filtrada
   - Ver solo servicios de su aseguradora
   - Aprobar/rechazar con motivo

2. **Historial de servicios**
   - Todos los servicios procesados
   - Filtros:
     - Aprobados
     - Rechazados
     - Rango de fechas
   - Descargar reportes

#### 2.2.3 Control de pagos
1. **Servicios cubiertos**
   - Lista de servicios aprobados
   - Monto total cubierto
   - Estado de pago:
     - Pendiente de facturar
     - Facturado
     - Pagado

2. **Reportes mensuales**
   - Total de servicios
   - Monto total
   - Desglose por tipo de servicio
   - Exportar a Excel/PDF

### Criterios de aceptación:
- ✅ Usuarios de aseguradora pueden iniciar sesión
- ✅ Pueden aprobar/rechazar servicios
- ✅ Ven solo sus servicios
- ✅ Pueden descargar reportes

---

## 2.3 MÓDULO ADMIN - Analítica Avanzada

### Tareas:

#### 2.3.1 Mapa de calor de servicios
1. **Google Maps Heatmap Layer**
   - Mostrar zonas con más demanda
   - Filtros por:
     - Rango de fechas
     - Hora del día
     - Tipo de vehículo

2. **Análisis de zonas**
   - Identificar zonas calientes
   - Sugerir posicionamiento de conductores
   - Reportes de cobertura

#### 2.3.2 Dashboard analítico
1. **Gráficas avanzadas**
   - Usar Recharts (ya instalado)
   - Gráficas:
     - Servicios por día (línea)
     - Ingresos por mes (barras)
     - Distribución por tipo de vehículo (pie)
     - Horarios pico (barras agrupadas)

2. **Métricas clave (KPIs)**
   - Tiempo promedio de respuesta
   - Tiempo promedio de servicio
   - Tasa de aceptación de conductores
   - Tasa de cancelación
   - Ingreso promedio por servicio
   - Calificación promedio de conductores

3. **Reportes avanzados**
   - Servicios por zona geográfica
   - Conductores más activos (ranking)
   - Clientes más frecuentes
   - Análisis de pérdidas y ganancias
   - Comparativa mes a mes

### Criterios de aceptación:
- ✅ Mapa de calor muestra zonas de demanda
- ✅ Gráficas actualizadas con datos reales
- ✅ Reportes exportables a PDF/Excel
- ✅ KPIs calculados correctamente

---

## 2.4 Sistema de Comisiones Automático (Stripe Connect)

### Tareas:

#### 2.4.1 Configurar Stripe Connect
1. **Verificar disponibilidad en RD**
   - Confirmar que Stripe Connect funciona en RD
   - Alternativa: usar Stripe normal y manejar transferencias manualmente

2. **Onboarding de conductores**
   - Flujo para conectar cuenta bancaria/tarjeta
   - Usar Stripe Connect Onboarding
   - Guardar Stripe Account ID del conductor

#### 2.4.2 Split payments automáticos
1. **Al crear PaymentIntent**
   - Usar `transfer_data` para dividir pago:
     - 70% → Cuenta del conductor
     - 30% → Cuenta de la empresa
   - Todo en una transacción

2. **Para efectivo**
   - Opción de cargo automático al conductor
   - Stripe guarda tarjeta del conductor
   - Al finalizar servicio en efectivo:
     - Calcular 30%
     - Hacer cargo a tarjeta del conductor
     - Transferir a cuenta empresa

### Criterios de aceptación:
- ✅ Conductores pueden conectar su cuenta
- ✅ Pagos con tarjeta se dividen automáticamente
- ✅ Efectivo también se procesa automáticamente
- ✅ Sistema registra todas las transacciones

---

## 2.5 MÓDULO SOCIOS/INVERSORES - Portal

### Tareas:

#### 2.5.1 Nuevo rol y schema
1. **Agregar rol `socio`**
   - Tabla nueva:
   ```typescript
   export const socios = pgTable("socios", {
     id: varchar("id").primaryKey(),
     userId: varchar("user_id").references(() => users.id),
     porcentajeParticipacion: decimal("porcentaje_participacion"),
     montoInversion: decimal("monto_inversion"),
     fechaInversion: timestamp("fecha_inversion"),
     activo: boolean("activo").default(true),
     cuentaBancaria: text("cuenta_bancaria"), // Encriptado
   });
   ```

2. **Tabla de distribuciones**
   ```typescript
   export const distribucionesSocios = pgTable("distribuciones_socios", {
     id: varchar("id").primaryKey(),
     socioId: varchar("socio_id").references(() => socios.id),
     periodo: text("periodo"), // "2024-01", "2024-02"
     ingresosTotales: decimal("ingresos_totales"),
     comisionEmpresa: decimal("comision_empresa"), // 30% de todo
     montoSocio: decimal("monto_socio"), // % según participación
     estado: estadoDistribucionEnum("estado"), // calculado, pagado
     fechaPago: timestamp("fecha_pago"),
   });
   ```

#### 2.5.2 Dashboard del socio
1. **Panel de ganancias**
   - Mostrar:
     - % de participación
     - Monto invertido
     - Ingresos del período actual
     - Tu porción (según %)
     - Histórico de pagos

2. **Gráficas**
   - Evolución de ingresos mensuales
   - Retorno sobre inversión (ROI)
   - Proyección de ganancias

3. **Descargar estados financieros**
   - PDF mensual con:
     - Resumen de servicios
     - Ingresos totales
     - Distribución entre socios
     - Tu porción
     - Firma digital

### Criterios de aceptación:
- ✅ Socios pueden ver sus ganancias
- ✅ Cálculo de distribuciones es correcto
- ✅ Pueden descargar estados financieros
- ✅ Solo ven sus propios datos

---

## 2.6 Sistema de Validaciones Anuales ✅ COMPLETADO

### Implementación:

#### 2.6.1 Recordatorios de vencimiento ✅
1. **Servicio de verificación automático**
   - Servicio en background que se ejecuta cada 6 horas
   - Revisa documentos próximos a vencer
   - Envía notificaciones push:
     - 30 días antes
     - 15 días antes
     - 7 días antes
     - Al vencer → suspender

2. **Suspensión automática**
   - Si seguro de grúa vence:
     - Marcar conductor como `suspendido`
     - Notificar al conductor
     - No recibe más solicitudes hasta renovar

#### 2.6.2 Portal de renovación ✅
1. **Conductor puede renovar**
   - ✅ Página `/driver/renovar-documentos` implementada
   - ✅ Subir nuevos documentos con fecha de vencimiento
   - ✅ Vista de estado de todos los documentos
   - ✅ Alertas para documentos vencidos/por vencer
   - ✅ Admin debe aprobar nuevamente

### Componentes implementados:
- `server/services/document-validation.ts`: Servicio de validación automático
- `client/src/pages/driver/document-renewal.tsx`: Página de renovación de documentos
- Tablas: `documento_recordatorios`, `system_jobs`
- APIs: `/api/admin/documents/expiring`, `/api/admin/documents/expired`, `/api/admin/documents/run-validation`, etc.

### Criterios de aceptación:
- ✅ Sistema envía recordatorios automáticos (30, 15, 7 días antes)
- ✅ Conductores con documentos vencidos son suspendidos automáticamente
- ✅ Conductor puede renovar documentos desde su portal
- ✅ Admin puede ver documentos vencidos/por vencer
- ✅ Admin puede suspender/reactivar conductores manualmente
- ✅ Admin valida renovaciones

---

## 2.7 Centro de Soporte con Tickets ✅ (Completado 28 Nov 2025)

### Tareas:

#### 2.7.1 Sistema de tickets ✅
1. **Schema de tickets** ✅
   ```typescript
   export const tickets = pgTable("tickets", {
     id: varchar("id").primaryKey(),
     usuarioId: varchar("usuario_id").references(() => users.id),
     categoria: ticketCategoriaEnum("categoria"), 
     // problema_tecnico, consulta_servicio, queja, sugerencia, problema_pago, otro
     titulo: text("titulo"),
     descripcion: text("descripcion"),
     prioridad: ticketPrioridadEnum("prioridad"), // baja, media, alta, urgente
     estado: ticketEstadoEnum("estado"), // abierto, en_proceso, resuelto, cerrado
     asignadoA: varchar("asignado_a").references(() => users.id),
     servicioRelacionadoId: varchar("servicio_relacionado_id").references(() => servicios.id),
     createdAt: timestamp("created_at").defaultNow(),
     updatedAt: timestamp("updated_at").defaultNow(),
     resueltoAt: timestamp("resuelto_at"),
     cerradoAt: timestamp("cerrado_at"),
   });

   export const mensajesTicket = pgTable("mensajes_ticket", {
     id: varchar("id").primaryKey(),
     ticketId: varchar("ticket_id").references(() => tickets.id),
     usuarioId: varchar("usuario_id").references(() => users.id),
     mensaje: text("mensaje"),
     esStaff: boolean("es_staff"),
     leido: boolean("leido"),
     createdAt: timestamp("created_at").defaultNow(),
   });
   ```

2. **Endpoints** ✅
   - `POST /api/tickets` - Crear ticket
   - `GET /api/tickets` - Listar mis tickets
   - `GET /api/tickets/:id` - Ver ticket con detalles
   - `GET /api/tickets/:id/mensajes` - Obtener mensajes del ticket
   - `POST /api/tickets/:id/mensaje` - Responder ticket
   - `PUT /api/tickets/:id/cerrar` - Cerrar ticket
   - `GET /api/admin/tickets` - Listar todos los tickets (admin)
   - `GET /api/admin/tickets/stats` - Estadísticas de tickets
   - `GET /api/admin/tickets/mis-asignados` - Tickets asignados al admin
   - `PUT /api/admin/tickets/:id/asignar` - Asignar ticket a admin
   - `PUT /api/admin/tickets/:id/estado` - Cambiar estado del ticket
   - `PUT /api/admin/tickets/:id/prioridad` - Cambiar prioridad del ticket

#### 2.7.2 UI para clientes y conductores ✅
1. **Botón de soporte en app** ✅
   - ✅ Acceso desde menú principal (/client/support, /driver/support)
   - ✅ Formulario de nuevo ticket con categoría, título, descripción, prioridad
   - ✅ Ver mis tickets abiertos con estado y prioridad visual
   - ✅ Vista detallada con conversación de mensajes
   - ✅ Posibilidad de cerrar ticket por el usuario

#### 2.7.3 Panel admin de tickets ✅
1. **Cola de tickets** ✅
   - ✅ Ver todos los tickets con estadísticas (total, abiertos, en proceso, resueltos, cerrados, urgentes, sin asignar)
   - ✅ Filtros por estado, prioridad y categoría
   - ✅ Tab "Mis Asignados" para tickets del admin actual
   - ✅ Asignar ticket a sí mismo
   - ✅ Cambiar estado y prioridad del ticket
   - ✅ Responder tickets con mensajes
   - ✅ Vista detallada con información del usuario y conversación completa

### Componentes implementados:
- `shared/schema.ts`: Tablas tickets, mensajesTicket con enums y relaciones
- `server/storage.ts`: Métodos CRUD para tickets y mensajes
- `server/routes.ts`: 12 endpoints para gestión de tickets
- `client/src/pages/support.tsx`: Página de soporte para clientes/conductores
- `client/src/pages/admin/tickets.tsx`: Panel de gestión de tickets para admin
- `client/src/components/layout/AdminLayout.tsx`: Enlace a tickets en navegación
- Migración: `migrations/0003_ticket_support_system.sql`

### Criterios de aceptación:
- ✅ Usuarios pueden crear tickets con categoría, prioridad y descripción
- ✅ Admin ve y gestiona todos los tickets
- ✅ Sistema de mensajes en ticket funciona bidireccional
- ✅ Admin puede asignar tickets a sí mismo
- ✅ Admin puede cambiar estado y prioridad
- ✅ Estadísticas de tickets disponibles para admin
- ✅ Filtros por estado, prioridad y categoría

---

## 2.8 Mejoras en Chat - Mensajes Predefinidos ✅ COMPLETADO (28 Nov 2025)

### Implementación:

#### 2.8.1 Templates de mensajes ✅
1. **Mensajes rápidos para clientes** ✅
   - "¿Cuánto falta para que llegues?"
   - "¿Dónde estás?"
   - "Necesito más tiempo"
   - "Gracias"

2. **Mensajes rápidos para conductores** ✅
   - "Voy en camino, llego en 5 minutos"
   - "Estoy cerca"
   - "He llegado al punto"
   - "Necesito que salgas del vehículo"
   - "Todo listo, nos vamos"

3. **UI** ✅
   - Botones de acceso rápido
   - Click → llena campo de mensaje
   - Click enviar → envía mensaje
   - Mensajes diferenciados por rol (cliente/conductor)

### Componentes implementados:
- `client/src/components/chat/ChatBox.tsx`: Constantes QUICK_MESSAGES_CLIENTE y QUICK_MESSAGES_CONDUCTOR, prop userType para diferenciación
- `client/src/pages/client/tracking.tsx`: ChatBox con userType="cliente"
- `client/src/pages/driver/dashboard.tsx`: ChatBox con userType="conductor"

### Criterios de aceptación:
- ✅ Mensajes predefinidos disponibles
- ✅ Un click para seleccionar mensaje
- ✅ Reduce fricción en comunicación
- ✅ Mensajes diferenciados por rol (cliente/conductor)

---

# FASE 3: CALIDAD, TESTING Y OPTIMIZACIÓN
**Duración estimada: 3-4 semanas**
**Objetivo: Asegurar calidad, performance, y preparar para producción**

---

## 3.1 Testing Completo

### Tareas:

#### 3.1.1 Tests E2E con Playwright
1. **Flujos principales**
   - Cliente solicita servicio → conductor acepta → completa
   - Registro de nuevo cliente
   - Registro de nuevo conductor
   - Admin aprueba conductor
   - Pago con tarjeta
   - Chat entre cliente y conductor

2. **Tests por rol**
   - Cliente:
     - Solicitar grúa (efectivo, tarjeta, aseguradora)
     - Ver historial
     - Descargar recibo
   - Conductor:
     - Activar disponibilidad
     - Ver solicitudes
     - Aceptar servicio
     - Completar servicio
   - Admin:
     - Validar documentos
     - Gestionar tarifas
     - Ver dashboard

#### 3.1.2 Tests de integración
1. **APIs críticas**
   - Autenticación
   - Creación de servicios
   - Pagos con Stripe
   - WebSocket

2. **Tests de base de datos**
   - Queries complejas
   - Transacciones
   - Constraints

### Criterios de aceptación:
- ✅ 80%+ de cobertura en flujos principales
- ✅ Tests E2E pasan consistentemente
- ✅ CI/CD ejecuta tests automáticamente

---

## 3.2 Optimización de Performance

### Tareas:

#### 3.2.1 Auditoría con Lighthouse
1. **Métricas objetivo**
   - Performance: ≥90
   - Accessibility: ≥90
   - Best Practices: ≥90
   - SEO: ≥90
   - PWA: 100

2. **Optimizaciones**
   - Code splitting
   - Lazy loading de componentes
   - Optimización de imágenes
   - Service worker para caching
   - Minimizar bundle size

#### 3.2.2 Optimización de base de datos
1. **Índices**
   - Agregar índices a campos frecuentes:
     - `users.email`
     - `servicios.clienteId`
     - `servicios.conductorId`
     - `servicios.estado`
     - `conductores.disponible`

2. **Queries optimizadas**
   - Usar `select` específicos (no `*`)
   - Paginación en listados
   - Caché de queries frecuentes

#### 3.2.3 Optimización de Google Maps
1. **Reducir llamadas a API**
   - Cachear geocoding de direcciones comunes
   - Throttle de actualizaciones de ubicación
   - Usar Static Maps API donde no se necesite interactividad

2. **Quotas y costos**
   - Monitorear uso
   - Implementar límites
   - Mostrar errores amigables si se excede

### Criterios de aceptación:
- ✅ Lighthouse score ≥90 en todas las categorías
- ✅ Tiempo de carga inicial <3s
- ✅ Queries de DB optimizadas
- ✅ Costos de Google Maps bajo control

---

## 3.3 Sistema de Calificaciones

### Tareas:

#### 3.3.1 Calificación de conductores
1. **Después de completar servicio**
   - Cliente puede calificar:
     - Estrellas (1-5)
     - Comentario opcional
   - Tabla ya existe: `calificaciones`

2. **Promedio de calificaciones**
   - Calcular y actualizar `calificacionPromedio` del conductor
   - Mostrar en perfil del conductor
   - Usar en ranking

3. **UI de calificación**
   - Modal después de servicio completado
   - Estrellas táctiles
   - Placeholder de comentarios
   - Botón "Calificar más tarde" (skip)

#### 3.3.2 Ranking de conductores
1. **Endpoint de ranking**
   - Ya existe: `getDriverRankings()` en storage
   - Completar implementación:
     - Ordenar por calificación promedio
     - Considerar cantidad de servicios
     - Filtrar por período

2. **Mostrar en admin**
   - Top 10 conductores
   - Métricas:
     - Calificación promedio
     - Total de servicios
     - Total ganado

### Criterios de aceptación:
- ✅ Cliente puede calificar al conductor
- ✅ Promedio se actualiza automáticamente
- ✅ Ranking de conductores funcional
- ✅ Admin puede ver top conductores

---

## 3.4 PWA Optimización Final

### Tareas:

#### 3.4.1 Service Worker avanzado
1. **Estrategias de caché**
   - Network first para datos en tiempo real
   - Cache first para assets estáticos
   - Offline fallback para páginas

2. **Notificaciones push**
   - VAPID configurado
   - Service worker maneja notificaciones
   - Click en notificación abre app

3. **Instalación fluida**
   - Prompt de instalación
   - Screenshots en manifest
   - Categorías apropiadas

#### 3.4.2 Modo offline básico
1. **Funcionalidad offline**
   - Ver historial (cacheado)
   - Ver perfil
   - Mostrar mensaje si intenta crear servicio

2. **Sincronización al reconectar**
   - Background Sync API
   - Enviar acciones pendientes cuando vuelva conexión

### Criterios de aceptación:
- ✅ PWA instalable en móviles
- ✅ Funciona offline parcialmente
- ✅ Notificaciones push funcionan
- ✅ Service worker optimizado

---

## 3.5 Seguridad y Compliance

### Tareas:

#### 3.5.1 Auditoría de seguridad
1. **Validaciones**
   - Todos los endpoints validan autenticación
   - Validación de permisos por rol
   - Sanitización de inputs
   - Rate limiting en endpoints sensibles

2. **Protección de datos**
   - Encriptar datos sensibles:
     - Cédula
     - Cuenta bancaria
     - API keys
   - HTTPS en producción (Replit lo maneja)

#### 3.5.2 GDPR / Protección de datos RD
1. **Política de privacidad**
   - Documento legal
   - Aceptación en registro
   - Opción de eliminar cuenta

2. **Exportación de datos**
   - Usuario puede descargar sus datos
   - Formato JSON

### Criterios de aceptación:
- ✅ Todos los endpoints autenticados y autorizados
- ✅ Datos sensibles encriptados
- ✅ Rate limiting configurado
- ✅ Política de privacidad implementada

---

## 3.6 Monitoreo y Logging en Producción

### Tareas:

#### 3.6.1 Logging estructurado
1. **Sistema de logs**
   - Winston o Pino configurado
   - Niveles apropiados
   - Logs a archivo y consola
   - Rotación de logs

2. **Logs críticos**
   - Todos los errores
   - Transacciones de pago
   - Creación de servicios
   - Autenticación fallida

#### 3.6.2 Monitoreo de salud
1. **Health checks**
   - `GET /api/health`
   - `GET /api/health/db` - Estado de DB
   - `GET /api/health/stripe` - Conectividad Stripe

2. **Alertas**
   - Notificar si:
     - DB se cae
     - Stripe falla
     - Muchos errores 500

### Criterios de aceptación:
- ✅ Logging configurado y funcionando
- ✅ Health checks responden
- ✅ Sistema de alertas básico

---

## 3.7 Documentación

### Tareas:

#### 3.7.1 Documentación de API
1. **Swagger / OpenAPI**
   - Documentar todos los endpoints
   - Ejemplos de requests/responses
   - Códigos de error

2. **Postman collection**
   - Colección completa
   - Variables de entorno
   - Tests básicos

#### 3.7.2 Documentación de usuario
1. **Guías**
   - Cómo solicitar una grúa (cliente)
   - Cómo usar la app (conductor)
   - Cómo gestionar la plataforma (admin)
   - FAQs

2. **Videos tutoriales**
   - Video corto por cada flujo principal
   - En español
   - Contexto dominicano

#### 3.7.3 Documentación técnica
1. **README mejorado**
   - Arquitectura del proyecto
   - Setup local
   - Variables de entorno
   - Scripts disponibles

2. **Guía de deployment**
   - Configuración de producción
   - Variables de entorno necesarias
   - Proceso de deployment en Replit

### Criterios de aceptación:
- ✅ API documentada con Swagger
- ✅ Guías de usuario disponibles
- ✅ README completo y actualizado
- ✅ Documentación técnica clara

---

## 3.8 Preparación para Lanzamiento

### Tareas:

#### 3.8.1 Checklist de producción
- [ ] Todas las features implementadas
- [ ] Tests pasando
- [ ] Performance optimizada
- [ ] Seguridad auditada
- [ ] Documentación completa
- [ ] Stripe en modo producción
- [ ] Google Maps con API key de producción
- [ ] SMS/WhatsApp configurado
- [ ] VAPID keys generadas
- [ ] Monitoreo configurado
- [ ] Backups automáticos
- [ ] Política de privacidad
- [ ] Términos y condiciones

#### 3.8.2 Datos de producción
1. **Seed data inicial**
   - Crear usuario admin principal
   - Crear tarifas base
   - Configurar aseguradoras principales

2. **Migraciones**
   - Todas las migraciones probadas
   - Rollback plan

#### 3.8.3 Plan de lanzamiento
1. **Soft launch**
   - Beta con usuarios limitados
   - Monitorear errores
   - Iterar rápido

2. **Marketing básico**
   - Landing page
   - Redes sociales
   - Comunicados de prensa

### Criterios de aceptación:
- ✅ Checklist completo
- ✅ Ambiente de producción configurado
- ✅ Plan de lanzamiento documentado

---

## 📋 RESUMEN DE DEPENDENCIAS CRÍTICAS

### Integraciones Externas Necesarias:
1. **SMS/WhatsApp** - Twilio, Infobip, o MessageBird
2. **Stripe** - Verificar disponibilidad completa en RD
3. **Google Maps Platform**:
   - Maps JavaScript API
   - Geocoding API
   - Distance Matrix API
   - Directions API (opcional, para rutas)
4. **Almacenamiento de archivos** - S3, Cloudinary, o Replit Object Storage
5. **APIs de Aseguradoras** - Investigar disponibilidad en RD

### Validaciones Específicas de RD:
- Formato de cédula dominicana (11 dígitos)
- Algoritmo de validación de cédula
- Moneda DOP en Stripe
- Normativas de seguros de grúas
- Permisos DGTT (Dirección General de Tránsito Terrestre)

---

## 📊 ESTIMACIÓN DE TIEMPO TOTAL

- **Fase 0**: 3-4 semanas
- **Fase 1**: 6-8 semanas
- **Fase 2**: 8-10 semanas
- **Fase 3**: 3-4 semanas

**TOTAL**: **20-26 semanas** (5-6.5 meses)

---

## 🎯 PRIORIZACIÓN PARA MVP RÁPIDO

Si necesitas lanzar más rápido, este sería el orden mínimo:

### MVP Mínimo (8-10 semanas):
1. ✅ Autenticación básica (ya existe)
2. ✅ Registro con cédula y OTP
3. ✅ Cliente solicita grúa (efectivo solo)
4. ✅ Conductor acepta y completa servicio
5. ✅ Tracking básico en tiempo real
6. ✅ Comisiones manuales (sin automatizar)
7. ✅ Admin valida conductores manualmente
8. ✅ Tarifas básicas

### Posponer para V2:
- Portal de aseguradoras
- Portal de socios
- Stripe Connect (usar transferencias manuales)
- Analítica avanzada
- Sistema de tickets
- Validaciones automáticas de seguros

---

## 🔧 PRÓXIMOS PASOS INMEDIATOS

1. **Decidir sobre integraciones**:
   - Elegir proveedor de SMS/WhatsApp
   - Confirmar Stripe en RD
   - Configurar Google Maps API key
   - Seleccionar storage de archivos

2. **Actualizar database schema**:
   - Agregar campos faltantes
   - Crear tablas nuevas
   - Ejecutar migraciones

3. **Configurar integraciones**:
   - Obtener API keys
   - Configurar webhooks
   - Testear en desarrollo

4. **Comenzar Fase 0** 🚀

---

**Notas**: Este plan es exhaustivo y cubre todas las especificaciones. Es adaptable según prioridades y recursos disponibles. Cada fase puede ajustarse según feedback y necesidades del mercado dominicano.
