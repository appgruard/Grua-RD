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

### Noviembre 23, 2025 - Definición de Fase 4 - Producción
- ✅ **Completadas Fases 1, 2 y 3** del desarrollo completo
- ✅ **Definida Fase 4 - Producción** con 4 workstreams estructurados:
  - Workstream A: Identidad y Cumplimiento (Validación de Cédula + OTP via SMS)
  - Workstream B: Gestión Documental & Seguridad Operativa
  - Workstream C: Pagos y Cumplimiento Financiero (Stripe Connect 70/30)
  - Workstream D: Preparación Producción & Deployabilidad (Capacitor/APK)
- ✅ **Actualizado checklist MVP:** 100% de funcionalidades core completadas
- ✅ **Documentación actualizada:** PLAN_DESARROLLO_GRUARD.md con detalles de Fase 4

### Estado Actual (Post-Fase 3):
- **Funcionalidades Core:** ✅ 100% implementadas (autenticación, servicios, tracking, chat, notificaciones)
- **Testing:** ✅ 27 tests E2E con Playwright (cobertura completa de flujos)
- **UI/UX:** ✅ Responsive design, modo oscuro, estados de carga, manejo de errores
- **Integraciones:** ✅ Google Maps, WebSocket, Web Push API, Stripe (requiere API keys)
- **Pendiente Fase 4:** Validación de cédula, OTP, gestión de documentos, Stripe Connect, optimización, APK

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

**Planificadas (Fase 4 - Producción):**
- **Identity Verification**: Cédula dominicana validation, OTP phone verification via SMS (Twilio/Infobip).
- **Document Management**: Secure upload and admin approval of driver documents (license, registration, ID).
- **Advanced Payments**: Stripe Connect for automatic 70/30 commission split, PDF receipt generation.
- **Security Hardening**: Helmet.js, CORS configuration, rate limiting, health check endpoint.
- **Production Ready**: Capacitor configuration for Android APK, Lighthouse optimization, error monitoring (Sentry).

### System Design Choices
The system uses PostgreSQL with Drizzle ORM for type-safe data access. WebSocket communication employs service-specific rooms for efficient updates. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage utilizes Replit Object Storage, with strict authorization for uploads. Stripe integration prioritizes server-side processing and webhook verification for security.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Google Maps Platform**: Maps JavaScript API, Distance Matrix API, Geocoding API.
- **Stripe**: Payment gateway for processing transactions.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **SMS Service**: Placeholder for OTP delivery (Twilio/Infobip/MessageBird planned).