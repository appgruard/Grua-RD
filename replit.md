# GruaRD - Plataforma de Servicios de Grúa

## Overview
GruaRD is a Progressive Web App (PWA) designed to connect users needing tow truck services with available drivers in real-time within the Dominican Republic, similar to Uber. The platform features three distinct interfaces: Client, Driver, and Admin. Its primary purpose is to streamline tow truck requests, real-time tracking, and service management, with a vision to revolutionize the tow truck service industry in the region.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/App.tsx`.
I like functional programming.
I prefer simple language.
I want to be kept informed about the progress regularly.
I expect the agent to write clear and concise code with comments where necessary.
Ensure all new features have corresponding tests.
Prioritize performance and scalability in new implementations.

## Recent Changes

### Noviembre 23, 2025 - Workstream A Completado (100%)
- ✅ **Completadas Fases 1, 2 y 3** del desarrollo completo
- ✅ **Definida Fase 4 - Producción** con 4 workstreams estructurados:
  - **Workstream A: Identidad y Cumplimiento** - ✅ 100% completado (backend + frontend + tests preparados)
  - Workstream B: Gestión Documental & Seguridad Operativa - En progreso
  - Workstream C: Pagos y Cumplimiento Financiero (Stripe Connect 70/30) - Pendiente
  - Workstream D: Preparación Producción & Deployabilidad (Capacitor/APK) - Pendiente

### Workstream A - Implementado:
**Backend:**
- ✅ **Sistema de Logging:** Winston con logging estructurado (`server/logger.ts`)
- ✅ **Servicio SMS:** Twilio con fallback a Mock (`server/sms-service.ts`)
- ✅ **Validación Cédula:** Algoritmo Luhn, format validation (`server/services/identity.ts`)
- ✅ **Sistema OTP:** Generación, envío, verificación con bcrypt (`server/sms-service.ts`)
- ✅ **Tablas DB:** `otp_tokens`, `verification_audit` (`server/schema-extensions.ts`)
- ✅ **API Endpoints:** 
  - `/api/identity/verify-cedula` - Validar cédula dominicana
  - `/api/identity/send-phone-otp` - Enviar código OTP via SMS
  - `/api/identity/verify-phone-otp` - Verificar código OTP
  - `/api/identity/status` - Estado de verificación del usuario
  - `/api/admin/verification-status` - Lista de usuarios con estado de verificación (con paginación y filtros)
  - `/api/admin/users/:id/verification-history` - Historial de intentos de verificación
- ✅ **Rate Limiting:** Protección contra abuso (3 OTP/hora, 5 cédula/hora)
- ✅ **Audit Logging:** Registro de todos los intentos de verificación

**Frontend:**
- ✅ **UI Wizard Multi-paso:** `client/src/pages/auth/onboarding-wizard.tsx` con 4 pasos completos:
  - Paso 1: Crear cuenta (email, password, nombre, apellido, teléfono, tipo de usuario)
  - Paso 2: Verificación de cédula dominicana
  - Paso 3: Verificación de teléfono con OTP (countdown timer, reenvío)
  - Paso 4: Datos de grúa (conductores) o confirmación (clientes)
  - Persistencia de estado en sessionStorage
  - Validaciones completas en cada paso
- ✅ **Panel Admin de Verificaciones:** `client/src/pages/admin/verifications.tsx` completamente funcional:
  - Dashboard con estadísticas (total usuarios, verificados, pendientes)
  - Tabla de usuarios con estado de verificación (cédula y teléfono)
  - Filtros por estado (todos, verificados, pendiente teléfono, pendiente cédula, sin verificar)
  - Búsqueda por nombre, email o cédula
  - Paginación
  - Vista de historial de verificación por usuario (modal lateral)
  - Badges visuales para estado de verificación
- ✅ **Integración con Login:** Botón de registro redirige a `/onboarding`

**Testing & Desarrollo:**
- ✅ **Tests E2E preparados:** Suite completa `e2e/06-onboarding-wizard.spec.ts` (requiere configurar Stripe test keys para ejecutar)
- ✅ **Helpers de testing:** `generateValidCedula()` con algoritmo Luhn, `generateDominicanPhone()`
- ✅ **Mock SMS:** Código OTP fijo "123456" en desarrollo para facilitar testing
- ✅ **Object Storage resiliente:** Inicialización lazy con degradación graciosa cuando no hay bucket configurado

### Estado Actual (Post-Fase 3 + Workstream A):
- **Funcionalidades Core:** ✅ 100% implementadas (autenticación, servicios, tracking, chat, notificaciones)
- **Testing:** ✅ 27+ tests E2E con Playwright (cobertura completa de flujos Fases 1-3 + wizard onboarding preparado)
- **UI/UX:** ✅ Responsive design, modo oscuro, estados de carga, manejo de errores
- **Integraciones:** ✅ Google Maps, WebSocket, Web Push API, Stripe (requiere API keys)
- **Fase 4 - Workstream A:** ✅ 100% completado (backend + frontend + testing utilities)
- **Fase 4 - Workstream B:** ⏳ En progreso (mejoras de seguridad)
- **Pendiente:** Gestión documentos UI (Workstream B), Stripe Connect (Workstream C), optimización y APK (Workstream D)

## System Architecture

### UI/UX Decisions
The design system uses Inter font with a primary blue color (`#2563eb`), leveraging `shadcn/ui` and Tailwind CSS for a mobile-first, responsive PWA. It supports a light mode with dark mode preparation. Client and Driver interfaces utilize a `MobileLayout` with bottom navigation, while the Admin interface uses an `AdminLayout` with a sidebar. The PWA is configured for standalone installation.

### Technical Implementations
GruaRD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. PostgreSQL (Neon) with Drizzle ORM manages the database. Authentication uses Passport.js with local strategy and bcrypt. Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Google Maps JavaScript API handles mapping, distance, and geocoding. State management is done with TanStack Query (React Query v5). The project maintains a modular structure.

### Feature Specifications

**Implementadas (Fases 1-3):**
- **Authentication & Security**: Role-based authentication (Client/Driver/Admin) with Passport.js, bcrypt password hashing, session management.
- **Client Features**: Map-based service requests, real-time GPS tracking, service history, user profiles, automatic price calculation.
- **Driver Features**: Dashboard with requests, accept/reject services, real-time GPS updates, status management, service history, availability toggle, truck information.
- **Admin Features**: Dashboard with statistics and charts, user/driver management, real-time service monitoring, dynamic tariff configuration (CRUD).
- **Real-time Communication**: WebSockets for location updates and client-driver chat with message persistence.
- **Push Notifications**: Web Push API integration for service updates and chat messages (requires VAPID keys configuration).
- **PWA Capabilities**: `manifest.json` for installability, service worker (`sw.js`) for static asset caching and offline support.
- **Payment Integration**: Stripe Elements for card payments, cash payment option (requires Stripe API keys for production).
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, responsive mobile-first design.
- **Monitoring & Logging**: Structured logging with Winston for all server operations.

**Fase 4 - Producción:**

**Workstream A: Identidad y Cumplimiento** ✅ 100%:
- Wizard de onboarding con 4 pasos (email→cédula→OTP→datos)
- Validación de cédula dominicana con algoritmo Luhn
- Verificación de teléfono via OTP/SMS con Twilio (fallback a Mock en desarrollo)
- Panel admin de verificaciones con historial completo de intentos
- Rate limiting y audit logging completo
- Testing utilities para E2E (cédulas válidas, teléfonos, OTP mock)
- Object Storage con degradación graciosa

**Workstream B: Gestión Documental & Seguridad Operativa** ⏳ En progreso:
- ✅ Backend: API endpoints para upload/download de documentos (`server/services/object-storage.ts`)
- ✅ Security Hardening implementado:
  - Helmet.js con CSP configurado para Google Maps, Stripe, y WebSockets
  - CORS mejorado con validación de orígenes y logging
  - Health check endpoint `/health` con métricas de uptime
  - HSTS habilitado (31536000s con includeSubDomains y preload)
- ⏳ Frontend: UI para conductores subir documentos y admin aprobarlos

**Workstream C: Pagos y Cumplimiento Financiero** ⏳:
- Stripe Connect para split automático 70/30
- Generación de recibos PDF
- Webhook handling robusto

**Workstream D: Preparación Producción** ⏳:
- Capacitor configuration para Android APK
- Lighthouse optimization
- Error monitoring (Sentry)

### System Design Choices
The system uses PostgreSQL with Drizzle ORM for type-safe data access. WebSocket communication employs service-specific rooms for efficient updates. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage utilizes Replit Object Storage, with strict authorization for uploads. Stripe integration prioritizes server-side processing and webhook verification for security.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Google Maps Platform**: Maps JavaScript API, Distance Matrix API, Geocoding API.
- **Stripe**: Payment gateway for processing transactions.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery (manual configuration, no Replit integration used - credentials stored as secrets).