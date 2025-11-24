# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) designed to connect users needing tow truck services with available drivers in real-time within the Dominican Republic, similar to Uber. Its primary purpose is to streamline tow truck requests, real-time tracking, and service management, with a vision to revolutionize the tow truck service industry in the region. The platform features distinct interfaces for Clients, Drivers, and Administrators.

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

### Next Phase: Phase 1 - MVP Operacional
**Module 1.1: MÓDULO CLIENTE - Solicitar Grúa** (Future)
1. Enhanced vehicle type selection
2. Improved location system with Google Maps
3. Payment method selection (cash, card, insurance)
4. Request confirmation and submission

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Google Maps Platform**: Maps JavaScript API, Distance Matrix API, Geocoding API.
- **Stripe**: Payment gateway for processing transactions (Stripe Elements, Stripe Connect, Stripe Payment Methods API).
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery.