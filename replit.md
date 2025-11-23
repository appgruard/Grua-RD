# GruaRD - Plataforma de Servicios de Grúa

## Overview
GruaRD is a Progressive Web App (PWA) designed to connect users needing tow truck services with available drivers in real-time within the Dominican Republic, similar to Uber. The platform features three distinct interfaces: Client, Driver, and Admin. Its primary purpose is to streamline tow truck requests, real-time tracking, and service management, with a vision to revolutionize the tow truck service industry in the region.

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
The platform provides comprehensive role-based authentication and security, including cédula validation, OTP phone verification, and brute-force protection.
- **Client Features**: Service requests (map-based), real-time tracking, service history, profiles, automatic price calculation.
- **Driver Features**: Dashboard for requests, accept/reject services, real-time GPS, status updates, service history, availability toggle, truck management.
- **Admin Features**: Dashboard with statistics, user/driver management, real-time service monitoring, dynamic tariff configuration.
- **Real-time Communication**: WebSockets for location updates, notifications, and client-driver chat.
- **PWA Capabilities**: `manifest.json` for installability and a service worker (`sw.js`) for static asset caching.
- **Robust Error Handling**: Toasts, visual form alerts, skeleton loaders, empty states, and confirmation dialogs.
- **Document Management**: Secure upload, storage, and management of user and driver documents with admin approval workflows.
- **Payment Integration**: Stripe for secure payments, automatic commission calculation (70/30 split), and PDF receipt generation.
- **Monitoring & Logging**: Structured logging with Winston and a health check endpoint for system status.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM for type-safe data access. WebSocket communication employs service-specific rooms for efficient updates. Security includes bcrypt, HTTP-only session cookies, role-based access control, and Drizzle ORM's SQL injection protection. Document storage utilizes Replit Object Storage, with strict authorization for uploads. Stripe integration prioritizes server-side processing and webhook verification for security.

## External Dependencies
- **PostgreSQL (Neon)**: Main database.
- **Google Maps Platform**: Maps JavaScript API, Distance Matrix API, Geocoding API.
- **Stripe**: Payment gateway for processing transactions.
- **Web Push API**: For sending push notifications.
- **Replit Object Storage**: For document storage.
- **SMS Service**: Placeholder for OTP delivery (Twilio/Infobip/MessageBird planned).