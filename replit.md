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
- **Payment Integration**: Azul API payment gateway (migración pendiente) for card payments, cash option, automatic 80/20 commission splitting, operator wallet system with scheduled payouts (Mondays/Fridays) and same-day withdrawals (100 DOP commission), and PDF receipt generation with Grúa RD branding.
- **Robust UX**: Skeleton loaders, empty states, confirmation dialogs, toast notifications, form validations, and responsive design.
- **Monitoring & Logging**: Structured logging with Winston.
- **Identity & Compliance**: Multi-step onboarding, Dominican ID (cédula) validation (Verifik OCR API), phone OTP/SMS verification, and admin verification panel.
- **Document Management**: Upload system with Replit Object Storage, admin review, and automated notifications.
- **Insurance Integration**: Adapter pattern for multiple insurance company APIs, policy validation, and claim submission.
- **Intermediate Service States**: Granular service states for detailed tracking.
- **Support Ticket System**: Comprehensive management for clients and drivers.
- **Negotiation Chat System**: Dual chat for standard and extraction services, with price proposal/acceptance flows, media sharing, and new service categories.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. WebSocket communication utilizes service-specific rooms. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage uses Replit Object Storage with strict authorization. Azul API payment integration (migración pendiente) will use server-side processing with webhook verification. Insurance API integrations use an Adapter pattern. Driver profile API is optimized for single-call data retrieval. Service auto-cancellation uses atomic updates and real-time notifications. The vehicle-per-category system enforces unique constraints for driver and category. Performance optimizations include smart location tracking with movement thresholds, lazy loading of map components, and consolidated API endpoint `/api/drivers/init` for fast driver dashboard loading. Loading optimizations include self-hosted fonts, an enhanced service worker, role-based preloading, AuthProvider cookie optimization, specialized skeleton screens, React Query optimizations, an `OptimizedImage` component, and dynamic preconnect by role. Web Vitals tracking and custom page load metrics are implemented, with an analytics API endpoint for data reception. TTFB optimizations include aggressive cache headers for static assets (fonts: 1 year immutable, hashed JS/CSS: 1 year immutable), X-Response-Time header for monitoring, Early Hints via Link headers for font preloading and Mapbox preconnect, and fast-path middleware to skip logging for static assets. These optimizations improved TTFB from 814ms to 13ms (-98%).

## Recent Changes

### December 2025 - Dual-Account System Implementation
- **Database Schema Change**: Replaced unique constraint on `users.email` with composite unique index on `(email, user_type)`. This allows the same email to be used for both client and driver accounts.
- **Migration 0012**: `migrations/0012_dual_account_email_constraint.sql` drops `users_email_unique` and creates `users_email_user_type_unique` composite index.
- **New Storage Methods**: Added `getUserByEmailAndType(email, userType)` and `getUsersByEmail(email)` to `server/storage.ts` for querying users with dual accounts.
- **Client Profile Enhancement**: Added "¿También eres operador de grúa?" section that redirects to `/auth/onboarding-wizard?tipo=conductor` instead of in-place account conversion.
- **Driver Profile Enhancement**: Added "¿También necesitas servicios de grúa?" section that redirects to `/auth/onboarding-wizard?tipo=cliente` for creating a client account.
- **Empty State Message**: Driver dashboard now shows "Aún no hay servicios cerca de tu zona" when there are no nearby service requests.
- **Registration Flow**: Backend now allows same email/phone for different account types, checking only for duplicates within the same userType.

### December 2025 - Registration Flow Security Improvements
- **Client Email OTP Verification**: Changed client registration from SMS to Email OTP verification. Uses `/api/auth/send-otp` and `/api/auth/verify-otp` endpoints, matching the operator flow. Step 3 of onboarding now shows "Verificación de Correo Electrónico" with email display.
- **Operator Name Editing During Cedula Scan**: Operators can now edit their name and surname before completing cedula verification (Step 2). Includes edit button, form fields initialized from current profile data, and validation for non-empty values.
- **Unverified User Login Block**: Login endpoint now uses synchronous `req.session.destroy()` to prevent unverified users from accessing protected routes. Session is destroyed before 403 response is sent, ensuring no session persistence.
- **Email Validation in OTP Flow**: Added validation in `sendOtpMutation` to ensure email is not empty before sending verification code.

### December 2025 - ID Card (Cédula) Verification Fix
- **New Endpoint for Cédula Images**: Added `GET /api/admin/cedula-image/:userId` endpoint to serve ID card images from Replit Object Storage. Admin-only access with proper authentication.
- **Admin Verification Panel Updated**: Fixed image display in manual verification dialog to use the new endpoint instead of non-existent `/api/documents/view/` path.
- **Onboarding Wizard State Persistence**: Fixed issue where driver verification state was lost on page refresh. Now properly restores `cedulaVerified` state from database when user data loads, using refs to distinguish between hydration and user-initiated userType changes.

### December 2025 - Password Change Feature & Deployment Fixes
- **Password Change in Profiles**: Added `POST /api/users/change-password` endpoint and `ChangePasswordModal` component. Both client and driver profiles now have a "Seguridad" section with "Cambiar Contraseña" button.
- **CapRover Deployment Fixes**: Updated Dockerfile to include all VITE_ build-time variables (VITE_MAPBOX_ACCESS_TOKEN, VITE_VAPID_PUBLIC_KEY, VITE_API_URL). Updated DEPLOYMENT_CAPROVER.md with clear instructions on build-time vs runtime variables.
- **Mobile Build Scripts Enhanced**: All 4 build scripts (cliente/conductor for Android/iOS) now export required VITE_ variables with validation warnings.
- **Azul Integration Status**: Code is COMPLETE. Only missing production credentials (AZUL_MERCHANT_ID, AZUL_AUTH1, AZUL_AUTH2, etc.)

### December 2025 - Multi-Vehicle Operator Support
- **Removed Vehicle-Specific Document Requirements**: Operators can now manage multiple tow trucks without needing to upload vehicle-specific documents (Matrícula del vehículo, Seguro de la grúa, Foto del vehículo) at the operator level. Vehicle documentation is managed per-vehicle in the `conductorVehiculos` table.
- **Dynamic Map Marker Colors**: Admin monitoring page now displays tow truck markers with colors based on the operator's vehicle color input. The first active vehicle's color is used for map representation.
- **Schema Updates**: Added `vehiculos` relation to `conductoresRelations` and `conductorVehiculosRelations` for proper one-to-many relationship between operators and vehicles.
- **Required Documents Simplified**: Driver onboarding and document renewal now only require: Licencia de Conducir, Cédula (Frente/Reverso). Vehicle-specific documents are managed separately.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Mapbox**: Maps (Mapbox GL JS via react-map-gl), Directions API, Geocoding API.
- **Waze**: Deep links for driver navigation.
- **Azul API**: Payment gateway for Dominican Republic (migración pendiente) - card payments, payouts to banks, and commission tracking.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery (via Replit Connector).
- **Resend**: Email service for transactional emails and notifications (via Replit Connector).
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins.
- **Jest**: Unit and integration testing framework.
- **Playwright**: E2E testing.