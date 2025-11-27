# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) designed to connect users needing tow truck services with available drivers in real-time within the Dominican Republic, similar to Uber. Its primary purpose is to streamline tow truck requests, real-time tracking, and service management, with a vision to revolutionize the tow truck service industry in the region. The platform features distinct interfaces for Clients, Drivers, and Administrators.

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

**NOTA IMPORTANTE - Claves API:** No configurar claves API (Stripe, Google Maps, Twilio, etc.) hasta finalizar todo el plan de desarrollo. Las pruebas E2E que requieran estas claves deben omitirse durante el desarrollo y ejecutarse solo cuando el proyecto esté listo para producción.

## System Architecture

### UI/UX Decisions
The design system uses Inter font with Grúa RD brand colors: navy blue (`#0F2947`) as primary and orange (`#F5A623`) as accent, leveraging `shadcn/ui` and Tailwind CSS for a mobile-first, responsive PWA. It supports a light mode with dark mode preparation. Client and Driver interfaces utilize a `MobileLayout` with bottom navigation, while the Admin interface uses an `AdminLayout` with a sidebar. The PWA is configured for standalone installation with the Grúa RD logo integrated across all interfaces.

### Technical Implementations
Grúa RD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. PostgreSQL (Neon) with Drizzle ORM manages the database. Authentication uses Passport.js with local strategy and bcrypt. Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Google Maps JavaScript API handles mapping, distance, and geocoding. State management is done with TanStack Query (React Query v5). The project maintains a modular structure.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based authentication (Client/Driver/Admin) with Passport.js, bcrypt, session management.
- **Client Features**: Map-based service requests, real-time GPS tracking, service history, user profiles, automatic price calculation.
- **Driver Features**: Dashboard with requests, accept/reject services, real-time GPS updates, status management, service history, availability toggle, truck information.
- **Admin Features**: Dashboard with statistics, user/driver management, real-time service monitoring, dynamic tariff configuration (CRUD).
- **Real-time Communication**: WebSockets for location updates and client-driver chat with message persistence.
- **Push Notifications**: Web Push API integration for service updates and chat messages.
- **PWA Capabilities**: `manifest.json` for installability, service worker (`sw.js`) for static asset caching and offline support.
- **Payment Integration**: Stripe Elements for card payments, cash payment option.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, responsive mobile-first design.
- **Monitoring & Logging**: Structured logging with Winston for server operations.

**Production-Ready Features (Phase 4):**
- **Workstream A - Identity & Compliance (100% Complete)**: Multi-step onboarding wizard (email, Dominican ID validation with Luhn algorithm, phone OTP/SMS verification via Twilio with mock fallback), admin verification panel with audit logging, rate limiting, and E2E testing utilities. Object storage with graceful degradation.
- **Workstream B - Document Management & Operational Security (100% Complete)**: 
  - Complete document upload system with Replit Object Storage integration (6 required documents: driver's license, vehicle registration, insurance, vehicle photo, ID front/back)
  - Admin document review panel with image/PDF preview, approve/reject workflow with rejection reasons
  - Driver document management interface with status tracking and resubmission capability
  - Automated push notifications for document approval/rejection
  - Availability validation preventing drivers from going online without all approved documents
  - Status badge in driver dashboard showing document completion status
  - Enhanced health check endpoint (`/health`) with database and Object Storage dependency monitoring
  - Security hardening with Helmet.js (CSP, HSTS), enhanced CORS configuration, and rate limiting on critical endpoints (identity verification, OTP)
  - Comprehensive audit logging for all document operations
- **Workstream C - Financial Compliance & Payments (100% Complete)**: Stripe Connect for automated driver payouts with 70/30 commission split, professional PDF receipt generation with branding and financial breakdown, comprehensive payment method management (Stripe Payment Methods API) with full UI for clients, receipt download buttons in both client and driver history pages, and robust webhook handling for payment events.
- **Branding Applied**: Grúa RD logo and brand colors (navy blue #0F2947, orange #F5A623) integrated across all interfaces including login pages, admin sidebar, and client/driver mobile layouts.
- **Production Preparation (Pending)**: Capacitor configuration for Android APK, Lighthouse optimization, error monitoring (Sentry).

### System Design Choices
The system uses PostgreSQL with Drizzle ORM for type-safe data access. WebSocket communication employs service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage utilizes Replit Object Storage with strict authorization. Stripe integration prioritizes server-side processing and webhook verification.

## Recent Changes

### November 26, 2025 - Module 1.9: Insurance Validation System
- **Module 1.9 - Insurance Validation - ✅ COMPLETE**
  - Implemented admin panel for insurance claim validation at `/admin/insurance`
  - Created storage methods for insurance service management:
    - `getServiciosPendientesAseguradora()`: Fetch services awaiting insurance validation
    - `getDocumentosByServicioId()`: Get documents associated with a specific service
    - `aprobarAseguradora()`: Approve insurance claim and notify client
    - `rechazarAseguradora()`: Reject insurance claim with reason and cancel service
  - Created API endpoints:
    - `GET /api/admin/servicios/pendientes-aseguradora`: Get pending insurance services
    - `GET /api/admin/servicios/:id/documentos`: Get documents for a service
    - `POST /api/admin/servicios/:id/aseguradora/aprobar`: Approve insurance claim
    - `POST /api/admin/servicios/:id/aseguradora/rechazar`: Reject insurance claim
    - `GET /api/admin/servicios/aseguradora/all`: Get all insurance services for stats
  - Admin interface features:
    - Statistics cards showing total, pending, approved, and rejected claims
    - Searchable table with client info, insurance company, policy number, vehicle type
    - Status badges with color coding (pending/approved/rejected)
    - Filter by status
    - Review dialog with client details, insurance info, service details
    - Document preview for uploaded files (póliza, matrícula, licencia)
    - Approve/Reject workflow with rejection reason requirement
  - Push notifications sent to clients on approval or rejection
  - Added navigation item in AdminLayout sidebar

### November 25, 2025 - Module 1.8: Admin Dashboard with Real-Time Map
- **Module 1.8 - MÓDULO ADMIN - Dashboard Principal - ✅ COMPLETE**
  - Implemented real-time map with Google Maps API integration
  - Added color-coded markers for drivers:
    - 🟢 Green: Available drivers
    - 🟡 Yellow: Drivers in active service
  - Added red markers for active service requests
  - Implemented interactive InfoWindows showing:
    - Driver details (name, vehicle, license plate, status)
    - Service details (client, status, origin, assigned driver)
  - Integrated WebSocket for real-time location updates
  - Enhanced dashboard metrics with live data:
    - Conductors online (real-time count)
    - Active services (filtered from all services)
  - Auto-refresh every 10 seconds for accuracy
  - Added map legend for marker colors
  - Responsive design with flex layout

### November 25, 2025 - Module 1.6: Intermediate Service States
- **Module 1.6 - Driver Service State Granularity - ✅ COMPLETE**
  - Added intermediate service states: `conductor_en_sitio` and `cargando`
  - Created new API endpoints: `/api/services/:id/arrived` and `/api/services/:id/loading`
  - Implemented linear state machine: aceptado → conductor_en_sitio → cargando → en_progreso → completado
  - Updated driver dashboard with dedicated buttons for each transition
  - Enhanced client tracking interface to display all intermediate states
  - Added push notifications for state transitions
  - Clean database migration targeting only estado_servicio enum changes
  - All code reviewed and approved by architect

### November 24, 2025 - Workstream D Completion
- **Workstream D - Production Readiness & Deployability - 100% Complete**
  - Created comprehensive environment variables documentation (`ENV_VARS.md`)
  - Implemented pre-deployment validation script with database/Stripe/API checks
  - Built complete deployment guide with step-by-step instructions (`DEPLOYMENT.md`)
  - Optimized PWA: Service Worker v4.0, code splitting, SEO enhancements
  - Configured Capacitor for production Android APK builds
  - Created Lighthouse audit documentation and automation script
  - Fixed critical issues identified by architect review:
    - Service Worker runtime cache TTL enforcement (Google Maps 24h)
    - Dynamic SEO meta tags for multi-environment support
  - All production readiness criteria met and architect-approved

### November 24, 2025 - Workstream C Completion  
- **Workstream C - Financial Compliance & Payments - 100% Complete**
  - Added PDF receipt download button in driver history page
  - Completed payment method management UI with Stripe Elements
  - All payment features implemented for clients and drivers

### November 24, 2025 - Brand Name Update
- **Complete rebranding from "GruaRD" to "Grúa RD"** across the entire application
  - Updated all configuration files (manifest.json, capacitor.config.ts, index.html)
  - Updated all React components (AdminLayout, authentication pages: login, register, forgot-password, verify-otp, onboarding-wizard)
  - Updated all documentation files (API.md, all README files, development plans)
  - Updated server-side files (PDF service, routes, SMS service)
  - Brand name now consistently displayed as "Grúa RD" (with space and accent) throughout the application

### Phase 0: Platform Fundamentals - 100% Complete (November 23, 2025)
- Identity verification system with Dominican ID validation
- Document management system with Replit Object Storage
- Payment integration with Stripe Connect
- Security hardening with Helmet.js and rate limiting
- Complete authentication and onboarding flow

### Current Phase: Workstream D - Production Readiness & Deployability - ✅ 100% COMPLETE
Optimized and prepared the application for production deployment with:
1. ✅ Complete environment and secrets management documentation
2. ✅ CI/CD pipeline with automated pre-deployment checks
3. ✅ PWA optimization with code splitting and advanced caching
4. ✅ Capacitor configured for Android APK build

**Completed November 24, 2025**

### Completed: Phase 1 - MVP Operacional (100% COMPLETE - November 26, 2025)

**All Modules Completed:**
- ✅ **Module 1.1: MÓDULO CLIENTE - Solicitar Grúa**
  - Enhanced vehicle type selection (carro, motor, jeep, camión)
  - Location system with Google Maps integration
  - Payment method selection (cash, card, insurance)
  - Request confirmation and submission flow

- ✅ **Module 1.2: MÓDULO CLIENTE - Seguimiento del Servicio**
  - Real-time tracking with WebSocket updates
  - Driver info card with photo, rating, vehicle details
  - Live map with driver location and ETA
  - Service state indicators (searching, assigned, en route, arrived, loading, in progress, completed)

- ✅ **Module 1.3: MÓDULO CLIENTE - Historial y Pagos**
  - Complete service history with filters
  - Stripe payment integration for card payments
  - PDF receipt generation and download
  - Payment method management (add/remove cards)

- ✅ **Module 1.4: MÓDULO OPERADORES - Registro y Validación**
  - Multi-step onboarding wizard for drivers
  - Document upload system (license, registration, insurance, photos)
  - Admin document review and approval workflow
  - Driver status management (pending, approved, rejected)

- ✅ **Module 1.5: MÓDULO OPERADORES - Disponibilidad y Solicitudes**
  - Availability toggle (online/offline)
  - GPS location updates while online
  - Nearby service requests list
  - Accept/reject service workflow with notifications

- ✅ **Module 1.6: Driver Service State Granularity**
  - Intermediate service states (conductor_en_sitio, cargando)
  - Linear state machine with 7 total states
  - Push notifications for each state transition
  - Enhanced UX for both drivers and clients

- ✅ **Module 1.7: MÓDULO OPERADORES - Comisiones y Pagos**
  - Automatic 70/30 commission calculation
  - Stripe Connect for driver payouts
  - Earnings dashboard with filters
  - Service history with payment status

- ✅ **Module 1.8: MÓDULO ADMIN - Dashboard Principal**
  - Real-time map with Google Maps showing all online drivers and active services
  - Color-coded markers (green = available, yellow = in service, red = active request)
  - Interactive InfoWindows with detailed driver and service information
  - WebSocket integration for real-time location updates
  - Enhanced metrics showing live counts (conductors online, active services)

- ✅ **Module 1.9: Insurance Validation System**
  - Admin panel for reviewing insurance claims at `/admin/insurance`
  - Manual approval/rejection workflow with reason requirement
  - Document preview for uploaded insurance files
  - Push notifications to clients on status change
  - Statistics dashboard with pending/approved/rejected counts

- ✅ **Module 1.10: MÓDULO ADMIN - Gestión de Tarifas**
  - CRUD for pricing configuration
  - Vehicle type-specific tariffs
  - Night rate multiplier
  - Dynamic price calculation endpoint

### Current Phase: Phase 2 - Automatizaciones y Portales Avanzados

**Completed Modules:**
- ✅ **Module 2.1: Integración con APIs de Aseguradoras** (Complete - November 26, 2025)
  - Created Adapter pattern infrastructure for insurance company APIs
  - Implemented InsuranceAdapter interface with standardized methods:
    - `validatePolicy()`: Validate policy by number and plate
    - `validatePolicyByCedula()`: Validate by holder's cedula
    - `requestTowingAuthorization()`: Request towing authorization from insurer
    - `submitTowingClaim()`: Submit completed service claim
    - `cancelAuthorization()`: Cancel pending authorization
    - `healthCheck()`: Check adapter connectivity
  - Created adapters for:
    - MockInsuranceAdapter: Development/testing with sample policies
    - ASSAInsuranceAdapter: ASSA Compania de Seguros integration
    - ConnectInsuranceAdapter: Connect Seguros integration
  - Implemented InsuranceValidationService for multi-insurer validation
  - Factory pattern for adapter instantiation and configuration
  - API endpoints:
    - `GET /api/insurance/insurers`: List supported insurers
    - `POST /api/insurance/validate-policy`: Validate policy
    - `POST /api/insurance/validate-by-cedula`: Validate by cedula
    - `POST /api/insurance/request-authorization`: Request towing authorization
    - `POST /api/insurance/submit-claim`: Submit towing claim
    - `POST /api/insurance/cancel-authorization`: Cancel authorization
    - `GET /api/insurance/health`: Check all adapters health (admin only)

- ✅ **Module 2.3: MÓDULO ADMIN - Analítica Avanzada** (Complete - November 26, 2025)
  - Implemented heatmap of service demand zones with Google Maps Visualization library
  - Added advanced KPI cards:
    - Average response time (minutes)
    - Acceptance rate (percentage)
    - Cancellation rate (percentage)
    - Average revenue per service (RD$)
  - Created vehicle type distribution pie chart with revenue breakdown
  - Enhanced analytics dashboard with tabs (Charts, Heatmap, Rankings)
  - Backend endpoints:
    - `GET /api/admin/analytics/heatmap`: Service location data for heatmap
    - `GET /api/admin/analytics/kpis`: Advanced KPI metrics
    - `GET /api/admin/analytics/vehicles`: Vehicle type distribution
    - `GET /api/admin/analytics/pdf`: Export analytics report to PDF
  - Implemented PDF export with professional formatting:
    - KPI section with 4 metric cards
    - Vehicle distribution table
    - Status breakdown
    - Driver rankings (top 10)
  - CSV export with all analytics data
  - Date range filtering for all metrics
  - Graceful degradation when Google Maps API is unavailable

**Pending Modules:**
- 📋 **Module 2.2: MÓDULO ASEGURADORAS - Portal Web** (Pending - Requires schema modification approval)
  - New 'aseguradora' user role (requires shared/schema.ts modification)
  - Insurance company dashboard
  - Service approval/rejection interface
  - Payment tracking and monthly reports

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Google Maps Platform**: Maps JavaScript API, Distance Matrix API, Geocoding API.
- **Stripe**: Payment gateway for processing transactions (Stripe Elements, Stripe Connect, Stripe Payment Methods API).
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery.