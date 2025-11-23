# GruaRD - Plataforma de Servicios de Grúa

## Overview
GruaRD is a Progressive Web App (PWA) designed to connect users needing tow truck services with available drivers in real-time within the Dominican Republic, similar to Uber. The platform features three distinct interfaces: Client, Driver, and Admin. Its primary purpose is to streamline tow truck requests, real-time tracking, and service management.

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
The design system is based on Inter font, with a primary blue color (`#2563eb`). It utilizes `shadcn/ui` components with Tailwind CSS for a mobile-first, responsive layout. The application currently supports a light mode, with dark mode preparation in place. Client and Driver interfaces use a `MobileLayout` with bottom navigation, while the Admin interface employs an `AdminLayout` with a sidebar. The PWA is configured for standalone installation with appropriate icons and a theme color.

### Technical Implementations
GruaRD is built with a React 18 (TypeScript, Vite) frontend and an Express.js (Node.js) backend. PostgreSQL (Neon) with Drizzle ORM handles database operations. Authentication uses Passport.js with a local strategy and bcrypt for password hashing. Real-time functionalities, including GPS tracking, are managed via WebSockets (ws library). Google Maps JavaScript API is integrated for interactive maps, distance calculations, and geocoding. State management is handled by TanStack Query (React Query v5). The project adheres to a modular structure, separating frontend, backend, and shared schema definitions.

### Feature Specifications
The platform supports comprehensive authentication with role-based access for clients, drivers, and administrators.
- **Authentication & Security (FASE 0.1 - Implementado)**:
  - User registration with Dominican Republic cédula validation (11 digits with verification algorithm)
  - Phone verification via OTP (One-Time Password) system
  - Account status management (pendiente_verificacion, activo, suspendido, rechazado)
  - Password recovery via SMS verification code
  - Zod schema validation for all registration inputs
  - Brute-force protection with attempt limits (max 3 attempts per OTP code)
  - Automatic expiration of verification codes (10 minutes)
- **Client Features**: Service requests with map-based origin/destination, real-time service tracking, service history, user profiles, and automatic price calculation.
- **Driver Features**: Dashboard with nearby requests, ability to accept/reject services, real-time GPS tracking, service status updates, service history, availability toggle, and truck information management.
- **Admin Features**: Dashboard with statistics, user and driver management, real-time service monitoring, and dynamic tariff configuration.
- **Real-time Communication**: WebSocket protocol facilitates real-time location updates for drivers and instant notifications for new service requests and status changes.
- **PWA Capabilities**: Configured `manifest.json` for installability and a service worker (`sw.js`) for static asset caching with a cache-first strategy.
- **Robust Error Handling**: Implemented with toasts for descriptive error messages, visual alerts in forms, and immediate feedback on validations.
- **UX Enhancements**: Includes complete form validations with specific error messages, reusable Skeleton components for loading states, informative Empty States, and confirmation dialogs for critical actions.
- **Chat Functionality**: Real-time chat between clients and drivers, supported by a dedicated database table, API endpoints, and WebSocket events.
- **Push Notifications**: Web Push API integration for critical events like service acceptance, start, completion, and new chat messages.

### System Design Choices
The system uses a PostgreSQL database with Drizzle ORM for type-safe data access. WebSocket communication is optimized by using service-specific rooms to efficiently broadcast location updates and service status changes. Security measures include bcrypt for password hashing, HTTP-only session cookies, role-based access control, and Drizzle ORM's protection against SQL injection.

## External Dependencies
- **PostgreSQL (Neon)**: Main database solution.
- **Google Maps Platform**:
    - **Maps JavaScript API**: For interactive map displays.
    - **Distance Matrix API**: For calculating travel times and distances.
    - **Geocoding API**: For converting addresses to geographical coordinates and vice-versa.
- **Stripe**: Payment gateway (configuration prepared, awaiting API keys).
- **Web Push API**: For sending push notifications (requires VAPID keys).
- **SMS Service** (Pending): Currently using mock service for OTP delivery. Integration with Twilio/Infobip/MessageBird planned for production.

## Recent Changes

### FASE 0.1 - Identidad y Autenticación ✅ COMPLETADA

#### Database Schema Updates
- Added `cedula` field to users table with validation for Dominican Republic ID format
- Added `estadoCuenta` enum field to users table (pendiente_verificacion, activo, suspendido, rechazado)
- Added `telefonoVerificado` boolean field to users table
- Created `verification_codes` table for OTP management with fields: telefono, codigo, expiraEn, intentos, verificado, tipoOperacion

#### API Endpoints (Backend)
- `POST /api/auth/send-otp` - Send OTP verification code via SMS
- `POST /api/auth/verify-otp` - Verify OTP code and activate account
- `POST /api/auth/forgot-password` - Request password recovery code
- `POST /api/auth/reset-password` - Reset password with verification code
- Updated `POST /api/auth/register` - Now includes cédula validation and Zod schema validation

#### Security Improvements
- Implemented brute-force protection on OTP verification (max 3 attempts)
- Automatic cleanup of expired verification codes
- Deletion of prior active codes when issuing new ones
- Full Zod validation on registration endpoint for input sanitization

---

### FASE 0.2 - Comunicaciones en Tiempo Real ✅ COMPLETADA

