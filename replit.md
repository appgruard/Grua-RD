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
- **Payment Integration**: Stripe Elements for card payments, cash payment option, Stripe Connect for driver payouts (70/30 commission), PDF receipt generation.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, responsive mobile-first design.
- **Monitoring & Logging**: Structured logging with Winston for server operations.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID validation, phone OTP/SMS verification, admin verification panel.
- **Document Management**: Document upload system with Replit Object Storage, admin review, driver document status tracking, automated notifications, availability validation based on documents.
- **Production Readiness**: Environment variables documentation, pre-deployment validation, deployment guide, Capacitor configuration for Android APK, Lighthouse optimization.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs (e.g., ASSA, Connect), policy validation, towing authorization requests, claim submission.
- **Intermediate Service States**: Granular service states (`conductor_en_sitio`, `cargando`) for detailed tracking.
- **Support Ticket System**: Complete ticket management for clients and drivers (/client/support, /driver/support) with category-based tickets (technical, service inquiry, complaint, suggestion, payment issue), priority levels (low, medium, high, urgent), state tracking (open, in_process, resolved, closed), message threading, and admin panel (/admin/tickets) for queue management, ticket assignment, and statistics.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM for type-safe data access. WebSocket communication employs service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage utilizes Replit Object Storage with strict authorization. Stripe integration prioritizes server-side processing and webhook verification. Insurance API integrations use an Adapter pattern.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Google Maps Platform**: Maps JavaScript API, Distance Matrix API, Geocoding API, Visualization library.
- **Stripe**: Payment gateway for processing transactions (Stripe Elements, Stripe Connect, Stripe Payment Methods API).
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery.