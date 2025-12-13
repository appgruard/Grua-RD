<p align="center">
  <img src="https://img.shields.io/badge/Grúa%20RD-Plataforma%20de%20Servicios-0F2947?style=for-the-badge&logo=truck&logoColor=white" alt="Grúa RD" />
</p>

<h1 align="center">Grúa RD</h1>

<p align="center">
  <strong>Plataforma integral de servicios de grúa y asistencia vial para República Dominicana</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Google%20Play-Available-414141?style=flat-square&logo=googleplay&logoColor=white" alt="Google Play" />
  <img src="https://img.shields.io/badge/App%20Store-Available-0D96F6?style=flat-square&logo=appstore&logoColor=white" alt="App Store" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="Proprietary License" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Mapbox-000000?style=flat-square&logo=mapbox&logoColor=white" alt="Mapbox" />
</p>

<p align="center">
  <a href="#características">Características</a> •
  <a href="#tecnologías">Tecnologías</a> •
  <a href="#instalación">Instalación</a> •
  <a href="#configuración">Configuración</a> •
  <a href="#despliegue">Despliegue</a> •
  <a href="#arquitectura">Arquitectura</a>
</p>

---

## Descripción

**Grúa RD** es una plataforma multiplataforma disponible como **Progressive Web App (PWA)** y **aplicaciones móviles nativas** para **Google Play** y **App Store**, diseñada para revolucionar la industria de servicios de grúa en República Dominicana. Conecta usuarios con operadores de grúa en tiempo real, permitiendo solicitar servicios, rastrear ubicaciones y gestionar operaciones de manera eficiente.

La plataforma ofrece interfaces especializadas para:
- **Clientes** - Solicitud y seguimiento de servicios
- **Operadores** - Gestión de solicitudes y navegación
- **Administradores** - Panel de control y analíticas
- **Empresas (B2B)** - Portal empresarial con facturación

---

## Características

### Para Clientes
| Característica | Descripción |
|---------------|-------------|
| Solicitud de Servicios | Selección de categoría, ubicación en mapa y cálculo de precio |
| Seguimiento en Tiempo Real | GPS del operador y estado del servicio |
| Múltiples Métodos de Pago | Efectivo, tarjeta y aseguradora |
| Historial de Servicios | Registro completo con recibos PDF |
| Chat con Operador | Comunicación directa durante el servicio |

### Para Operadores
| Característica | Descripción |
|---------------|-------------|
| Dashboard de Solicitudes | Visualización y gestión de servicios |
| Navegación Integrada | Integración con Waze para rutas |
| Sistema de Wallet | Comisiones, retiros y balance en tiempo real |
| Gestión de Vehículos | Múltiples grúas por operador |
| Negociación de Precios | Chat especializado para extracciones |

### Para Administradores
| Característica | Descripción |
|---------------|-------------|
| Dashboard Analítico | Métricas y KPIs en tiempo real |
| Gestión de Usuarios | Administración de clientes, operadores y empresas |
| Monitoreo de Servicios | Seguimiento de todos los servicios activos |
| Configuración de Tarifas | Precios dinámicos por categoría y distancia |
| Sistema de Tickets | Soporte y resolución de incidencias |

### Características Técnicas
- **Multiplataforma** - PWA + Apps nativas para iOS y Android con Capacitor
- **Disponible en Tiendas** - Google Play Store y Apple App Store
- **Notificaciones Push** - Alertas nativas en tiempo real
- **Verificación de Identidad** - OCR de cédula dominicana con Verifik
- **Geolocalización Precisa** - Tracking GPS nativo optimizado
- **Modo Offline** - Service Worker para operación sin conexión
- **Cámara Nativa** - Captura de documentos y fotos de servicio

---

## Tecnologías

### Frontend
```
React 18          →  UI Library
TypeScript        →  Type Safety
Vite              →  Build Tool
Tailwind CSS      →  Styling
shadcn/ui         →  Component Library
TanStack Query    →  State Management
Mapbox GL JS      →  Maps & Routing
Framer Motion     →  Animations
```

### Mobile Nativo
```
Capacitor         →  Framework híbrido para iOS/Android
Camera            →  Captura de fotos y documentos
Geolocation       →  GPS nativo de alta precisión
Push Notifications→  Notificaciones nativas
Filesystem        →  Almacenamiento local
Network           →  Detección de conectividad
```

