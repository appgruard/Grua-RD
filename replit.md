# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) designed for the Dominican Republic to connect users with tow truck services and drivers in real-time. It aims to streamline service requests, enable real-time tracking, and efficiently manage operations. The platform provides distinct interfaces for Clients, Drivers, Administrators, and an enterprise portal for B2B clients, with the goal of revolutionizing the local tow truck service industry.

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
The system features a mobile-first, responsive PWA built with `shadcn/ui` and Tailwind CSS. It uses a light mode with dark mode preparation, Inter font, and Grúa RD brand colors. Client and Driver interfaces utilize a `MobileLayout` with bottom navigation, while Admin and Enterprise interfaces use `AdminLayout` or `EmpresaLayout` with sidebars. The PWA is configured for standalone installation with Capacitor for native mobile capabilities.

### Technical Implementations
Grúa RD uses a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. It integrates PostgreSQL (Neon) with Drizzle ORM. Authentication is handled by Passport.js (local strategy, bcrypt). Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Mapbox GL JS with react-map-gl is used for mapping, routing, and geocoding. State management is handled by TanStack Query (React Query v5). The project maintains a modular structure and integrates Capacitor for native mobile functionality.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based access (Client/Driver/Admin/Empresa) with Passport.js, bcrypt, and session management.
- **Client Features**: Map-based service requests, real-time tracking, service history, automatic price calculation, and insurance document management.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS updates, availability toggle, and specialized truck/vehicle management per service category. Includes an Operator Wallet System for commission calculation, debt management, and payment processing with push notifications for debt alerts.
- **Admin Features**: Dashboard with analytics, user/driver/enterprise management, real-time service monitoring, dynamic tariff configuration, document validation, and support ticket system.
- **Enterprise Portal (B2B)**: Business management, contract/tariff configuration, project tracking, scheduled services, and invoicing.
- **Real-time Communication**: WebSockets for location updates, client-driver chat, and automatic service cancellation.
- **Push Notifications**: Web Push API and Capacitor for service updates and chat messages.
- **PWA & Native Capabilities**: Installable PWA with service worker and full Capacitor integration for Android/iOS.
- **Payment Integration**: Azul Payment Gateway for card payments (HOLD/POST/REFUND/VOID), cash option, automatic commission splitting, and PDF receipt generation.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, and responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation (Verifik OCR API), phone OTP/SMS verification, and admin verification panel.
- **Document Management**: Upload system with Replit Object Storage, admin review, and automated notifications.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs, policy validation, and claim submission.
- **Intermediate Service States**: Granular service states for detailed tracking.
- **Support Ticket System**: Comprehensive management for clients and drivers.
- **Negotiation Chat System**: Dual chat for standard and extraction services, with price proposal/acceptance flows, media sharing, and new service categories.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage uses Replit Object Storage with strict authorization. Azul Payment Gateway integration prioritizes server-side processing with a HOLD/POST flow and webhook verification. Insurance API integrations use an Adapter pattern. Driver profile API is optimized for single-call data retrieval. Service auto-cancellation uses atomic updates and real-time notifications. The vehicle-per-category system enforces unique constraints for driver and category. Performance optimizations include smart location tracking with movement thresholds, lazy loading of map components, and consolidated API endpoint `/api/drivers/init` for fast driver dashboard loading.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API, Geocoding API.
- **Waze**: Deep links for driver navigation.
- **Azul Payment Gateway**: Dominican payment provider for card transactions.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery (via Replit Connector).
- **Resend**: Email service for transactional emails and notifications (via Replit Connector).
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins.
- **Jest**: Unit and integration testing framework.
- **Playwright**: E2E testing.

## Recent Changes (December 2024)

### Extraction Service Flow Improvements
- Modified extraction-evaluation.tsx to require operators to review chat/evidence before entering proposed amounts
- Added two-step flow: Step 1 (Evaluate Situation via Chat) must be completed before Step 2 (Propose Price)
- State tracking with `hasViewedChat` ensures operators cannot skip evaluation step

### Service Rejection System
- Added `dismissed_services` database table with unique constraint on (conductor_id, servicio_id)
- New API endpoint: POST `/api/services/:id/dismiss` for drivers to reject services
- Dismissed services are filtered out from nearby-requests list
- Added frontend mutation and onClick handler to "Rechazar" button in driver dashboard

### Service Category Filtering
- Updated `/api/drivers/nearby-requests` endpoint to filter by driver's service categories and vehicle capabilities
- Drivers only see services matching their registered categories AND having appropriate vehicles
- Services with null category default to 'remolque_estandar' for backwards compatibility

### Tariff Category Assignment (December 2024)
- Added `servicioCategoria` field to tarifas table using the existing service category enum
- Updated admin pricing page (`/admin/pricing`) with category selector dropdown
- Tariffs can now be assigned to specific service categories for differentiated pricing
- UI groups tariffs by category for better organization

### Operator Wallet Earnings Tracking (December 2024)
- Added `totalCashEarnings` and `totalCardEarnings` fields to operator_wallets table
- WalletService now tracks earnings separately by payment method:
  - Cash: Operator keeps 100% physically, owes 20% commission as debt
  - Card: Platform takes 20%, 80% added to operator balance
