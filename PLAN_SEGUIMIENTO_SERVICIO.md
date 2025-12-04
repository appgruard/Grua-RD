# Plan de Mejoras: Seguimiento de Servicio en Tiempo Real

## Resumen Ejecutivo

Este documento describe las mejoras necesarias para implementar un sistema de seguimiento en tiempo real completo, incluyendo detección automática de estados, validación por geofence, actualizaciones de ubicación cada 2-5 segundos, cálculo de ETA, y visualización de rutas en el mapa.

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

### Bugs Corregidos
- ✅ El endpoint `/api/drivers/active-service` ahora considera todos los estados activos

---

## NUEVAS FUNCIONALIDADES REQUERIDAS

### 1. Detección Automática de Estados Basada en Movimiento

El sistema debe detectar automáticamente el estado del operador basándose en su ubicación y movimiento:

| Situación | Estado a Mostrar | Lógica de Detección |
|-----------|------------------|---------------------|
| Conductor aceptó y se mueve hacia el origen | "En camino hacia ti" | Distancia al origen disminuye + velocidad > 0 |
| Conductor cerca del origen pero moviéndose lento/detenido | "El operador está llegando" | Distancia < 200m, velocidad < 5 km/h |
| Conductor en el punto de recogida sin moverse | "El operador está trabajando" | Distancia < 60m del origen, velocidad ≈ 0 por > 30 seg |
| Conductor se mueve hacia el destino | "Llevando tu vehículo al destino" | Estado `en_progreso` + distancia al destino disminuye |
| Conductor cerca del destino | "Llegando al destino" | Distancia < 200m del destino |

### 2. Validación por Geofence (50-60 metros)

El conductor **no puede marcar que está en el sitio** a menos que su ubicación esté dentro de un radio de 50-60 metros del punto de recogida.

```typescript
// Validación en endpoint /api/services/:id/arrived
const distanceToPickup = calculateDistance(
  driverLocation,
  { lat: servicio.origenLat, lng: servicio.origenLng }
);

if (distanceToPickup > 60) {
  return res.status(400).json({ 
    message: "Debes estar a menos de 60 metros del punto de recogida",
    distancia: distanceToPickup
  });
}
```

### 3. Actualizaciones de Ubicación Cada 2-5 Segundos

**Frontend del Conductor** (dashboard.tsx):
- Obtener ubicación GPS cada 2-5 segundos
- Enviar ubicación al servidor vía WebSocket
- Incluir velocidad y dirección (heading)

**Backend**:
- Recibir ubicaciones vía WebSocket
- Calcular velocidad si no está disponible
- Broadcast a clientes suscritos al servicio
- Guardar historial de ubicaciones

**Frontend del Cliente** (tracking.tsx):
- Recibir ubicaciones en tiempo real vía WebSocket
- Actualizar marcador del conductor en el mapa
- Actualizar ETA dinámicamente

### 4. Cálculo y Visualización de ETA

| Fase | ETA a Mostrar | Cálculo |
|------|---------------|---------|
| Conductor en camino al cliente | "Llega en ~X min" | Mapbox Directions API desde ubicación actual hasta origen |
| Conductor llevando vehículo al destino | "Tu vehículo llega en ~X min" | Mapbox Directions API desde ubicación actual hasta destino |

**Actualización**: Recalcular ETA cada 30 segundos o cada 500 metros recorridos.

### 5. Visualización de Ruta en el Mapa

El cliente debe ver:
- **Línea de ruta**: Trayecto desde conductor hasta punto objetivo (origen o destino)
- **Marcador del conductor**: Posición en tiempo real con icono de grúa
- **Marcador de origen**: Punto de recogida del vehículo
- **Marcador de destino**: Punto de entrega del vehículo
- **Actualización**: Redibujar ruta cuando el conductor se desvíe significativamente

---

## Arquitectura de la Solución

### Flujo de Datos de Ubicación

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Conductor     │        │     Server      │        │    Cliente      │
│   (GPS App)     │        │   (WebSocket)   │        │   (Tracking)    │
└────────┬────────┘        └────────┬────────┘        └────────┬────────┘
         │                          │                          │
         │  location_update         │                          │
         │  (cada 2-5 seg)          │                          │
         ├─────────────────────────>│                          │
         │                          │                          │
         │                          │  driver_location         │
         │                          │  (broadcast)             │
         │                          ├─────────────────────────>│
         │                          │                          │
         │                          │                          │  Actualizar mapa
         │                          │                          │  Recalcular ETA
         │                          │                          │
