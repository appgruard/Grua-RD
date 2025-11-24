# GruaRD - Plataforma de Servicios de Grúa

## Overview
GruaRD is a Progressive Web App (PWA) designed to connect users needing tow truck services with available drivers in real-time within the Dominican Republic, similar to Uber. Its primary purpose is to streamline tow truck requests, real-time tracking, and service management, with a vision to revolutionize the tow truck service industry in the region. The platform features distinct interfaces for Clients, Drivers, and Administrators.

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
The design system uses Inter font with a primary blue color (`#2563eb`), leveraging `shadcn/ui` and Tailwind CSS for a mobile-first, responsive PWA. It supports a light mode with dark mode preparation. Client and Driver interfaces utilize a `MobileLayout` with bottom navigation, while the Admin interface uses an `AdminLayout` with a sidebar. The PWA is configured for standalone installation.

### Technical Implementations
GruaRD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. PostgreSQL (Neon) with Drizzle ORM manages the database. Authentication uses Passport.js with local strategy and bcrypt. Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Google Maps JavaScript API handles mapping, distance, and geocoding. State management is done with TanStack Query (React Query v5). The project maintains a modular structure.

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
- **Identity & Compliance**: Multi-step onboarding wizard (email, Dominican ID validation with Luhn algorithm, phone OTP/SMS verification via Twilio with mock fallback), admin verification panel with audit logging, rate limiting, and E2E testing utilities. Object storage with graceful degradation.
- **Document Management & Operational Security**: API endpoints for secure document upload/download (presigned URLs), admin review system (approve/reject with reasons), automated push notifications for document status, and comprehensive audit logging. Security hardening includes Helmet.js with CSP, enhanced CORS, HSTS, and rate limiting on critical endpoints.
- **Financial Compliance & Payments**: Stripe Connect for automated driver payouts (70%), professional PDF receipt generation with branding and financial breakdown, comprehensive payment method management (Stripe Payment Methods API) for clients, and robust webhook handling for payment events.
- **Production Preparation (Pending)**: Capacitor configuration for Android APK, Lighthouse optimization, error monitoring (Sentry).

### System Design Choices
The system uses PostgreSQL with Drizzle ORM for type-safe data access. WebSocket communication employs service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage utilizes Replit Object Storage with strict authorization. Stripe integration prioritizes server-side processing and webhook verification.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Google Maps Platform**: Maps JavaScript API, Distance Matrix API, Geocoding API.
- **Stripe**: Payment gateway for processing transactions (Stripe Elements, Stripe Connect, Stripe Payment Methods API).
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery.