# GruaRD API Documentation

Documentación completa de la API REST y WebSocket del sistema GruaRD.

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [Servicios](#servicios)
- [Conductores](#conductores)
- [Administración](#administración)
- [Tarifas](#tarifas)
- [Mapas](#mapas)
- [WebSocket](#websocket)
- [Tipos de Datos](#tipos-de-datos)
- [Códigos de Estado](#códigos-de-estado)

---

## Autenticación

Todos los endpoints requieren autenticación mediante sesiones de Express excepto `/api/auth/register` y `/api/auth/login`.

### POST /api/auth/register

Registra un nuevo usuario en el sistema.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura",
  "nombre": "Juan",
  "apellido": "Pérez",
  "phone": "+1-809-555-0100",
  "userType": "cliente",
  "conductorData": {
    "licencia": "ABC123456",
    "placaGrua": "A123456",
    "marcaGrua": "Ford",
    "modeloGrua": "F-350"
  }
}
```

**Campos:**
- `email` (string, required): Email único del usuario
- `password` (string, required): Contraseña
- `nombre` (string, required): Nombre del usuario
- `apellido` (string, required): Apellido del usuario
- `phone` (string, optional): Teléfono del usuario
- `userType` (enum, required): Tipo de usuario - `"cliente"`, `"conductor"`, o `"admin"`
- `conductorData` (object, optional): Requerido solo si `userType` es `"conductor"`

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "userType": "cliente",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Email ya registrado
- `500` - Error en el registro

---

### POST /api/auth/login

Inicia sesión de un usuario.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "userType": "cliente"
  }
}
```

**Errors:**
- `401` - Credenciales inválidas

---

### POST /api/auth/logout

Cierra la sesión del usuario actual.

**Response (200):**
```json
{
  "message": "Logged out"
}
```

---

### GET /api/auth/me

Obtiene los datos del usuario autenticado.

**Response (200):**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "userType": "cliente",
  "calificacionPromedio": "4.5"
}
```

**Errors:**
- `401` - No autenticado

---

## Servicios

### POST /api/services/request

Crea una nueva solicitud de servicio de grúa.

**Requiere:** Autenticación (cliente)

**Request Body:**
```json
{
  "origenLat": 18.4861,
  "origenLng": -69.9312,
  "origenDireccion": "Calle Principal #123, Santo Domingo",
  "destinoLat": 18.4700,
  "destinoLng": -69.8900,
  "destinoDireccion": "Av. Venezuela #456, Santo Domingo",
  "distanciaKm": 5.2,
  "costoTotal": 350.00,
  "metodoPago": "efectivo"
}
```

**Campos:**
- `origenLat` (decimal, required): Latitud del origen
- `origenLng` (decimal, required): Longitud del origen
- `origenDireccion` (string, required): Dirección legible del origen
- `destinoLat` (decimal, required): Latitud del destino
- `destinoLng` (decimal, required): Longitud del destino
- `destinoDireccion` (string, required): Dirección legible del destino
- `distanciaKm` (decimal, required): Distancia en kilómetros
- `costoTotal` (decimal, required): Costo total del servicio
- `metodoPago` (enum, required): `"efectivo"` o `"tarjeta"`

**Response (200):**
```json
{
  "id": "uuid",
  "clienteId": "uuid",
  "conductorId": null,
  "origenLat": "18.4861",
  "origenLng": "-69.9312",
  "origenDireccion": "Calle Principal #123, Santo Domingo",
  "destinoLat": "18.4700",
  "destinoLng": "-69.8900",
  "destinoDireccion": "Av. Venezuela #456, Santo Domingo",
  "distanciaKm": "5.2",
  "costoTotal": "350.00",
  "estado": "pendiente",
  "metodoPago": "efectivo",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

**Nota:** Al crear un servicio, se envía automáticamente una notificación WebSocket a todos los conductores disponibles.

---

### GET /api/services/:id

Obtiene los detalles de un servicio específico.

**Requiere:** Autenticación

**Response (200):**
```json
{
  "id": "uuid",
  "clienteId": "uuid",
  "conductorId": "uuid",
  "origenLat": "18.4861",
  "origenLng": "-69.9312",
  "origenDireccion": "Calle Principal #123",
  "destinoLat": "18.4700",
  "destinoLng": "-69.8900",
  "destinoDireccion": "Av. Venezuela #456",
  "distanciaKm": "5.2",
  "costoTotal": "350.00",
  "estado": "aceptado",
  "metodoPago": "efectivo",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "aceptadoAt": "2025-01-01T00:05:00.000Z",
  "conductor": {
    "nombre": "Pedro",
    "apellido": "García",
    "calificacionPromedio": "4.8"
  }
}
```

**Errors:**
- `404` - Servicio no encontrado

---

### GET /api/services/my-services

Obtiene todos los servicios del usuario actual.

**Requiere:** Autenticación (cliente o conductor)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "estado": "completado",
    "costoTotal": "350.00",
    "distanciaKm": "5.2",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "completadoAt": "2025-01-01T00:30:00.000Z"
  }
]
```

---

### POST /api/services/:id/accept

Acepta una solicitud de servicio (solo conductores).

**Requiere:** Autenticación (conductor)

**Response (200):**
```json
{
  "id": "uuid",
  "conductorId": "uuid",
  "estado": "aceptado",
  "aceptadoAt": "2025-01-01T00:05:00.000Z"
}
```

**Nota:** Al aceptar un servicio, se envía una notificación WebSocket al cliente.

---

### POST /api/services/:id/start

Inicia un servicio aceptado (solo conductores).

**Requiere:** Autenticación (conductor)

**Response (200):**
```json
{
  "id": "uuid",
  "estado": "en_progreso",
  "iniciadoAt": "2025-01-01T00:10:00.000Z"
}
```

---

### POST /api/services/:id/complete

Completa un servicio en progreso (solo conductores).

**Requiere:** Autenticación (conductor)

**Response (200):**
```json
{
  "id": "uuid",
  "estado": "completado",
  "completadoAt": "2025-01-01T00:30:00.000Z"
}
```

---

## Conductores

### GET /api/drivers/me

Obtiene los datos del conductor actual.

**Requiere:** Autenticación (conductor)

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "licencia": "ABC123456",
  "placaGrua": "A123456",
  "marcaGrua": "Ford",
  "modeloGrua": "F-350",
  "disponible": true,
  "ubicacionLat": "18.4861",
  "ubicacionLng": "-69.9312",
  "ultimaUbicacionUpdate": "2025-01-01T00:00:00.000Z"
}
```

---

### PUT /api/drivers/availability

Actualiza la disponibilidad del conductor.

**Requiere:** Autenticación (conductor)

**Request Body:**
```json
{
  "disponible": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "disponible": true
}
```

---

### PUT /api/drivers/location

Actualiza la ubicación del conductor.

**Requiere:** Autenticación (conductor)

**Request Body:**
```json
{
  "lat": 18.4861,
  "lng": -69.9312
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "ubicacionLat": "18.4861",
  "ubicacionLng": "-69.9312",
  "ultimaUbicacionUpdate": "2025-01-01T00:00:00.000Z"
}
```

---

### GET /api/drivers/nearby-requests

Obtiene las solicitudes pendientes cercanas al conductor.

**Requiere:** Autenticación (conductor)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "origenLat": "18.4861",
    "origenLng": "-69.9312",
    "origenDireccion": "Calle Principal #123",
    "destinoLat": "18.4700",
    "destinoLng": "-69.8900",
    "destinoDireccion": "Av. Venezuela #456",
    "distanciaKm": "5.2",
    "costoTotal": "350.00",
    "estado": "pendiente",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### GET /api/drivers/active-service

Obtiene el servicio activo del conductor (aceptado o en progreso).

**Requiere:** Autenticación (conductor)

**Response (200):**
```json
{
  "id": "uuid",
  "estado": "en_progreso",
  "origenLat": "18.4861",
  "origenLng": "-69.9312",
  "destinoLat": "18.4700",
  "destinoLng": "-69.8900",
  "costoTotal": "350.00"
}
```

**Nota:** Devuelve `null` si no hay servicio activo.

---

## Administración

### GET /api/admin/dashboard

Obtiene estadísticas generales del sistema.

**Requiere:** Autenticación (admin)

**Response (200):**
```json
{
  "totalUsers": 150,
  "totalDrivers": 25,
  "totalServices": 500,
  "totalRevenue": 125000.00,
  "activeDrivers": 12,
  "pendingServices": 3
}
```

---

### GET /api/admin/users

Obtiene la lista de todos los usuarios.

**Requiere:** Autenticación (admin)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "userType": "cliente",
    "phone": "+1-809-555-0100",
    "calificacionPromedio": "4.5",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### GET /api/admin/drivers

Obtiene la lista de todos los conductores.

**Requiere:** Autenticación (admin)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "licencia": "ABC123456",
    "placaGrua": "A123456",
    "marcaGrua": "Ford",
    "modeloGrua": "F-350",
    "disponible": true,
    "user": {
      "nombre": "Pedro",
      "apellido": "García",
      "email": "conductor@ejemplo.com"
    }
  }
]
```

---

### GET /api/admin/services

Obtiene todos los servicios del sistema.

**Requiere:** Autenticación (admin)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "estado": "completado",
    "costoTotal": "350.00",
    "distanciaKm": "5.2",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "cliente": {
      "nombre": "Juan",
      "apellido": "Pérez"
    },
    "conductor": {
      "nombre": "Pedro",
      "apellido": "García"
    }
  }
]
```

---

### GET /api/admin/active-drivers

Obtiene la lista de conductores actualmente disponibles.

**Requiere:** Autenticación (admin)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "ubicacionLat": "18.4861",
    "ubicacionLng": "-69.9312",
    "user": {
      "nombre": "Pedro",
      "apellido": "García"
    }
  }
]
```

---

### GET /api/admin/pricing

Obtiene todas las tarifas configuradas.

**Requiere:** Autenticación (admin)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "nombre": "Tarifa Estándar",
    "precioBase": "100.00",
    "tarifaPorKm": "15.00",
    "tarifaNocturnaMultiplicador": "1.5",
    "horaInicioNocturna": "20:00",
    "horaFinNocturna": "06:00",
    "zona": "Santo Domingo",
    "activo": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### POST /api/admin/pricing

Crea una nueva tarifa.

**Requiere:** Autenticación (admin)

**Request Body:**
```json
{
  "nombre": "Tarifa Premium",
  "precioBase": 150.00,
  "tarifaPorKm": 20.00,
  "zona": "Zona Este"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "nombre": "Tarifa Premium",
  "precioBase": "150.00",
  "tarifaPorKm": "20.00",
  "tarifaNocturnaMultiplicador": "1.5",
  "activo": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

### PUT /api/admin/pricing/:id

Actualiza una tarifa existente.

**Requiere:** Autenticación (admin)

**Request Body:**
```json
{
  "activo": false
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "nombre": "Tarifa Premium",
  "activo": false
}
```

---

## Tarifas

### GET /api/pricing/active

Obtiene la tarifa activa actual.

**Response (200):**
```json
{
  "id": "uuid",
  "nombre": "Tarifa Estándar",
  "precioBase": "100.00",
  "tarifaPorKm": "15.00",
  "tarifaNocturnaMultiplicador": "1.5",
  "activo": true
}
```

---

### POST /api/pricing/calculate

Calcula el costo de un servicio basado en la distancia.

**Request Body:**
```json
{
  "distanceKm": 5.2
}
```

**Response (200):**
```json
{
  "total": 178.00,
  "breakdown": {
    "base": 100.00,
    "distance": 78.00,
    "nightSurcharge": 0
  }
}
```

---

## Mapas

### POST /api/maps/calculate-route

Calcula la distancia y duración entre dos puntos usando Google Distance Matrix API.

**Request Body:**
```json
{
  "origin": {
    "lat": 18.4861,
    "lng": -69.9312
  },
  "destination": {
    "lat": 18.4700,
    "lng": -69.8900
  }
}
```

**Response (200):**
```json
{
  "distanceKm": 5.2,
  "distanceText": "5.2 km",
  "durationMinutes": 12,
  "durationText": "12 mins"
}
```

---

### POST /api/maps/geocode

Convierte una dirección en coordenadas o viceversa usando Google Geocoding API.

**Request Body (dirección a coordenadas):**
```json
{
  "address": "Calle Principal #123, Santo Domingo"
}
```

**Request Body (coordenadas a dirección):**
```json
{
  "lat": 18.4861,
  "lng": -69.9312
}
```

**Response (200):**
```json
{
  "lat": 18.4861,
  "lng": -69.9312,
  "formattedAddress": "Calle Principal #123, Santo Domingo, República Dominicana"
}
```

---

## WebSocket

El sistema utiliza WebSocket para comunicación en tiempo real. Conectar a: `ws://[host]/ws` o `wss://[host]/ws` (producción).

### Eventos del Cliente al Servidor

#### join_service

El cliente o conductor se une a una sala de servicio para recibir actualizaciones.

**Enviar:**
```json
{
  "type": "join_service",
  "payload": {
    "serviceId": "uuid",
    "role": "client"
  }
}
```

**Roles:** `"client"` o `"driver"`

---

#### register_driver

Registra un conductor para recibir notificaciones de nuevas solicitudes.

**Enviar:**
```json
{
  "type": "register_driver",
  "payload": {
    "driverId": "uuid"
  }
}
```

---

#### update_location

El conductor envía una actualización de ubicación durante un servicio activo.

**Enviar:**
```json
{
  "type": "update_location",
  "payload": {
    "servicioId": "uuid",
    "conductorId": "uuid",
    "lat": 18.4861,
    "lng": -69.9312
  }
}
```

**Nota:** Esta actualización se guarda en la base de datos y se transmite a todos los clientes en la sala del servicio.

---

### Eventos del Servidor al Cliente

#### new_request

Notifica a los conductores disponibles de una nueva solicitud de servicio.

**Recibir:**
```json
{
  "type": "new_request",
  "payload": {
    "id": "uuid",
    "origenLat": "18.4861",
    "origenLng": "-69.9312",
    "destinoLat": "18.4700",
    "destinoLng": "-69.8900",
    "costoTotal": "350.00",
    "distanciaKm": "5.2"
  }
}
```

---

#### driver_location_update

Notifica al cliente de una actualización de ubicación del conductor.

**Recibir:**
```json
{
  "type": "driver_location_update",
  "payload": {
    "servicioId": "uuid",
    "lat": 18.4861,
    "lng": -69.9312
  }
}
```

---

#### service_status_change

Notifica de un cambio en el estado del servicio.

**Recibir:**
```json
{
  "type": "service_status_change",
  "payload": {
    "id": "uuid",
    "estado": "aceptado",
    "conductorId": "uuid",
    "aceptadoAt": "2025-01-01T00:05:00.000Z"
  }
}
```

---

## Tipos de Datos

### User Type
- `cliente`: Usuario que solicita servicios
- `conductor`: Conductor de grúa
- `admin`: Administrador del sistema

### Estado del Servicio
- `pendiente`: Solicitud creada, esperando conductor
- `aceptado`: Conductor ha aceptado, en camino
- `en_progreso`: Servicio iniciado
- `completado`: Servicio finalizado
- `cancelado`: Servicio cancelado

### Método de Pago
- `efectivo`: Pago en efectivo al completar
- `tarjeta`: Pago con tarjeta vía Stripe (requiere configuración)

---

## Códigos de Estado

- `200 OK`: Solicitud exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Datos de solicitud inválidos
- `401 Unauthorized`: No autenticado o credenciales inválidas
- `403 Forbidden`: No autorizado para esta acción
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error del servidor

---

## Notas de Implementación

### Autenticación
- Las sesiones se gestionan con `express-session`
- Las cookies tienen una duración de 30 días
- Las contraseñas se hashean con `bcrypt` (10 rounds)

### Rate Limiting
No implementado actualmente. Se recomienda agregar para producción.

### CORS
Configurar según el dominio de producción.

### Variables de Entorno Requeridas
- `DATABASE_URL`: Connection string de PostgreSQL
- `SESSION_SECRET`: Secret para sesiones de Express
- `VITE_GOOGLE_MAPS_API_KEY`: API key de Google Maps
- `STRIPE_SECRET_KEY`: (Opcional) Secret key de Stripe
- `VITE_STRIPE_PUBLIC_KEY`: (Opcional) Public key de Stripe

---

**Versión de la API:** 1.0  
**Última actualización:** 17 de noviembre de 2025