#### WebSocket Enhancements
- **Heartbeat/Ping-Pong**: Implemented heartbeat mechanism with ping every 30 seconds to detect disconnected clients
- **Secure Authentication**: WebSocket connections now validate Express session on upgrade - reject unauthenticated connections
- **User Identity**: Server derives userId from session (`request.session.passport.user`) instead of trusting client data
- **Authorization**: `join_service` messages validate that user is either the service's cliente or conductor before allowing subscription
- **Real-time Chat**: Chat messages broadcast via WebSocket to service participants (reduced polling from 2s to 30s fallback)
- **Visual Reconnection Notifications**: Toast notifications show connection status (disconnected/reconnected) to users

#### Frontend Updates
- Updated `useWebSocket` hook to handle server-driven authentication
- Added quick message buttons to ChatBox: "¿Cuánto falta?", "Ya llegué", "Gracias", "En camino"
- ChatBox now sends `join_service` on connection to receive real-time chat updates
- WebSocket automatically responds to ping with pong to maintain connection health
- Implemented visual reconnection notifications using toast system

---

### FASE 0.3 - Gestión de Documentos ✅ COMPLETADA

#### Database Schema
- Created `documentos` table with fields: id, tipo, usuarioId, conductorId, servicioId, url, nombreArchivo, estado, validoHasta, revisadoPor, motivoRechazo, createdAt
- Added `documentoTipoEnum` with values: licencia, matricula, poliza, seguro_grua, foto_vehiculo, foto_perfil, cedula_frontal, cedula_trasera
- Added `documentoEstadoEnum` with values: pendiente, aprobado, rechazado
- Full TypeScript types and Zod validation schemas generated

#### Storage Service (Replit Object Storage)
- Implemented `StorageService` using `@replit/object-storage` SDK
- Upload files with automatic folder organization (usuarios/, conductores/, servicios/)
- Download files as Buffer for serving
- Delete files from storage
- List files by prefix
- **⚠️ IMPORTANTE**: Se requiere crear un bucket en el workspace de Replit antes de usar la funcionalidad de carga de documentos. El servicio de almacenamiento se inicializa de forma lazy y lanzará un error descriptivo si no hay bucket disponible.

#### API Endpoints
- `POST /api/upload` - Upload document with multipart/form-data (max 5MB, JPEG/PNG/PDF only)
  - **Seguridad**: Solo conductores activos y admins pueden subir documentos
  - **Autorización**: El conductorId se deriva ESTRICTAMENTE de la sesión del usuario autenticado (ignora cualquier conductorId del cliente)
  - **Validación de estado**: Solo conductores con estadoCuenta='activo' pueden subir documentos
  - **Validación de tipos**: Tipos de documento permitidos: licencia, matricula, poliza, seguro_grua, foto_vehiculo, foto_perfil, cedula_frontal, cedula_trasera
  - **Ownership**: Los conductores solo pueden subir documentos a su propio perfil (verificado mediante sesión)
  - **Comportamiento Admin**: Los admins suben documentos con conductorId=null (no pueden asignar documentos a conductores mediante este endpoint). Para asignar documentos a conductores específicos, se creará un endpoint separado en el futuro.
- `GET /api/documentos/:id` - Get document by ID (with authorization)
- `GET /api/documentos/user/:userId` - Get all documents for a user
- `GET /api/documentos/conductor/:conductorId` - Get all documents for a driver
- `GET /api/admin/documentos` - Admin: Get all documents in system
- `DELETE /api/documentos/:id` - Delete document (removes from storage and database)
- `PUT /api/admin/documentos/:id/aprobar` - Admin: Approve document
- `PUT /api/admin/documentos/:id/rechazar` - Admin: Reject document with reason
- All endpoints include proper authentication and authorization checks

#### Frontend Components
- **FileUpload Component**: Reusable drag-and-drop file upload component
  - Drag & drop support
  - File type validation (JPEG, PNG, PDF)
  - File size validation (5MB max)
  - Image preview for uploaded images
  - Error handling and user feedback
  - Loading states during upload
- **Driver Profile Integration**: Document management section added to driver profile
  - Upload required documents: Licencia, Matrícula, Seguro de Grúa, Foto del Vehículo, Cédula (Frente/Reverso)
  - Visual status badges: Pendiente (yellow), Aprobado (green), Rechazado (red)
  - Display rejection reasons for rejected documents
  - Real-time upload progress and status updates
  - Ability to replace rejected or expired documents
  - **Nota técnica**: El upload usa `fetch()` directo en lugar de `apiRequest` porque FormData requiere que el navegador establezca automáticamente el `Content-Type` con el boundary correcto (`multipart/form-data`), mientras que `apiRequest` está configurado para JSON.

#### Storage Methods (Database)
- `createDocumento(documento)` - Create new document record
- `getDocumentoById(id)` - Get document with full details
- `getDocumentosByUsuarioId(userId)` - Get all documents for user
- `getDocumentosByConductorId(conductorId)` - Get all documents for driver
- `getAllDocumentos()` - Admin: Get all documents
- `updateDocumento(id, data)` - Update document metadata
- `deleteDocumento(id)` - Delete document record
- `aprobarDocumento(id, adminId)` - Approve document
- `rechazarDocumento(id, adminId, motivo)` - Reject document with reason