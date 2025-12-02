# Grúa RD - Plataforma de Servicios de Grúa

## Overview
Grúa RD is a Progressive Web App (PWA) designed for the Dominican Republic to connect users needing tow truck services with available drivers in real-time. The platform aims to streamline tow truck requests, facilitate real-time tracking, and manage services efficiently. It features distinct interfaces for Clients, Drivers, and Administrators, and includes an enterprise portal for B2B clients, revolutionizing the local tow truck service industry.

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
The design system uses Inter font with Grúa RD brand colors: navy blue (`#0F2947`) and orange (`#F5A623`). It leverages `shadcn/ui` and Tailwind CSS for a mobile-first, responsive PWA, supporting a light mode with dark mode preparation. Client and Driver interfaces utilize a `MobileLayout` with bottom navigation, while Admin and Enterprise interfaces use `AdminLayout` or `EmpresaLayout` with sidebars. The PWA is configured for standalone installation, with Capacitor integration for native mobile app capabilities.

### Technical Implementations
Grúa RD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. It uses PostgreSQL (Neon) with Drizzle ORM. Authentication is handled by Passport.js with local strategy and bcrypt. Real-time features, including GPS tracking and chat, are powered by WebSockets (`ws` library). Mapbox GL JS with react-map-gl is used for mapping, routing, and geocoding. State management relies on TanStack Query (React Query v5). The project adheres to a modular structure and integrates Capacitor for native mobile functionality.

### Feature Specifications
**Core Features:**
- **Authentication & Security**: Role-based (Client/Driver/Admin/Empresa) with Passport.js, bcrypt, session management.
- **Client Features**: Map-based requests, real-time tracking, service history, profiles, automatic price calculation, multiple insurance document management.
- **Driver Features**: Request dashboard, accept/reject services, real-time GPS updates, status management, availability toggle, truck information, service category specialization, vehicle-per-category management (one vehicle with photo, plate, color, and capacity per service category).
- **Admin Features**: Dashboard with statistics, user/driver/enterprise management, real-time service monitoring, dynamic tariff configuration, insurance claim validation, analytics, document validation, ticket support system.
- **Enterprise Portal (B2B)**: Dedicated portal for businesses with employee management, contract/tariff configuration, project tracking, scheduled services, and invoicing.
- **Real-time Communication**: WebSockets for location updates and client-driver chat, automatic service cancellation.
- **Push Notifications**: Web Push API and Capacitor native push notifications for service updates and chat messages.
- **PWA & Native Capabilities**: `manifest.json` for installability, service worker for caching, and full Capacitor integration for Android/iOS with native plugins for location tracking and other device features.
- **Payment Integration**: Azul Payment Gateway (Dominican provider) for card payments (HOLD/POST/REFUND/VOID), cash option, automatic commission split, PDF receipt generation.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation with Verifik OCR API and government database verification, phone OTP/SMS verification, admin verification panel.
- **Document Management**: Upload system with Replit Object Storage, admin review, status tracking, automated notifications.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs, policy validation, towing authorization, claim submission.
- **Intermediate Service States**: Granular service states for detailed tracking.
- **Support Ticket System**: Complete management for clients and drivers with category-based tickets, priority levels, state tracking, and admin panel.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security measures include bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage is on Replit Object Storage with strict authorization. Azul Payment Gateway integration prioritizes server-side processing with a HOLD/POST flow, webhook verification, and automatic commission distribution. Insurance API integrations use an Adapter pattern. Driver profile API is optimized for single-call data retrieval. Service auto-cancellation employs atomic updates and real-time notifications. Vehicle-per-category system uses unique constraint (conductorId, categoria) with active-only filtering for matching and acceptance flows.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API for routing, Geocoding API for address lookup.
- **Waze**: Deep links for driver navigation.
- **Azul Payment Gateway**: Dominican payment provider for card transactions, tokenization (DataVault), HOLD/POST/REFUND operations.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery (via Replit Connector).
- **Resend**: Email service for transactional emails and notifications (via Replit Connector).
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins (e.g., Camera, Filesystem, Geolocation, Push Notifications, Network, App).

## Deployment Configuration
- **CapRover**: Production deployment via Docker multi-stage build (Node 20 Alpine)
- **Container Port**: 80 (standard for CapRover)
- **Health Check**: `/health` endpoint for container monitoring
- **CORS**: Configured for web domains, plus `capacitor://`, `ionic://`, and `file://` schemes for mobile apps
- **API URL**: Use `VITE_API_URL` environment variable to configure production server URL for mobile builds
- **Documentation**: See `DEPLOYMENT_CAPROVER.md` for full deployment guide and `CAPACITOR_BUILD_GUIDE.md` for mobile app builds