- Updated WalletSection UI to display earnings breakdown (cash vs card)
- Updated admin wallets page with new earnings columns in table and detail view
- Color-coded display: amber for cash earnings, blue for card earnings

### Admin Panel Evaluation Document (December 2024)
- Created comprehensive ADMIN_PANEL_EVALUATION.md analyzing all 14 admin modules
- Identified 32 improvement opportunities across categories:
  - High Priority: Pagination, advanced filters, alerts, service details
  - Medium Priority: Driver dashboards, automated reports, manual interventions
  - Low Priority: Self-service portals, API integrations, chat support
- Document serves as roadmap for future admin panel enhancements

### Driver Dashboard Performance Optimization (December 2024)
Optimized the driver app's initial loading time after first login with the following changes:

**Backend Optimizations:**
1. Created new `getActiveServiceByConductorId()` function in storage.ts
   - Uses targeted query to find only active services (states: aceptado, conductor_en_sitio, cargando, en_progreso)
   - Replaces inefficient pattern of fetching ALL conductor services and filtering client-side
   - Uses Drizzle's `findFirst` with `or()` operator for optimal single-record retrieval

2. Created new `getWalletSummaryByConductorId()` function in storage.ts
   - Returns only essential wallet fields: id, balance, totalDebt, cashServicesBlocked
   - Eliminates unnecessary joins and queries for pendingDebts and recentTransactions
   - Separate `/api/wallet` endpoint still provides full details when needed

3. Updated `/api/drivers/init` endpoint in routes.ts
   - Uses new optimized functions instead of fetching all data
   - Added documentation comments explaining optimizations
   - All queries still execute in parallel with Promise.all

**Frontend Optimizations:**
1. Enhanced `preload.ts` with aggressive preloading:
   - Added `scheduleImmediateTask()` using queueMicrotask for critical resources
   - Added `addDnsPrefetch()` for faster DNS resolution to Mapbox servers
   - Created `preloadMapboxModule()` to cache MapboxMap import promise
   - Driver modules now load immediately without waiting for idle callback
   - Reduced prefetch endpoints to only `/api/drivers/init` (consolidated endpoint)
   - Increased fetch priority for Mapbox style with `priority: 'high'`

**Performance Impact:**
- Reduced database queries from 4 (with full data) to 4 (with minimal data)
- Eliminated fetching all historical services when only active service needed
- Eliminated wallet debt/transaction sub-queries during init
- Faster module loading with immediate scheduling instead of idle callbacks
- DNS prefetch reduces connection time to Mapbox servers

### Loading Optimization Phase 2 (December 2024)

Implemented comprehensive loading optimizations documented in `LOADING_OPTIMIZATION_PLAN.md`:

**2.1 Self-Hosted Fonts:**
- Downloaded Inter font files (400, 500, 600, 700 weights) to `client/public/fonts/`
- Created `client/src/fonts.css` with `@font-face` declarations and `font-display: swap`
- Removed Google Fonts dependency from `index.html`
- Added `<link rel="preload">` hints for critical font weights

**2.2 Enhanced Service Worker (v6.0):**
- Added new `ASSETS_CACHE` for JS/CSS assets
- Implemented stale-while-revalidate strategy for build chunks
- Cache-first strategy for self-hosted fonts
- Background cache updates without blocking UI

**2.3 Role-Based Preloading:**
- New `preloadByUserType()` function routes preloading by user role
- `preloadFromLastSession()` uses localStorage to hint next session
- Dedicated preload functions: `preloadAdminModules()`, `preloadClientModules()`, `preloadSocioModules()`
- Integrated with AuthProvider's login success handler

**2.4 AuthProvider Cookie Optimization:**
- Added `hasSessionCookie()` check for instant user feedback
- Query is disabled if no session cookie exists
- Eliminates unnecessary API calls for logged-out users
- Immediate redirect to login for unauthenticated visitors

### Loading Optimization Phase 3 (December 2024)

**3.1 Skeleton Screens Mejorados:**
- Created specialized skeletons for each page type in `client/src/components/skeletons/`
- DriverDashboardSkeleton, ClientHomeSkeleton, TrackingSkeleton for main pages
- ProfileSkeleton for user profile pages
- MapSkeleton and FormSkeleton for reusable components
- All skeletons exported from `index.ts` barrel file

**3.2 React Query Optimizations:**
- Added `gcTime: 10 minutes` for extended cache retention
- Set `staleTime: 5 minutes` for data freshness
- Configured `refetchOnMount: false` to prevent unnecessary refetches
- Added `refetchOnReconnect: 'always'` for connection recovery

**3.3 OptimizedImage Component:**
- Created `client/src/components/ui/OptimizedImage.tsx`
- Uses IntersectionObserver for viewport-based lazy loading
- Shows skeleton while loading with smooth fade-in
- Supports fallback images on error
- Separate `wrapperClassName` and `imageClassName` props for proper styling
- ProfileImage variant for avatar use cases

**3.4 Dynamic Preconnect por Rol:**
- Script in `index.html` that executes before React
- Reads `lastUserType` from localStorage
- Adds dns-prefetch and preconnect for Mapbox URLs for conductor/cliente users
- Works in both development and production environments