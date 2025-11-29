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

## System Architecture

### UI/UX Decisions
The design system uses Inter font with Grúa RD brand colors: navy blue (`#0F2947`) as primary and orange (`#F5A623`) as accent, leveraging `shadcn/ui` and Tailwind CSS for a mobile-first, responsive PWA. It supports a light mode with dark mode preparation. Client and Driver interfaces utilize a `MobileLayout` with bottom navigation, while the Admin interface uses an `AdminLayout` with a sidebar. The PWA is configured for standalone installation with the Grúa RD logo integrated across all interfaces.

### Technical Implementations
Grúa RD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. PostgreSQL (Neon) with Drizzle ORM manages the database. Authentication uses Passport.js with local strategy and bcrypt. Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Mapbox GL JS handles mapping, routing, and geocoding with react-map-gl as the React wrapper. State management is done with TanStack Query (React Query v5). The project maintains a modular structure.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based authentication (Client/Driver/Admin) with Passport.js, bcrypt, session management.
- **Client Features**: Map-based service requests, real-time GPS tracking, service history, user profiles, automatic price calculation.
- **Driver Features**: Dashboard with requests, accept/reject services, real-time GPS updates, status management, service history, availability toggle, truck information.
- **Admin Features**: Dashboard with statistics, user/driver management, real-time service monitoring, dynamic tariff configuration (CRUD), insurance claim validation, analytics with heatmap and KPIs, annual document validation, ticket support system management.
- **Real-time Communication**: WebSockets for location updates and client-driver chat with message persistence.
- **Push Notifications**: Web Push API integration for service updates and chat messages.
- **PWA Capabilities**: `manifest.json` for installability, service worker (`sw.js`) for static asset caching and offline support.
- **Payment Integration**: Azul Payment Gateway (Dominican local provider) for card payments, cash payment option, automatic 70/30 commission split between drivers and platform, DataVault tokenization for storing driver card information, HOLD/POST/REFUND/VOID transaction support, PDF receipt generation.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, responsive mobile-first design.
- **Monitoring & Logging**: Structured logging with Winston for server operations.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID validation, phone OTP/SMS verification, admin verification panel.
- **Document Management**: Document upload system with Replit Object Storage, admin review, driver document status tracking, automated notifications, availability validation based on documents.
- **Production Readiness**: Environment variables documentation, pre-deployment validation, deployment guide, Capacitor configuration for Android APK, Lighthouse optimization.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs (e.g., ASSA, Connect), policy validation, towing authorization requests, claim submission.
- **Intermediate Service States**: Granular service states (`conductor_en_sitio`, `cargando`) for detailed tracking.
- **Support Ticket System**: Complete ticket management for clients and drivers (/client/support, /driver/support) with category-based tickets (technical, service inquiry, complaint, suggestion, payment issue), priority levels (low, medium, high, urgent), state tracking (open, in_process, resolved, closed), message threading, and admin panel (/admin/tickets) for queue management, ticket assignment, and statistics.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM for type-safe data access. WebSocket communication employs service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage utilizes Replit Object Storage with strict authorization. Azul Payment Gateway integration prioritizes server-side processing with HOLD/POST flow for transaction safety, webhook verification for payment confirmation, and automatic commission distribution (70% driver, 30% platform). Insurance API integrations use an Adapter pattern.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API for routing, Geocoding API for address lookup.
- **Waze**: Deep links for driver navigation to service locations.
- **Azul Payment Gateway**: Dominican payment provider for card transactions, tokenization (DataVault), HOLD/POST/REFUND operations.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery.

## Module Development Progress

### Phase 2 - Advanced Features ✅ COMPLETED
- **Module 2.1**: Real-time location tracking and GPS updates ✅ Completed
- **Module 2.2**: Insurance company portal and integration ✅ Completed
- **Module 2.3**: Admin dashboard with statistics and analytics ✅ Completed
- **Module 2.4**: Azul Payment Gateway Integration ✅ Completed - Full implementation with DataVault tokenization, HOLD/POST flow, retry logic, commission management
- **Module 2.5**: Partner/investor portal ✅ Completed - Full dashboard with ROI, distributions, PDF financial statements, admin management
- **Module 2.6**: Annual document validation system ✅ Completed - Automatic reminders, suspension on expiry, renewal portal
- **Module 2.7**: Support ticket system ✅ Completed - Full implementation with 12 API endpoints, categories, priorities, and admin management
- **Module 2.8**: Predefined chat messages ✅ Completed - Role-based quick messages for clients and drivers

