# GruaRD - Plataforma de Servicios de Grúa

## Descripción General
GruaRD es una Progressive Web App (PWA) tipo Uber para servicios de grúa en República Dominicana. La plataforma conecta clientes que necesitan servicios de grúa con conductores disponibles en tiempo real, con tres interfaces distintas: Cliente, Conductor y Admin.

## Arquitectura

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Base de Datos**: PostgreSQL (Neon) con Drizzle ORM
- **Autenticación**: Passport.js con estrategia local + bcrypt
- **Real-time**: WebSocket (ws library) para tracking GPS
- **Mapas**: Google Maps JavaScript API
- **Pagos**: Stripe (configuración preparada)
- **Estilos**: Tailwind CSS + shadcn/ui components
- **Estado**: TanStack Query (React Query v5)

### Estructura del Proyecto
```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas por rol (auth, client, driver, admin)
│   │   ├── components/    # Componentes reutilizables (UI, layouts, maps)
│   │   ├── lib/           # Utilities (auth, queryClient, websocket, maps)
│   │   └── App.tsx        # Router principal con rutas protegidas
│   └── public/            # Assets estáticos + manifest.json + sw.js
├── server/                # Backend Express
│   ├── db.ts             # Conexión PostgreSQL + Drizzle
│   ├── storage.ts        # DatabaseStorage con todos los métodos CRUD
│   ├── routes.ts         # API REST + WebSocket server
│   └── index.ts          # Entry point
└── shared/
    └── schema.ts         # Modelos Drizzle compartidos + tipos TypeScript
```

## Base de Datos

### Tablas Principales
1. **users** - Usuarios del sistema (clientes, conductores, admins)
2. **conductores** - Información específica de conductores (licencia, grúa, ubicación)
3. **servicios** - Solicitudes de servicio (origen, destino, estado, costos)
4. **tarifas** - Configuración de precios (base, por km, nocturna)
5. **calificaciones** - Ratings de servicios completados
6. **ubicaciones_tracking** - Historial GPS para tracking en tiempo real

### Relaciones
- `users` 1:1 `conductores` (userId)
- `servicios` N:1 `users` (clienteId, conductorId)
- `calificaciones` N:1 `servicios` (servicioId)
- `ubicaciones_tracking` N:1 `servicios` (servicioId)

## Funcionalidades Implementadas

### Autenticación
- ✅ Registro con tipo de usuario (cliente/conductor/admin)
- ✅ Login con email/password
- ✅ Sesiones persistentes con express-session
- ✅ Rutas protegidas por rol

### Cliente
- ✅ Solicitar servicio con origen/destino en mapa
- ✅ Ver servicios activos con tracking en tiempo real
- ✅ Historial de servicios completados
- ✅ Perfil de usuario con calificación promedio
- ✅ Cálculo automático de precios por distancia

### Conductor
- ✅ Dashboard con solicitudes pendientes cercanas
- ✅ Aceptar/rechazar solicitudes
- ✅ Tracking GPS en tiempo real durante servicio
- ✅ Marcar servicio como iniciado/completado
- ✅ Historial de servicios realizados
- ✅ Disponibilidad on/off
- ✅ Perfil con información de grúa

### Admin
- ✅ Dashboard con estadísticas (usuarios, conductores, servicios, ingresos)
- ✅ Gestión de usuarios y conductores
- ✅ Monitoreo de servicios en tiempo real
- ✅ Configuración de tarifas (crear, editar, activar/desactivar)
- ✅ Vista de mapa con grúas activas

### Integraciones
- ✅ Google Maps API para mapas interactivos
- ✅ Distance Matrix API para cálculo de rutas
- ✅ Geocoding API para conversión dirección ↔ coordenadas
- ✅ WebSocket para ubicaciones en tiempo real
- ⏳ Stripe para pagos (keys pendientes)

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuario actual

