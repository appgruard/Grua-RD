# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) for the Dominican Republic, connecting users with tow truck services and drivers in real-time. It aims to streamline service requests, enable real-time tracking, and efficiently manage operations. The platform offers distinct interfaces for Clients, Drivers, Administrators, and an enterprise portal for B2B clients, with the goal of revolutionizing the local tow truck service industry.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Modificaciones al schema (`shared/schema.ts`) están permitidas cuando sean necesarias para nuevas funcionalidades.
App.tsx puede ser modificado para agregar nuevas rutas cuando sea necesario para nuevas funcionalidades.
I like functional programming.
I prefer simple language.
I want to be kept informed about the progress regularly.
I expect the agent to write clear and concise code with comments where necessary.
Ensure all new features have corresponding tests.
Prioritize performance and scalability in new implementations.

## System Architecture

### UI/UX Decisions
The system features a mobile-first, responsive PWA built with `shadcn/ui` and Tailwind CSS, utilizing a light mode, Inter font, and Grúa RD brand colors. Client and Driver interfaces use `MobileLayout` with bottom navigation, while Admin and Enterprise interfaces use `AdminLayout` or `EmpresaLayout` with sidebars. The PWA is configured for standalone installation with Capacitor for native mobile capabilities.

### Technical Implementations
Grúa RD uses a React 18 (TypeScript, Vite) frontend, an Express.js (Node.js) backend, and PostgreSQL (Neon) with Drizzle ORM. Authentication is handled by Passport.js (local strategy, bcrypt). Real-time features are powered by WebSockets (`ws` library). Mapbox GL JS with react-map-gl is used for mapping, routing, and geocoding. State management is handled by TanStack Query (React Query v5). The project maintains a modular structure and integrates Capacitor for native mobile functionality.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based access with Passport.js.
- **Client Features**: Map-based service requests, real-time tracking, service history, price calculation, insurance document management.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS, availability toggle, specialized truck management, Operator Wallet System (commissions, debt, payments).
- **Admin Features**: Dashboard with analytics, user/driver/enterprise management, real-time service monitoring, dynamic tariff configuration, document validation, support ticket system.
- **Enterprise Portal (B2B)**: Business management, contract/tariff configuration, project tracking, scheduled services, invoicing.
- **Real-time Communication**: WebSockets for location updates, chat, automatic service cancellation.
- **Push Notifications**: Web Push API and Capacitor for updates.
- **PWA & Native Capabilities**: Installable PWA with Capacitor integration.
- **Payment Integration**: Azul API (pending migration) for card payments, cash, automatic 80/20 commission splitting, operator wallet with scheduled payouts and same-day withdrawals, PDF receipts.
- **Robust UX**: Skeleton loaders, empty states, dialogs, toast notifications, form validations, responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation (Verifik OCR API), phone OTP/SMS verification, admin verification panel.
- **Document Management**: Upload system with Replit Object Storage, admin review.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs.
- **Intermediate Service States**: Granular service states for tracking.
- **Support Ticket System**: Comprehensive management.
- **Negotiation Chat System**: Dual chat for standard and extraction services with price proposals.
- **Multi-Vehicle Operator Support**: Operators can manage multiple vehicles, with vehicle documentation handled per-vehicle.
- **Draggable Pins & Extended Destination**: Clients can drag origin/destination pins. Drivers can extend destinations up to 1.5km.
- **Dual-Account System**: Allows the same email to be used for both client and driver accounts.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage uses Replit Object Storage. Azul API payment integration (pending migration) will use server-side processing with webhook verification. Insurance API integrations use an Adapter pattern. Performance optimizations include smart location tracking, lazy loading of map components, consolidated API endpoints, self-hosted fonts, enhanced service worker, role-based preloading, React Query optimizations, and dynamic preconnect by role. TTFB optimizations include aggressive cache headers, X-Response-Time header, Early Hints, and fast-path middleware, reducing TTFB from 814ms to 13ms. Cedula validation allows the same cedula across multiple account types belonging to the same person.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API, Geocoding API.
- **Waze**: Deep links for driver navigation.
- **Azul API**: Payment gateway for Dominican Republic.
- **Web Push API**: For push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery (via Replit Connector).
- **Resend**: Email service for transactional emails and notifications (via Replit Connector).
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins.
- **Jest**: Unit and integration testing framework.
- **Playwright**: E2E testing.

## CapRover Deployment

### Document Storage Configuration
The application uses a provider-agnostic storage abstraction that automatically selects the appropriate storage backend:

1. **Replit Object Storage**: Used when running inside Replit environment (default)
2. **Filesystem Storage**: Used when running outside Replit (CapRover, Docker, local)

### CapRover Volume Configuration
When deploying to CapRover, configure a persistent volume for document uploads:

1. In CapRover app settings, add a persistent volume:
   - **Container Path**: `/app/uploads`
   - **Host Path**: Use CapRover's default persistent storage

2. Optionally set the `STORAGE_PATH` environment variable to customize the storage location:
   ```
   STORAGE_PATH=/app/uploads
   ```

### Environment Variables for CapRover
Required environment variables for CapRover deployment:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `MAPBOX_ACCESS_TOKEN` / `VITE_MAPBOX_ACCESS_TOKEN`: Mapbox API key
- `RESEND_API_KEY`: Email service API key
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Push notification keys
- `STORAGE_PATH`: (Optional) Custom path for file storage, defaults to `/app/uploads`

### Storage API Endpoints
- `GET /api/storage/info`: Returns current storage provider status
- `GET /api/storage/files/*`: Serves uploaded files from filesystem storage (requires authentication)

### Session Configuration for CapRover
The application uses PostgreSQL session store for persistent sessions in production:
- Session cookie name: `gruard.sid`
- Session store: `connect-pg-simple` with table `user_sessions`
- Trust proxy enabled for reverse proxy environments
- Cookie: `secure: true` in production, `sameSite: "lax"` for compatibility

## Recent Changes

### December 10, 2025 - Bug Corrections Phase 1 Completed and Validated
Implemented and validated fixes from `PLAN_CORRECCIONES_BUGS.md`:

- **Bug 3 (Alta prioridad)**: ✅ Fixed and validated - secondary account flow uses `/onboarding` route (user selects conductor type in wizard step 1)
- **Bug 2 (Alta prioridad)**: ✅ Fixed - migrated `vehiculos_registrados` column from INTEGER to BOOLEAN
- **Bug 1 (Media prioridad)**: 🟡 Logging added - search for `VERIFICATION_BLOCKED`, `LICENSE_SCAN_FRONT`, `LICENSE_SCAN_BACK` in CapRover logs
- **Bug 4**: ✅ Validated as not a bug - insurance is optional during client verification, redirection logic only requires cedula and email verification

### December 9, 2025 - Authentication & Verification Plan Completed
All phases of `PLAN_UNIFICADO_AUTH_VERIFICACION.md` have been implemented:

- **FASE 1**: Critical authentication fixes - passport.authenticate callback pattern, PostgreSQL session store, improved deserializeUser
- **FASE 2**: Sessions during pending verification - ProtectedRoute with `allowPendingVerification`, verification-allowed API patterns
- **FASE 3**: UI verification flow - `getNextStep()` helper, framer-motion transitions between steps
- **FASE 4**: License OCR validation with Verifik - front/back license scanning with OCR verification
- **FASE 5**: CapRover compatibility - `gruard.sid` cookie name, trust proxy, session store configuration
- **FASE 6**: Cleanup & improvements - removed obsolete grúa fields, added `logAuth.verificationStep()` for audit logging