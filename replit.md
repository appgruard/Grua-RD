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
Grúa RD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. PostgreSQL (Neon) with Drizzle ORM manages the database. Authentication uses Passport.js with local strategy and bcrypt. Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Google Maps JavaScript API handles mapping, distance, and geocoding. State management is done with TanStack Query (React Query v5). The project maintains a modular structure.

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
- **Google Maps Platform**: Maps JavaScript API, Distance Matrix API, Geocoding API, Visualization library.
- **Azul Payment Gateway**: Dominican payment provider for card transactions, tokenization (DataVault), HOLD/POST/REFUND operations.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery.

## Module Development Progress

### Phase 2 - Advanced Features
- **Module 2.1**: Real-time location tracking and GPS updates ✅ Completed
- **Module 2.2**: Insurance company portal and integration ✅ Completed
- **Module 2.3**: Admin dashboard with statistics and analytics ✅ Completed
- **Module 2.4**: Payment system migration from Stripe to Azul 🔄 **IN PROGRESS** - Core service created (`server/services/azul-payment.ts`), schema updated with Azul fields, payment endpoints converted, webhook handler migrated, migration SQL written
- **Module 2.5**: Partner/investor portal (pending)
- **Module 2.6**: Predefined chat messages (pending)
- **Module 2.7**: Support ticket system ✅ Completed - Full implementation with 9 API endpoints, categories, priorities, and admin management

## Recent Changes (November 28, 2025)

### Azul Payment Gateway Integration (Module 2.4)
**Files Created/Modified:**
- `server/services/azul-payment.ts`: New Azul Payment Service with processPayment, holdFunds, captureHold, voidTransaction, refundTransaction, createDataVaultToken methods
- `shared/schema.ts`: Added azulTransactionId to servicios and comisiones; added azulMerchantId and azulCardToken to conductores
- `server/routes.ts`: 
  - Updated webhook handler for Azul (replacing Stripe webhook)
  - Converted `/api/payments/create-intent` to use Azul HOLD method
  - Converted `/api/payments/create-setup-intent` for conductor token setup
- `migrations/0004_azul_payment_integration.sql`: Database migration for Azul columns and indexes

**Key Implementation Details:**
- Azul authentication via MerchantID and AuthKey (SHA256 hash generation)
- HOLD/POST flow: Client requests payment → HOLD created → Webhook triggers POST to capture → Commission split (70/30) → Automatic payout to conductor using stored DataVault token if available
- Commission system unchanged: 70% to conductor, 30% to platform
- Manual transfer handling since Azul lacks Stripe Connect equivalent
- WebSocket integration ready for real-time payment status updates

**Environment Variables Required:**
- `AZUL_MERCHANT_ID`: Merchant identifier from Azul
- `AZUL_AUTH_KEY`: Authentication key from Azul
- `AZUL_API_URL`: API endpoint (default: https://api.azul.com.do/webservices/API_Operation/processTransaction)

**Next Steps for Module 2.4:**
1. Add endpoint for conductors to store Azul card tokens (DataVault)
2. Add endpoint for manual commission payout processing
3. Implement payment status polling for clients
4. Add comprehensive error handling and retry logic
5. End-to-end payment flow testing