```

### Estructura de Mensajes WebSocket

```typescript
// Conductor → Server
{
  type: 'location_update',
  payload: {
    serviceId: string,
    lat: number,
    lng: number,
    speed: number,        // km/h
    heading: number,      // 0-360 grados
    timestamp: number,
    accuracy: number      // metros
  }
}

// Server → Cliente
{
  type: 'driver_location',
  payload: {
    lat: number,
    lng: number,
    speed: number,
    heading: number,
    timestamp: number,
    eta: number,                    // minutos estimados
    distanceRemaining: number,      // metros
    driverStatus: string,           // "en_camino" | "trabajando" | "en_ruta_destino"
    statusMessage: string           // "El operador está trabajando"
  }
}

// Server → Cliente (cambio de estado)
{
  type: 'service_status_change',
  payload: {
    serviceId: string,
    estado: string,
    timestamp: number,
    statusMessage: string
  }
}
```

---

## Plan de Implementación

### Fase 1: Backend - Infraestructura de Tiempo Real

#### 1.1 Mejorar Sistema WebSocket para Ubicaciones Frecuentes

**Archivo**: `server/routes.ts`

```typescript
// Nuevo handler para location_update
case 'location_update': {
  const { serviceId, lat, lng, speed, heading, timestamp, accuracy } = data.payload;
  
  // Guardar ubicación
  await storage.saveDriverLocation(serviceId, {
    lat, lng, speed, heading, timestamp, accuracy
  });
  
  // Calcular estado automático
  const driverStatus = await calculateDriverStatus(serviceId, lat, lng, speed);
  
  // Calcular ETA
  const eta = await calculateETA(serviceId, lat, lng);
  
  // Broadcast a clientes
  if (serviceSessions.has(serviceId)) {
    const broadcast = JSON.stringify({
      type: 'driver_location',
      payload: {
        lat, lng, speed, heading, timestamp,
        eta: eta.minutes,
        distanceRemaining: eta.distance,
        driverStatus: driverStatus.status,
        statusMessage: driverStatus.message
      }
    });
    serviceSessions.get(serviceId)!.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(broadcast);
      }
    });
  }
  break;
}
```

#### 1.2 Validación Geofence para Llegada

**Archivo**: `server/routes.ts`

```typescript
app.post("/api/services/:id/arrived", async (req, res) => {
  const { lat, lng } = req.body; // Ubicación actual del conductor
  
  const servicio = await storage.getServicioById(req.params.id);
  
  // Calcular distancia al punto de recogida
  const distance = calculateHaversineDistance(
    { lat, lng },
    { lat: servicio.origenLat, lng: servicio.origenLng }
  );
  
  if (distance > 60) {
    return res.status(400).json({
      success: false,
      message: `Debes estar a menos de 60 metros del punto de recogida. Distancia actual: ${Math.round(distance)}m`,
      distancia: distance,
      required: 60
    });
  }
  
  // Proceder con la actualización...
});
```

#### 1.3 Función de Cálculo de Distancia (Haversine)

**Archivo**: `server/utils/geo.ts` (nuevo)

```typescript
export function calculateHaversineDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en metros
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

#### 1.4 Función de Detección Automática de Estado

**Archivo**: `server/utils/driver-status.ts` (nuevo)

```typescript
interface DriverStatusResult {
  status: 'en_camino' | 'llegando' | 'trabajando' | 'en_ruta_destino' | 'llegando_destino';
  message: string;
}

export async function calculateDriverStatus(
  serviceId: string,
  lat: number,
  lng: number,
  speed: number
): Promise<DriverStatusResult> {
  const servicio = await storage.getServicioById(serviceId);
  
  const distanceToOrigin = calculateHaversineDistance(
    { lat, lng },
    { lat: servicio.origenLat, lng: servicio.origenLng }
  );
  
  const distanceToDestination = calculateHaversineDistance(
    { lat, lng },
    { lat: servicio.destinoLat, lng: servicio.destinoLng }
  );
  
  // Estado: aceptado - conductor en camino al origen
  if (servicio.estado === 'aceptado') {
    if (distanceToOrigin < 200 && speed < 5) {
      return { status: 'llegando', message: 'El operador está llegando' };
    }
    return { status: 'en_camino', message: 'El operador viene en camino' };
  }
  
  // Estado: conductor_en_sitio o cargando - trabajando en el vehículo
  if (servicio.estado === 'conductor_en_sitio' || servicio.estado === 'cargando') {
    if (distanceToOrigin < 60 && speed < 2) {
      return { status: 'trabajando', message: 'El operador está trabajando' };
    }
    return { status: 'trabajando', message: 'El operador está en el sitio' };
  }
  
  // Estado: en_progreso - llevando vehículo al destino
  if (servicio.estado === 'en_progreso') {
    if (distanceToDestination < 200) {
      return { status: 'llegando_destino', message: 'Llegando al destino' };
    }
    return { status: 'en_ruta_destino', message: 'Llevando tu vehículo al destino' };
  }
  
  return { status: 'en_camino', message: 'En servicio' };
}
```