### Phase 3 - Quality & Optimization ✅ COMPLETED
- **Module 3.3**: Rating System ✅ Completed
  - POST /api/services/:id/calificar endpoint with 1-5 star ratings
  - StarRating reusable component
  - RatingModal integration in tracking and history pages
  - Driver rankings with visual stars in admin analytics

- **Module 3.4**: PWA Optimization ✅ Completed
  - Service Worker v5.0 with Background Sync
  - InstallPWA component for app installation prompt
  - UpdateAvailable component for version updates
  - OfflineIndicator for connection status

- **Module 3.5**: Security Improvements ✅ Completed
  - Authentication added to /api/maps endpoints
  - Rate limiting on /api/pricing/calculate (30/15min)
  - Privacy policy page (/privacy-policy)
  - Privacy policy links in auth flows

- **Module 3.6**: Monitoring & Logging ✅ Completed
  - GET /api/health - General system health check
  - GET /api/health/db - Database connectivity and statistics
  - GET /api/health/stripe - Stripe integration status
  - GET /api/health/alerts - System alerts with metrics and warnings

- **Module 3.7**: Documentation ✅ Completed
  - API.md - Complete API documentation
  - DEPLOYMENT.md - Deployment guide
  - ENV_VARS.md - Environment variables reference

- **Module 3.8**: Production Preparation ✅ Completed
  - scripts/seed-production.ts - Seed data for new deployments
  - scripts/production-checklist.ts - Pre-production verification
  - scripts/pre-deploy-check.ts - Deployment validation

## Recent Changes (November 29, 2025)

### Mapbox Migration - COMPLETED

**Key Changes:**
- Migrated from Google Maps API to Mapbox GL JS for all mapping functionality
- Created new `MapboxMap` component (`client/src/components/maps/MapboxMap.tsx`) with:
  - Interactive markers with click callbacks
  - Route line rendering between two points
  - Click-to-select location with reverse geocoding
  - Fit bounds for multiple markers
  - Heatmap visualization component for admin analytics
- Updated `client/src/lib/maps.ts` utility functions:
  - `getWazeNavigationUrl(lat, lng)`: Generate Waze deep links for driver navigation
  - `reverseGeocode(lat, lng)`: Fetch address from coordinates using Mapbox Geocoding API
- Updated backend API routes in `server/routes.ts`:
  - `POST /api/maps/calculate-route`: Uses Mapbox Directions API for distance/duration
  - `POST /api/maps/geocode`: Uses Mapbox Geocoding API for address lookup
- Added Waze navigation buttons in driver dashboard for quick navigation to service locations
- Updated all pages using maps: client home, driver dashboard, admin analytics

**Environment Variables Required:**
- `MAPBOX_ACCESS_TOKEN`: Backend access token for Mapbox APIs
- `VITE_MAPBOX_ACCESS_TOKEN`: Frontend access token for Mapbox GL JS

**Libraries Added:**
- `mapbox-gl`: Core Mapbox GL JS library
- `react-map-gl`: React wrapper for Mapbox GL JS
- `@types/mapbox-gl`: TypeScript definitions

---

### Module 3.6: Monitoring & Logging - COMPLETED

**New API Endpoints:**
- `GET /api/health/db` - Detailed database health check with stats
- `GET /api/health/payments` - Azul Payment Gateway status verification
- `GET /api/health/alerts` - System alerts monitoring (critical/warning/info)

**System Alerts Monitoring:**
- Detects pending services older than 30 minutes
- Monitors driver availability
- Tracks expiring and expired documents
- Flags urgent support tickets

### Module 3.8: Production Preparation - COMPLETED

**New Scripts:**
- `scripts/seed-production.ts` - Creates admin user, default tariffs, and insurance company placeholders
- `scripts/production-checklist.ts` - Comprehensive pre-launch verification (environment, database, files, security)

**Usage:**
```bash
tsx scripts/seed-production.ts      # Initialize production data
tsx scripts/production-checklist.ts  # Verify production readiness
```

---

## Previous Changes (November 28, 2025)

### Predefined Chat Messages - COMPLETED (Module 2.8)

**Files Modified:**
- `client/src/components/chat/ChatBox.tsx`: Added role-based quick messages with:
  - `QUICK_MESSAGES_CLIENTE`: 4 predefined messages for clients ("¿Cuánto falta para que llegues?", "¿Dónde estás?", "Necesito más tiempo", "Gracias")
  - `QUICK_MESSAGES_CONDUCTOR`: 5 predefined messages for drivers ("Voy en camino, llego en 5 minutos", "Estoy cerca", "He llegado al punto", "Necesito que salgas del vehículo", "Todo listo, nos vamos")
  - Required `userType` prop ('cliente' | 'conductor') to differentiate message templates
  - `sanitizeTestId()` function for stable data-testid generation (removes accents and special characters)

- `client/src/pages/client/tracking.tsx`: Updated ChatBox with `userType="cliente"`
- `client/src/pages/driver/dashboard.tsx`: Updated ChatBox with `userType="conductor"`

### Partner/Investor Portal - COMPLETED (Module 2.5)

**Files Created/Modified:**
- `migrations/0005_socios_portal.sql`: Database migration for socios and distribuciones_socios tables
- `shared/schema.ts`: Added socios and distribucionesSocios tables with relations
- `server/storage.ts`: Added storage methods for partner management (createSocio, getSocioById, getAllSocios, updateSocio, getDistribucionesBySocioId, getResumenSocio, getSociosStats)
- `server/routes.ts`: 12 new endpoints for partner portal:
  - Partner endpoints: `/api/socio/dashboard`, `/api/socio/distribuciones`, `/api/socio/resumen`, `/api/socio/estado-financiero/:periodo`
  - Admin endpoints: `/api/admin/socios` (CRUD), `/api/admin/socios/stats`, `/api/admin/distribuciones/calcular`, `/api/admin/distribuciones/:id/aprobar`, `/api/admin/distribuciones/:id/pagar`
- `client/src/pages/socio/dashboard.tsx`: Full partner dashboard with KPIs (participation %, investment, total received, ROI), distribution history, charts, PDF download
- `client/src/pages/admin/socios.tsx`: Admin panel for partner management with creation, toggle status, distribution calculation, approval, and payment workflows
- `client/src/App.tsx`: Added routes for `/socio` and `/admin/socios`

### Azul Payment Gateway Integration - COMPLETED (Module 2.4)

**Files Created/Modified:**
- `server/services/azul-payment.ts`: Complete Azul Payment Service with:
  - processPayment, holdFunds, captureHold, voidTransaction, refundTransaction
  - createDataVaultToken for storing driver cards
  - verifyTransaction for checking transaction status
  - Retry logic with exponential backoff (up to 3 attempts)
  - Comprehensive error code mapping (AZUL_ERROR_CODES) with Spanish messages
  - Network error handling

- `shared/schema.ts`: Added azulTransactionId to servicios and comisiones; added azulMerchantId and azulCardToken to conductores

- `server/routes.ts`: New endpoints:
  - `POST /api/drivers/azul-card-token`: Driver card tokenization via DataVault
  - `GET /api/drivers/azul-card-status`: Check if driver has stored card token
  - `DELETE /api/drivers/azul-card-token`: Remove driver's stored card
  - `GET /api/payments/:servicioId/status`: Payment status polling for clients
  - `POST /api/admin/comisiones/:id/payout-azul`: Admin manual payout using Azul
  - `POST /api/admin/comisiones/:id/mark-paid`: Admin mark commission as paid manually
  - `GET /api/drivers/mis-comisiones`: Get driver's commissions summary

- `server/storage.ts`: New storage methods:
  - `getComisionById`: Get commission by ID with details
  - `getComisionesByConductor`: Get all commissions for a conductor
  - `updateComisionNotas`: Update commission notes
  - Updated `marcarComisionPagada` to use azulTransactionId

- `migrations/0004_azul_payment_integration.sql`: Database migration for Azul columns and indexes

**Key Implementation Details:**
- Azul authentication via MerchantID and AuthKey (SHA256 hash generation)
- HOLD/POST flow: Client requests payment → HOLD created → Webhook triggers POST to capture → Commission split (70/30) → Automatic payout to conductor if DataVault token exists
- Commission system: 70% to conductor, 30% to platform
- Manual transfer handling since Azul lacks Stripe Connect equivalent
- Retry logic for network errors (up to 3 attempts with exponential backoff)
- User-friendly Spanish error messages for all Azul error codes

**Environment Variables Required:**
- `AZUL_MERCHANT_ID`: Merchant identifier from Azul
- `AZUL_AUTH_KEY`: Authentication key from Azul
- `AZUL_API_URL`: API endpoint (default: https://api.azul.com.do/webservices/API_Operation/processTransaction)