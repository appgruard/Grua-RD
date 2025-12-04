# Plan de Implementación: Sistema de Chat y Negociación para Extracción

## Resumen Ejecutivo

Este plan detalla la implementación de un sistema de chat dual para la plataforma Grúa RD:
1. **Chat Normal**: Comunicación entre cliente y chofer cuando se acepta un servicio
2. **Chat de Negociación**: Para servicios de extracción donde el chofer evalúa la situación y propone un monto

---

## Fase 1: Preparación del Schema y Base de Datos ✅ COMPLETADA (4 Dic 2025)

### 1.1 Añadir Categoría de Extracción
**Archivo:** `shared/schema.ts`

**Cambios:**
- Añadir `extraccion` como nueva categoría en `VALID_SERVICE_CATEGORIES`
- Añadir subtipos específicos para extracción:
  - `extraccion_zanja` (Vehículo en zanja)
  - `extraccion_lodo` (Vehículo atascado en lodo)
  - `extraccion_volcado` (Vehículo volcado)
  - `extraccion_accidente` (Vehículo accidentado)
  - `extraccion_dificil` (Situación compleja/difícil acceso)

### 1.2 Extender Tabla de Servicios
**Archivo:** `shared/schema.ts`

**Nuevos campos en `servicios`:**
```typescript
requiereNegociacion: boolean  // Indica si el servicio requiere negociación de precio
montoNegociado: decimal       // Monto propuesto por el chofer
estadoNegociacion: enum       // 'pendiente' | 'propuesto' | 'aceptado' | 'rechazado'
notasExtraccion: text         // Notas del chofer sobre la situación
```

### 1.3 Extender Tabla de Mensajes de Chat
**Archivo:** `shared/schema.ts`

**Nuevos campos en `mensajesChat`:**
```typescript
tipoMensaje: enum      // 'texto' | 'imagen' | 'video' | 'monto_propuesto' | 'monto_confirmado' | 'monto_aceptado' | 'monto_rechazado'
montoAsociado: decimal // Para mensajes de tipo monto
urlArchivo: text       // Para mensajes con archivos adjuntos (fotos/videos)
```

### 1.4 Migración de Base de Datos ✅
**Archivo:** `migrations/0008_negotiation_chat_system.sql`

**Implementado:**
- ✅ Añadido valor `extraccion` al enum `servicio_categoria`
- ✅ Añadidos 5 nuevos subtipos de extracción al enum `servicio_subtipo`:
  - `extraccion_zanja`, `extraccion_lodo`, `extraccion_volcado`, `extraccion_accidente`, `extraccion_dificil`
- ✅ Creado enum `estado_negociacion` con valores: `no_aplica`, `pendiente_evaluacion`, `propuesto`, `confirmado`, `aceptado`, `rechazado`, `cancelado`
- ✅ Creado enum `tipo_mensaje_chat` con valores: `texto`, `imagen`, `video`, `monto_propuesto`, `monto_confirmado`, `monto_aceptado`, `monto_rechazado`, `sistema`
- ✅ Añadidas columnas a tabla `servicios`:
  - `requiere_negociacion` (boolean, NOT NULL DEFAULT false)
  - `estado_negociacion` (enum, DEFAULT 'no_aplica')
  - `monto_negociado` (decimal 10,2)
  - `notas_extraccion` (text)
  - `descripcion_situacion` (text)
- ✅ Añadidas columnas a tabla `mensajes_chat`:
  - `tipo_mensaje` (enum, NOT NULL DEFAULT 'texto')
  - `monto_asociado` (decimal 10,2)
  - `url_archivo` (text)
  - `nombre_archivo` (text)
- ✅ Índices creados para optimización

---

## Fase 2: Backend - API y Lógica de Negocio ✅ COMPLETADA (4 Dic 2025)

### 2.1 Nuevos Endpoints para Chat de Negociación ✅
**Archivo:** `server/routes.ts`

**Endpoints implementados:**

```
POST /api/chat/send-media ✅
- Subir foto/video como evidencia
- Usa multer con límite de 10MB
- Detecta automáticamente tipo de mensaje (imagen/video)
- Retorna URL del archivo

POST /api/services/:id/propose-amount ✅
- Chofer propone un monto
- Body: { monto: number, notas: string }
- Crea mensaje de tipo 'monto_propuesto'
- Actualiza estadoNegociacion a 'propuesto'
- Envía notificación push al cliente

POST /api/services/:id/confirm-amount ✅
- Chofer confirma que el monto es final
- Cambia estadoNegociacion a 'confirmado'
- Envía notificación al cliente

POST /api/services/:id/accept-amount ✅
- Cliente acepta el monto negociado
- Actualiza estadoNegociacion a 'aceptado'
- Actualiza costoTotal con montoNegociado
- Cambia estado del servicio a 'aceptado'

POST /api/services/:id/reject-amount ✅
- Cliente rechaza el monto
- Limpia conductorId y montoNegociado
- Actualiza estadoNegociacion a 'rechazado'
- Servicio queda disponible nuevamente

GET /api/drivers/available-requests ✅
- Lista de servicios pendientes sin conductor asignado
- Ordenados por fecha de creación (descendente)
```

### 2.2 Detección Automática de Montos ✅
**Archivo:** `server/services/chat-amount-detector.ts`

**Implementado:**
- ✅ Patrones múltiples para detectar montos en español dominicano
- ✅ Soporte para formatos: "RD$X,XXX", "$X,XXX", "X,XXX pesos", "el costo es X,XXX", etc.
- ✅ Límites de monto: mínimo RD$500, máximo RD$500,000
- ✅ Funciones: `detectAmount()`, `isAmountMessage()`, `extractAllAmounts()`, `formatAmount()`

### 2.3 Sistema de Priorización de Servicios ✅
**Archivo:** `server/services/service-priority.ts`

**Implementado:**
- ✅ Sistema de puntuación basado en categoría, subtipo y tiempo de espera
- ✅ Tres niveles de prioridad: alta (rojo), media (naranja), baja (verde)
- ✅ Generación de IDs visuales por categoría (EXT-001, REM-002, etc.)
- ✅ Funciones: `prioritizeServices()`, `getPriorityColor()`, `getPriorityLabel()`

### 2.4 WebSocket para Negociación en Tiempo Real ✅
**Archivo:** `server/routes.ts` (integrado en la función registerRoutes)

**Tipos de mensaje WebSocket implementados:**
```typescript
'amount_proposed'      // ✅ Chofer propuso monto
'amount_confirmed'     // ✅ Chofer confirmó monto final
'amount_accepted'      // ✅ Cliente aceptó
'amount_rejected'      // ✅ Cliente rechazó
'new_chat_message'     // ✅ Mensaje con media/archivo
```

### 2.5 Notificaciones Push de Negociación ✅
**Archivo:** `server/push-service.ts`

**Nuevas notificaciones implementadas:**
- ✅ `notifyNegotiationAmountProposed()` - Al cliente cuando operador propone monto
- ✅ `notifyNegotiationAmountConfirmed()` - Al cliente cuando operador confirma monto
- ✅ `notifyNegotiationAmountAccepted()` - Al conductor cuando cliente acepta
- ✅ `notifyNegotiationAmountRejected()` - Al conductor cuando cliente rechaza
- ✅ `notifyNewExtractionRequest()` - A conductores para nuevas solicitudes de extracción

### 2.6 Métodos de Storage ✅
**Archivo:** `server/storage.ts`

**Nuevos métodos implementados:**
- ✅ `getAvailableServicesForDrivers()` - Obtener servicios pendientes sin conductor
- ✅ `proposeNegotiationAmount()` - Proponer monto de negociación
- ✅ `confirmNegotiationAmount()` - Confirmar monto propuesto
- ✅ `acceptNegotiationAmount()` - Cliente acepta el monto
- ✅ `rejectNegotiationAmount()` - Cliente rechaza el monto
- ✅ `createMensajeChatWithMedia()` - Crear mensaje con archivos adjuntos
- ✅ `getServiciosByNegociacionEstado()` - Filtrar por estado de negociación

---

## Fase 3: Frontend - Componentes de Chat

### 3.1 Chat Normal (Existente - Mejorar)
**Archivo:** `client/src/components/chat/ChatBox.tsx`

**Mejoras:**
- Mantener funcionalidad actual
- Añadir indicador de "escribiendo..."
- Mejorar visualización de mensajes leídos/no leídos
- Añadir soporte para mensajes de sistema

### 3.2 Chat de Negociación
**Archivo:** `client/src/components/chat/NegotiationChatBox.tsx`

**Funcionalidades:**
- Heredar base del ChatBox normal
- Añadir botón para subir fotos/videos
- Vista previa de archivos adjuntos
- Detección de monto en tiempo de escritura (para el chofer)
- Modal de confirmación cuando se detecta monto
- Mensajes especiales para montos (con diseño destacado)
- Botones de aceptar/rechazar para el cliente
- Indicador de estado de negociación

### 3.3 Componente de Propuesta de Monto (Chofer)
**Archivo:** `client/src/components/chat/AmountProposalCard.tsx`

**Diseño:**
```
┌─────────────────────────────────────┐
│  💰 Propuesta de Monto              │
│                                     │
│  Basado en la evaluación:           │
│  • Complejidad: Alta                │
│  • Situación: Vehículo en zanja     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  RD$ 5,500.00               │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ Editar ] [ Confirmar y Enviar ]  │
└─────────────────────────────────────┘
```

### 3.4 Componente de Respuesta de Monto (Cliente)
**Archivo:** `client/src/components/chat/AmountResponseCard.tsx`

**Diseño:**
```
┌─────────────────────────────────────┐
│  📋 Cotización del Servicio         │
│                                     │
│  El operador ha evaluado tu         │
│  situación y propone:               │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  RD$ 5,500.00               │    │
│  └─────────────────────────────┘    │
│                                     │
│  Notas: Vehículo en zanja profunda, │
│  requiere equipo especial.          │
│                                     │
│  [ Rechazar ] [ Aceptar Monto ]     │
└─────────────────────────────────────┘
```

### 3.5 Componente de Upload de Evidencia
**Archivo:** `client/src/components/chat/EvidenceUploader.tsx`

**Funcionalidades:**
- Captura de foto desde cámara
- Selección de galería
- Captura de video corto
- Vista previa antes de enviar
- Barra de progreso de subida
- Compresión automática de imágenes

---

## Fase 4: Frontend - Páginas y Flujos

### 4.1 Flujo de Solicitud de Extracción (Cliente)
**Archivo:** `client/src/pages/client/home.tsx`

**Cambios:**
- Añadir categoría "Extracción" al selector
- Cuando se selecciona extracción:
  - Mostrar mensaje: "Este servicio requiere evaluación"
  - Indicar que el precio se definirá tras evaluar
  - Solicitar descripción inicial de la situación
  - Permitir subir foto/video inicial (opcional)

### 4.2 Lista de Servicios Disponibles (Operador)
**Archivo:** `client/src/pages/driver/dashboard.tsx`

**Nuevo componente bajo el mapa:**
```
┌─────────────────────────────────────┐
│ 📋 Servicios Disponibles (3)        │
├─────────────────────────────────────┤
│ 🔴 #EXT-001 | Extracción            │
│    📍 Av. 27 de Febrero             │
│    ⏱️ Hace 25 min | 🚗 Toyota Camry │
│    [ Ver Detalles ] [ Tomar ]       │
├─────────────────────────────────────┤
│ 🟠 #REM-045 | Remolque Estándar     │
│    📍 C/ El Conde                   │
│    ⏱️ Hace 12 min | 🚗 Honda Civic  │
│    [ Ver Detalles ] [ Tomar ]       │
├─────────────────────────────────────┤
│ 🟢 #AUX-023 | Auxilio Vial          │
│    📍 Av. Lincoln                   │
│    ⏱️ Hace 2 min | 🏍️ Pasola       │
│    [ Ver Detalles ] [ Tomar ]       │
└─────────────────────────────────────┘
```

**Funcionalidades:**
- Lista scrollable debajo del mapa
- Ordenamiento por prioridad (color-coded)
- ID único visible (formato: CAT-XXX)
- Información clave: ubicación, tiempo, tipo vehículo
- Botón "Tomar" para servicios normales
- Botón "Ver y Evaluar" para servicios de extracción

### 4.3 Página de Evaluación de Extracción (Operador)
**Archivo:** `client/src/pages/driver/extraction-evaluation.tsx`

**Flujo:**
1. Ver fotos/videos enviados por cliente
2. Chat para solicitar más información
3. Enviar propias fotos de evaluación
4. Ingresar monto propuesto
5. Añadir notas de la situación
6. Confirmar y enviar cotización
7. Esperar respuesta del cliente

### 4.4 Página de Seguimiento con Negociación (Cliente)
**Archivo:** `client/src/pages/client/tracking.tsx`

**Cambios para servicios de extracción:**
- Mostrar estado de negociación
- Integrar chat de negociación
- Mostrar cotización recibida
- Botones para aceptar/rechazar
- Actualizar tracking cuando se acepte

