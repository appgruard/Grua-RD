# Plan de Mejoras: Seguimiento de Servicio

## Resumen Ejecutivo

Este documento describe las mejoras necesarias para dar seguimiento completo al flujo de servicio desde que el conductor indica que está en el sitio hasta la finalización del servicio.

---

## Estado Actual del Flujo

### Estados del Servicio
1. `pendiente` - Solicitud creada, esperando conductor
2. `aceptado` - Conductor aceptó el servicio
3. `conductor_en_sitio` - Conductor llegó al punto de recogida
4. `cargando` - Conductor está cargando el vehículo
5. `en_progreso` - Conductor en ruta al destino
6. `completado` - Servicio finalizado
7. `cancelado` - Servicio cancelado

### Problemas Identificados

#### 1. Bug Corregido: Servicio Activo No Se Mostraba
- **Problema**: El endpoint `/api/drivers/active-service` solo consideraba estados `aceptado` y `en_progreso`
- **Solución Aplicada**: Se agregaron los estados `conductor_en_sitio` y `cargando` a la verificación

#### 2. WebSocket Broadcasts Faltantes
| Endpoint | WebSocket | Push Notification | Estado |
|----------|-----------|-------------------|--------|
| `/accept` | ✅ Sí | ✅ Sí | Correcto |
| `/arrived` | ❌ No | ✅ Sí | **Problema** |
| `/loading` | ❌ No | ✅ Sí | **Problema** |
| `/start` | ❌ No | ✅ Sí | **Problema** |
| `/complete` | ❌ No | ✅ Sí | **Problema** |

**Impacto**: El cliente solo recibe actualizaciones en tiempo real del estado `aceptado`. Para los demás estados, debe esperar al polling (cada 10 segundos) o depender de notificaciones push.

#### 3. Timestamps No Registrados
| Campo | Estado | Existe |
|-------|--------|--------|
| `aceptadoAt` | aceptado | ✅ Sí |
| `conductorEnSitioAt` | conductor_en_sitio | ❌ No |
| `cargandoAt` | cargando | ❌ No |
| `iniciadoAt` | en_progreso | ✅ Sí |
| `completadoAt` | completado | ✅ Sí |

**Impacto**: No hay registro histórico de cuándo ocurrieron las fases intermedias.

#### 4. Sin Feedback Visual Mejorado
- No hay indicador de progreso visual (timeline/stepper)
- No hay ETA estimado de llegada
- No hay distancia restante al destino
- No hay notificación de "conductor llegó al destino"

---

## Plan de Implementación

### Fase 1: Correcciones Críticas (Backend)

#### 1.1 Agregar WebSocket Broadcasts a Todos los Endpoints de Estado

**Archivos a modificar**: `server/routes.ts`

```typescript
// Agregar a /api/services/:id/arrived
if (serviceSessions.has(servicio.id)) {
  const broadcast = JSON.stringify({
    type: 'service_status_change',
    payload: servicio,
  });
  serviceSessions.get(servicio.id)!.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(broadcast);
    }
  });
}

// Repetir para /loading, /start, /complete
```

#### 1.2 Agregar Timestamps Faltantes

**Archivos a modificar**: `shared/schema.ts`, `server/routes.ts`

```typescript
// En schema.ts - Agregar campos a la tabla servicios:
conductorEnSitioAt: timestamp("conductor_en_sitio_at"),
cargandoAt: timestamp("cargando_at"),

// En routes.ts - Actualizar endpoints:
// /arrived
const servicio = await storage.updateServicio(req.params.id, {
  estado: 'conductor_en_sitio',
  conductorEnSitioAt: new Date(),
});

// /loading
const servicio = await storage.updateServicio(req.params.id, {
  estado: 'cargando',
  cargandoAt: new Date(),
});
```

#### 1.3 Agregar Nuevo Endpoint: Llegada al Destino

```typescript
app.post("/api/services/:id/arrived-destination", async (req, res) => {
  // Marcar que el conductor llegó al destino
  // Enviar notificación al cliente
  // WebSocket broadcast
});
```

### Fase 2: Mejoras de UI del Cliente

#### 2.1 Componente de Timeline/Progreso

Crear un componente visual que muestre el progreso del servicio:

```
[✓] Conductor aceptó      ─────────────────────────────────────
    3:06 PM

[✓] Conductor en sitio    ─────────────────────────────────────
    3:15 PM

[○] Cargando vehículo     ─────────────────────────────────────
    En progreso...

[ ] En ruta al destino    ─────────────────────────────────────
    

[ ] Servicio completado   ─────────────────────────────────────
```

**Archivo a crear**: `client/src/components/ServiceTimeline.tsx`

#### 2.2 Mejoras en la Página de Tracking

**Archivo a modificar**: `client/src/pages/client/tracking.tsx`

- Agregar componente ServiceTimeline
- Mostrar ETA estimado cuando el conductor está en ruta
- Mostrar distancia restante (usando ubicación del conductor)
- Mejorar badges de estado con iconos animados

#### 2.3 Notificaciones Visuales en la App

- Toast notifications cuando cambia el estado
- Indicador de "última actualización"
- Animación de pulso en el marcador del conductor

### Fase 3: Mejoras Adicionales

#### 3.1 Cálculo de ETA

```typescript
// Calcular ETA basado en ubicación actual del conductor y destino
function calculateETA(driverLocation: Coordinates, destination: Coordinates): number {
  // Usar Mapbox Directions API
  // Retornar minutos estimados
}
```

#### 3.2 Historial de Ubicaciones

Mejorar la tabla `ubicaciones_tracking` para guardar más información:
- Velocidad estimada
- Dirección (heading)
- Timestamp más preciso

#### 3.3 Notificaciones Push Mejoradas

| Estado | Notificación Actual | Notificación Propuesta |
|--------|---------------------|------------------------|
| conductor_en_sitio | "El conductor ha llegado al punto de origen" | "Juan Pérez ha llegado. Prepara tu vehículo." |
| cargando | "El conductor está cargando tu vehículo" | "Tu vehículo está siendo cargado. ETA al destino: ~25 min" |
| en_progreso | "El conductor va en camino al destino" | "En ruta a Santo Domingo. Llegada estimada: 3:45 PM" |
| llegado_destino | (No existe) | "El conductor ha llegado al destino con tu vehículo" |
| completado | "Tu vehículo ha sido entregado" | "Servicio completado. Por favor califica a Juan Pérez" |

#### 3.4 Confirmación de Entrega

Agregar un paso de confirmación donde:
1. Conductor marca que llegó al destino
2. Cliente confirma recepción del vehículo
3. Ambas confirmaciones completan el servicio

### Fase 4: Dashboard del Administrador

#### 4.1 Vista de Servicios en Tiempo Real

- Mapa con todos los servicios activos
- Lista de servicios por estado
- Métricas de tiempo promedio por fase

#### 4.2 Alertas Automáticas

- Servicio en estado `cargando` por más de 30 minutos
- Conductor sin actualizar ubicación por más de 5 minutos
- Servicio sin progreso por tiempo prolongado

---

## Priorización

### Alta Prioridad (Implementar Primero)
1. ✅ Fix: Considerar estados intermedios en servicio activo (COMPLETADO)
2. Agregar WebSocket broadcasts a todos los endpoints de estado
3. Agregar timestamps faltantes (conductorEnSitioAt, cargandoAt)
4. Componente ServiceTimeline en tracking.tsx

### Media Prioridad
5. Mejorar notificaciones push con más contexto
6. Agregar endpoint de llegada al destino
7. Calcular y mostrar ETA

### Baja Prioridad
8. Confirmación de entrega bilateral
9. Dashboard de administrador en tiempo real
10. Alertas automáticas

---

## Estimación de Tiempo

| Fase | Tareas | Tiempo Estimado |
|------|--------|-----------------|
| Fase 1 | Backend fixes | 2-3 horas |
| Fase 2 | UI improvements | 3-4 horas |
| Fase 3 | Additional features | 4-6 horas |
| Fase 4 | Admin dashboard | 6-8 horas |

**Total estimado**: 15-21 horas de desarrollo

---

## Archivos Afectados

### Backend
- `server/routes.ts` - Endpoints de estado
- `server/push-service.ts` - Notificaciones
- `shared/schema.ts` - Modelo de datos

### Frontend
- `client/src/pages/client/tracking.tsx` - Página de seguimiento
- `client/src/pages/driver/dashboard.tsx` - Dashboard del conductor
- `client/src/components/ServiceTimeline.tsx` - Nuevo componente
- `client/src/components/ETADisplay.tsx` - Nuevo componente

---

## Métricas de Éxito

1. **Tiempo de actualización UI**: < 1 segundo después del cambio de estado
2. **Satisfacción del cliente**: Encuesta post-servicio sobre claridad del seguimiento
3. **Reducción de consultas**: Menos llamadas al conductor preguntando "¿dónde estás?"
4. **Tasa de calificación**: Aumento en servicios calificados por mejor UX

---

## Próximos Pasos

Esperando instrucciones para comenzar la implementación de las mejoras priorizadas.
