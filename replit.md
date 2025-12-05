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
Grúa RD uses a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. It integrates PostgreSQL (Neon) with Drizzle ORM. Authentication is handled by Passport.js (local strategy, bcrypt). Real-time features are powered by WebSockets (`ws` library). Mapbox GL JS with react-map-gl is used for mapping, routing, and geocoding. State management is handled by TanStack Query (React Query v5). The project maintains a modular structure and integrates Capacitor for native mobile functionality.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based access with Passport.js and session management.
- **Client Features**: Map-based service requests, real-time tracking, service history, automatic price calculation, and insurance document management.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS updates, availability toggle, and specialized truck/vehicle management per service category. Includes an Operator Wallet System for commission calculation, debt management, and payment processing.
- **Admin Features**: Dashboard with analytics, user/driver/enterprise management, real-time service monitoring, dynamic tariff configuration with subcategory support (allowing independent pricing per service type), document validation, and support ticket system.
- **Enterprise Portal (B2B)**: Business management, contract/tariff configuration, project tracking, scheduled services, and invoicing.
- **Real-time Communication**: WebSockets for location updates, client-driver chat, and automatic service cancellation.
- **Push Notifications**: Web Push API and Capacitor for service updates and chat messages.
- **PWA & Native Capabilities**: Installable PWA with full Capacitor integration for Android/iOS.
- **Payment Integration**: dLocal payment gateway (único proveedor) for card payments with authorization/capture flow, cash option, automatic 80/20 commission splitting with dLocal fee tracking, operator wallet system with scheduled payouts (Mondays/Fridays) and same-day withdrawals (100 DOP commission), and PDF receipt generation with Grúa RD branding.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, and responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation (Verifik OCR API), phone OTP/SMS verification, and admin verification panel.
- **Document Management**: Upload system with Replit Object Storage, admin review, and automated notifications.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs, policy validation, and claim submission.
- **Intermediate Service States**: Granular service states for detailed tracking.
- **Support Ticket System**: Comprehensive management for clients and drivers.
- **Negotiation Chat System**: Dual chat for standard and extraction services, with price proposal/acceptance flows, media sharing, and new service categories.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage uses Replit Object Storage with strict authorization. dLocal payment integration uses server-side processing with authorization/capture flow, automatic fee tracking, and webhook verification. Insurance API integrations use an Adapter pattern. Driver profile API is optimized for single-call data retrieval. Service auto-cancellation uses atomic updates and real-time notifications. The vehicle-per-category system enforces unique constraints for driver and category. Performance optimizations include smart location tracking with movement thresholds, lazy loading of map components, and consolidated API endpoint `/api/drivers/init` for fast driver dashboard loading. Loading optimizations include self-hosted fonts, an enhanced service worker, role-based preloading, AuthProvider cookie optimization, specialized skeleton screens, React Query optimizations, an `OptimizedImage` component, and dynamic preconnect by role. Web Vitals tracking and custom page load metrics are implemented, with an analytics API endpoint for data reception. TTFB optimizations include aggressive cache headers for static assets (fonts: 1 year immutable, hashed JS/CSS: 1 year immutable), X-Response-Time header for monitoring, Early Hints via Link headers for font preloading and Mapbox preconnect, and fast-path middleware to skip logging for static assets. These optimizations improved TTFB from 814ms to 13ms (-98%).

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API, Geocoding API.
- **Waze**: Deep links for driver navigation.
- **dLocal**: Payment gateway for Dominican Republic - card payments, payouts to banks, authorization/capture flow, and commission tracking.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery (via Replit Connector).
- **Resend**: Email service for transactional emails and notifications (via Replit Connector).
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins.
- **Jest**: Unit and integration testing framework.
- **Playwright**: E2E testing.