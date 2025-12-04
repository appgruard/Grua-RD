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

## Fase 3: Frontend - Componentes de Chat ✅ COMPLETADA (4 Dic 2025)

### 3.1 Chat Normal (Existente - Mejorado) ✅
**Archivo:** `client/src/components/chat/ChatBox.tsx`

**Mejoras implementadas:**
- ✅ Mantiene funcionalidad actual de chat básico
- ✅ Indicador de "escribiendo..." con animación de puntos
- ✅ Visualización de mensajes leídos/no leídos con íconos Check/CheckCheck
- ✅ Badge contador de mensajes no leídos
- ✅ Soporte para mensajes de sistema (centrados con estilo distintivo)
- ✅ Soporte para mensajes de tipo monto (propuesto, confirmado, aceptado, rechazado)
- ✅ Soporte para mensajes con archivos adjuntos (imagen/video)
- ✅ Indicador de conexión WebSocket (punto verde/rojo)
- ✅ Componente MessageBubble modular para diferentes tipos de mensaje

### 3.2 Chat de Negociación ✅
**Archivo:** `client/src/components/chat/NegotiationChatBox.tsx`

**Funcionalidades implementadas:**
- ✅ Integración con componentes ChatBox mejorado
- ✅ Sistema de tabs (Chat / Cotización) para organizar la interfaz
- ✅ Botones para subir fotos/videos integrados en el footer
- ✅ Vista previa de archivos adjuntos en mensajes
- ✅ Mensajes especiales para montos con diseño destacado y colores semánticos
- ✅ Integración con AmountProposalCard (para conductor)
- ✅ Integración con AmountResponseCard (para cliente)
- ✅ Badge de estado de negociación en header
- ✅ Mensajes rápidos específicos para negociación
- ✅ Indicador de escritura en tiempo real
- ✅ Manejo de eventos WebSocket para actualizaciones en tiempo real

### 3.3 Componente de Propuesta de Monto (Chofer) ✅
**Archivo:** `client/src/components/chat/AmountProposalCard.tsx`

**Funcionalidades implementadas:**
- ✅ Input de monto con formato RD$ y validación (min 500, max 500,000)
- ✅ Campo de notas de evaluación
- ✅ Visualización de descripción del cliente
- ✅ Badge de tipo de extracción
- ✅ Estados: pendiente_evaluacion, propuesto, confirmado, aceptado, rechazado
- ✅ Botón "Editar" para modificar propuesta antes de confirmar
- ✅ Botón "Enviar Propuesta" / "Confirmar Cotización"
- ✅ Estados visuales para aceptado (verde) y rechazado (rojo)
- ✅ Integración con API de negociación

### 3.4 Componente de Respuesta de Monto (Cliente) ✅
**Archivo:** `client/src/components/chat/AmountResponseCard.tsx`

**Funcionalidades implementadas:**
- ✅ Vista de monto propuesto con diseño destacado
- ✅ Notas del operador visibles
- ✅ Estados: pendiente_evaluacion, propuesto, confirmado, aceptado, rechazado
- ✅ Botones "Aceptar" / "Rechazar" (solo en estado confirmado)
- ✅ Dialog de confirmación antes de rechazar
- ✅ Estados visuales según el progreso de negociación
- ✅ Mensaje de advertencia sobre implicaciones de aceptar
- ✅ Integración con API de negociación

### 3.5 Componente de Upload de Evidencia ✅
**Archivo:** `client/src/components/chat/EvidenceUploader.tsx`

**Funcionalidades implementadas:**
- ✅ Captura de foto desde cámara (input capture="environment")
- ✅ Selección de galería
- ✅ Captura de video
- ✅ Vista previa antes de enviar (imagen y video)
- ✅ Barra de progreso de subida
- ✅ Validación de tipos de archivo (JPEG, PNG, GIF, WebP, MP4, MOV, WebM)
- ✅ Límite de tamaño 10MB con mensaje de error
- ✅ Modo compacto para integrar en el footer del chat
- ✅ Modo completo para sección dedicada
- ✅ Botón para eliminar selección antes de enviar

---

## Fase 4: Frontend - Páginas y Flujos ✅ COMPLETADA (4 Dic 2025)

### 4.1 Flujo de Solicitud de Extracción (Cliente) ✅
**Archivo:** `client/src/pages/client/home.tsx`

**Implementado:**
- ✅ Categoría "Extracción" disponible en ServiceCategorySelector
- ✅ Subtipos de extracción en ServiceSubtypeSelector:
  - zanja, lodo, volcado, accidente, dificil
- ✅ Al seleccionar extracción:
  - Flujo especial sin paso de precios
  - Descripción de la situación obligatoria
  - Mensaje indicando que se requiere evaluación
  - Flag requiereNegociacion = true automático
  - estadoNegociacion = 'pendiente_evaluacion' automático

### 4.2 Lista de Servicios Disponibles (Operador) ✅
**Archivo:** `client/src/pages/driver/dashboard.tsx`

**Implementado:**
- ✅ Lista scrollable de solicitudes cercanas bajo el mapa
- ✅ Para servicios de extracción:
  - Badge "Requiere Negociación" en color ámbar
  - Muestra descripción de la situación (truncada)
  - Precio muestra "Por negociar" en lugar de monto fijo
  - Botón "Ver y Evaluar" (navega a extraction-evaluation)
- ✅ Para servicios normales:
  - Muestra precio calculado
  - Botón "Aceptar" directo
- ✅ Drawer de chat usa NegotiationChatBox para servicios de negociación
- ✅ Card de servicio activo muestra info de extracción y monto negociado

### 4.3 Página de Evaluación de Extracción (Operador) ✅
**Archivo:** `client/src/pages/driver/extraction-evaluation.tsx`

**Implementado:**
- ✅ Vista de mapa con ubicación del vehículo
- ✅ Card con ubicación y dirección
- ✅ Card con tipo de vehículo y subtipo de extracción
- ✅ Card destacado con descripción de la situación (fondo ámbar)
- ✅ Card de cliente con nombre
- ✅ Input de monto propuesto con validación
- ✅ Botón "Aceptar y Enviar Propuesta" que:
  - Acepta el servicio
  - Envía propuesta de monto
  - Redirige al dashboard
- ✅ Vista de monto acordado (cuando existe)
- ✅ Botón para abrir chat de negociación
- ✅ NegotiationChatBox integrado
- ✅ Ruta: `/driver/extraction-evaluation/:id`

### 4.4 Página de Seguimiento con Negociación (Cliente) ✅
**Archivo:** `client/src/pages/client/tracking.tsx`

**Implementado:**
- ✅ Detección automática de servicios de negociación
- ✅ Badge de estado de negociación con colores semánticos
- ✅ Muestra monto negociado cuando está disponible
- ✅ Card especial para servicios de extracción (fondo ámbar)
- ✅ Drawer usa NegotiationChatBox para servicios de negociación
- ✅ Título del drawer cambia según tipo de servicio

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
