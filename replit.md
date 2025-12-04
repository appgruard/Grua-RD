# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) for the Dominican Republic, connecting users with tow truck services and drivers in real-time. It streamlines service requests, facilitates real-time tracking, and efficiently manages operations. The platform offers distinct interfaces for Clients, Drivers, and Administrators, alongside an enterprise portal for B2B clients, aiming to transform the local tow truck service industry.

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
The system uses a design focused on a mobile-first, responsive PWA, built with `shadcn/ui` and Tailwind CSS. It features a light mode with dark mode preparation, using Inter font and Grúa RD brand colors (`#0F2947`, `#F5A623`). Client and Driver interfaces use a `MobileLayout` with bottom navigation, while Admin and Enterprise interfaces use `AdminLayout` or `EmpresaLayout` with sidebars. The PWA is configured for standalone installation with Capacitor for native mobile capabilities.

### Technical Implementations
Grúa RD uses a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. It integrates PostgreSQL (Neon) with Drizzle ORM. Passport.js handles authentication (local strategy, bcrypt). Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Mapbox GL JS with react-map-gl is used for mapping, routing, and geocoding. State management is handled by TanStack Query (React Query v5). The project maintains a modular structure and integrates Capacitor for native mobile functionality.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based access (Client/Driver/Admin/Empresa) with Passport.js, bcrypt, and session management.
- **Client Features**: Map-based service requests, real-time tracking, service history, automatic price calculation, and insurance document management.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS updates, availability toggle, and specialized truck/vehicle management per service category.
- **Admin Features**: Dashboard with analytics, user/driver/enterprise management, real-time service monitoring, dynamic tariff configuration, document validation, and support ticket system.
- **Enterprise Portal (B2B)**: Business management, contract/tariff configuration, project tracking, scheduled services, and invoicing.
- **Real-time Communication**: WebSockets for location updates, client-driver chat, and automatic service cancellation.
- **Push Notifications**: Web Push API and Capacitor for service updates and chat messages.
- **PWA & Native Capabilities**: Installable PWA with service worker and full Capacitor integration for Android/iOS, including native plugins.
- **Payment Integration**: Azul Payment Gateway (Dominican provider) for card payments (HOLD/POST/REFUND/VOID), cash option, automatic commission splitting, and PDF receipt generation.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, and responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation (Verifik OCR API), phone OTP/SMS verification, and admin verification panel.
- **Document Management**: Upload system with Replit Object Storage, admin review, and automated notifications.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs, policy validation, and claim submission.
- **Intermediate Service States**: Granular service states for detailed tracking.
- **Support Ticket System**: Comprehensive management for clients and drivers.
- **Negotiation Chat System**: Dual chat for standard and extraction services, with price proposal/acceptance flows, media sharing, and new service categories (`remolque_plataforma`, `remolque_motocicletas`, `extraccion`).

### System Design Choices
The system leverages PostgreSQL with Drizzle ORM. WebSocket communication uses service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage uses Replit Object Storage with strict authorization. Azul Payment Gateway integration prioritizes server-side processing with a HOLD/POST flow and webhook verification. Insurance API integrations use an Adapter pattern. Driver profile API is optimized for single-call data retrieval. Service auto-cancellation uses atomic updates and real-time notifications. The vehicle-per-category system enforces unique constraints for driver and category.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API, Geocoding API.
- **Waze**: Deep links for driver navigation.
- **Azul Payment Gateway**: Dominican payment provider for card transactions, tokenization, HOLD/POST/REFUND operations.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery (via Replit Connector).
- **Resend**: Email service for transactional emails and notifications (via Replit Connector).
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins (e.g., Camera, Filesystem, Geolocation, Push Notifications, Network, App).
- **Jest**: Unit and integration testing framework with ts-jest for TypeScript support.
- **Playwright**: E2E testing for browser-based testing.

