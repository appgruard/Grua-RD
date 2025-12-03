# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) designed for the Dominican Republic to connect users needing tow truck services with available drivers in real-time. The platform aims to streamline tow truck requests, facilitate real-time tracking, and manage services efficiently. It features distinct interfaces for Clients, Drivers, and Administrators, and includes an enterprise portal for B2B clients, revolutionizing the local tow truck service industry.

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
The design system uses Inter font with Grúa RD brand colors: navy blue (`#0F2947`) and orange (`#F5A623`). It leverages `shadcn/ui` and Tailwind CSS for a mobile-first, responsive PWA, supporting a light mode with dark mode preparation. Client and Driver interfaces utilize a `MobileLayout` with bottom navigation, while Admin and Enterprise interfaces use `AdminLayout` or `EmpresaLayout` with sidebars. The PWA is configured for standalone installation, with Capacitor integration for native mobile app capabilities.

### Technical Implementations
Grúa RD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. It uses PostgreSQL (Neon) with Drizzle ORM. Authentication is handled by Passport.js with local strategy and bcrypt. Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Mapbox GL JS with react-map-gl is used for mapping, routing, and geocoding. State management relies on TanStack Query (React Query v5). The project adheres to a modular structure and integrates Capacitor for native mobile functionality.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based (Client/Driver/Admin/Empresa) with Passport.js, bcrypt, session management.
- **Client Features**: Map-based requests, real-time tracking, service history, profiles, automatic price calculation, multiple insurance document management.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS updates, status management, availability toggle, truck information, service category specialization, vehicle-per-category management (one vehicle with photo, plate, color, and capacity per service category).
- **Admin Features**: Dashboard with statistics, user/driver/enterprise management, real-time service monitoring, dynamic tariff configuration, insurance claim validation, analytics, document validation, ticket support system.
- **Enterprise Portal (B2B)**: Dedicated portal for businesses with employee management, contract/tariff configuration, project tracking, scheduled services, and invoicing.
- **Real-time Communication**: WebSockets for location updates and client-driver chat, automatic service cancellation.
- **Push Notifications**: Web Push API and Capacitor native push notifications for service updates and chat messages.
- **PWA & Native Capabilities**: `manifest.json` for installability, service worker for caching, and full Capacitor integration for Android/iOS with native plugins for location tracking and other device features.
- **Payment Integration**: Azul Payment Gateway (Dominican provider) for card payments (HOLD/POST/REFUND/VOID), cash option, automatic commission split, PDF receipt generation.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation with Verifik OCR API and government database verification, phone OTP/SMS verification, admin verification panel.
- **Document Management**: Upload system with Replit Object Storage, admin review, status tracking, automated notifications.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs, policy validation, towing authorization, claim submission.
- **Intermediate Service States**: Granular service states for detailed tracking.
- **Support Ticket System**: Complete management for clients and drivers with category-based tickets, priority levels, state tracking, and admin panel.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security measures include bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage is on Replit Object Storage with strict authorization. Azul Payment Gateway integration prioritizes server-side processing with a HOLD/POST flow, webhook verification, and automatic commission distribution. Insurance API integrations use an Adapter pattern. Driver profile API is optimized for single-call data retrieval. Service auto-cancellation employs atomic updates and real-time notifications. Vehicle-per-category system uses unique constraint (conductorId, categoria) with active-only filtering for matching and acceptance flows.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API for routing, Geocoding API for address lookup.
- **Waze**: Deep links for driver navigation.
- **Azul Payment Gateway**: Dominican payment provider for card transactions, tokenization (DataVault), HOLD/POST/REFUND operations.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery (via Replit Connector).
- **Resend**: Email service for transactional emails and notifications (via Replit Connector).
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins (e.g., Camera, Filesystem, Geolocation, Push Notifications, Network, App).

## Deployment Configuration
- **CapRover**: Production deployment via Docker multi-stage build (Node 20 Alpine)
- **Container Port**: 80 (standard for CapRover)
- **Health Check**: `/health` endpoint for container monitoring
- **CORS**: Configured for web domains, plus `capacitor://`, `ionic://`, and `file://` schemes for mobile apps
- **API URL**: Use `VITE_API_URL` environment variable to configure production server URL for mobile builds
- **Documentation**: See `DEPLOYMENT_CAPROVER.md` for full deployment guide and `CAPACITOR_BUILD_GUIDE.md` for mobile app builds

## Pending Implementation Plans

### New Service Categories (December 2025) - IMPLEMENTED
- **Document:** `PLAN_NUEVAS_CATEGORIAS_SERVICIO.md`
- **Status:** ✅ Implemented (December 3, 2025)
- **Migration file:** `migrations/0007_new_service_categories.sql`
- **New categories:**
  - `remolque_plataforma` (Flatbed) - For luxury, sports, and low vehicles (6 subtypes)
  - `remolque_motocicletas` (Motorcycles) - For motorcycles, scooters, pasolas (7 subtypes)
- **Frontend components updated:** ServiceCategorySelector, ServiceCategoryMultiSelect, ServiceSubtypeSelector
- **Pages updated:** driver/dashboard, empresa/solicitudes, empresa/historial
- **Note:** Database migration required after provisioning PostgreSQL

## Recent Code Audits

### December 2025 - Navigation Buttons Improvement (Fase 5)
**Driver Dashboard (`client/src/pages/driver/dashboard.tsx`):**
- Added dual navigation buttons: Waze and Google Maps options
- Self-descriptive labels: "Origen (Waze)", "Destino (Maps)", etc.
- Imported `SiGooglemaps` icon from react-icons
- Added aria-labels for accessibility
- Added test IDs: `button-waze-origin`, `button-google-origin`, `button-waze-destination`, `button-google-destination`

### December 2025 - Driver Dashboard Service Info (Fase 4)
**Driver Dashboard (`client/src/pages/driver/dashboard.tsx`):**
- Added friendly labels for service categories and vehicle types (serviceCategoryLabels, vehicleTypeLabels)
- Enhanced active service card to display service category and client vehicle type in a 2-column grid
- Added badges in nearby requests cards showing service category and vehicle type
- Proper fallback to "No especificado" for null/undefined values
- Added test IDs: `service-details-info`, `text-service-category`, `text-vehicle-type`, `request-details-{id}`, `badge-service-category-{id}`, `badge-vehicle-type-{id}`

### December 2025 - Error Handling Improvements (Fase 1)
**Analytics Admin (`client/src/pages/admin/analytics.tsx`):**
- Added retry logic (2 retries, 1s delay) to all useQuery hooks
- Implemented ErrorCard component with retry buttons for individual charts
- Added global error banner when connection issues occur
- Added "Retry All" button to reload all failed queries
- Export buttons disabled when errors are present

**Driver History (`client/src/pages/driver/history.tsx`):**
- Added retry logic (2 retries, 1s delay) to services query
- Implemented full-screen error state with retry button
- Added missing service states to statusColors/statusLabels maps (`conductor_en_sitio`, `cargando`)

### December 2025 - Admin Panel Improvements
**Bug Fixes:**
- `client/src/pages/admin/analytics.tsx` - Fixed blank screen by adding missing MapPin import

**UI Cleanup:**
- `client/src/components/layout/AdminLayout.tsx` - Removed Documents and Insurance Verification modules from sidebar (now automated with Verifik). Cleaned unused imports (FolderOpen, Shield).

**Feature Enhancements:**
- `client/src/pages/admin/monitoring.tsx` - Implemented auto-focus feature that calculates centroid of active operators and adjusts map zoom dynamically based on operator spread.

### December 2025 - Code Cleanup
**Files Removed:**
- `client/src/pages/auth/register.tsx` - Obsolete file replaced by `onboarding-wizard.tsx`
- `client/src/components/maps/GoogleMap.tsx` - Unused file (app uses Mapbox)

**Code Cleaned:**
- `client/src/lib/maps.ts` - Removed unused `loadGoogleMapsScript` function (Google Maps legacy code)

**Technical Debt Identified:**
- `server/routes.ts` (8,128 lines) - Consider modular split
- `server/storage.ts` (3,791 lines) - Consider modular split
- `shared/schema.ts` (1,958 lines) - Consider domain-based organization
- Enum `servicio_categoria` contains both "camiones_pesados" and "vehiculos_pesados" for backward compatibility
- `client/src/pages/driver/dashboard.tsx` line 726 - LSP type error with ConfirmDialogProps (pre-existing)