### Backend
```
Node.js           →  Runtime
Express.js        →  Web Framework
PostgreSQL        →  Database
Drizzle ORM       →  Database ORM
Passport.js       →  Authentication
WebSocket (ws)    →  Real-time
Winston           →  Logging
```

### Servicios Externos
```
Mapbox            →  Mapas, rutas y geocodificación
Twilio            →  SMS y verificación OTP
Resend            →  Emails transaccionales
Verifik           →  OCR y validación de cédula
Azul              →  Pasarela de pagos (RD)
Web Push          →  Notificaciones push
```

---

## Instalación

### Prerrequisitos
- Node.js 20+
- PostgreSQL 16+
- npm o yarn

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/grua-rd.git
cd grua-rd
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar base de datos**
```bash
npm run db:push
```

4. **Iniciar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5000`

---

## Configuración

### Variables de Entorno

Crea un archivo `.env` con las siguientes variables:

```env
# Base de Datos
DATABASE_URL=postgresql://user:password@host:5432/database

# Sesiones
SESSION_SECRET=tu-secreto-seguro

# Mapbox
MAPBOX_ACCESS_TOKEN=pk.xxx
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Resend (Email)
RESEND_API_KEY=re_xxx

# Verifik (OCR)
VERIFIK_API_KEY=xxx

# Push Notifications
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx

# Almacenamiento (opcional para CapRover)
STORAGE_PATH=/app/uploads
```

---

## Despliegue

### CapRover

1. **Crear aplicación** en CapRover

2. **Configurar volumen persistente**
   - Container Path: `/app/uploads`
   - Activar persistencia

3. **Variables de entorno**
   - Configurar todas las variables listadas arriba
   - Asegurar `NODE_ENV=production`

4. **Desplegar**
```bash
# Usando CapRover CLI
caprover deploy
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

---

## Arquitectura

```
grua-rd/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Páginas por rol
│   │   │   ├── admin/      # Panel administrativo
│   │   │   ├── client/     # Interfaz cliente
│   │   │   ├── driver/     # Interfaz operador
│   │   │   └── empresa/    # Portal empresarial
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilidades
│   └── index.html
├── server/                 # Backend Express
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Capa de datos
│   ├── services/           # Servicios externos
│   └── index.ts            # Entry point
├── shared/                 # Código compartido
│   └── schema.ts           # Modelos Drizzle
└── e2e/                    # Tests E2E Playwright
```

### Flujo de Datos

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│   Express   │────▶│  PostgreSQL │
│   (React)   │◀────│   (API)     │◀────│   (Neon)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  WebSocket  │     │  Servicios  │
│  (Tiempo    │     │  Externos   │
│   Real)     │     │  (Mapbox,   │
└─────────────┘     │   Twilio)   │
                    └─────────────┘
```

---

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm start` | Inicia servidor de producción |
| `npm run db:push` | Sincroniza esquema de BD |
| `npm run check` | Verifica tipos TypeScript |

---

## Roles y Permisos

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| `cliente` | `/client/*` | Usuarios que solicitan servicios |
| `conductor` | `/driver/*` | Operadores de grúa |
| `admin` | `/admin/*` | Administradores del sistema |
| `empresa` | `/empresa/*` | Cuentas empresariales B2B |
| `aseguradora` | `/aseguradora/*` | Compañías de seguros |
| `support` | `/support/*` | Soporte técnico |

---

## Seguridad

- Autenticación con Passport.js y sesiones HTTP-only
- Contraseñas hasheadas con bcrypt
- Control de acceso basado en roles (RBAC)
- Protección SQL injection via Drizzle ORM
- Rate limiting en endpoints críticos
- Validación de datos con Zod
- CORS configurado para orígenes permitidos

---

## Licencia

**TODOS LOS DERECHOS RESERVADOS**

Este software es propiedad exclusiva de Grúa RD. Queda prohibido su uso, copia, modificación o distribución sin autorización expresa por escrito. Ver el archivo [LICENSE](LICENSE) para los términos completos.

---

<p align="center">
  <strong>Desarrollado con dedicación para República Dominicana</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Made%20with-❤️-white?style=flat-square" alt="Made with love" />
  <img src="https://img.shields.io/badge/Dominican%20Republic-🇩🇴-blue?style=flat-square" alt="Dominican Republic" />
</p>
