# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) designed for the Dominican Republic to connect users with tow truck services and drivers in real-time. It aims to streamline service requests, enable real-time tracking, and efficiently manage operations. The platform offers distinct interfaces for Clients, Drivers, Administrators, and an enterprise portal for B2B clients, with the vision of revolutionizing the local tow truck service industry.

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

### Servicio al Cliente y Contacto
- **Dirección Física:** CARRT. JUAN BOSCH C/ PRINCIPAL #106, CANCA LA REYNA, ESPAILLAT, República Dominicana.
- **Contactos:**
  - General: info@gruard.com
  - Soporte: support@gruard.com
  - Pagos: payments@gruard.com
  - Celular: 8293519324

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based access, dual-account system.
- **Client Features**: Map-based service requests, real-time tracking, service history, price calculation, insurance document management, draggable pins.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS, availability toggle, specialized truck management, Operator Wallet System, multi-vehicle support, extended destination.
- **Admin Features**: Dashboard with analytics, user/driver/enterprise management, real-time service monitoring, dynamic tariff configuration, document validation, support ticket system with Jira integration.
- **Enterprise Portal (B2B)**: Business management, contract/tariff configuration, project tracking, scheduled services, invoicing.
- **Real-time Communication**: WebSockets for location updates, chat, automatic service cancellation, negotiation chat.
- **Service Cancellation Plan (In Progress)**: 
    - **Proportional Penalties**: Charges based on a percentage of the total service cost, not fixed amounts.
    - **Distance-Based Calculation**: Penalties adjusted according to distance traveled by the driver (e.g., higher if >10km).
    - **Time & Delay Justification**: Customers can cancel without penalty if the operator exceeds the Estimated Time of Arrival (ETA) by a defined margin (taking traffic into account).
    - **Driver Compensation**: Ensures drivers are compensated for expenses incurred before cancellation.
    - **No Rating Penalty for Customers**: Rating remains unaffected by cancellations.
    - **Status Tracking**: Justifications for penalties/exonerations stored for transparency.
- **Notifications**: Web Push API, Capacitor push notifications, email (Resend).
- **Payment Integration**: Azul API for card payments, cash, automatic commission splitting, operator wallet with scheduled payouts and same-day withdrawals, PDF receipts.
- **Robust UX**: Skeleton loaders, empty states, dialogs, toast notifications, form validations, responsive design.
- **Monitoring & Logging**: Structured logging with Winston and intelligent system error tracking, auto-ticketing, priority assignment, and noise filtering.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation (Verifik OCR API), phone OTP/SMS verification (Twilio), admin verification panel, license category persistence.
- **Document Management**: Upload system with Replit Object Storage, admin review.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs.
- **Intermediate Service States**: Granular service states for tracking.
- **Operator Bank Account Management**: Drivers can add/edit bank account info, visible to admins for payout processing.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage uses Replit Object Storage or filesystem storage. Azul API payment integration uses server-side processing with webhook verification. Insurance API integrations use an Adapter pattern. Performance optimizations include smart location tracking, lazy loading, consolidated API endpoints, self-hosted fonts, enhanced service worker, role-based preloading, React Query optimizations, and dynamic preconnect by role, with significant TTFB reductions. Session management uses a PostgreSQL session store with `connect-pg-simple`. Cedula validation allows the same cedula across multiple account types belonging to the same person.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API, Geocoding API.
- **Waze**: Deep links for driver navigation.
- **Azul API**: Payment gateway for Dominican Republic.
- **Web Push API**: For push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery.
- **Resend**: Email service for transactional emails and notifications.
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins.
- **Jest**: Unit and integration testing framework.
- **Playwright**: E2E testing.
- **Jira REST API**: For ticket synchronization with Jira Cloud.