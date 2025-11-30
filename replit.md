# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) designed to connect users needing tow truck services with available drivers in real-time within the Dominican Republic. Its primary purpose is to streamline tow truck requests, real-time tracking, and service management. The platform aims to revolutionize the tow truck service industry in the region, featuring distinct interfaces for Clients, Drivers, and Administrators.

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
The design system uses Inter font with Grúa RD brand colors: navy blue (`#0F2947`) as primary and orange (`#F5A623`) as accent. It leverages `shadcn/ui` and Tailwind CSS for a mobile-first, responsive PWA, supporting a light mode with dark mode preparation. Client and Driver interfaces use a `MobileLayout` with bottom navigation, while the Admin interface uses an `AdminLayout` with a sidebar. The PWA is configured for standalone installation.

### Technical Implementations
Grúa RD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. It uses PostgreSQL (Neon) with Drizzle ORM for database management. Authentication is handled by Passport.js with local strategy and bcrypt. Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Mapbox GL JS with react-map-gl is used for mapping, routing, and geocoding. State management relies on TanStack Query (React Query v5). The project adheres to a modular structure.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based (Client/Driver/Admin) with Passport.js, bcrypt, session management.
- **Client Features**: Map-based requests, real-time tracking, service history, profiles, automatic price calculation.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS updates, status management, availability toggle, truck information.
- **Admin Features**: Dashboard with statistics, user/driver management, real-time service monitoring, dynamic tariff configuration (CRUD), insurance claim validation, analytics with heatmap, annual document validation, ticket support system.
- **Real-time Communication**: WebSockets for location updates and client-driver chat.
- **Push Notifications**: Web Push API for service updates and chat messages.
- **PWA Capabilities**: `manifest.json` for installability, service worker for caching and offline support.
- **Payment Integration**: Azul Payment Gateway (Dominican provider) for card payments, cash option, automatic 70/30 commission split, DataVault tokenization, HOLD/POST/REFUND/VOID transactions, PDF receipt generation.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation with Verifik OCR API, phone OTP/SMS verification, admin verification panel. Cédula scanning is mandatory for drivers during registration and optional for clients (required before adding payment methods).
- **Document Management**: Upload system with Replit Object Storage, admin review, status tracking, automated notifications, availability validation.
- **Production Readiness**: Environment variables, pre-deployment validation, deployment guide, Capacitor configuration for Android APK, Lighthouse optimization.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs, policy validation, towing authorization, claim submission.
- **Intermediate Service States**: Granular service states (`conductor_en_sitio`, `cargando`) for detailed tracking.
- **Support Ticket System**: Complete management for clients and drivers with category-based tickets, priority levels, state tracking, message threading, and admin panel for queue management.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security measures include bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage is on Replit Object Storage with strict authorization. Azul Payment Gateway integration prioritizes server-side processing with a HOLD/POST flow, webhook verification, and automatic commission distribution. Insurance API integrations use an Adapter pattern.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API for routing, Geocoding API for address lookup.
- **Waze**: Deep links for driver navigation.
- **Azul Payment Gateway**: Dominican payment provider for card transactions, tokenization (DataVault), HOLD/POST/REFUND operations.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery. Configured via Replit Connector (connection:conn_twilio_01KB9WVTM5Z8DY14CV50JWTYHP).
- **Resend**: Email service for transactional emails and notifications. Configured via Replit Connector (connection:conn_resend_01KB9X4F9ETMAVF38PMRQR6VR8).
- **Verifik**: OCR scanning (`/v2/ocr/scan-prompt`) and Dominican government database verification (`/v2/do/cedula`) for cédula validation.

## Notification Services Configuration

### SMS Service (Twilio via Replit Connector)
- **File**: `server/sms-service.ts`
- **Integration**: Twilio connector managed by Replit
- **Features**: OTP codes, service notifications
- **Fallback**: Mock service for development when Twilio is not configured

### Email Service (Resend via Replit Connector)
- **File**: `server/email-service.ts`
- **Integration**: Resend connector managed by Replit
- **Features**: 
  - OTP verification emails
  - Welcome emails
  - Password reset emails
  - Service notifications
  - Document approval/rejection notifications
- **Fallback**: Mock service for development when Resend is not configured

## Recent Changes

### November 30, 2025 - Service Auto-Cancellation and API Optimization
- **Automatic Service Cancellation**: Services not accepted by operators within 10 minutes are automatically cancelled
  - Atomic UPDATE...RETURNING pattern to prevent race conditions
  - Push notifications sent to clients when services are auto-cancelled
  - WebSocket broadcasts for real-time UI updates
  - Configurable timeout (SERVICE_TIMEOUT_MINUTES)
  - File: `server/services/service-auto-cancel.ts`
- **Driver Profile API Optimization**: Combined endpoint reduces API calls
  - New endpoint: `GET /api/drivers/me/full` consolidates driver data, documents, services, and identity status
  - Parallel queries for improved performance
  - Reduces page load from 4+ API calls to 1
  - File: `server/routes.ts`
- **Storage Layer Updates**: 
  - `cancelExpiredServicios()` now returns cancelled service records for notifications
  - `getRecentlyCancelledServices()` for querying recently cancelled services
  - File: `server/storage.ts`

### November 30, 2025 - Notification Services Integration (Twilio + Resend)
- **SMS Service**: Updated to use Replit Twilio Connector for OTP delivery
  - Lazy initialization for credentials from Replit Connector API
  - Fallback to mock service in development
  - File: `server/sms-service.ts`
- **Email Service**: New service using Resend via Replit Connector
  - OTP verification emails with branded HTML templates
  - Welcome emails for new users
  - Password reset emails
  - Service notifications
  - Document approval/rejection emails
  - File: `server/email-service.ts`
- **Routes Updated**: `server/routes.ts` now uses async SMS service initialization

### November 30, 2025 - Driver Service Specialization and Verifik Validation Display
- **Service Categories**: Drivers can now select multiple service categories and subtypes during registration and edit them post-registration
- **New Component**: `ServiceCategoryMultiSelect.tsx` with 6 service categories:
  - Remolque Estándar (Standard Tow)
  - Auxilio Vial (Roadside Assistance)
  - Remolque Especializado (Specialized Tow)
  - Camiones Pesados (Heavy Trucks)
  - Izaje y Construcción (Lifting & Construction)
  - Remolque Recreativo (Recreational Towing)
- **Onboarding Wizard Updates**:
  - New step 5: "Servicios Ofrecidos" for service selection
  - TOTAL_STEPS increased from 6 to 7
  - Services saved via PUT /api/drivers/me/servicios
- **Driver Profile Updates**:
  - New "Servicios Ofrecidos" section with view/edit mode
  - New "Verificación de Identidad" section showing Verifik validation status and score
  - Visual progress bar for validation score with color coding
- **Admin Panel Updates**:
  - New "Servicios" column with expandable service badges
  - New "Verificación" column with Verifik score display
  - Tooltips showing service subtypes and validation details
- **Key Files Modified**:
  - `client/src/components/ServiceCategoryMultiSelect.tsx`
  - `client/src/pages/auth/onboarding-wizard.tsx`
  - `client/src/pages/driver/profile.tsx`
  - `client/src/pages/admin/drivers.tsx`

### November 29, 2025 - Multiple Insurance Documents Support
- **Client Insurance**: Clients can now upload multiple insurance documents for different vehicles
- **API Changes**: 
  - `POST /api/client/insurance` now adds documents without deleting existing ones
  - Added `vehiculoDescripcion` field to identify which vehicle the insurance is for
  - `GET /api/client/insurance` returns array of all documents
  - `GET /api/client/insurance/status` returns counts (approved, pending, rejected) plus backward-compatible single status
  - `DELETE /api/client/insurance/:documentId` deletes specific document with ownership validation
- **Frontend**: ClientInsuranceManager component updated to display list of insurances with add/delete functionality
- **Storage**: Added `getAllClientInsuranceDocuments(userId)` function