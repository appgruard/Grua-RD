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
    - **Data Implementation**: Schema updated to track `tiempo_espera_real`, `eta_original`, `distancia_recorrida_operador`, and `monto_total_servicio`.
- **Communications Panel**: Dashboard for email communications with statistics (total, successful, failed emails), email history table with filtering, and test template functionality.
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
  - **Runtime Token Endpoint**: `GET /public-config` returns MapBox token at runtime for native mobile apps (Capacitor)
  - **Fallback Strategy**: Web apps use `VITE_MAPBOX_ACCESS_TOKEN` at build time; native apps fetch from `/public-config` endpoint
  - **Client Hook**: `useMapboxToken()` hook in `client/src/hooks/use-public-config.ts` handles both strategies
- **Waze**: Deep links for driver navigation.
- **Azul API**: Payment gateway for Dominican Republic (mTLS with digital certificates).
  - **Estado**: 3D Secure 2.0 integrado y probado en sandbox. LISTO PARA PRODUCCION.
  - **Certificado**: app.gruard.com.bundle.crt (incluye CA de Azul)
  - **Merchant ID Sandbox**: 39038540035
  - **Auth Headers**: splitit (para transacciones estandar) / 3dsecure (para 3DS 2.0)
  - **Ruta en servidor**: /opt/certificados/gruard/ (CapRover) -> /etc/azul/certs/ (container)
  - **3DS 2.0 Endpoints**:
    - `POST /api/azul/3ds/initiate` - Iniciar pago con autenticacion 3DS
    - `POST /api/azul/3ds/method-notification` - Callback del 3DS Method
    - `POST /api/azul/3ds/callback` - Callback del desafio 3DS
    - `GET /api/azul/3ds/status/:sessionId` - Consultar estado de sesion 3DS
  - **Flujos 3DS soportados**:
    - Frictionless (sin friccion): Aprobacion automatica sin intervencion del usuario
    - 3DS Method: Recoleccion de datos del navegador antes del desafio
    - Challenge (desafio): Redireccion a la pagina del emisor para autenticacion
  - **OrderNumber**: Maximo 15 digitos numericos (timestamp + sufijo aleatorio)
  - **CONFIGURACION PRODUCCION** - Secrets requeridos:
    - `AZUL_MERCHANT_ID` - ID del comercio en produccion (diferente al sandbox)
    - `AZUL_AUTH_KEY` - Llave de autenticacion para transacciones estandar
    - `AZUL_AUTH_3DS` - Llave de autenticacion para 3D Secure 2.0
    - `AZUL_ENVIRONMENT` - Cambiar a `production` (actualmente usa `sandbox`)
    - `AZUL_CERT_PATH` - Ruta al certificado SSL (default: /etc/azul/certs/app.gruard.com.bundle.crt)
    - `AZUL_KEY_PATH` - Ruta a la llave privada (default: /etc/azul/certs/app.gruard.com.key)
    - `APP_BASE_URL` - URL base de la app (default: https://app.gruard.com)
  - **PROTECCION PRODUCCION**: El sistema bloquea automáticamente los pagos si `AZUL_ENVIRONMENT=production` y faltan credenciales o certificados. Esto previene pagos accidentales con configuración incorrecta.
  - **NOTA PRODUCCION**: Las sesiones 3DS se almacenan en memoria. Para produccion multi-instancia, migrar a Redis o PostgreSQL.
- **Web Push API**: For push notifications.
- **Replit Object Storage**: For document storage.
- **Twilio**: SMS service for OTP delivery.
- **Resend**: Email service for transactional emails and notifications.
- **Verifik**: OCR scanning and Dominican government database verification for cédula validation.
- **Capacitor**: For native mobile app functionalities and plugins.
- **Jest**: Unit and integration testing framework.
- **Playwright**: E2E testing.
- **Jira REST API**: For ticket synchronization with Jira Cloud.

## Mobile Build Configuration

### Capacitor Setup
- **App ID**: `com.fouronesolutions.gruard`
- **App Name**: Grúa RD
- **Web Directory**: `dist/public`
- **Installed Plugins**: @capacitor/app, @capacitor/camera, @capacitor/filesystem, @capacitor/geolocation, @capacitor/network, @capacitor/push-notifications

### Android Configuration
- **Min SDK**: 23 (Android 6.0)
- **Target SDK**: 35
- **Java Version**: 21
- **Signing**: Environment variables required for release builds:
  - `ANDROID_KEYSTORE_PATH`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- **Permissions**: Internet, Network State, Location (Fine/Coarse), Camera, Storage, Push Notifications, Vibrate

### iOS Configuration
- **Deployment Target**: iOS 14.0
- **Bundle ID**: `com.fouronesolutions.gruard`
- **Entitlements**: Push Notifications (development)
- **Permissions**: Camera, Photo Library, Location (When In Use, Always)

### Build Commands
```bash
# Build web assets
npm run build

# Sync Capacitor (after any web changes)
npx cap sync

# Build debug APK (requires Android SDK)
./scripts/build-android.sh debug

# Build release APK (requires signing config)
./scripts/build-android.sh release

# Build iOS (requires Xcode on macOS)
./scripts/build-ios.sh debug
./scripts/build-ios.sh release
```

### GitHub Actions Workflows
- `.github/workflows/build-android.yml` - Builds APK on PRs, release APK/AAB on tags
- `.github/workflows/build-ios.yml` - Builds for simulator on PRs, IPA on tags

### Known Issues
- **Capacitor CLI 7.x Template Bug**: The template.js file in `@capacitor/cli` needs patching. The patch is included in GitHub Actions workflows and should be applied after npm install in CI environments.