### Fase 2: Frontend del Conductor - Envío de Ubicación

#### 2.1 Hook de Geolocalización Continua

**Archivo**: `client/src/hooks/useDriverLocation.ts` (nuevo)

```typescript
import { useEffect, useRef, useCallback } from 'react';

interface LocationData {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  timestamp: number;
}

export function useDriverLocation(
  serviceId: string | null,
  ws: WebSocket | null,
  intervalMs: number = 3000 // 3 segundos por defecto
) {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  
  const sendLocation = useCallback((position: GeolocationPosition) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !serviceId) return;
    
    const now = Date.now();
    if (now - lastSentRef.current < intervalMs) return;
    lastSentRef.current = now;
    
    const locationData: LocationData = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: position.coords.speed ? position.coords.speed * 3.6 : 0, // m/s a km/h
      heading: position.coords.heading,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
    
    ws.send(JSON.stringify({
      type: 'location_update',
      payload: {
        serviceId,
        ...locationData
      }
    }));
  }, [ws, serviceId, intervalMs]);
  
  useEffect(() => {
    if (!serviceId || !ws) return;
    
    // Iniciar tracking de alta precisión
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (error) => console.error('Geolocation error:', error),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [serviceId, ws, sendLocation]);
}
```

#### 2.2 Integración en Dashboard del Conductor

**Archivo**: `client/src/pages/driver/dashboard.tsx`

```typescript
// Agregar al componente del conductor
const { ws } = useWebSocket(); // Conexión WebSocket existente

// Activar tracking cuando hay servicio activo
useDriverLocation(
  activeService?.id || null,
  ws,
  3000 // Enviar cada 3 segundos
);
```

#### 2.3 Validación de Geofence en UI del Conductor

Mostrar distancia restante antes de poder marcar llegada:

```typescript
// En el botón "He llegado"
const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
const distanceToPickup = currentLocation 
  ? calculateDistance(currentLocation, { lat: service.origenLat, lng: service.origenLng })
  : null;

<Button 
  onClick={handleArrived}
  disabled={!distanceToPickup || distanceToPickup > 60}
>
  {distanceToPickup && distanceToPickup > 60 
    ? `Acércate al punto (${Math.round(distanceToPickup)}m)`
    : 'He llegado'
  }
</Button>
```

### Fase 3: Frontend del Cliente - Tracking en Tiempo Real

#### 3.1 Mejoras en tracking.tsx

**Archivo**: `client/src/pages/client/tracking.tsx`

```typescript
// Estado para ubicación del conductor y ETA
const [driverLocation, setDriverLocation] = useState<{
  lat: number;
  lng: number;
  speed: number;
  eta: number;
  statusMessage: string;
} | null>(null);

// Escuchar actualizaciones de ubicación
useEffect(() => {
  if (!ws) return;
  
  const handleMessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'driver_location') {
      setDriverLocation({
        lat: data.payload.lat,
        lng: data.payload.lng,
        speed: data.payload.speed,
        eta: data.payload.eta,
        statusMessage: data.payload.statusMessage
      });
    }
    
    if (data.type === 'service_status_change') {
      // Refetch service data
      refetchService();
    }
  };
  
  ws.addEventListener('message', handleMessage);
  return () => ws.removeEventListener('message', handleMessage);
}, [ws]);
```

#### 3.2 Componente de Mapa con Ruta

```typescript
// Mostrar ruta en el mapa usando Mapbox Directions
useEffect(() => {
  if (!driverLocation || !map) return;
  
  // Determinar destino según estado
  const destination = service.estado === 'en_progreso'
    ? { lat: service.destinoLat, lng: service.destinoLng }
    : { lat: service.origenLat, lng: service.origenLng };
  
  // Obtener ruta de Mapbox
  fetchRoute(driverLocation, destination).then(route => {
    // Actualizar línea de ruta en el mapa
    updateRouteLayer(map, route);
  });
}, [driverLocation, service.estado]);
```

#### 3.3 Componente de Estado y ETA

```typescript
<Card className="p-4">
  <div className="flex items-center gap-3">
    <div className="animate-pulse">
      <Truck className="w-8 h-8 text-primary" />
    </div>
    <div>
      <p className="font-semibold text-lg">{driverLocation?.statusMessage}</p>
      <p className="text-muted-foreground">
        {driverLocation?.eta 
          ? `Llegada estimada en ${driverLocation.eta} minutos`
          : 'Calculando tiempo de llegada...'
        }
      </p>
    </div>
  </div>
</Card>
```

### Fase 4: Integración con Mapbox Directions API

#### 4.1 Servicio de Rutas y ETA

**Archivo**: `server/services/mapbox-directions.ts` (nuevo)

```typescript
interface DirectionsResult {
  duration: number;     // segundos
  distance: number;     // metros
  geometry: string;     // encoded polyline
}

export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<DirectionsResult> {
  const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}&geometries=polyline`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found');
  }
  
  return {
    duration: data.routes[0].duration,
    distance: data.routes[0].distance,
    geometry: data.routes[0].geometry
  };
}

export function calculateETAMinutes(durationSeconds: number): number {
  return Math.ceil(durationSeconds / 60);
}
```

---

## Timestamps y Schema

### Agregar Campos Faltantes

**Archivo**: `shared/schema.ts`

```typescript
// Agregar a la tabla servicios:
conductorEnSitioAt: timestamp("conductor_en_sitio_at"),
cargandoAt: timestamp("cargando_at"),

// Mejorar tabla ubicaciones_tracking:
speed: real("speed"),           // km/h
heading: real("heading"),       // 0-360 grados
accuracy: real("accuracy"),     // metros
```

---

## WebSocket Broadcasts Faltantes

Agregar broadcast a todos los endpoints de cambio de estado:

| Endpoint | Acción Requerida |
|----------|------------------|
| `/arrived` | Agregar WebSocket broadcast |
| `/loading` | Agregar WebSocket broadcast |
| `/start` | Agregar WebSocket broadcast |
| `/complete` | Agregar WebSocket broadcast |

---

## Priorización Final

### ALTA PRIORIDAD
1. ✅ Fix: Estados intermedios en servicio activo (COMPLETADO)
2. 🔴 Validación geofence (50-60m) para marcar llegada
3. 🔴 Actualizaciones de ubicación cada 2-5 segundos
4. 🔴 WebSocket broadcasts en todos los endpoints de estado
5. 🔴 Detección automática de estado basada en movimiento
6. 🔴 Mostrar ubicación del conductor en tiempo real al cliente

### MEDIA PRIORIDAD
7. 🟡 Cálculo y visualización de ETA
8. 🟡 Visualización de ruta en el mapa
9. 🟡 Timestamps faltantes (conductorEnSitioAt, cargandoAt)

### BAJA PRIORIDAD
10. 🟢 Mejoras en notificaciones push
11. 🟢 Timeline visual del servicio
12. 🟢 Historial detallado de ubicaciones

---

## Archivos a Crear/Modificar

### Nuevos Archivos
- `server/utils/geo.ts` - Funciones de geolocalización
- `server/utils/driver-status.ts` - Detección automática de estado
- `server/services/mapbox-directions.ts` - Integración con Mapbox
- `client/src/hooks/useDriverLocation.ts` - Hook de tracking del conductor

### Archivos a Modificar
- `server/routes.ts` - WebSocket handlers, validación geofence
- `shared/schema.ts` - Nuevos campos de timestamp
- `client/src/pages/driver/dashboard.tsx` - Envío de ubicación
- `client/src/pages/client/tracking.tsx` - Recepción de ubicación, mapa, ETA

---

## Estimación de Tiempo Actualizada

| Fase | Descripción | Tiempo |
|------|-------------|--------|
| Fase 1 | Backend: WebSocket, Geofence, Status | 3-4 horas |
| Fase 2 | Conductor: Envío ubicación | 2 horas |
| Fase 3 | Cliente: Tracking tiempo real | 3-4 horas |
| Fase 4 | Mapbox: Rutas y ETA | 2-3 horas |

**Total estimado**: 10-13 horas de desarrollo

---

## Métricas de Éxito

1. **Latencia de ubicación**: < 5 segundos entre conductor y cliente
2. **Precisión de ETA**: ±3 minutos del tiempo real
3. **Validación geofence**: 100% de llegadas verificadas
4. **Satisfacción del cliente**: Reducción de llamadas "¿dónde está el conductor?"
