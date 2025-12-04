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