## Testing Infrastructure
The project includes a comprehensive testing setup:
- **Unit Tests** (`test/`): Jest-based tests for services like chat-amount-detector and service-priority
- **Integration Tests** (`test/`): Scenario-based tests for negotiation flows
- **E2E Tests** (`e2e/`): Playwright tests for full user journey testing
- **Configuration**: `jest.config.cjs` for Jest, `playwright.config.ts` for Playwright
- **Run tests**: `npx jest --config=jest.config.cjs` for unit/integration, `npx playwright test` for E2E

## Recent Changes

### 2025-12-04: Operator Wallet System - Phases 1-3 Complete
- **WalletService Created** (`server/services/wallet.ts`):
  - Commission calculation (20% on cash payments)
  - Debt creation with 15-day due date
  - Payment processing for cash and card services
  - Direct debt payment with card support
  - Automatic overdue debt checking (hourly job)
  - Cash service blocking/unblocking
  - Push notifications for debt alerts
  - Admin adjustment capabilities
  - Chronological debt ordering (oldest first)
  - Floating-point safe comparisons (0.01 tolerance)
- **Storage Methods Added** (`server/storage.ts`):
  - 15 wallet-related methods in IStorage interface
  - Full implementation for wallet CRUD operations
  - Debt management with days remaining calculation
  - Overdue and near-due debt queries
  - Idempotency check via `getTransactionByPaymentIntentId`
- **API Endpoints with Validation** (`server/routes.ts`):
  - `GET /api/wallet` - Get operator wallet with details
  - `GET /api/wallet/transactions` - Transaction history
  - `GET /api/wallet/debts` - Pending debts list
  - `GET /api/wallet/can-accept-cash` - Check cash acceptance
  - `POST /api/wallet/process-payment` - Validates service amount and payment method against servicio record
  - `POST /api/wallet/create-payment-intent` - Prepare debt payment
  - `POST /api/wallet/pay-debt` - Explicit overpayment rejection, idempotency protection
  - Admin endpoints for wallet management and statistics
- **Security**: Idempotency checks prevent double-application of payments. Stripe PaymentIntent verification documented as production requirement (see `WALLET_IMPLEMENTATION_PLAN.md`)

### 2025-12-04: Operator Wallet System - Phase 1 (Data Model)
- **New Tables Created** (`shared/schema.ts`):
  - `operator_wallets`: Stores operator balance, total debt, and service blocking status
  - `wallet_transactions`: Complete transaction history (cash commissions, card payments, debt payments, direct payments, withdrawals, adjustments)
  - `operator_debts`: Individual debt records with 15-day due date tracking
- **New Enums**: `tipo_transaccion_billetera` (transaction types), `estado_deuda` (debt status: pending, partial, paid, overdue)
- **Modified `servicios` table**: Added `commission_processed` boolean field to prevent duplicate commission processing
- **TypeScript Types**: Insert schemas, select schemas, and inferred types for all new wallet entities
- **Drizzle Relations**: Proper relationships between wallets, transactions, debts, conductores, and servicios
- **Database Migration**: Successfully pushed schema changes to PostgreSQL
- **Documentation**: Updated `WALLET_IMPLEMENTATION_PLAN.md` with Phase 1 completion status

### 2025-12-04: Responsiveness Improvements
- **Driver Extraction Evaluation Screen** (`driver/extraction-evaluation.tsx`): Improved mobile responsiveness with adaptive map height, reduced padding, responsive text sizes, and better form spacing for small screens.
- **Driver Dashboard** (`driver/dashboard.tsx`): Fixed mobile layout with adaptive panel heights, responsive grid layouts, compact navigation buttons, and optimized text/badge sizes for small screens.
- **Bug Fix**: Corrected ConfirmDialog component props in dashboard (confirmText→confirmLabel, isLoading→loading).
- **Documentation**: Updated `PLAN_CORRECCIONES_RESPONSIVIDAD.md` with detailed change logs.

### Pending Tasks
- **Wallet System Phase 4**: Build operator wallet UI components
- **Wallet System Phase 5**: Add notifications and alerts
- **Wallet System Phase 6**: Admin panel for wallet management (optional)
- Task 5: Update status messages in client tracking screen (change "Conductor" to "Operador")
- Task 6: Complete terminology changes across remaining files (tracking.tsx, history.tsx, solicitudes.tsx)