---

## Fase 5: Notificaciones y Alertas

### 5.1 Notificaciones Push
**Archivo:** `server/push-service.ts`

**Nuevas notificaciones:**
- "El operador ha enviado una cotización"
- "El cliente ha aceptado tu cotización"
- "El cliente ha rechazado la cotización"
- "Nueva solicitud de extracción disponible"

### 5.2 Notificaciones In-App
**Componentes:**
- Toast para acciones inmediatas
- Badges en tabs de navegación
- Indicadores de mensajes no leídos

---

## Fase 6: Cambios Menores y Correcciones

### 6.1 Actualizar Descripción de Remolque Especializado
**Archivo:** `client/src/components/ServiceCategorySelector.tsx`

**Cambio:**
```typescript
// Antes:
{ id: 'remolque_especializado', label: 'Remolque Especializado', description: 'Vehículos especiales' }

// Después:
{ id: 'remolque_especializado', label: 'Remolque Especializado', description: 'Vehículos especiales o en situaciones complejas' }
```

---

## Fase 7: Testing y QA

### 7.1 Tests Unitarios
- Detector de montos
- Priorización de servicios
- Validación de estados de negociación

### 7.2 Tests de Integración
- Flujo completo de negociación
- WebSocket de negociación
- Subida de archivos

### 7.3 Tests E2E
- Cliente solicita extracción
- Operador evalúa y propone monto
- Cliente acepta/rechaza
- Servicio continúa o cancela

---

## Cronograma Sugerido

| Fase | Descripción | Estimación |
|------|-------------|------------|
| 1 | Schema y Base de Datos | 1-2 horas |
| 2 | Backend - API | 3-4 horas |
| 3 | Frontend - Componentes Chat | 4-5 horas |
| 4 | Frontend - Páginas y Flujos | 3-4 horas |
| 5 | Notificaciones | 1-2 horas |
| 6 | Cambios Menores | 30 min |
| 7 | Testing | 2-3 horas |

**Total estimado: 15-20 horas de desarrollo**

---

## Consideraciones Técnicas

### Diferencias entre Chat Normal y Chat de Negociación

| Aspecto | Chat Normal | Chat de Negociación |
|---------|-------------|---------------------|
| Cuándo inicia | Al aceptar servicio | Al solicitar extracción |
| Archivos | No soporta | Fotos y videos |
| Detección monto | No | Sí (automática) |
| Estados especiales | No | Propuesto, Confirmado, Aceptado, Rechazado |
| Mensajes sistema | Básicos | Cotizaciones, confirmaciones |
| Propósito | Coordinación | Evaluación y acuerdo de precio |

### Reutilización de Código
- `ChatBox.tsx` será base para `NegotiationChatBox.tsx`
- Hooks compartidos: `useWebSocket`, `useQuery`, `useMutation`
- Componentes UI: mismos de shadcn/ui
- Estilos: misma paleta de colores

### Seguridad
- Validación de montos en backend
- Solo el chofer puede proponer montos
- Solo el cliente puede aceptar/rechazar
- Límites de monto máximo/mínimo configurables
- Rate limiting en subida de archivos

---

## Archivos a Crear/Modificar

### Nuevos Archivos
```
server/services/chat-amount-detector.ts
server/services/service-priority.ts
client/src/components/chat/NegotiationChatBox.tsx
client/src/components/chat/AmountProposalCard.tsx
client/src/components/chat/AmountResponseCard.tsx
client/src/components/chat/EvidenceUploader.tsx
client/src/pages/driver/extraction-evaluation.tsx
migrations/XXXX_chat_negociacion.sql
```

### Archivos a Modificar
```
shared/schema.ts
server/routes.ts
server/websocket.ts
server/storage.ts
server/push-service.ts
client/src/components/chat/ChatBox.tsx
client/src/components/ServiceCategorySelector.tsx
client/src/pages/client/home.tsx
client/src/pages/client/tracking.tsx
client/src/pages/driver/dashboard.tsx
client/src/App.tsx (nueva ruta)
```

---

## Notas Adicionales

1. **Compatibilidad hacia atrás**: Los servicios existentes no se verán afectados
2. **Migración gradual**: Se puede implementar por fases
3. **Feature flags**: Considerar toggles para habilitar/deshabilitar funcionalidades
4. **Monitoreo**: Añadir logs para debugging de negociaciones

---

*Documento creado: Diciembre 2025*
*Última actualización: Diciembre 2025*
