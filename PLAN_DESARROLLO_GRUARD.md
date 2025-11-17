# 🚛 Plan de Desarrollo - GruaRD
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

### 🔄 Fase 2 - Testing & Refinamiento - EN PROGRESO
- [x] Playwright instalado y configurado
- [x] Tests E2E para Cliente (7 tests)
- [x] Tests E2E para Conductor (7 tests)
- [x] Tests E2E para Admin (9 tests)
- [x] Tests de integración completos (4 tests)
- [x] Documentación completa de testing
- [ ] Tests WebSocket (requiere backend más robusto)
- [ ] Validaciones y mejoras de UX

### ⏳ Pendiente
- [ ] Stripe API Keys (STRIPE_SECRET_KEY, VITE_STRIPE_PUBLIC_KEY)
- [ ] Fase 3 - Integraciones Avanzadas
- [ ] Fase 4 - Producción

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
  "name": "GruaRD - Servicio de Grúas",
  "short_name": "GruaRD",
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
- [ ] Registro/Login (Cliente, Conductor, Admin)
- [ ] Cliente puede solicitar grúa desde mapa
- [ ] Sistema calcula costo automáticamente
- [ ] Conductor ve solicitudes cercanas
- [ ] Conductor puede aceptar/rechazar
- [ ] Tracking GPS en tiempo real (ambas partes)
- [ ] Completar servicio
- [ ] Pago en efectivo (registro manual)
- [ ] Pago con tarjeta (Stripe) - requiere API keys
- [ ] Calificar servicio
- [ ] Historial completo
- [ ] Toggle disponibilidad conductor
- [ ] Admin: Dashboard con stats
- [ ] Admin: Gestión usuarios/conductores
- [ ] Admin: Configuración tarifas
- [ ] Admin: Monitoreo en tiempo real

### Calidad Técnica
- [ ] Responsive design perfecto
- [ ] Modo oscuro funcional
- [ ] Estados de carga elegantes
- [ ] Manejo de errores robusto
- [ ] Validación de formularios
- [ ] WebSocket reconexión automática
- [ ] PWA instalable
- [ ] Rendimiento optimizado

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