### Servicios
- `POST /api/services/request` - Solicitar servicio
- `GET /api/services/:id` - Detalles de servicio
- `GET /api/services/my-services` - Mis servicios
- `POST /api/services/:id/accept` - Aceptar servicio (conductor)
- `POST /api/services/:id/start` - Iniciar servicio (conductor)
- `POST /api/services/:id/complete` - Completar servicio (conductor)

### Conductores
- `GET /api/drivers/me` - Datos de conductor
- `PUT /api/drivers/availability` - Cambiar disponibilidad
- `PUT /api/drivers/location` - Actualizar ubicación
- `GET /api/drivers/nearby-requests` - Solicitudes pendientes

### Admin
- `GET /api/admin/dashboard` - Estadísticas generales
- `GET /api/admin/users` - Lista de usuarios
- `GET /api/admin/drivers` - Lista de conductores
- `GET /api/admin/services` - Todos los servicios
- `GET /api/admin/active-drivers` - Conductores activos
- `GET /api/admin/pricing` - Tarifas configuradas
- `POST /api/admin/pricing` - Crear tarifa
- `PUT /api/admin/pricing/:id` - Actualizar tarifa

### Tarifas y Mapas
- `GET /api/pricing/active` - Tarifa activa actual
- `POST /api/pricing/calculate` - Calcular costo por distancia
- `POST /api/maps/calculate-route` - Calcular ruta (Distance Matrix)
- `POST /api/maps/geocode` - Convertir dirección a coordenadas

## WebSocket Protocol

### Conexión
- Endpoint: `ws://[host]/ws`
- Sin autenticación inicial (validar userId en mensajes)

### Mensajes del Cliente

#### Unirse a sesión de servicio
```json
{
  "type": "join_service",
  "payload": {
    "serviceId": "uuid",
    "role": "client|driver"
  }
}
```

#### Actualizar ubicación (conductor)
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

#### Registrar conductor para notificaciones
```json
{
  "type": "register_driver",
  "payload": {
    "driverId": "uuid"
  }
}
```

### Mensajes del Servidor

#### Nueva solicitud (broadcast a conductores)
```json
{
  "type": "new_request",
  "payload": { ...servicio }
}
```

#### Actualización de ubicación
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

#### Cambio de estado de servicio
```json
{
  "type": "service_status_change",
  "payload": { ...servicio }
}
```

## Variables de Entorno

### Requeridas
- `DATABASE_URL` - PostgreSQL connection string (auto-configurada en Replit)
- `SESSION_SECRET` - Secret para sessions (auto-generada)
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key (configurada)

### Opcionales (para funcionalidad completa)
- `STRIPE_SECRET_KEY` - Stripe backend key
- `VITE_STRIPE_PUBLIC_KEY` - Stripe frontend key

## Configuración PWA

### manifest.json
- ✅ Configurado para instalación standalone
- ✅ Iconos 192x192 y 512x512
- ✅ Theme color: #2563eb (azul)
- ✅ Shortcuts para acción rápida

### Service Worker (sw.js)
- ✅ Cache de assets estáticos
- ✅ Estrategia cache-first
- ✅ Auto-limpieza de cache antiguo

## Diseño Visual

