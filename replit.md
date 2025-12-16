# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) designed for the Dominican Republic, connecting users with tow truck services and drivers in real-time. It aims to streamline service requests, enable real-time tracking, and efficiently manage operations. The platform provides distinct interfaces for Clients, Drivers, Administrators, and an enterprise portal for B2B clients, with the vision of revolutionizing the local tow truck service industry by offering advanced features and a robust user experience.

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
- **Authentication & Security**: Role-based access with Passport.js, dual-account system.
- **Client Features**: Map-based service requests, real-time tracking, service history, price calculation, insurance document management, draggable pins for origin/destination.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS, availability toggle, specialized truck management, Operator Wallet System, multi-vehicle support, extended destination option.
- **Admin Features**: Dashboard with analytics, user/driver/enterprise management, real-time service monitoring, dynamic tariff configuration, document validation, support ticket system.
- **Enterprise Portal (B2B)**: Business management, contract/tariff configuration, project tracking, scheduled services, invoicing.
- **Real-time Communication**: WebSockets for location updates, chat, automatic service cancellation.
- **Push Notifications**: Web Push API and Capacitor.
- **PWA & Native Capabilities**: Installable PWA with Capacitor integration.
- **Payment Integration**: Azul API for card payments, cash, automatic 80/20 commission splitting, operator wallet with scheduled payouts and same-day withdrawals, PDF receipts.
- **Robust UX**: Skeleton loaders, empty states, dialogs, toast notifications, form validations, responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation (Verifik OCR API), phone OTP/SMS verification, admin verification panel.
- **Document Management**: Upload system with Replit Object Storage, admin review.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs.
- **Intermediate Service States**: Granular service states for tracking.
- **Support Ticket System**: Comprehensive management.
- **Negotiation Chat System**: Dual chat for standard and extraction services with price proposals.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage uses Replit Object Storage or filesystem storage based on environment. Azul API payment integration uses server-side processing with webhook verification. Insurance API integrations use an Adapter pattern. Performance optimizations include smart location tracking, lazy loading of map components, consolidated API endpoints, self-hosted fonts, enhanced service worker, role-based preloading, React Query optimizations, and dynamic preconnect by role, with significant TTFB reductions. Session management uses a PostgreSQL session store with `connect-pg-simple`. Cedula validation allows the same cedula across multiple account types belonging to the same person.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API, Geocoding API.
- **Waze**: Deep links for driver navigation.
- **Azul API**: Payment gateway for Dominican Republic.
- **Web Push API**: For push notifications.
- **Replit Object Storage**: For document storage (default in Replit).
- **Twilio**: SMS service for OTP delivery (via Replit Connector).
- **Resend**: Email service for transactional emails and notifications (via Replit Connector).
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins.
- **Jest**: Unit and integration testing framework.
- **Playwright**: E2E testing.
- **Jira REST API**: For ticket synchronization with Jira Cloud (requires manual configuration of secrets).

## Recent Changes

### December 16, 2025 - Jira REST API Integration
- **Feature**: Full integration with Jira REST API for synchronizing support tickets.
- **Configuration Required**: The following environment variables must be set as secrets:
  - `JIRA_BASE_URL`: Your Jira Cloud instance URL (e.g., `https://your-domain.atlassian.net`)
  - `JIRA_EMAIL`: The email associated with your Atlassian account
  - `JIRA_API_TOKEN`: API token generated from https://id.atlassian.com/manage-profile/security/api-tokens
  - `JIRA_PROJECT_KEY`: The project key where tickets will be created (e.g., `GRUA` or `SUPPORT`)
- **API Endpoints**:
  - `GET /api/admin/jira/status` - Check Jira connection status
  - `POST /api/admin/tickets/:id/sync-jira` - Create Jira issue from local ticket
  - `POST /api/admin/tickets/:id/sync-jira-status` - Pull status from Jira to local
  - `POST /api/admin/tickets/:id/push-jira-status` - Push local status to Jira
  - `POST /api/admin/tickets/:id/jira-comment` - Add comment to Jira issue
  - `POST /api/admin/jira/bulk-sync` - Bulk sync multiple tickets to Jira
- **Features**:
  - Bidirectional status synchronization
  - Priority mapping (baja→Low, media→Medium, alta→High, urgente→Highest)
  - Category labels for issue classification
  - Comment syncing with author attribution
  - Bulk operations support
- **Database Changes**: 
  - New columns on `tickets` table: `jira_issue_id`, `jira_issue_key`, `jira_synced_at`
- **Files Added/Modified**:
  - `server/services/jira-service.ts` - Jira REST API service
  - `server/routes.ts` - Jira integration API routes
  - `shared/schema.ts` - Schema updates for Jira fields
  - `migrations/0014_jira_integration.sql` - Database migration

### December 16, 2025 - System Error Tracking and Auto-Ticketing
- **Feature**: Comprehensive error handling system with automatic ticket creation and classification.
- **Error Classification**: 
  - User errors (ValidationError, AuthenticationError, NotFoundError, etc.) - No tickets created
  - System errors (DatabaseError, ExternalApiError, PaymentError, etc.) - Automatic ticket creation
- **Deduplication**: SHA256 fingerprinting with 1-hour window prevents duplicate tickets for same error
- **Severity Escalation**: Uses `Math.max()` to ensure severity never downgrades (critical stays critical)
- **Email Notifications**: High and critical errors send email notifications to admin@fourone.com.do via Resend
- **Admin Routes**: 
  - `POST /api/admin/tickets/manual` - Create tickets manually
  - `GET /api/admin/system-errors` - List all system errors
  - `GET /api/admin/system-errors/unresolved` - List unresolved errors
  - `GET/PUT /api/admin/system-errors/:id` - View/update specific error
- **Database Tables**: 
  - `systemErrors` table with fingerprint, severity, source, type, occurrenceCount, status
  - Enums: error_severity (low/medium/high/critical), error_source, error_type
  - New columns on tickets: autoCreated, errorFingerprint, sourceComponent
- **Files Added/Modified**:
  - `server/errors/app-errors.ts` - Error classification hierarchy
  - `server/services/system-error-service.ts` - Deduplication and ticket creation logic
  - `server/middleware/error-handler.ts` - Express error handling middleware
  - `shared/schema.ts` - Database schema for system errors
  - `server/storage.ts` - Storage methods for system errors
  - `server/routes.ts` - Admin API routes
  - `server/index.ts` - Middleware integration

### December 12, 2025 - Operator Bank Account Management
- **Feature**: Added bank account management for operators.
- **Driver Profile**: Operators can now add/edit their bank account information (bank name, account type, account number, account holder name, cédula) in their profile page via a new BankAccountModal component.
- **Admin Panel**: The admin wallets page now displays operator bank account information in the statement tab, allowing admins to see bank details when processing payouts.
- **Security**: Account numbers are masked in the UI (only last 4 digits shown) for both operator and admin views.
- **Files Changed**: 
  - `client/src/pages/driver/profile.tsx` - Added bank account card and modal integration
  - `client/src/pages/admin/wallets.tsx` - Added bank account display in statement tab
  - `shared/schema.ts` - Updated OperatorStatementSummary type to include bankAccount
  - `server/storage.ts` - Updated getOperatorStatement to fetch and return bank account data
- **Database**: Uses `operatorBankAccounts` table with fields: banco, tipoCuenta, numeroCuenta, nombreTitular, cedula, estado

### December 11, 2025 - License Category Storage Fix
- **Issue**: License category was not being saved after OCR scan of the back of the driver's license. This caused drivers to remain with pending validation and unable to activate services.
- **Root Cause**: The `/api/identity/scan-license-back` endpoint was only performing OCR scan and returning results, but not persisting the extracted category to the database.
- **Fix**: Modified the endpoint to save `licenciaCategoria`, `licenciaCategoriaVerificada`, `licenciaRestricciones`, and `licenciaFechaVencimiento` to the `conductores` table after a successful scan.
- **Files Changed**: `server/routes.ts` (lines 2278-2316)
- **Note**: Drivers who previously scanned their license back will need to re-scan after deploying this fix to have their category saved.