### Sistema de Diseño
- **Fuente**: Inter (Google Fonts)
- **Color primario**: Azul (#2563eb)
- **Componentes**: shadcn/ui con Tailwind CSS
- **Layout**: Mobile-first responsive
- **Tema**: Light mode (dark mode preparado)

### Layouts
- **Cliente/Conductor**: `MobileLayout` con bottom navigation
- **Admin**: `AdminLayout` con sidebar lateral

## Próximos Pasos (Roadmap)

### Fase 1: Core MVP ✅ COMPLETADO
- [x] Schema completo con todas las tablas
- [x] Frontend para las 3 interfaces
- [x] Backend con todos los endpoints
- [x] WebSocket para tracking
- [x] Google Maps integration
- [x] PWA configuration

### Fase 2: Testing & Refinamiento
- [ ] End-to-end testing con Playwright
- [ ] Validar flujos completos (solicitud → tracking → completado)
- [ ] Probar WebSocket en diferentes escenarios
- [ ] Mejorar manejo de errores y loading states
- [ ] Agregar toasts informativos

### Fase 3: Integraciones Avanzadas
- [ ] Configurar Stripe para pagos reales
- [ ] Push notifications (Web Push API)
- [ ] Chat en tiempo real (cliente ↔ conductor)
- [ ] Geofencing para zonas de servicio

### Fase 4: Producción
- [ ] Migración a Capacitor para Android APK
- [ ] Configurar Google Play Store
- [ ] Añadir pasarelas de pago locales (Azul, BanReservas)
- [ ] Sistema de verificación de documentos
- [ ] Analytics y reportes avanzados

## Comandos Útiles

```bash
# Desarrollo
npm run dev                 # Iniciar servidor dev (Express + Vite)

# Base de datos
npm run db:push            # Sincronizar schema con PostgreSQL
npm run db:studio          # Abrir Drizzle Studio (GUI)

# Producción
npm run build              # Build frontend para producción
npm start                  # Iniciar servidor producción
```

## Notas de Desarrollo

### Google Maps API Key
- Key actual: `AIzaSyCHae3-wAWIy2xcWcF5YApYSEv2ZYi9N20`
- Configurada en variable de entorno `VITE_GOOGLE_MAPS_API_KEY`
- APIs habilitadas: Maps JavaScript API, Distance Matrix API, Geocoding API

### Sesiones y Autenticación
- Sesiones persistentes con cookies
- Duración: 30 días
- Password hashing: bcrypt con salt 10

### WebSocket Implementation
- Path separado: `/ws` (no interfiere con Vite HMR)
- Salas por servicio para broadcast eficiente
- Registro de conductores para notificaciones push

### Stripe Integration
- Configuración preparada en shared/schema.ts
- Esperando keys `STRIPE_SECRET_KEY` y `VITE_STRIPE_PUBLIC_KEY`
- Métodos de pago: `efectivo` y `tarjeta` soportados en schema

## Arquitectura de Datos en Tiempo Real

### Flujo de Solicitud de Servicio
1. Cliente crea solicitud → guardada en DB
2. Backend envía notificación WebSocket a conductores disponibles
3. Conductor acepta → actualiza servicio en DB
4. Cliente recibe notificación de servicio aceptado
5. Conductor inicia servicio → tracking GPS comienza
6. Cada ubicación GPS se broadcast a cliente via WebSocket
7. Conductor completa servicio → cliente puede calificar

### Optimizaciones
- Ubicaciones GPS se guardan en `ubicaciones_tracking` cada X segundos
- WebSocket usa salas por servicio para evitar broadcast innecesario
- Queries con `with` de Drizzle para reducir roundtrips a DB

## Seguridad

- ✅ Passwords hasheados con bcrypt
- ✅ Sesiones con cookies HTTP-only
- ✅ Rutas protegidas por autenticación
- ✅ Validación de roles (cliente/conductor/admin)
- ✅ SQL injection protegido (Drizzle ORM)
- ⏳ HTTPS en producción (configurar en deploy)
- ⏳ CORS configurado para dominio específico

## Migración a Android (Capacitor)

### Preparación Actual
- ✅ PWA completamente funcional
- ✅ manifest.json configurado
- ✅ Service worker implementado
- ✅ APIs móviles compatibles (Geolocation, WebSocket)

### Pasos para Conversión (futuro)
1. Instalar Capacitor: `npm i @capacitor/core @capacitor/cli @capacitor/android`
2. Inicializar: `npx cap init`
3. Agregar Android: `npx cap add android`
4. Build web: `npm run build`
5. Sincronizar: `npx cap sync`
6. Abrir Android Studio: `npx cap open android`
7. Configurar permisos en AndroidManifest.xml (GPS, red)
8. Build APK para Google Play

## Documentación Técnica Adicional

Ver archivo `PLAN_DESARROLLO_GRUARD.md` para:
- Plan de desarrollo detallado en español
- Especificaciones técnicas completas
- Roadmap de features futuras
- Guía de migración a Android
