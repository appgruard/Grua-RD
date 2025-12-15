import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { storageService } from "./storage-service";
import { pushService } from "./push-service";
import { getSMSService, generateOTP } from "./sms-service";
import { getEmailService } from "./email-service";
import { getVerificationHistory } from "./services/identity";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { insertUserSchema, insertServicioSchema, insertTarifaSchema, insertMensajeChatSchema, insertPushSubscriptionSchema, insertDocumentoSchema, insertTicketSchema, insertMensajeTicketSchema, insertSocioSchema, insertDistribucionSocioSchema, insertCalificacionSchema, insertEmpresaSchema, insertEmpresaEmpleadoSchema, insertEmpresaContratoSchema, insertEmpresaTarifaSchema, insertEmpresaProyectoSchema, insertEmpresaConductorAsignadoSchema, insertServicioProgramadoSchema, insertEmpresaFacturaSchema, insertEmpresaFacturaItemSchema, VALID_SERVICE_CATEGORIES, ADMIN_PERMISOS, type AdminPermiso } from "@shared/schema";
import type { User, Servicio, Empresa } from "@shared/schema";
import { logAuth, logTransaction, logService, logDocument, logSystem } from "./logger";
import { z } from "zod";
import { uploadDocument, getDocument, isStorageInitialized, getFilesystemProvider, getActiveProviderName } from "./services/object-storage";
import { pdfService } from "./services/pdf-service";
import { insuranceValidationService, getSupportedInsurers, InsurerCode } from "./services/insurance";
import { documentValidationService } from "./services/document-validation";
import { initServiceAutoCancellation, SERVICE_TIMEOUT_MINUTES } from "./services/service-auto-cancel";
import { calculateHaversineDistance, GEOFENCE_RADIUS_METERS, type Coordinates } from "./utils/geo";
import { calculateDriverStatus } from "./utils/driver-status";
import { WalletService, initWalletService } from "./services/wallet";
import { AzulPaymentService } from "./services/azul-payment";

// Zod validation schemas for aseguradora/admin endpoints
const updateAseguradoraPerfilSchema = z.object({
  telefono: z.string().min(1, "Teléfono es requerido").optional().nullable(),
  direccion: z.string().min(1, "Dirección es requerida").optional().nullable(),
  emailContacto: z.string().email("Email de contacto inválido").optional().nullable(),
  personaContacto: z.string().min(1, "Persona de contacto es requerida").optional().nullable(),
});

const aprobarServicioSchema = z.object({
  montoAprobado: z.union([
    z.string().min(1, "Monto aprobado es requerido").refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Monto aprobado debe ser un número positivo"
    ),
    z.number().positive("Monto aprobado debe ser un número positivo"),
  ]),
});

const rechazarServicioSchema = z.object({
  motivo: z.string().min(1, "Motivo de rechazo es requerido").max(500, "Motivo no puede exceder 500 caracteres"),
});

const facturarServicioSchema = z.object({
  numeroFactura: z.string().min(1, "Número de factura es requerido").max(100, "Número de factura no puede exceder 100 caracteres"),
});

const createAseguradoraSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombreEmpresa: z.string().min(1, "Nombre de empresa es requerido").max(200, "Nombre de empresa no puede exceder 200 caracteres"),
  rnc: z.string().min(1, "RNC es requerido").max(50, "RNC no puede exceder 50 caracteres"),
  telefono: z.string().min(1, "Teléfono es requerido").optional().nullable(),
  direccion: z.string().min(1, "Dirección es requerida").optional().nullable(),
  emailContacto: z.string().email("Email de contacto inválido").optional().nullable(),
  personaContacto: z.string().min(1, "Persona de contacto es requerida").optional().nullable(),
});

const updateAseguradoraAdminSchema = z.object({
  nombreEmpresa: z.string().min(1, "Nombre de empresa es requerido").max(200, "Nombre de empresa no puede exceder 200 caracteres").optional(),
  rnc: z.string().min(1, "RNC es requerido").max(50, "RNC no puede exceder 50 caracteres").optional(),
  telefono: z.string().min(1, "Teléfono es requerido").optional().nullable(),
  direccion: z.string().min(1, "Dirección es requerida").optional().nullable(),
  emailContacto: z.string().email("Email de contacto inválido").optional().nullable(),
  personaContacto: z.string().min(1, "Persona de contacto es requerida").optional().nullable(),
});

// Zod validation schemas for socios (Module 2.5)
const createSocioSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombre: z.string().min(1, "Nombre es requerido"),
  telefono: z.string().optional().nullable(),
  porcentajeParticipacion: z.union([
    z.string().refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100,
      "Porcentaje debe ser un número entre 0.01 y 100"
    ),
    z.number().positive().max(100, "Porcentaje no puede exceder 100"),
  ]),
  montoInversion: z.union([
    z.string().refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      "Monto debe ser un número positivo o cero"
    ),
    z.number().min(0, "Monto debe ser positivo o cero"),
  ]),
  fechaInversion: z.string().optional(),
  notas: z.string().optional().nullable(),
});

const updateSocioSchema = z.object({
  porcentajeParticipacion: z.union([
    z.string().refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100,
      "Porcentaje debe ser un número entre 0.01 y 100"
    ),
    z.number().positive().max(100, "Porcentaje no puede exceder 100"),
  ]).optional(),
  montoInversion: z.union([
    z.string().refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      "Monto debe ser un número positivo o cero"
    ),
    z.number().min(0, "Monto debe ser positivo o cero"),
  ]).optional(),
  notas: z.string().optional().nullable(),
});

const calcularDistribucionSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, "Período debe tener formato YYYY-MM"),
});

const marcarPagadaSchema = z.object({
  metodoPago: z.string().min(1, "Método de pago es requerido"),
  referenciaTransaccion: z.string().min(1, "Referencia de transacción es requerida"),
});

// Zod validation schemas for empresas (Module 6)
const createEmpresaAdminSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombre: z.string().min(1, "Nombre del representante es requerido"),
  apellido: z.string().min(1, "Apellido del representante es requerido").optional().default(""),
  phone: z.string().optional().nullable(),
  nombreEmpresa: z.string().min(1, "Nombre de empresa es requerido"),
  rnc: z.string().min(9, "RNC debe tener al menos 9 caracteres"),
  tipoEmpresa: z.enum([
    "constructora", "ferreteria", "logistica", "turistica",
    "ayuntamiento", "zona_franca", "industria", "rent_car",
    "maquinaria_pesada", "otro"
  ]),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  emailContacto: z.string().email("Email de contacto inválido").optional().nullable(),
  personaContacto: z.string().optional().nullable(),
  limiteCredito: z.string().optional().nullable(),
  diasCredito: z.number().optional().nullable(),
  descuentoVolumen: z.string().optional().nullable(),
});

const updateEmpresaPerfilSchema = z.object({
  nombreEmpresa: z.string().min(1, "Nombre de empresa es requerido").optional(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  emailContacto: z.string().email("Email de contacto inválido").optional().nullable(),
  personaContacto: z.string().optional().nullable(),
});

const updateEmpresaAdminSchema = z.object({
  nombreEmpresa: z.string().min(1, "Nombre de empresa es requerido").optional(),
  rnc: z.string().min(9, "RNC debe tener al menos 9 caracteres").optional(),
  tipoEmpresa: z.enum([
    "constructora", "ferreteria", "logistica", "turistica",
    "ayuntamiento", "zona_franca", "industria", "rent_car",
    "maquinaria_pesada", "otro"
  ]).optional(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  emailContacto: z.string().email("Email de contacto inválido").optional().nullable(),
  personaContacto: z.string().optional().nullable(),
  limiteCredito: z.string().optional().nullable(),
  diasCredito: z.number().optional().nullable(),
  descuentoVolumen: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

const createServicioProgramadoRequestSchema = z.object({
  proyectoId: z.string().optional().nullable(),
  contratoId: z.string().optional().nullable(),
  fechaProgramada: z.string().min(1, "Fecha programada es requerida"),
  horaInicio: z.string().min(1, "Hora de inicio es requerida"),
  horaFin: z.string().optional().nullable(),
  origenLat: z.string().min(1, "Latitud de origen es requerida"),
  origenLng: z.string().min(1, "Longitud de origen es requerida"),
  origenDireccion: z.string().min(1, "Dirección de origen es requerida"),
  destinoLat: z.string().optional().nullable(),
  destinoLng: z.string().optional().nullable(),
  destinoDireccion: z.string().optional().nullable(),
  servicioCategoria: z.enum([
    "remolque_estandar", "auxilio_vial", "remolque_especializado",
    "vehiculos_pesados", "maquinarias", "izaje_construccion", "remolque_recreativo"
  ]).optional(),
  servicioSubtipo: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  recurrente: z.boolean().optional(),
  frecuenciaRecurrencia: z.string().optional().nullable(),
  notasInternas: z.string().optional().nullable(),
});

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      phone: string | null;
      cedula: string | null;
      cedulaImageUrl: string | null;
      cedulaVerificada: boolean;
      passwordHash: string;
      userType: "cliente" | "conductor" | "admin" | "aseguradora" | "socio" | "empresa";
      estadoCuenta: "activo" | "suspendido" | "pendiente_verificacion" | "rechazado" | "baneado";
      nombre: string;
      apellido: string | null;
      fotoUrl: string | null;
      calificacionPromedio: string | null;
      telefonoVerificado: boolean | null;
      emailVerificado: boolean | null;
      fotoVerificada: boolean | null;
      createdAt: Date;
    }
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        // Security model for disambiguation:
        // When userType is provided, fetch the specific account by email + type
        // This is secure because each email can only have ONE account per type
        // Password is always verified for the selected account
        
        const requestedUserType = req.body.userType as string | undefined;
        
        let user;
        if (requestedUserType) {
          // Disambiguation: login with specific account type
          // Each email can only have one account per type, so this is safe
          user = await storage.getUserByEmailAndType(email, requestedUserType);
        } else {
          // Default: get first account (backwards compatibility)
          user = await storage.getUserByEmail(email);
        }
        
        if (!user) {
          logAuth.loginFailed(email, "User not found");
          return done(null, false);
        }

        // Always verify password for the selected account
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          logAuth.loginFailed(email, "Invalid password");
          return done(null, false);
        }

        logAuth.loginSuccess(user.id, user.email);
        return done(null, user as any);
      } catch (error) {
        logSystem.error("Login error", error);
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUserById(id);
    
    if (!user) {
      logSystem.warn("DeserializeUser: User not found", { userId: id });
      return done(null, false);
    }
    
    if (user.estadoCuenta === 'suspendido' || user.estadoCuenta === 'rechazado') {
      logSystem.warn("DeserializeUser: User suspended/rejected", { userId: id, estado: user.estadoCuenta });
      return done(null, false);
    }
    
    done(null, user as any);
  } catch (error) {
    logSystem.error("DeserializeUser error", error);
    done(error);
  }
});

// Helper function to sanitize user data before sending to client
// Uses explicit whitelist of allowed properties to prevent sensitive data exposure
export const getSafeUser = (user: any) => {
  if (!user) return null;
  
  // Explicit whitelist of public user fields
  const safeUser: Record<string, any> = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    cedula: user.cedula,
    cedulaVerificada: user.cedulaVerificada,
    userType: user.userType,
    estadoCuenta: user.estadoCuenta,
    nombre: user.nombre,
    apellido: user.apellido,
    fotoUrl: user.fotoUrl,
    calificacionPromedio: user.calificacionPromedio,
    telefonoVerificado: user.telefonoVerificado,
    emailVerificado: user.emailVerificado,
    fotoVerificada: user.fotoVerificada,
    createdAt: user.createdAt,
  };
  
  // Include conductor data if present (for driver users)
  if (user.conductor) {
    safeUser.conductor = {
      id: user.conductor.id,
      userId: user.conductor.userId,
      licencia: user.conductor.licencia,
      disponible: user.conductor.disponible,
      ubicacionLat: user.conductor.ubicacionLat,
      ubicacionLng: user.conductor.ubicacionLng,
      ultimaUbicacionUpdate: user.conductor.ultimaUbicacionUpdate,
      balanceDisponible: user.conductor.balanceDisponible,
      balancePendiente: user.conductor.balancePendiente,
      licenciaFrontalUrl: user.conductor.licenciaFrontalUrl,
      licenciaTraseraUrl: user.conductor.licenciaTraseraUrl,
      licenciaVerificada: user.conductor.licenciaVerificada,
      categoriasConfiguradas: user.conductor.categoriasConfiguradas,
      vehiculosRegistrados: user.conductor.vehiculosRegistrados,
    };
  }
  
  return safeUser;
};

// Helper function to sanitize user data for admin views
// Uses explicit whitelist including admin-relevant fields while excluding sensitive auth data
export const getSafeUserForAdmin = (user: any) => {
  if (!user) return null;
  
  // Explicit whitelist of admin-viewable fields (excludes passwordHash, tokens, internal flags)
  const safeUser: Record<string, any> = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    cedula: user.cedula,
    cedulaVerificada: user.cedulaVerificada,
    userType: user.userType,
    estadoCuenta: user.estadoCuenta,
    nombre: user.nombre,
    apellido: user.apellido,
    fotoUrl: user.fotoUrl,
    calificacionPromedio: user.calificacionPromedio,
    telefonoVerificado: user.telefonoVerificado,
    createdAt: user.createdAt,
  };
  
  // Include conductor data if present
  if (user.conductor) {
    safeUser.conductor = {
      id: user.conductor.id,
      userId: user.conductor.userId,
      licencia: user.conductor.licencia,
      disponible: user.conductor.disponible,
      ubicacionLat: user.conductor.ubicacionLat,
      ubicacionLng: user.conductor.ubicacionLng,
      ultimaUbicacionUpdate: user.conductor.ultimaUbicacionUpdate,
      balanceDisponible: user.conductor.balanceDisponible,
      balancePendiente: user.conductor.balancePendiente,
      licenciaFrontalUrl: user.conductor.licenciaFrontalUrl,
      licenciaTraseraUrl: user.conductor.licenciaTraseraUrl,
      licenciaVerificada: user.conductor.licenciaVerificada,
      categoriasConfiguradas: user.conductor.categoriasConfiguradas,
      vehiculosRegistrados: user.conductor.vehiculosRegistrados,
    };
  }
  
  return safeUser;
};

// Helper to sanitize arrays of users for admin endpoints
export const getSafeUsersForAdmin = (users: any[]) => {
  return users.map(getSafeUserForAdmin);
};

// Helper to sanitize driver/conductor records with embedded user objects
export const getSafeDriver = (driver: any) => {
  if (!driver) return null;
  const safeDriver = { ...driver };
  if (safeDriver.user) {
    safeDriver.user = getSafeUserForAdmin(safeDriver.user);
  }
  return safeDriver;
};

// Helper to sanitize arrays of drivers
export const getSafeDrivers = (drivers: any[]) => {
  return drivers.map(getSafeDriver);
};

export async function registerRoutes(app: Express): Promise<Server> {
  // TODO: Implementar con Azul API - Payment Webhook Handler
  // Los webhooks de pago serán implementados cuando se integre Azul API

  app.use(express.json());

  const isProduction = process.env.NODE_ENV === "production";
  
  // Configure trust proxy for CapRover/reverse proxy deployments
  if (isProduction) {
    app.set('trust proxy', 1);
  }
  
  // Configure persistent session store for production
  let sessionStore: session.Store | undefined = undefined;
  
  if (isProduction && process.env.DATABASE_URL) {
    try {
      const PgSession = connectPgSimple(session);
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
      });
      
      sessionStore = new PgSession({
        pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 15 // Clean expired sessions every 15 minutes
      });
      
      logSystem.info("PostgreSQL session store initialized");
    } catch (error) {
      logSystem.error("Failed to initialize PostgreSQL session store, falling back to memory", error);
    }
  }
  
  const sessionParser = session({
    store: sessionStore,
    name: 'gruard.sid', // Unique session cookie name for CapRover deployments
    secret: process.env.SESSION_SECRET || "gruard-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    proxy: isProduction,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax", // "lax" es más compatible con CapRover que termina TLS en proxy
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  });

  app.use(sessionParser);

  app.use(passport.initialize());
  app.use(passport.session());

  // Helper function to check if user needs verification
  const userNeedsVerification = async (user: any): Promise<boolean> => {
    if (!user) return false;
    
    // Skip verification check for admin, aseguradora, socio, and empresa users
    const skipVerificationTypes = ['admin', 'aseguradora', 'socio', 'empresa'];
    if (skipVerificationTypes.includes(user.userType)) {
      return false;
    }

    const isConductor = user.userType === 'conductor';
    // Use truthy checks to handle both boolean true and integer 1 (database type mismatch)
    const cedulaVerificada = !!user.cedulaVerificada;
    const emailVerificado = !!user.emailVerificado;
    const fotoVerificada = !!user.fotoVerificada;

    if (!isConductor) {
      // Client only needs cedula and email
      return !cedulaVerificada || !emailVerificado;
    }

    // Driver needs 6 verifications - ALWAYS fetch conductor from storage (not session)
    // This fixes the bug where session data was stale after conductor creation
    const conductor = await storage.getConductorByUserId(user.id);
    
    // If no conductor exists yet, user needs verification but we allow verification routes
    if (!conductor) {
      return true;
    }
    
    // Use truthy checks to handle integer values from database (vehiculosRegistrados is stored as int)
    const licenciaVerificada = !!conductor.licenciaVerificada;
    const categoriasConfiguradas = !!conductor.categoriasConfiguradas;
    const vehiculosRegistrados = !!conductor.vehiculosRegistrados;

    return !cedulaVerificada || !emailVerificado || !fotoVerificada || 
           !licenciaVerificada || !categoriasConfiguradas || !vehiculosRegistrados;
  };

  // Middleware to block unverified users from accessing non-verification endpoints
  // This allows users to stay logged in during verification while restricting access
  // Uses exact path + method matching to prevent unintended access through nested routes
  // Set prefix: true for routes that have dynamic parameters (e.g., /api/drivers/me/vehiculos/:id)
  const VERIFICATION_ALLOWED_PATTERNS: Array<{ method: string; path: string; prefix?: boolean }> = [
    { method: 'GET', path: '/api/auth/me' },
    { method: 'POST', path: '/api/auth/logout' },
    { method: 'POST', path: '/api/auth/send-otp' },
    { method: 'POST', path: '/api/auth/verify-otp' },
    { method: 'POST', path: '/api/identity/scan-cedula' },
    { method: 'POST', path: '/api/identity/verify-cedula' },
    { method: 'POST', path: '/api/identity/verify-profile-photo' },
    { method: 'POST', path: '/api/identity/scan-license' },
    { method: 'POST', path: '/api/identity/scan-license-back' },
    { method: 'GET', path: '/api/identity/verification-status' },
    { method: 'GET', path: '/api/identity/status' },
    { method: 'PATCH', path: '/api/users/me' },
    { method: 'POST', path: '/api/documents/upload' },
    { method: 'POST', path: '/api/driver/documents' },
    { method: 'GET', path: '/api/drivers/me' },
    { method: 'GET', path: '/api/drivers/init' },
    { method: 'GET', path: '/api/drivers/me/servicios' },
    { method: 'PUT', path: '/api/drivers/me/servicios' },
    { method: 'PUT', path: '/api/drivers/me/license-data' },
    { method: 'POST', path: '/api/auth/add-driver-account' },
    { method: 'POST', path: '/api/drivers/become-driver' },
    { method: 'GET', path: '/api/drivers/me/vehiculos', prefix: true },
    { method: 'POST', path: '/api/drivers/me/vehiculos' },
    { method: 'PATCH', path: '/api/drivers/me/vehiculos', prefix: true },
    { method: 'DELETE', path: '/api/drivers/me/vehiculos', prefix: true },
    { method: 'POST', path: '/api/users/profile-photo' },
    { method: 'POST', path: '/api/client/insurance' },
    { method: 'GET', path: '/api/client/insurance/status' },
    { method: 'POST', path: '/api/analytics/web-vitals' },
    { method: 'GET', path: '/api/storage/files', prefix: true },
  ];

  app.use(async (req: Request, res: Response, next) => {
    // Skip check for non-API routes (allow frontend/SPA routes to pass through)
    if (!req.path.startsWith('/api/')) {
      return next();
    }
    
    // Skip check for non-authenticated users (they'll fail auth checks later)
    if (!req.isAuthenticated()) {
      return next();
    }

    const user = req.user as any;
    
    // If user is fully verified or exempt, allow all endpoints
    if (!(await userNeedsVerification(user))) {
      return next();
    }

    // User needs verification - only allow verification-related endpoints
    // Uses exact matching for most routes, prefix matching for routes with parameters
    const requestPath = req.path;
    const requestMethod = req.method;

    const isAllowed = VERIFICATION_ALLOWED_PATTERNS.some(pattern => {
      if (pattern.method !== requestMethod) return false;
      if (pattern.prefix) {
        return requestPath === pattern.path || requestPath.startsWith(pattern.path + '/');
      }
      return pattern.path === requestPath;
    });

    if (isAllowed) {
      return next();
    }

    // Block access to other endpoints - detailed logging for Bug 1 debugging
    const matchDetails = VERIFICATION_ALLOWED_PATTERNS.map(pattern => ({
      pattern: `${pattern.method} ${pattern.path}${pattern.prefix ? ' (prefix)' : ''}`,
      methodMatch: pattern.method === requestMethod,
      pathMatch: pattern.prefix 
        ? (requestPath === pattern.path || requestPath.startsWith(pattern.path + '/'))
        : pattern.path === requestPath
    })).filter(d => d.methodMatch || d.pathMatch);
    
    logSystem.warn('VERIFICATION_BLOCKED: Unverified user blocked from endpoint', { 
      userId: user.id, 
      userType: user.userType, 
      path: requestPath, 
      method: requestMethod,
      emailVerificado: user.emailVerificado,
      cedulaVerificada: user.cedulaVerificada,
      fotoVerificada: user.fotoVerificada,
      licenciaVerificada: user.licenciaVerificada,
      partialMatches: matchDetails.length > 0 ? matchDetails : 'none',
      expectedLicensePatterns: [
        'POST /api/identity/scan-license',
        'POST /api/identity/scan-license-back'
      ]
    });
    
    return res.status(403).json({
      message: "Debe completar la verificación de identidad antes de acceder a esta función",
      requiresVerification: true,
      redirectTo: '/verify-pending'
    });
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  const serviceSessions = new Map<string, Set<WebSocket>>();
  const driverSessions = new Map<string, WebSocket>();

  interface ExtendedWebSocket extends WebSocket {
    isAlive: boolean;
    pingInterval?: NodeJS.Timeout;
    userId?: string;
    userType?: string;
  }

  httpServer.on('upgrade', (request: any, socket, head) => {
    if (request.url !== '/ws') {
      socket.destroy();
      return;
    }

    sessionParser(request, {} as any, () => {
      if (!request.session || !request.session.passport || !request.session.passport.user) {
        logSystem.warn('WebSocket connection rejected: Not authenticated');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
  });

  setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      
      if (extWs.isAlive === false) {
        logSystem.warn('WebSocket connection terminated due to no pong response', { userId: extWs.userId });
        return extWs.terminate();
      }

      extWs.isAlive = false;
      extWs.send(JSON.stringify({ type: 'ping' }));
    });
  }, 30000);

  wss.on('connection', async (ws: WebSocket, request: any) => {
    const userId = request.session.passport.user;
    
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        logSystem.warn('WebSocket rejected: User not found', { userId });
        ws.close();
        return;
      }

      // Block unverified users from WebSocket access
      if (await userNeedsVerification(user)) {
        logSystem.warn('WebSocket rejected: User needs verification', { 
          userId: user.id, 
          userType: user.userType,
          cedulaVerificada: user.cedulaVerificada,
          emailVerificado: user.emailVerificado,
          fotoVerificada: user.fotoVerificada
        });
        ws.send(JSON.stringify({
          type: 'error',
          payload: { 
            message: 'Debe completar la verificación de identidad',
            requiresVerification: true,
            redirectTo: '/verify-pending'
          }
        }));
        ws.close();
        return;
      }

      const extWs = ws as ExtendedWebSocket;
      extWs.isAlive = true;
      extWs.userId = user.id;
      extWs.userType = user.userType;

      logSystem.info('WebSocket authenticated', { userId: user.id, userType: user.userType });

      if (user.userType === 'conductor') {
        driverSessions.set(user.id, ws);
      }

      ws.send(JSON.stringify({
        type: 'authenticated',
        payload: { success: true, userId: user.id, userType: user.userType }
      }));

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'pong':
              extWs.isAlive = true;
              break;

          case 'join_service':
            const { serviceId } = message.payload;
            
            const servicio = await storage.getServicioById(serviceId);
            if (!servicio) {
              logSystem.warn('join_service rejected: Service not found', { serviceId, userId: extWs.userId });
              break;
            }
            
            if (servicio.clienteId !== extWs.userId && servicio.conductorId !== extWs.userId) {
              logSystem.warn('join_service rejected: User not authorized', { serviceId, userId: extWs.userId });
              break;
            }
            
            if (!serviceSessions.has(serviceId)) {
              serviceSessions.set(serviceId, new Set());
            }
            serviceSessions.get(serviceId)!.add(ws);
            logSystem.info('User joined service', { userId: extWs.userId, serviceId });
            break;

          case 'update_location':
            const { servicioId, conductorId, lat, lng, speed, heading, accuracy } = message.payload;
            
            await storage.createUbicacionTracking({
              servicioId,
              conductorId,
              lat: lat.toString(),
              lng: lng.toString(),
            });

            if (serviceSessions.has(servicioId)) {
              const servicio = await storage.getServicioById(servicioId);
              let driverStatusInfo = { status: 'en_camino', message: 'En servicio', distanceToTarget: 0 };
              
              if (servicio) {
                const driverLocation: Coordinates = { lat: Number(lat), lng: Number(lng) };
                driverStatusInfo = calculateDriverStatus(driverLocation, {
                  origenLat: Number(servicio.origenLat),
                  origenLng: Number(servicio.origenLng),
                  destinoLat: Number(servicio.destinoLat),
                  destinoLng: Number(servicio.destinoLng),
                  estado: servicio.estado
                }, speed || 0);
              }

              const broadcast = JSON.stringify({
                type: 'driver_location_update',
                payload: {
                  servicioId,
                  lat,
                  lng,
                  speed: speed || 0,
                  heading: heading || 0,
                  accuracy: accuracy || 0,
                  timestamp: Date.now(),
                  driverStatus: driverStatusInfo.status,
                  statusMessage: driverStatusInfo.message,
                  distanceRemaining: Math.round(driverStatusInfo.distanceToTarget)
                },
              });
              serviceSessions.get(servicioId)!.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(broadcast);
                }
              });
            }
            break;

          case 'register_driver':
            const { driverId } = message.payload;
            driverSessions.set(driverId, ws);
            break;
        }
        } catch (error) {
          logSystem.error('WebSocket message error', error, { userId: extWs.userId });
        }
      });

      ws.on('close', () => {
        logSystem.info('WebSocket disconnected', { userId: extWs.userId });
        
        serviceSessions.forEach((clients, serviceId) => {
          clients.delete(ws);
          if (clients.size === 0) {
            serviceSessions.delete(serviceId);
          }
        });

        if (extWs.userId && extWs.userType === 'conductor') {
          driverSessions.delete(extWs.userId);
        }
      });
    } catch (error) {
      logSystem.error('WebSocket connection error', error);
      ws.close();
    }
  });

  // Web Vitals Analytics Endpoint
  app.post("/api/analytics/web-vitals", express.json(), (req: Request, res: Response) => {
    try {
      const { name, value, rating, delta, id, navigationType } = req.body;
      
      if (!name || typeof value !== 'number') {
        return res.status(400).json({ message: "Invalid metric data" });
      }

      logSystem.info('Web Vital metric received', {
        metric: name,
        value: value.toFixed(2),
        rating,
        delta: delta?.toFixed(2),
        metricId: id,
        navigationType,
        userAgent: req.headers['user-agent']?.substring(0, 100),
      });

      res.status(204).end();
    } catch (error) {
      logSystem.error('Web Vitals endpoint error', error);
      res.status(500).json({ message: "Error processing metric" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { password, userType, conductorData, cedulaVerificada: _ignored, ...userData } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
      }

      const validationResult = insertUserSchema.safeParse({
        ...userData,
        passwordHash: password,
        userType: userType || 'cliente',
        cedulaVerificada: false,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return res.status(400).json({ 
          message: firstError.message || "Datos de registro inválidos",
          errors: validationResult.error.errors
        });
      }

      const requestedType = userType || 'cliente';
      const userTypeLabel = requestedType === 'conductor' ? 'operador' : 'cliente';
      
      // Check if user already exists with the same email AND type
      const existingUserSameType = await storage.getUserByEmailAndType(userData.email, requestedType);
      if (existingUserSameType) {
        logAuth.registerFailed(userData.email, "Email already registered for same account type");
        
        // Check if user needs to complete verification
        const needsVerification = requestedType === 'conductor' 
          ? !existingUserSameType.cedulaVerificada 
          : !existingUserSameType.emailVerificado;
        
        if (needsVerification) {
          const verificationMessage = requestedType === 'conductor'
            ? `Ya tienes una cuenta de operador con este correo. Inicia sesión para completar la verificación de tu cédula.`
            : `Ya tienes una cuenta de cliente con este correo. Inicia sesión para acceder a tu cuenta.`;
          return res.status(400).json({ 
            message: verificationMessage,
            needsVerification: true,
            userType: requestedType
          });
        }
        
        return res.status(400).json({ 
          message: `Ya tienes una cuenta de ${userTypeLabel} con este correo. Inicia sesión para acceder.` 
        });
      }

      // Check phone for same account type (simple duplicate check, no verification logic)
      if (userData.phone) {
        const existingPhoneSameType = await storage.getUserByPhone(userData.phone);
        if (existingPhoneSameType && existingPhoneSameType.userType === requestedType) {
          logAuth.registerFailed(userData.email, "Phone already registered for same account type");
          return res.status(400).json({ 
            message: `Ya tienes una cuenta de ${userTypeLabel} con este teléfono. Inicia sesión para acceder.` 
          });
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        ...validationResult.data,
        passwordHash,
      });

      if (userType === 'conductor') {
        // Always create conductor record for conductor users (fixes Bug #1)
        await storage.createConductor({
          userId: user.id,
          licencia: conductorData?.licencia || '',
          placaGrua: conductorData?.placaGrua || '',
          marcaGrua: conductorData?.marcaGrua || '',
          modeloGrua: conductorData?.modeloGrua || '',
        });
      }

      logAuth.registerSuccess(user.id, user.email, user.userType);

      // Cedula verification for conductors is now done via the OCR scan endpoint
      // which validates confidenceScore >= 0.6 and name matching
      // The conductor should use /api/identity/scan-cedula with their name during registration
      if (userData.cedula && userType === 'conductor') {
        logSystem.info("Conductor registered with cedula - verification pending via OCR scan", { 
          userId: user.id,
          hasCedula: !!userData.cedula
        });
      }

      // Send welcome email based on user type (use the created user's type, not request body)
      try {
        const emailService = await getEmailService();
        const userName = user.nombre || user.email.split('@')[0];
        const actualUserType = user.userType || 'cliente';
        
        if (actualUserType === 'conductor') {
          await emailService.sendOperatorWelcomeEmail(user.email, userName);
          logSystem.info("Operator welcome email sent", { userId: user.id, email: user.email });
        } else if (actualUserType === 'cliente') {
          await emailService.sendClientWelcomeEmail(user.email, userName);
          logSystem.info("Client welcome email sent", { userId: user.id, email: user.email });
        }
      } catch (emailError) {
        // Don't fail registration if email fails
        logSystem.warn("Failed to send welcome email during registration", { 
          userId: user.id, 
          email: user.email, 
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }

      const updatedUser = await storage.getUserById(user.id);

      req.login(updatedUser || user, (err) => {
        if (err) {
          logSystem.error("Login failed after registration", err, { userId: user.id });
          return res.status(500).json({ message: "Login failed after registration" });
        }
        // Return sanitized user data
        res.json({ user: getSafeUser(updatedUser || user) });
      });
    } catch (error: any) {
      logSystem.error('Registration error', error);
      res.status(500).json({ message: "Error en el registro" });
    }
  });

  // Add driver account for existing client (dual account system)
  app.post("/api/auth/add-driver-account", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Debes iniciar sesión primero" });
      }

      const currentUser = req.user as Express.User;
      
      // Verify the current user is a client
      if (currentUser.userType !== 'cliente') {
        return res.status(400).json({ 
          message: "Solo los clientes pueden añadir una cuenta de conductor" 
        });
      }

      // Check if user already has a conductor account
      const existingConductor = await storage.getUserByEmailAndType(currentUser.email, 'conductor');
      if (existingConductor) {
        return res.status(400).json({ 
          message: "Ya tienes una cuenta de conductor con este correo. Inicia sesión con tu cuenta de conductor.",
          hasExistingAccount: true
        });
      }

      // Create new user with conductor type, copying data from client account
      const newConductorUser = await storage.createUser({
        email: currentUser.email,
        passwordHash: currentUser.passwordHash,
        userType: 'conductor',
        nombre: currentUser.nombre,
        apellido: currentUser.apellido || '',
        phone: currentUser.phone || undefined,
        cedula: currentUser.cedula || undefined,
        cedulaImageUrl: currentUser.cedulaImageUrl || undefined,
        cedulaVerificada: currentUser.cedulaVerificada,
        emailVerificado: currentUser.emailVerificado || false,
      });
      
      // Update fields that are omitted from insert schema
      await storage.updateUser(newConductorUser.id, {
        estadoCuenta: 'pendiente_verificacion',
        telefonoVerificado: currentUser.telefonoVerificado || false,
      });

      // Create conductor record for the new driver user (fixes Bug #1)
      await storage.createConductor({
        userId: newConductorUser.id,
        licencia: '',
        placaGrua: '',
        marcaGrua: '',
        modeloGrua: '',
      });

      logAuth.registerSuccess(newConductorUser.email, 'conductor', req.ip || 'unknown');
      logSystem.info("Client added driver account", { 
        clientUserId: currentUser.id, 
        driverUserId: newConductorUser.id,
        email: currentUser.email 
      });

      // Send welcome email for new operator account
      try {
        const emailService = await getEmailService();
        await emailService.sendOperatorWelcomeEmail(newConductorUser.email, newConductorUser.nombre);
      } catch (emailError) {
        logSystem.warn("Failed to send operator welcome email", { 
          userId: newConductorUser.id, 
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }

      // Log into the new conductor account
      req.login(newConductorUser, (err) => {
        if (err) {
          logSystem.error("Login failed after adding driver account", err, { userId: newConductorUser.id });
          return res.status(500).json({ message: "Error al cambiar a cuenta de conductor" });
        }
        res.json({ 
          success: true,
          message: "Cuenta de conductor creada exitosamente",
          user: getSafeUser(newConductorUser) 
        });
      });
    } catch (error: any) {
      logSystem.error('Add driver account error', error);
      res.status(500).json({ message: "Error al crear cuenta de conductor" });
    }
  });

  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      
      let dbStatus = 'unknown';
      let serviciosActivos = 0;
      let conductoresOnline = 0;
      let dbErrors = 0;
      
      // Safe storage queries with individual error handling
      let servicios: any[] = [];
      let drivers: any[] = [];
      
      try {
        servicios = await storage.getAllServicios();
      } catch (e) {
        dbErrors++;
        logSystem.warn('Health check: Failed to fetch services', e);
      }
      
      try {
        drivers = await storage.getAllDrivers();
      } catch (e) {
        dbErrors++;
        logSystem.warn('Health check: Failed to fetch drivers', e);
      }
      
      // Set DB status based on errors
      dbStatus = dbErrors === 0 ? 'connected' : dbErrors < 2 ? 'degraded' : 'error';
      serviciosActivos = servicios.filter(s => 
        s.estado === 'aceptado' || s.estado === 'en_progreso'
      ).length;
      conductoresOnline = drivers.filter(d => d.disponible).length;
      
      const dbResponseTime = Date.now() - startTime;
      
      const healthStatus = {
        status: dbStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`
        },
        metrics: {
          serviciosActivos,
          conductoresOnline,
          websocketConnections: wss.clients.size
        },
        version: '1.0.0'
      };
      
      if (healthStatus.status === 'degraded') {
        logSystem.warn('Health check: System degraded', { 
          dbStatus, 
          dbResponseTime,
          reason: 'Database connection failed'
        });
      }
      
      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error: any) {
      logSystem.error('Health check: Critical error', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // Storage provider info
  app.get("/api/storage/info", async (_req: Request, res: Response) => {
    res.json({
      provider: getActiveProviderName(),
      initialized: isStorageInitialized(),
      timestamp: new Date().toISOString(),
    });
  });

  // Serve files from filesystem storage (for CapRover/local deployments)
  app.get("/api/storage/files/*", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const key = req.path.replace('/api/storage/files/', '');
      
      if (!key || key.includes('..')) {
        return res.status(400).json({ message: "Invalid file path" });
      }

      const fileBuffer = await getDocument(key);
      if (!fileBuffer) {
        return res.status(404).json({ message: "File not found" });
      }

      const ext = key.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'pdf': 'application/pdf',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };

      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(fileBuffer);
    } catch (error: any) {
      logSystem.error('Error serving file from storage', error);
      res.status(500).json({ message: "Failed to retrieve file" });
    }
  });

  // Health Check - Database detailed
  app.get("/api/health/db", async (_req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity with safe queries
      const [users, servicios, drivers, tarifas] = await Promise.all([
        storage.getAllUsers().catch(() => []),
        storage.getAllServicios().catch(() => []),
        storage.getAllDrivers().catch(() => []),
        storage.getAllTarifas().catch(() => []),
      ]);
      
      const responseTime = Date.now() - startTime;
      
      // Calculate stats
      const stats = {
        totalUsers: users.length,
        usersByType: {
          clientes: users.filter(u => u.userType === 'cliente').length,
          conductores: users.filter(u => u.userType === 'conductor').length,
          admins: users.filter(u => u.userType === 'admin').length,
          aseguradoras: users.filter(u => u.userType === 'aseguradora').length,
          socios: users.filter(u => u.userType === 'socio').length,
        },
        totalServices: servicios.length,
        servicesByState: {
          pendiente: servicios.filter(s => s.estado === 'pendiente').length,
          aceptado: servicios.filter(s => s.estado === 'aceptado').length,
          en_progreso: servicios.filter(s => s.estado === 'en_progreso').length,
          completado: servicios.filter(s => s.estado === 'completado').length,
          cancelado: servicios.filter(s => s.estado === 'cancelado').length,
        },
        totalDrivers: drivers.length,
        availableDrivers: drivers.filter(d => d.disponible).length,
        activeTariffs: tarifas.filter(t => t.activo).length,
      };
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        connection: 'established',
        stats,
      });
      
    } catch (error: any) {
      logSystem.error('Health check DB: Failed', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        connection: 'failed',
      });
    }
  });

  // Health Check - Payment Gateway
  // TODO: Implementar con Azul API
  app.get("/api/health/payments", async (_req: Request, res: Response) => {
    try {
      // TODO: Implementar verificación de configuración con Azul API
      res.status(200).json({
        status: 'not_configured',
        timestamp: new Date().toISOString(),
        message: 'Payment Gateway pending migration to Azul API',
        gateway: 'azul',
        keysPresent: {
          apiKey: false,
          secretKey: false,
        },
      });
    } catch (error: any) {
      logSystem.error('Health check Payments: Failed', error);
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        gateway: 'azul',
        error: error.message,
      });
    }
  });

  // System Alerts endpoint - Basic monitoring
  app.get("/api/health/alerts", async (_req: Request, res: Response) => {
    try {
      const alerts: Array<{ level: 'critical' | 'warning' | 'info'; message: string; category: string; timestamp: string }> = [];
      const now = new Date();
      
      // Fetch data with safe fallbacks
      const [servicios, drivers, documentos, tickets] = await Promise.all([
        storage.getAllServicios().catch(() => []),
        storage.getAllDrivers().catch(() => []),
        storage.getAllDocumentos().catch(() => []),
        storage.getAllTickets().catch(() => []),
      ]);
      
      // Check for pending services older than 30 minutes
      const pendientes = servicios.filter(s => {
        if (s.estado !== 'pendiente') return false;
        const createdAt = new Date(s.createdAt || now);
        const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        return ageMinutes > 30;
      });
      
      if (pendientes.length > 0) {
        alerts.push({
          level: pendientes.length > 5 ? 'critical' : 'warning',
          message: `${pendientes.length} servicios pendientes por más de 30 minutos`,
          category: 'operations',
          timestamp: now.toISOString(),
        });
      }
      
      // Check driver availability
      const disponibles = drivers.filter(d => d.disponible).length;
      const total = drivers.length;
      
      if (disponibles === 0 && total > 0) {
        alerts.push({
          level: 'critical',
          message: 'No hay conductores disponibles',
          category: 'operations',
          timestamp: now.toISOString(),
        });
      } else if (disponibles < 3 && total > 0) {
        alerts.push({
          level: 'warning',
          message: `Solo ${disponibles} conductores disponibles`,
          category: 'operations',
          timestamp: now.toISOString(),
        });
      }
      
      // Check for documents expiring soon
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringDocs = documentos.filter(d => {
        if (!d.validoHasta) return false;
        const validoHasta = new Date(d.validoHasta);
        return validoHasta <= thirtyDaysFromNow && validoHasta > now;
      });
      
      if (expiringDocs.length > 0) {
        alerts.push({
          level: 'warning',
          message: `${expiringDocs.length} documentos vencerán en los próximos 30 días`,
          category: 'compliance',
          timestamp: now.toISOString(),
        });
      }
      
      // Check for expired documents
      const expiredDocs = documentos.filter(d => {
        if (!d.validoHasta) return false;
        return new Date(d.validoHasta) < now;
      });
      
      if (expiredDocs.length > 0) {
        alerts.push({
          level: 'critical',
          message: `${expiredDocs.length} documentos vencidos`,
          category: 'compliance',
          timestamp: now.toISOString(),
        });
      }
      
      // Check pending tickets (urgent priority)
      const urgentPending = tickets.filter(t => 
        t.prioridad === 'urgente' && 
        (t.estado === 'abierto' || t.estado === 'en_proceso')
      );
      
      if (urgentPending.length > 0) {
        alerts.push({
          level: 'warning',
          message: `${urgentPending.length} tickets urgentes sin resolver`,
          category: 'support',
          timestamp: now.toISOString(),
        });
      }
      
      // Summary
      const summary = {
        critical: alerts.filter(a => a.level === 'critical').length,
        warning: alerts.filter(a => a.level === 'warning').length,
        info: alerts.filter(a => a.level === 'info').length,
      };
      
      res.json({
        status: summary.critical > 0 ? 'critical' : summary.warning > 0 ? 'warning' : 'ok',
        timestamp: now.toISOString(),
        summary,
        alerts,
        metrics: {
          serviciosPendientes: servicios.filter(s => s.estado === 'pendiente').length,
          serviciosActivos: servicios.filter(s => s.estado === 'aceptado' || s.estado === 'en_progreso').length,
          conductoresDisponibles: disponibles,
          conductoresTotales: total,
          documentosVencidos: expiredDocs.length,
          documentosPorVencer: expiringDocs.length,
          ticketsUrgentes: urgentPending.length,
        },
      });
      
    } catch (error: any) {
      logSystem.error('Health alerts: Failed', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  // Check if multiple accounts exist for an email (for disambiguation)
  // Security: Only returns accounts where password matches that specific account
  // Uses userType for selection (not raw IDs) since a user can only have ONE account per type
  app.post("/api/auth/check-accounts", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña son requeridos" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Formato de correo electrónico inválido" });
      }
      
      // Get all accounts with this email (using basic query without relations for performance)
      let accounts;
      try {
        accounts = await storage.getBasicUsersByEmail(email);
        console.log('Check-accounts: Found accounts count:', accounts?.length || 0);
      } catch (dbError: any) {
        console.error('Check-accounts: Database query failed:', dbError?.message);
        throw new Error(`Database query failed: ${dbError?.message}`);
      }
      
      if (accounts.length === 0) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      // Security: Validate password against EACH individual account
      // Only return accounts where the provided password matches that specific account's hash
      // This prevents privilege escalation - you can only access accounts where you know the password
      const validAccounts = [];
      for (const account of accounts) {
        // Skip accounts without a valid password hash (safety check)
        if (!account.passwordHash) {
          continue;
        }
        
        // Check all account types for disambiguation (cliente, conductor, admin, aseguradora, socio, empresa)
        
        try {
          const isValid = await bcrypt.compare(password, account.passwordHash);
          if (isValid) {
            validAccounts.push({
              userType: account.userType,
              nombre: account.nombre,
              apellido: account.apellido,
              fotoUrl: account.fotoUrl,
            });
          }
        } catch (bcryptError) {
          // Log but don't fail the whole request if one account has an invalid hash
          logSystem.error('Bcrypt compare error for account', bcryptError, { 
            email: account.email, 
            userType: account.userType 
          });
          continue;
        }
      }
      
      // No valid accounts with matching password
      if (validAccounts.length === 0) {
        logAuth.loginFailed(email, "Invalid password");
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      // If only one valid account, no disambiguation needed
      if (validAccounts.length === 1) {
        return res.json({ 
          requiresDisambiguation: false,
          accounts: validAccounts
        });
      }
      
      // Multiple accounts found - return info for disambiguation
      // Note: We use userType for selection since each email can only have ONE account per type
      return res.json({
        requiresDisambiguation: true,
        accounts: validAccounts,
      });
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const errorStack = error?.stack || '';
      console.error('Check accounts error details:', {
        message: errorMessage,
        stack: errorStack,
        email: req.body.email,
        errorType: error?.constructor?.name
      });
      logSystem.error('Check accounts error', error, { 
        email: req.body.email,
        errorMessage,
        errorStack: errorStack.substring(0, 500)
      });
      res.status(500).json({ message: "Error al verificar cuentas" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        logSystem.error("Login authentication error", err);
        return res.status(500).json({ message: "Error de autenticación interno" });
      }
      
      if (!user) {
        logAuth.loginFailed(req.body.email || "unknown", info?.message || "Invalid credentials");
        return res.status(401).json({ 
          message: info?.message || "Credenciales inválidas. Verifica tu correo y contraseña." 
        });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          logSystem.error("Session establishment error", loginErr);
          return res.status(500).json({ message: "Error al establecer sesión" });
        }
        
        // Skip verification check for admin, aseguradora, socio, and empresa users
        const skipVerificationTypes = ['admin', 'aseguradora', 'socio', 'empresa'];
        
        // For clientes and conductores, validate that identity verification is complete
        if (user && !skipVerificationTypes.includes(user.userType)) {
          // Only email verification is required (no SMS)
          const emailVerificado = user.emailVerificado === true;
          
          const verificationStatus = {
            cedulaVerificada: user.cedulaVerificada === true,
            emailVerificado: emailVerificado,
            fotoVerificada: user.fotoVerificada === true,
          };
          
          // Determine what's required based on user type
          const isConductor = user.userType === 'conductor';
          const needsVerification = isConductor 
            ? (!verificationStatus.cedulaVerificada || !emailVerificado || !verificationStatus.fotoVerificada)
            : (!verificationStatus.cedulaVerificada || !emailVerificado);
          
          // If verification is missing, return 403 but KEEP session active
          // This allows the user to complete verification steps (photo upload, OTP, etc.)
          if (needsVerification) {
            // Return only safe, non-sensitive user data for the verification page
            const safeUserData = {
              id: user.id,
              email: user.email,
              nombre: user.nombre,
              apellido: user.apellido,
              userType: user.userType,
              cedulaVerificada: user.cedulaVerificada,
              emailVerificado: user.emailVerificado,
              fotoVerificada: user.fotoVerificada,
            };
            
            // Keep session active so user can complete verification steps
            // The frontend will redirect to verify-pending page
            // Verification endpoints will work since req.isAuthenticated() will return true
            return res.status(403).json({
              message: "Debe completar la verificación de identidad antes de acceder",
              requiresVerification: true,
              verificationStatus,
              redirectTo: '/verify-pending',
              user: safeUserData,
            });
          }
        }
        
        // Check for socio first login and send welcome email
        if (user && user.userType === 'socio') {
          try {
            const socio = await storage.getSocioByUserId(user.id);
            if (socio && socio.primerInicioSesion) {
              // Send first login email
              const emailService = await getEmailService();
              await emailService.sendSocioFirstLoginEmail(user.email, user.nombre || 'Socio');
              
              // Mark first login as completed
              await storage.updateSocio(socio.id, { primerInicioSesion: false });
              
              logSystem.info('Socio first login processed', { socioId: socio.id, userId: user.id });
            }
          } catch (error) {
            logSystem.error('Error processing socio first login', error, { userId: user.id });
          }
        }
        
        // Return sanitized user data (without passwordHash)
        res.json({ user: getSafeUser(user) });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      // Destroy the session completely to prevent any stale data
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        // Clear the session cookie
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
        });
        res.json({ message: "Logged out" });
      });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      // Return sanitized user data (without passwordHash)
      res.json(getSafeUser(req.user));
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { email, tipoOperacion } = req.body;

      if (!email || !tipoOperacion) {
        return res.status(400).json({ message: "Correo electrónico y tipo de operación son requeridos" });
      }

      if (!['registro', 'recuperacion_password'].includes(tipoOperacion)) {
        return res.status(400).json({ message: "Tipo de operación inválido" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Formato de correo electrónico inválido" });
      }

      const codigo = generateOTP();
      const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

      await storage.deleteExpiredVerificationCodes();
      await storage.deletePriorVerificationCodes(email, tipoOperacion);

      await storage.createVerificationCode({
        telefono: email, // Using telefono field to store email
        codigo,
        expiraEn,
        tipoOperacion,
      });

      // Get user name if exists for personalized email
      const user = await storage.getUserByEmail(email);
      const userName = user?.nombre || undefined;

      // Send verification code via email
      const emailService = await getEmailService();
      const sent = await emailService.sendOTPEmail(email, codigo, userName);

      if (!sent) {
        logSystem.error('Failed to send OTP email', null, { email });
        return res.status(500).json({ message: "Error al enviar el código de verificación. Por favor intente nuevamente." });
      }

      logAuth.otpSent(email);

      res.json({ 
        message: "Código enviado a tu correo electrónico",
        expiresIn: 600
      });
    } catch (error: any) {
      logSystem.error('Send OTP error', error, { email: req.body.email });
      res.status(500).json({ message: "Error al enviar código de verificación" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { email, codigo, tipoOperacion, userType } = req.body;

      if (!email || !codigo || !tipoOperacion) {
        return res.status(400).json({ message: "Datos incompletos" });
      }

      // Using telefono field to store email in verification codes
      const verificationCode = await storage.getActiveVerificationCode(email, tipoOperacion);

      if (!verificationCode) {
        return res.status(400).json({ message: "Código inválido o expirado" });
      }

      if (verificationCode.intentos >= 3) {
        await storage.markVerificationCodeAsUsed(verificationCode.id);
        logAuth.otpFailed(email, verificationCode.intentos);
        return res.status(400).json({ message: "Demasiados intentos. Solicita un nuevo código" });
      }

      if (verificationCode.codigo !== codigo) {
        await storage.incrementVerificationAttempts(verificationCode.id);
        logAuth.otpFailed(email, verificationCode.intentos + 1);
        return res.status(400).json({ message: "Código incorrecto" });
      }

      await storage.markVerificationCodeAsUsed(verificationCode.id);

      if (tipoOperacion === 'registro') {
        // Priority: 1) Authenticated session user, 2) userType parameter, 3) first user by email
        let user;
        if (req.isAuthenticated() && req.user) {
          // Use the currently authenticated user's account
          user = await storage.getUserById(req.user.id);
          logSystem.info('OTP verification using authenticated session', { userId: req.user.id, email });
        } else if (userType) {
          // Use userType to find the specific account
          user = await storage.getUserByEmailAndType(email, userType);
          logSystem.info('OTP verification using userType', { userType, email });
        } else {
          // Fallback to first user by email (backwards compatibility)
          user = await storage.getUserByEmail(email);
          logSystem.info('OTP verification using email only (fallback)', { email });
        }
        
        if (user) {
          await storage.updateUser(user.id, { 
            emailVerificado: true,
            estadoCuenta: 'activo'
          });
          logSystem.info('Email verified for user', { userId: user.id, userType: user.userType });
        }
      }

      logAuth.otpVerified(email);

      res.json({ 
        message: "Código verificado exitosamente",
        verified: true
      });
    } catch (error: any) {
      logSystem.error('Verify OTP error', error, { email: req.body.email });
      res.status(500).json({ message: "Error al verificar código" });
    }
  });

  // Rate limiting middleware for identity verification endpoints (Workstream A - Phase 4)
  const verifyCedulaLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // max 5 requests per hour per IP
    message: "Demasiados intentos de verificación de cédula. Intenta nuevamente en 1 hora.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSystem.warn('Rate limit exceeded for cedula verification', { 
        ip: req.ip, 
        userId: req.user?.id 
      });
      res.status(429).json({ 
        message: "Demasiados intentos de verificación de cédula. Intenta nuevamente en 1 hora." 
      });
    }
  });

  const sendOTPLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // max 3 requests per hour per IP
    message: "Demasiados intentos de envío de código. Intenta nuevamente en 1 hora.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSystem.warn('Rate limit exceeded for OTP sending', { 
        ip: req.ip, 
        userId: req.user?.id 
      });
      res.status(429).json({ 
        message: "Demasiados intentos de envío de código. Intenta nuevamente en 1 hora." 
      });
    }
  });

  const verifyOTPLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // max 10 requests per hour per IP
    message: "Demasiados intentos de verificación. Intenta nuevamente en 1 hora.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSystem.warn('Rate limit exceeded for OTP verification', { 
        ip: req.ip, 
        userId: req.user?.id 
      });
      res.status(429).json({ 
        message: "Demasiados intentos de verificación. Intenta nuevamente en 1 hora." 
      });
    }
  });

  // Rate limiter for pricing calculation endpoint
  const pricingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // max 30 requests per 15 minutes per IP
    message: "Demasiados intentos de cálculo de precio. Intenta nuevamente en 15 minutos.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSystem.warn('Rate limit exceeded for pricing calculation', { 
        ip: req.ip, 
        userId: req.user?.id 
      });
      res.status(429).json({ 
        message: "Demasiados intentos de cálculo de precio. Intenta nuevamente en 15 minutos." 
      });
    }
  });

  // Identity Verification Endpoints (Workstream A - Phase 4)
  app.post("/api/identity/verify-cedula", verifyCedulaLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { cedula } = req.body;

      if (!cedula) {
        return res.status(400).json({ message: "Cédula es requerida" });
      }

      const { verifyCedula } = await import("./services/identity");
      const result = await verifyCedula(
        req.user!.id,
        cedula,
        req.ip,
        req.headers['user-agent']
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      logAuth.cedulaVerified(req.user!.id, result.formatted!);

      res.json({
        message: "Cédula verificada exitosamente",
        cedula: result.formatted
      });
    } catch (error: any) {
      logSystem.error('Verify cedula error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al verificar cédula" });
    }
  });

  const ocrScanLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Demasiados intentos de escaneo. Intenta nuevamente en 1 hora.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSystem.warn('Rate limit exceeded for OCR scan', { 
        ip: req.ip, 
        userId: req.user?.id 
      });
      res.status(429).json({ 
        message: "Demasiados intentos de escaneo. Intenta nuevamente en 1 hora." 
      });
    }
  });

  app.post("/api/identity/scan-cedula", ocrScanLimiter, async (req: Request, res: Response) => {
    try {
      const { image, userId, skipVerification } = req.body;

      if (!image) {
        return res.status(400).json({ message: "Imagen de la cédula es requerida" });
      }

      if (image.length > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "La imagen es demasiado grande. Máximo 10MB." });
      }

      const { scanAndVerifyCedula, isVerifikConfigured } = await import("./services/verifik-ocr");
      
      if (!isVerifikConfigured()) {
        if (req.isAuthenticated() && image) {
          let imageUrl: string | null = null;
          
          try {
            const timestamp = Date.now();
            const filename = `cedula_${req.user!.id}_${timestamp}.jpg`;
            const uploadResult = await storageService.uploadBase64Image(image, 'cedulas', filename);
            imageUrl = uploadResult.url;
            
            await storage.updateUser(req.user!.id, {
              cedulaImageUrl: uploadResult.url
            });
            
            logSystem.info('Cedula image saved for manual verification', { userId: req.user!.id });
          } catch (uploadError) {
            logSystem.warn('Failed to save cedula image, continuing without image storage', { 
              userId: req.user!.id, 
              error: uploadError 
            });
          }
          
          return res.json({
            success: true,
            verified: false,
            manualVerificationRequired: true,
            imageSaved: !!imageUrl,
            message: imageUrl 
              ? "Tu cédula ha sido recibida y será verificada manualmente por un administrador."
              : "Tu cédula será verificada manualmente. Por favor, asegúrate de tenerla disponible si se solicita."
          });
        }
        
        return res.status(503).json({ 
          message: "El servicio de verificación OCR no está configurado" 
        });
      }

      // Get user name for comparison (from authenticated user or request body for registration)
      let userNombre: string | undefined;
      let userApellido: string | undefined;
      
      if (req.isAuthenticated()) {
        userNombre = req.user!.nombre;
        userApellido = req.user!.apellido ?? undefined;
      } else if (req.body.nombre && req.body.apellido) {
        // For registration flow - name provided in request body
        userNombre = req.body.nombre;
        userApellido = req.body.apellido;
      }

      const result = await scanAndVerifyCedula(image, userNombre, userApellido);

      // Only save cedula image if OCR was successful (has cedula number)
      // This prevents marking the step as "pending review" when OCR completely fails
      if (!result.success) {
        logSystem.warn('OCR scan failed', { 
          error: result.error, 
          userId: userId || req.user?.id 
        });
        return res.status(400).json({ 
          message: result.error || "No se pudo escanear la cédula"
        });
      }

      // Check if name extraction failed - allow manual verification instead of blocking
      if (userNombre && userApellido && (!result.nombre || !result.apellido)) {
        logSystem.warn('Could not verify name match - insufficient data from OCR, allowing manual verification', {
          userId: req.user?.id,
          hasNombre: !!result.nombre,
          hasApellido: !!result.apellido,
          confidenceScore: result.confidenceScore
        });
        
        // Save cedula for manual review if authenticated
        if (req.isAuthenticated() && result.cedula) {
          let imageUrl: string | null = null;
          
          if (image) {
            try {
              const timestamp = Date.now();
              const filename = `cedula_manual_${req.user!.id}_${timestamp}.jpg`;
              const uploadResult = await storageService.uploadBase64Image(image, 'cedulas', filename);
              imageUrl = uploadResult.url;
            } catch (uploadError) {
              logSystem.warn('Failed to upload cedula image, saving cedula number only', { 
                userId: req.user!.id, 
                error: uploadError 
              });
            }
          }
          
          const updateData: any = { cedula: result.cedula };
          if (imageUrl) updateData.cedulaImageUrl = imageUrl;
          
          await storage.updateUser(req.user!.id, updateData);
          logSystem.info('Cedula saved for manual verification (name extraction failed)', { 
            userId: req.user!.id,
            hasImage: !!imageUrl
          });
        }
        
        return res.json({
          success: true,
          cedula: result.cedula,
          nombre: result.nombre,
          apellido: result.apellido,
          verified: false,
          nameMatch: false,
          manualVerificationRequired: true,
          confidenceScore: result.confidenceScore,
          message: "Cédula escaneada. La verificación será revisada manualmente."
        });
      }

      // Check name match result - if skipVerification is true or similarity is reasonable, allow to continue
      if (!result.nameMatch) {
        logSystem.warn('Name mismatch during cedula verification', {
          userId: req.user?.id,
          registeredName: `${userNombre} ${userApellido}`,
          documentName: `${result.nombre} ${result.apellido}`,
          similarity: result.nameSimilarity,
          skipVerification
        });
        
        // If similarity is at least 30% or skipVerification is true, allow manual verification
        const allowManualVerification = skipVerification || (result.nameSimilarity && result.nameSimilarity >= 0.3);
        
        if (allowManualVerification) {
          logSystem.info('Allowing manual verification despite name mismatch', {
            userId: req.user?.id,
            similarity: result.nameSimilarity,
            skipVerification
          });
          
          // Save cedula for manual review if authenticated
          if (req.isAuthenticated() && result.cedula) {
            let imageUrl: string | null = null;
            
            // Try to save image, but don't block if it fails
            if (image) {
              try {
                const timestamp = Date.now();
                const filename = `cedula_manual_${req.user!.id}_${timestamp}.jpg`;
                const uploadResult = await storageService.uploadBase64Image(image, 'cedulas', filename);
                imageUrl = uploadResult.url;
              } catch (uploadError) {
                logSystem.warn('Failed to upload cedula image, saving cedula number only', { 
                  userId: req.user!.id, 
                  error: uploadError 
                });
              }
            }
            
            // Always save cedula number (and image URL if available)
            const updateData: any = { cedula: result.cedula };
            if (imageUrl) updateData.cedulaImageUrl = imageUrl;
            
            await storage.updateUser(req.user!.id, updateData);
            logSystem.info('Cedula saved for manual verification', { 
              userId: req.user!.id, 
              cedula: result.cedula?.slice(0, 5) + '***',
              hasImage: !!imageUrl
            });
          }
          
          return res.json({
            success: true,
            cedula: result.cedula,
            nombre: result.nombre,
            apellido: result.apellido,
            verified: false,
            nameMatch: false,
            manualVerificationRequired: true,
            confidenceScore: result.confidenceScore,
            similarity: result.nameSimilarity,
            message: "Cédula escaneada. La verificación del nombre será revisada manualmente."
          });
        }
        
        return res.status(400).json({
          success: false,
          verified: false,
          nameMatch: false,
          confidenceScore: result.confidenceScore,
          similarity: result.nameSimilarity,
          message: result.error || `La cédula no coincide con sus datos de registro.`
        });
      }

      // Update user's cedula verification status if authenticated and verified
      if (req.isAuthenticated() && !skipVerification && result.cedula && result.verified) {
        // Save cedula image for verified cedulas
        if (image) {
          try {
            const timestamp = Date.now();
            const filename = `cedula_verified_${req.user!.id}_${timestamp}.jpg`;
            const uploadResult = await storageService.uploadBase64Image(image, 'cedulas', filename);
            
            await storage.updateUser(req.user!.id, {
              cedulaImageUrl: uploadResult.url
            });
            
            logSystem.info('Verified cedula image saved', { userId: req.user!.id, url: uploadResult.url });
          } catch (uploadError) {
            logSystem.warn('Failed to save verified cedula image', { userId: req.user!.id, error: uploadError });
          }
        }
        
        const { verifyCedula } = await import("./services/identity");
        const verifyResult = await verifyCedula(
          req.user!.id,
          result.cedula,
          req.ip,
          req.headers['user-agent']
        );

        if (verifyResult.success) {
          logAuth.cedulaVerified(req.user!.id, result.cedula);
        }
      }

      logSystem.info('OCR scan successful', { 
        cedula: result.cedula?.slice(0, 5) + '***', 
        verified: result.verified,
        confidenceScore: result.confidenceScore,
        nameMatch: result.nameMatch,
        userId: userId || req.user?.id 
      });

      res.json({
        success: true,
        cedula: result.cedula,
        nombre: result.nombre,
        apellido: result.apellido,
        verified: result.verified,
        nameMatch: result.nameMatch,
        confidenceScore: result.confidenceScore,
        message: result.verified 
          ? "Cédula escaneada y verificada exitosamente"
          : "Cédula escaneada. Verificación pendiente."
      });
    } catch (error: any) {
      logSystem.error('Scan cedula error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al escanear cédula" });
    }
  });

  app.get("/api/identity/verifik-status", async (req: Request, res: Response) => {
    try {
      const { isVerifikConfigured } = await import("./services/verifik-ocr");
      res.json({ 
        configured: isVerifikConfigured(),
        service: "Verifik OCR"
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error checking Verifik status" });
    }
  });

  // License OCR Scan endpoint for operators during registration
  app.post("/api/identity/scan-license", ocrScanLimiter, async (req: Request, res: Response) => {
    // Bug 1 debugging: Log when request reaches this endpoint
    const user = req.user as any;
    logSystem.info('LICENSE_SCAN_FRONT: Request received', {
      userId: user?.id,
      userType: user?.userType,
      isAuthenticated: req.isAuthenticated(),
      hasImage: !!req.body?.image,
      emailVerificado: user?.emailVerificado,
      cedulaVerificada: user?.cedulaVerificada,
      fotoVerificada: user?.fotoVerificada
    });
    
    try {
      const { image, nombre, apellido } = req.body;

      if (!image) {
        return res.status(400).json({ message: "Imagen de la licencia es requerida" });
      }

      if (image.length > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "La imagen es demasiado grande. Máximo 10MB." });
      }

      // IMPORTANT: Require cédula to be verified (or pending review) before license verification
      if (req.isAuthenticated()) {
        const currentUser = await storage.getUserById(req.user!.id);
        if (currentUser && !currentUser.cedulaVerificada && !currentUser.cedulaImageUrl) {
          logSystem.warn('License verification attempted without cedula verification', {
            userId: req.user!.id,
            cedulaVerificada: currentUser.cedulaVerificada,
            hasCedulaImage: !!currentUser.cedulaImageUrl
          });
          return res.status(400).json({ 
            message: "Debes verificar tu cédula antes de verificar tu licencia de conducir",
            requiresCedulaFirst: true
          });
        }
      }

      const { scanAndVerifyLicense, isVerifikConfigured } = await import("./services/verifik-ocr");
      
      if (!isVerifikConfigured()) {
        return res.status(503).json({ 
          message: "El servicio de verificación OCR no está configurado" 
        });
      }

      // Get user data for comparison (from authenticated user or request body for registration)
      let userNombre: string | undefined;
      let userApellido: string | undefined;
      let userCedula: string | undefined;
      
      if (req.isAuthenticated()) {
        userNombre = req.user!.nombre;
        userApellido = req.user!.apellido ?? undefined;
        userCedula = req.user!.cedula ?? undefined;
      } else if (nombre && apellido) {
        // For registration flow - name provided in request body
        userNombre = nombre;
        userApellido = apellido;
        // Cedula may be provided in request body for registration flow
        userCedula = req.body.cedula;
      }

      const result = await scanAndVerifyLicense(image, userNombre, userApellido, userCedula);

      if (!result.success) {
        logSystem.warn('License OCR scan failed', { 
          error: result.error, 
          userId: req.user?.id 
        });
        return res.status(400).json({ 
          message: result.error || "No se pudo escanear la licencia"
        });
      }

      // Check cedula match result first (more critical than name match)
      if (result.cedulaMatch === false && userCedula) {
        logSystem.warn('Cedula mismatch during license verification', {
          userId: req.user?.id,
          hasCedulaMatch: result.cedulaMatch
        });
        
        return res.status(400).json({
          success: false,
          verified: false,
          cedulaMatch: false,
          nameMatch: result.nameMatch,
          confidenceScore: result.confidenceScore,
          message: result.error || `El número de cédula en la licencia no coincide con su cédula verificada.`
        });
      }

      // Check name match result
      if (!result.nameMatch && userNombre && userApellido) {
        logSystem.warn('Name mismatch during license verification', {
          userId: req.user?.id,
          registeredName: `${userNombre} ${userApellido}`,
          documentName: `${result.nombre} ${result.apellido}`,
          similarity: result.nameSimilarity
        });
        
        return res.status(400).json({
          success: false,
          verified: false,
          nameMatch: false,
          cedulaMatch: result.cedulaMatch,
          confidenceScore: result.confidenceScore,
          similarity: result.nameSimilarity,
          message: result.error || `La licencia no coincide con sus datos de registro.`
        });
      }

      // If we reached this point, the license is valid:
      // - Document type is a driver's license
      // - License number (cedula) was extracted successfully
      // - License is not expired
      // - Name and cedula comparisons passed (if applicable)
      // So we can mark it as verified
      const isVerified = true;

      logSystem.info('License OCR scan successful', { 
        licenseNumber: result.licenseNumber?.slice(0, 3) + '***', 
        verified: isVerified,
        confidenceScore: result.confidenceScore,
        nameMatch: result.nameMatch,
        cedulaMatch: result.cedulaMatch,
        expirationDateSource: result.expirationDateSource,
        userId: req.user?.id 
      });

      res.json({
        success: true,
        licenseNumber: result.licenseNumber,
        nombre: result.nombre,
        apellido: result.apellido,
        expirationDate: result.expirationDate,
        issueDate: result.issueDate,
        expirationDateSource: result.expirationDateSource,
        licenseClass: result.licenseClass,
        verified: isVerified,
        nameMatch: result.nameMatch,
        cedulaMatch: result.cedulaMatch,
        confidenceScore: result.confidenceScore,
        message: result.expirationDateSource === 'manual_required' 
          ? "Licencia verificada. Por favor, ingresa la fecha de vencimiento manualmente."
          : "Licencia escaneada y verificada exitosamente"
      });
    } catch (error: any) {
      logSystem.error('Scan license error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al escanear licencia" });
    }
  });

  // Scan license back side (category and restrictions)
  app.post("/api/identity/scan-license-back", ocrScanLimiter, async (req: Request, res: Response) => {
    // Bug 1 debugging: Log when request reaches this endpoint
    const user = req.user as any;
    logSystem.info('LICENSE_SCAN_BACK: Request received', {
      userId: user?.id,
      userType: user?.userType,
      isAuthenticated: req.isAuthenticated(),
      hasImage: !!req.body?.image,
      emailVerificado: user?.emailVerificado,
      cedulaVerificada: user?.cedulaVerificada,
      fotoVerificada: user?.fotoVerificada
    });
    
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ message: "Imagen de la parte trasera de la licencia es requerida" });
      }

      if (image.length > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "La imagen es demasiado grande. Máximo 10MB." });
      }

      // IMPORTANT: Require cédula to be verified (or pending review) before license verification
      if (req.isAuthenticated()) {
        const currentUser = await storage.getUserById(req.user!.id);
        if (currentUser && !currentUser.cedulaVerificada && !currentUser.cedulaImageUrl) {
          logSystem.warn('License back verification attempted without cedula verification', {
            userId: req.user!.id,
            cedulaVerificada: currentUser.cedulaVerificada,
            hasCedulaImage: !!currentUser.cedulaImageUrl
          });
          return res.status(400).json({ 
            message: "Debes verificar tu cédula antes de verificar tu licencia de conducir",
            requiresCedulaFirst: true
          });
        }
      }

      const { validateDriverLicenseBack, isVerifikConfigured } = await import("./services/verifik-ocr");
      
      if (!isVerifikConfigured()) {
        return res.status(503).json({ 
          message: "El servicio de verificación OCR no está configurado" 
        });
      }

      const result = await validateDriverLicenseBack(image);

      // License back category extraction is optional - don't fail the request
      // Even if OCR fails, we still accept the upload for manual review
      if (!result.success) {
        logSystem.warn('License back OCR scan failed - accepting for manual review', { 
          error: result.error, 
          userId: req.user?.id 
        });
        // Return success with isValid: true but no category - manual review will handle it
        return res.json({
          success: true,
          isValid: true,
          category: null,
          restrictions: null,
          expirationDate: null,
          confidenceScore: 0,
          manualReviewRequired: true,
          message: "La licencia fue aceptada. La categoría será verificada manualmente."
        });
      }

      logSystem.info('License back OCR scan successful', { 
        category: result.category,
        restrictions: result.restrictions ? 'yes' : 'no',
        confidenceScore: result.score,
        userId: req.user?.id 
      });

      // Save license category to database if scan was valid and user is a conductor
      if (result.isValid && user?.userType === 'conductor') {
        try {
          const conductor = await storage.getConductorByUserId(user.id);
          if (conductor) {
            const updateData: any = {
              licenciaCategoriaVerificada: true,
            };
            
            if (result.category) {
              updateData.licenciaCategoria = result.category;
            }
            if (result.restrictions) {
              updateData.licenciaRestricciones = result.restrictions;
            }
            if (result.expirationDate) {
              const parsedDate = new Date(result.expirationDate);
              if (!isNaN(parsedDate.getTime())) {
                updateData.licenciaFechaVencimiento = parsedDate;
              }
            }
            
            await storage.updateConductor(conductor.id, updateData);
            
            logSystem.info('Conductor license category saved', {
              conductorId: conductor.id,
              userId: user.id,
              category: result.category,
              restrictions: result.restrictions ? 'yes' : 'no',
              hasExpirationDate: !!result.expirationDate
            });
          }
        } catch (saveError: any) {
          logSystem.error('Failed to save license category to database', saveError, { 
            userId: user.id,
            category: result.category
          });
          // Don't fail the request, just log the error - OCR was successful
        }
      }

      res.json({
        success: true,
        isValid: result.isValid,
        category: result.category,
        restrictions: result.restrictions,
        expirationDate: result.expirationDate,
        confidenceScore: result.score,
        message: result.isValid 
          ? "Parte trasera de licencia escaneada exitosamente"
          : "No se pudo extraer la información de la licencia. Intenta con otra foto."
      });
    } catch (error: any) {
      logSystem.error('Scan license back error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al escanear parte trasera de la licencia" });
    }
  });

  // Update email during verification flow (with rate limiting to prevent abuse)
  app.patch("/api/identity/email", sendOTPLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "El correo electrónico es requerido" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Formato de correo electrónico inválido" });
      }

      // Validate that the new email is different from the current one
      if (email.toLowerCase() === req.user!.email.toLowerCase()) {
        return res.status(400).json({ 
          message: "El nuevo correo debe ser diferente al actual" 
        });
      }

      // Check if email is already in use by ANY user (not just same type)
      const existingUsers = await storage.getUsersByEmail(email);
      const otherUser = existingUsers.find(u => u.id !== req.user!.id);
      if (otherUser) {
        return res.status(409).json({ 
          message: "Este correo electrónico ya está en uso por otra cuenta" 
        });
      }

      // Update email and reset emailVerificado to false (requires re-verification)
      const updatedUser = await storage.updateUser(req.user!.id, { 
        email: email,
        emailVerificado: false 
      });

      logSystem.info('User email updated during verification', { 
        userId: req.user!.id, 
        newEmail: email.replace(/(.{2}).*@/, '$1***@') // Mask email for logging
      });

      // Update session to reflect the new email
      await new Promise<void>((resolve, reject) => {
        req.login(updatedUser, (err) => {
          if (err) {
            logSystem.error('Failed to update session after email change', err, { userId: req.user?.id });
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Automatically send OTP to the new email
      let otpSent = false;
      try {
        const codigo = generateOTP();
        const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

        await storage.deleteExpiredVerificationCodes();
        await storage.deletePriorVerificationCodes(email, 'registro');

        await storage.createVerificationCode({
          telefono: email, // Using telefono field to store email (consistent with /api/auth/send-otp)
          codigo,
          expiraEn,
          tipoOperacion: 'registro',
        });

        // Send verification code via email
        const emailService = await getEmailService();
        const sent = await emailService.sendOTPEmail(email, codigo, updatedUser.nombre || undefined);

        if (sent) {
          otpSent = true;
          logAuth.otpSent(email);
        } else {
          logSystem.error('Failed to send OTP email after email update', null, { email });
        }
      } catch (otpError: any) {
        logSystem.error('Error sending OTP after email update', otpError, { userId: req.user?.id });
        // Don't fail the whole request, just note OTP wasn't sent
      }

      // Return updated user data so frontend can update its state
      res.json({
        success: true,
        message: otpSent 
          ? "Correo actualizado. Hemos enviado un código de verificación a tu nuevo correo." 
          : "Correo electrónico actualizado. Por favor, solicita un código de verificación.",
        requiresVerification: true,
        otpSent,
        expiresIn: otpSent ? 600 : undefined,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          emailVerificado: updatedUser.emailVerificado,
          nombre: updatedUser.nombre,
          userType: updatedUser.userType
        }
      });
    } catch (error: any) {
      logSystem.error('Update email error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al actualizar el correo electrónico" });
    }
  });

  app.post("/api/identity/send-phone-otp", sendOTPLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Teléfono es requerido" });
      }

      // Validate phone format (basic check for Dominican Republic)
      const phoneRegex = /^\+?1?8\d{9}$/;
      if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
        return res.status(400).json({ 
          message: "Formato de teléfono inválido. Use formato: +1809XXXXXXX o +1829XXXXXXX" 
        });
      }

      const { createAndSendOTP } = await import("./sms-service");
      const result = await createAndSendOTP(
        req.user!.id,
        phone,
        req.ip,
        req.headers['user-agent']
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({
        message: "Código enviado exitosamente",
        expiresIn: result.expiresIn
      });
    } catch (error: any) {
      logSystem.error('Send phone OTP error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al enviar código de verificación" });
    }
  });

  app.post("/api/identity/verify-phone-otp", verifyOTPLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ message: "Teléfono y código son requeridos" });
      }

      const { verifyOTP } = await import("./sms-service");
      const result = await verifyOTP(
        req.user!.id,
        phone,
        code,
        req.ip,
        req.headers['user-agent']
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      logAuth.phoneVerified(req.user!.id, phone);

      res.json({
        message: "Teléfono verificado exitosamente",
        verified: true
      });
    } catch (error: any) {
      logSystem.error('Verify phone OTP error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al verificar código" });
    }
  });

  app.get("/api/identity/status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { isIdentityVerified } = await import("./services/identity");
      const verified = await isIdentityVerified(req.user!.id);

      const user = await storage.getUserById(req.user!.id);
      
      const isDriver = user?.userType === 'conductor';
      const fotoVerificada = user?.fotoVerificada || false;
      const fotoVerificadaScore = user?.fotoVerificadaScore ? parseFloat(user.fotoVerificadaScore) : null;

      res.json({
        cedulaVerificada: user?.cedulaVerificada || false,
        telefonoVerificado: user?.telefonoVerificado || false,
        emailVerificado: user?.emailVerificado || false,
        fotoVerificada: fotoVerificada,
        fotoVerificadaScore: fotoVerificadaScore,
        fullyVerified: isDriver 
          ? verified && fotoVerificada 
          : verified,
        cedula: user?.cedulaVerificada ? user.cedula : null,
        phone: user?.telefonoVerificado ? user.phone : null,
        fotoUrl: user?.fotoUrl || null,
        userType: user?.userType
      });
    } catch (error: any) {
      logSystem.error('Get identity status error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al obtener estado de verificación" });
    }
  });

  app.get("/api/identity/verification-status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const isDriver = user.userType === 'conductor';
      const cedulaVerificada = user.cedulaVerificada === true;
      // Cedula pending review = image submitted but not yet verified
      const cedulaPendingReview = !cedulaVerificada && !!user.cedulaImageUrl;
      // Only email verification is required (no SMS)
      const emailVerificado = user.emailVerificado === true;
      const fotoVerificada = user.fotoVerificada === true;
      const fotoVerificadaScore = user.fotoVerificadaScore ? parseFloat(user.fotoVerificadaScore) : null;

      // For onboarding flow purposes, cedula step is complete if verified OR pending review
      const cedulaStepComplete = cedulaVerificada || cedulaPendingReview;

      // Fetch conductor data for drivers
      let conductor = null;
      if (isDriver) {
        conductor = await storage.getConductorByUserId(user.id);
      }

      const steps: Array<{ id: string; name: string; description: string; completed: boolean; pendingReview?: boolean; required: boolean }> = [
        {
          id: 'cedula',
          name: 'Verificación de Cédula',
          description: 'Escanea tu cédula de identidad',
          completed: cedulaStepComplete,
          pendingReview: cedulaPendingReview,
          required: true
        },
        {
          id: 'email',
          name: 'Verificación de Correo',
          description: 'Verifica tu correo electrónico con código',
          completed: emailVerificado,
          required: true
        }
      ];

      if (isDriver) {
        steps.push({
          id: 'photo',
          name: 'Foto de Perfil Verificada',
          description: 'Sube una foto clara de tu rostro',
          completed: fotoVerificada,
          required: true
        });
        steps.push({
          id: 'license',
          name: 'Subir Licencia',
          description: 'Sube fotos de tu licencia (frente y reverso)',
          completed: !!(conductor?.licenciaVerificada && conductor?.licenciaFrontalUrl && conductor?.licenciaTraseraUrl),
          required: true
        });
        steps.push({
          id: 'categories',
          name: 'Categorías de Servicio',
          description: 'Selecciona las categorías de servicio que ofreces',
          completed: conductor?.categoriasConfiguradas || false,
          required: true
        });
        steps.push({
          id: 'vehicles',
          name: 'Registrar Vehículos',
          description: 'Registra tus vehículos para cada categoría',
          completed: conductor?.vehiculosRegistrados || false,
          required: true
        });
      }

      const completedSteps = steps.filter(s => s.completed).length;
      const totalRequiredSteps = steps.filter(s => s.required).length;
      const progress = Math.round((completedSteps / totalRequiredSteps) * 100);
      const allCompleted = steps.filter(s => s.required).every(s => s.completed);

      // Check for active OTP for email verification
      let otpStatus: { hasActiveOtp: boolean; otpExpiresIn: number | null; otpCreatedSecondsAgo: number | null } = {
        hasActiveOtp: false,
        otpExpiresIn: null,
        otpCreatedSecondsAgo: null
      };
      
      if (user.email && !emailVerificado) {
        const activeOtp = await storage.getActiveVerificationCode(user.email, 'registro');
        if (activeOtp && activeOtp.expiraEn) {
          const now = Date.now();
          const expiresAt = new Date(activeOtp.expiraEn).getTime();
          const createdAt = activeOtp.createdAt ? new Date(activeOtp.createdAt).getTime() : now;
          const expiresInSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
          const createdSecondsAgo = Math.floor((now - createdAt) / 1000);
          
          if (expiresInSeconds > 0) {
            otpStatus = {
              hasActiveOtp: true,
              otpExpiresIn: expiresInSeconds,
              otpCreatedSecondsAgo: createdSecondsAgo
            };
          }
        }
      }

      res.json({
        userType: user.userType,
        // Include basic user data for the verification page
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          userType: user.userType,
          cedulaVerificada: user.cedulaVerificada,
          emailVerificado: user.emailVerificado,
          telefonoVerificado: user.telefonoVerificado,
          fotoVerificada: user.fotoVerificada,
        },
        verification: {
          cedulaVerificada,
          cedulaPendingReview,
          emailVerificado,
          fotoVerificada,
          fotoVerificadaScore,
          cedula: cedulaVerificada ? user.cedula : null,
          cedulaImageUrl: user.cedulaImageUrl || null,
          email: user.email || null,
          fotoUrl: user.fotoUrl || null,
          ...(isDriver && {
            licenciaVerificada: conductor?.licenciaVerificada || false,
            categoriasConfiguradas: conductor?.categoriasConfiguradas || false,
            vehiculosRegistrados: conductor?.vehiculosRegistrados || false,
            licenciaFrontalUrl: conductor?.licenciaFrontalUrl || null,
            licenciaTraseraUrl: conductor?.licenciaTraseraUrl || null
          })
        },
        steps,
        progress,
        allCompleted,
        // canAccessPlatform still requires actual verification, not just pending review
        canAccessPlatform: isDriver ? allCompleted : (cedulaVerificada && emailVerificado)
      });
    } catch (error: any) {
      logSystem.error('Get verification status error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al obtener estado de verificación" });
    }
  });

  // Validate profile photo with Verifik face detection (pre-upload validation)
  app.post("/api/identity/verify-profile-photo", ocrScanLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ 
          message: "Se requiere una imagen para validar",
          verified: false 
        });
      }

      // Validate image size (max 10MB base64 ~ 7.5MB actual image)
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
      if (typeof image !== 'string' || image.length > MAX_IMAGE_SIZE) {
        return res.status(400).json({
          message: "La imagen es demasiado grande. El tamaño máximo es 5MB.",
          verified: false
        });
      }

      // Basic format validation - must be base64 data URL or raw base64
      const base64Pattern = /^(data:image\/[a-zA-Z+]+;base64,)?[A-Za-z0-9+/=]+$/;
      if (!base64Pattern.test(image.substring(0, 100))) {
        return res.status(400).json({
          message: "Formato de imagen inválido",
          verified: false
        });
      }

      const { validateFacePhoto, isVerifikConfigured } = await import("./services/verifik-ocr");

      if (!isVerifikConfigured()) {
        logSystem.warn("Verifik not configured, photo requires manual review");
        return res.json({
          verified: false,
          score: 0,
          skipped: true,
          requiresManualReview: true,
          message: "Validación de rostro no disponible. La foto será revisada manualmente."
        });
      }

      const result = await validateFacePhoto(image);

      logSystem.info("Profile photo face validation completed", {
        userId: req.user!.id,
        success: result.success,
        isHumanFace: result.isHumanFace,
        score: result.score
      });

      // If Verifik API fails (404, network error, etc.), mark for manual review
      if (!result.success) {
        logSystem.warn("Verifik face validation failed, marking for manual review", {
          userId: req.user!.id,
          error: result.error
        });
        
        // Store the score as 0 to indicate it needs manual review
        await storage.updateUser(req.user!.id, {
          fotoVerificada: false,
          fotoVerificadaScore: "0"
        });
        
        return res.json({
          verified: false,
          score: 0,
          requiresManualReview: true,
          message: "La validación automática no está disponible. La foto será revisada manualmente por un administrador."
        });
      }

      // Verifik succeeded - check if it's a valid human face
      if (result.isHumanFace && result.score >= 0.6) {
        // Normalize image to data URL format and extract mime type
        let photoDataUrl: string;
        let mimeType: string;
        
        if (image.startsWith('data:')) {
          photoDataUrl = image;
          // Extract mime type from data URL (data:image/jpeg;base64,...)
          const mimeMatch = image.match(/^data:([^;]+);/);
          mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        } else {
          // Default to JPEG for raw base64
          mimeType = 'image/jpeg';
          photoDataUrl = `data:${mimeType};base64,${image}`;
        }
        
        // Calculate approximate file size from base64 (base64 is ~33% larger than binary)
        const base64Data = photoDataUrl.split(',')[1] || image;
        const estimatedSize = Math.round((base64Data.length * 3) / 4);
        
        // Save the base64 image to user's fotoUrl and mark as verified
        await storage.updateUser(req.user!.id, {
          fotoUrl: photoDataUrl,
          fotoVerificada: true,
          fotoVerificadaScore: result.score.toString()
        });
        
        // If conductor, also create/update the foto_perfil document as 'aprobado'
        if (req.user!.userType === 'conductor') {
          const conductor = await storage.getConductorByUserId(req.user!.id);
          if (conductor) {
            const existingDocs = await storage.getDocumentosByConductorId(conductor.id);
            const existingPhoto = existingDocs.find(d => d.tipo === 'foto_perfil');
            
            if (existingPhoto) {
              // Update existing document
              await storage.updateDocumento(existingPhoto.id, {
                url: photoDataUrl,
                nombreArchivo: 'profile_photo_verified.jpg',
                tamanoArchivo: estimatedSize,
                mimeType: mimeType,
                estado: 'aprobado',
              });
            } else {
              // Create new document as aprobado (already validated by Verifik)
              const doc = await storage.createDocumento({
                tipo: 'foto_perfil',
                conductorId: conductor.id,
                url: photoDataUrl,
                nombreArchivo: 'profile_photo_verified.jpg',
                tamanoArchivo: estimatedSize,
                mimeType: mimeType,
              });
              await storage.updateDocumento(doc.id, { estado: 'aprobado' });
            }
            logSystem.info("Profile photo document created/updated for conductor", {
              conductorId: conductor.id,
              estado: 'aprobado'
            });
          }
        }
        
        logSystem.info("Profile photo verified automatically", {
          userId: req.user!.id,
          score: result.score
        });
        
        return res.json({
          verified: true,
          score: result.score,
          scanId: result.scanId,
          message: "Foto verificada exitosamente"
        });
      }

      // Verifik succeeded but score is too low or not a valid human face - mark for manual review
      logSystem.info("Profile photo needs manual review due to low score or invalid face", {
        userId: req.user!.id,
        score: result.score,
        isHumanFace: result.isHumanFace
      });
      
      await storage.updateUser(req.user!.id, {
        fotoVerificada: false,
        fotoVerificadaScore: result.score.toString()
      });

      res.json({
        verified: false,
        score: result.score,
        scanId: result.scanId,
        requiresManualReview: true,
        details: result.details,
        message: result.details || "La foto no cumple con los requisitos automáticos y será revisada manualmente por un administrador."
      });
    } catch (error: any) {
      logSystem.error("Verify profile photo error", error, { userId: req.user?.id });
      res.status(500).json({ 
        message: "Error al validar la foto de perfil",
        verified: false 
      });
    }
  });

  app.patch("/api/users/me", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { nombre, apellido, phone, conductorData } = req.body;
      const userId = req.user!.id;
      const currentUser = await storage.getUserById(userId);

      if (!currentUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const updateData: any = {};
      
      // Block name changes for operators (conductores) with verified cédula
      if (currentUser.userType === 'conductor' && currentUser.cedulaVerificada) {
        if ((nombre !== undefined && nombre !== currentUser.nombre) || 
            (apellido !== undefined && apellido !== currentUser.apellido)) {
          logSystem.warn('Attempted name change blocked for verified conductor', { 
            userId, 
            cedulaVerificada: currentUser.cedulaVerificada 
          });
          return res.status(403).json({ 
            message: "No puedes cambiar tu nombre después de que tu cédula haya sido verificada. El nombre debe coincidir con tu documento de identidad." 
          });
        }
      } else {
        if (nombre !== undefined) updateData.nombre = nombre;
        if (apellido !== undefined) updateData.apellido = apellido;
      }
      
      if (phone !== undefined) updateData.phone = phone;

      if (Object.keys(updateData).length > 0) {
        await storage.updateUser(userId, updateData);
      }

      if (conductorData && req.user!.userType === 'conductor') {
        const conductor = await storage.getConductorByUserId(userId);
        if (conductor) {
          await storage.updateConductor(conductor.id, conductorData);
        } else {
          await storage.createConductor({
            userId,
            licencia: conductorData.licencia,
            placaGrua: conductorData.placaGrua,
            marcaGrua: conductorData.marcaGrua,
            modeloGrua: conductorData.modeloGrua,
          });
        }
      }

      const updatedUser = await storage.getUserById(userId);
      logSystem.info('User profile updated', { userId });

      // Return sanitized user data
      res.json({ user: getSafeUser(updatedUser) });
    } catch (error: any) {
      logSystem.error('Update user profile error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al actualizar perfil" });
    }
  });

  // Delete user account - permanent deletion with all related data
  app.delete("/api/users/me", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const userId = req.user!.id;
      const userType = req.user!.userType;

      // Check for active services (for both clients and drivers)
      // Get all user services to check if any are active
      const allServices = await storage.getAllServicios();
      const userActiveServices = allServices.filter(
        s => (s.clienteId === userId || s.conductorId === userId) &&
             ['pendiente', 'aceptado', 'conductor_en_sitio', 'cargando', 'en_progreso'].includes(s.estado)
      );

      if (userActiveServices.length > 0) {
        return res.status(400).json({ 
          message: "No puedes eliminar tu cuenta mientras tengas servicios activos o pendientes. Por favor, espera a que se completen o cancelen." 
        });
      }

      // For drivers, check for pending wallet balance
      if (userType === 'conductor') {
        const conductor = await storage.getConductorByUserId(userId);
        if (conductor) {
          const pendingBalance = parseFloat(conductor.balancePendiente || '0');
          const availableBalance = parseFloat(conductor.balanceDisponible || '0');
          if (pendingBalance > 0 || availableBalance > 0) {
            return res.status(400).json({ 
              message: `No puedes eliminar tu cuenta mientras tengas balance pendiente (RD$${pendingBalance.toFixed(2)}) o disponible (RD$${availableBalance.toFixed(2)}). Por favor, retira tu dinero primero.` 
            });
          }
        }
      }

      logSystem.info('User account deletion requested', { 
        userId, 
        userType,
        email: req.user!.email 
      });

      // First destroy session and logout, then delete the user
      // This ensures session is cleaned up before user data is removed
      req.logout((logoutErr) => {
        if (logoutErr) {
          logSystem.error('Logout error during account deletion', logoutErr, { userId });
          // Continue anyway as logout error shouldn't block deletion
        }
        
        // Destroy the session completely
        req.session.destroy(async (sessionErr) => {
          // Always clear the session cookie to prevent stale sessions
          res.clearCookie('gruard.sid');
          
          if (sessionErr) {
            logSystem.error('Session destroy error during account deletion - aborting', sessionErr, { userId });
            // Session teardown failed - abort deletion to avoid inconsistent state
            return res.status(500).json({ 
              message: "Error al cerrar la sesión. Tu cuenta no fue eliminada. Por favor intenta de nuevo." 
            });
          }
          
          try {
            // Delete the user - CASCADE will handle related records
            await storage.deleteUser(userId);
            
            logSystem.info('User account deleted successfully', { 
              userId, 
              userType,
              email: req.user?.email 
            });
            
            res.json({ 
              success: true, 
              message: "Tu cuenta ha sido eliminada exitosamente" 
            });
          } catch (deleteError: any) {
            logSystem.error('User deletion failed after session teardown', deleteError, { userId });
            res.status(500).json({ message: "Error al eliminar la cuenta. Por favor intenta de nuevo." });
          }
        });
      });
    } catch (error: any) {
      logSystem.error('Delete user account error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al eliminar la cuenta" });
    }
  });

  // Profile photo upload - needs multer configuration first
  const profilePhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new Error('Solo se permiten imágenes'));
        return;
      }
      cb(null, true);
    },
  });

  app.post("/api/users/profile-photo", profilePhotoUpload.single('photo'), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No se recibió ninguna imagen" });
      }

      const userId = req.user!.id;

      // Convert image to base64 data URL and store in database
      const base64Image = req.file.buffer.toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

      // Update user's photo URL with base64 data
      await storage.updateUser(userId, { fotoUrl: dataUrl });

      // If driver, also create/update the foto_perfil document
      if (req.user!.userType === 'conductor') {
        const conductor = await storage.getConductorByUserId(userId);
        if (conductor) {
          // Check for existing profile photo document
          const existingDocs = await storage.getDocumentosByConductorId(conductor.id);
          const existingPhoto = existingDocs.find(d => d.tipo === 'foto_perfil');
          
          if (existingPhoto) {
            // Update existing document
            await storage.updateDocumento(existingPhoto.id, {
              url: dataUrl,
              nombreArchivo: req.file.originalname,
              tamanoArchivo: req.file.size,
              mimeType: req.file.mimetype,
            });
          } else {
            // Create new document
            await storage.createDocumento({
              tipo: 'foto_perfil',
              conductorId: conductor.id,
              url: dataUrl,
              nombreArchivo: req.file.originalname,
              tamanoArchivo: req.file.size,
              mimeType: req.file.mimetype,
            });
          }
        }
      }

      logSystem.info('Profile photo uploaded', { userId });

      res.json({ 
        message: "Foto de perfil actualizada",
        url: dataUrl,
      });
    } catch (error: any) {
      logSystem.error('Profile photo upload error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al subir la foto de perfil" });
    }
  });

  app.post("/api/users/change-password", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Las contraseñas no coinciden" });
      }

      const userId = req.user!.id;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ message: "La contraseña actual es incorrecta" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { passwordHash });

      logAuth.passwordReset(userId);

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error: any) {
      logSystem.error('Change password error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al cambiar la contraseña" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { telefono } = req.body;

      if (!telefono) {
        return res.status(400).json({ message: "Teléfono es requerido" });
      }

      const user = await storage.getUserByPhone(telefono);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const codigo = generateOTP();
      const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

      await storage.deleteExpiredVerificationCodes();
      await storage.deletePriorVerificationCodes(telefono, 'recuperacion_password');

      await storage.createVerificationCode({
        telefono,
        codigo,
        expiraEn,
        tipoOperacion: 'recuperacion_password',
      });

      const mensaje = `Tu código de recuperación de contraseña para GruaRD es: ${codigo}. Válido por 10 minutos.`;
      const smsService = await getSMSService();
      await smsService.sendSMS(telefono, mensaje);

      res.json({ 
        message: "Código de recuperación enviado",
        expiresIn: 600
      });
    } catch (error: any) {
      logSystem.error('Forgot password error', error);
      res.status(500).json({ message: "Error al enviar código de recuperación" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { telefono, codigo, nuevaPassword } = req.body;

      if (!telefono || !codigo || !nuevaPassword) {
        return res.status(400).json({ message: "Datos incompletos" });
      }

      if (nuevaPassword.length < 6) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
      }

      const verificationCode = await storage.getActiveVerificationCode(telefono, 'recuperacion_password');

      if (!verificationCode) {
        return res.status(400).json({ message: "Código inválido o expirado" });
      }

      if (verificationCode.intentos >= 3) {
        await storage.markVerificationCodeAsUsed(verificationCode.id);
        return res.status(400).json({ message: "Demasiados intentos. Solicita un nuevo código" });
      }

      if (verificationCode.codigo !== codigo) {
        await storage.incrementVerificationAttempts(verificationCode.id);
        return res.status(400).json({ message: "Código incorrecto" });
      }

      const user = await storage.getUserByPhone(telefono);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const passwordHash = await bcrypt.hash(nuevaPassword, 10);
      await storage.updateUser(user.id, { passwordHash });
      await storage.markVerificationCodeAsUsed(verificationCode.id);

      logAuth.passwordReset(user.id);

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error: any) {
      logSystem.error('Reset password error', error, { telefono: req.body?.telefono });
      res.status(500).json({ message: "Error al resetear contraseña" });
    }
  });

  app.post("/api/services/request", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const ONSITE_SUBTYPES = [
        'cambio_goma',
        'inflado_neumatico',
        'paso_corriente',
        'cerrajero_automotriz',
        'suministro_combustible',
        'envio_bateria',
        'diagnostico_obd',
      ];

      const isOnsiteService = (categoria: string, subtipo?: string) => {
        return categoria === 'auxilio_vial' && subtipo && ONSITE_SUBTYPES.includes(subtipo);
      };

      const isExtractionService = (categoria: string) => {
        return categoria === 'extraccion';
      };

      const validationSchema = insertServicioSchema.extend({
        clienteId: z.string().optional(),
      }).refine((data) => {
        if (data.metodoPago === "aseguradora") {
          return !!(data.aseguradoraNombre && data.aseguradoraPoliza);
        }
        return true;
      }, {
        message: "Nombre de aseguradora y número de póliza son requeridos cuando el método de pago es aseguradora",
      }).refine((data) => {
        const isOnsite = isOnsiteService(data.servicioCategoria || '', data.servicioSubtipo || undefined);
        const isExtraction = isExtractionService(data.servicioCategoria || '');
        if (isOnsite || isExtraction) {
          return true;
        }
        const originLat = parseFloat(data.origenLat as string);
        const originLng = parseFloat(data.origenLng as string);
        const destLat = parseFloat(data.destinoLat as string);
        const destLng = parseFloat(data.destinoLng as string);
        
        if (isNaN(destLat) || isNaN(destLng)) {
          return false;
        }
        
        const isSameLocation = Math.abs(originLat - destLat) < 0.0001 && Math.abs(originLng - destLng) < 0.0001;
        return !isSameLocation;
      }, {
        message: "Servicios de transporte requieren un destino diferente al origen",
      });

      const validatedData = validationSchema.parse(req.body);

      const servicioData: any = {
        clienteId: req.user!.id,
        ...validatedData,
      };

      if (validatedData.metodoPago === "aseguradora") {
        servicioData.aseguradoraEstado = "pendiente";
      }

      if (validatedData.metodoPago === "tarjeta") {
        if (!AzulPaymentService.isConfigured()) {
          return res.status(503).json({ 
            message: "El servicio de pagos con tarjeta no está disponible en este momento.",
            paymentServiceUnavailable: true 
          });
        }
        
        const defaultPaymentMethod = await storage.getDefaultClientPaymentMethod(req.user!.id);
        if (!defaultPaymentMethod) {
          return res.status(400).json({ 
            message: "Debe agregar una tarjeta antes de usar este método de pago.",
            noPaymentMethod: true 
          });
        }
        
        servicioData.azulDataVaultToken = defaultPaymentMethod.azulDataVaultToken;
        servicioData.azulPaymentStatus = "pending";
        
        logSystem.info('Service created with card payment', {
          clienteId: req.user!.id,
          paymentMethodId: defaultPaymentMethod.id,
          cardBrand: defaultPaymentMethod.cardBrand,
          last4: defaultPaymentMethod.last4
        });
      }

      const servicio = await storage.createServicio(servicioData);

      logService.created(servicio.id, req.user!.id, req.body.origenDireccion || 'N/A', req.body.destinoDireccion || 'N/A');

      const availableDrivers = await storage.getAvailableDriversForCategory(validatedData.servicioCategoria || '');
      availableDrivers.forEach(async (driver) => {
        const ws = driverSessions.get(driver.userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'new_request',
            payload: servicio,
          }));
        }
        
        await pushService.notifyNewServiceRequest(driver.userId, servicio.origenDireccion);
      });

      res.json(servicio);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0]?.message || "Validation error" });
      }
      logSystem.error('Create service error', error, { clienteId: req.user!.id });
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  const contextPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post("/api/services/upload-context-photo", contextPhotoUpload.single('photo'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      const timestamp = Date.now();
      const index = req.body.index || '0';
      const filename = `context-photo-${req.user!.id}-${timestamp}-${index}.jpg`;

      const uploadResult = await uploadDocument({
        fileName: filename,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        folder: 'context-photos',
        userId: req.user!.id
      });

      res.json({ url: uploadResult.url });
    } catch (error: any) {
      logSystem.error('Upload context photo error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  app.get("/api/services/my-services", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = req.user!;
      let services: any[] = [];

      if (user.userType === 'cliente') {
        services = await storage.getServiciosByClientId(user.id);
      } else if (user.userType === 'conductor') {
        services = await storage.getServiciosByConductorId(user.id);
      }

      res.json(services);
    } catch (error: any) {
      logSystem.error('Get my services error', error);
      res.status(500).json({ message: "Failed to get services" });
    }
  });

  app.get("/api/services/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const servicio = await storage.getServicioById(req.params.id);
      if (!servicio) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Get service error', error);
      res.status(500).json({ message: "Failed to get service" });
    }
  });

  // Endpoint to convert a client account to a driver account
  app.post("/api/drivers/become-driver", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      // Get fresh user data from storage to avoid stale session data
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Sesión inválida" });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Check if user is already a driver
      if (user.userType === 'conductor') {
        return res.status(400).json({ message: "Ya eres conductor" });
      }
      
      // Check if user is a client
      if (user.userType !== 'cliente') {
        return res.status(400).json({ message: "Solo los clientes pueden convertirse en conductores" });
      }
      
      // Check if user already has a conductor profile
      const existingConductor = await storage.getConductorByUserId(user.id);
      if (existingConductor) {
        // Just update the user type
        await storage.updateUser(user.id, { userType: 'conductor' });
        
        // Update session with new user data
        const updatedUser = await storage.getUserById(user.id);
        if (!updatedUser) {
          logSystem.error('Failed to get updated user after conversion', { userId: user.id });
          return res.status(500).json({ message: "Error al actualizar la sesión" });
        }
        
        return new Promise<void>((resolve) => {
          req.login(updatedUser as any, (err) => {
            if (err) {
              logSystem.error('Failed to update session after become-driver', { userId: user.id, error: err });
              res.status(500).json({ message: "Error al actualizar la sesión" });
            } else {
              res.json({ 
                success: true, 
                message: "Tu cuenta ha sido actualizada a conductor",
                redirectTo: '/driver/dashboard'
              });
            }
            resolve();
          });
        });
      }
      
      // Update user type to conductor
      await storage.updateUser(user.id, { 
        userType: 'conductor',
        estadoCuenta: 'pendiente_verificacion'
      });
      
      // Create conductor record (fixes Bug #1 - conductor not created during become-driver)
      await storage.createConductor({
        userId: user.id,
        licencia: '',
        placaGrua: '',
        marcaGrua: '',
        modeloGrua: '',
      });
      
      // Update session with new user data
      const updatedUser = await storage.getUserById(user.id);
      if (!updatedUser) {
        logSystem.error('Failed to get updated user after conversion', { userId: user.id });
        return res.status(500).json({ message: "Error al actualizar la sesión" });
      }
      
      logSystem.info('Client converted to driver', { userId: user.id, email: user.email });
      
      return new Promise<void>((resolve) => {
        req.login(updatedUser as any, (err) => {
          if (err) {
            logSystem.error('Failed to update session after become-driver', { userId: user.id, error: err });
            res.status(500).json({ message: "Error al actualizar la sesión" });
          } else {
            res.json({ 
              success: true, 
              message: "Tu cuenta ha sido convertida a conductor. Completa tu perfil.",
              redirectTo: '/auth/onboarding-wizard',
              requiresOnboarding: true
            });
          }
          resolve();
        });
      });
    } catch (error: any) {
      logSystem.error('Become driver error', error, { userId: (req.user as any)?.id });
      res.status(500).json({ message: "Error al convertir cuenta a conductor" });
    }
  });

  app.get("/api/drivers/me", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      res.json(conductor);
    } catch (error: any) {
      logSystem.error('Get driver data error', error);
      res.status(500).json({ message: "Failed to get driver data" });
    }
  });

  app.get("/api/drivers/me/full", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.user!.id;
      
      const [conductor, documentos, verifikStatus] = await Promise.all([
        storage.getConductorByUserId(userId),
        storage.getDocumentosByUsuarioId(userId),
        (async () => {
          try {
            const user = await storage.getUserById(userId);
            return user ? { cedulaVerificada: user.cedulaVerificada } : null;
          } catch {
            return null;
          }
        })()
      ]);

      let servicios: any[] = [];
      if (conductor) {
        servicios = await storage.getConductorServicios(conductor.id);
      }

      res.json({
        conductor: conductor || null,
        documentos: documentos || [],
        servicios: { categorias: servicios || [] },
        verifikStatus: verifikStatus || null
      });
    } catch (error: any) {
      logSystem.error('Get driver full profile error', error);
      res.status(500).json({ message: "Failed to get driver profile" });
    }
  });

  // Get driver public profile (for clients to see when service is accepted)
  app.get("/api/drivers/:id/public-profile", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get driver by user ID
      const driverUser = await storage.getUserById(id);
      if (!driverUser || driverUser.userType !== 'conductor') {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const conductor = await storage.getConductorByUserId(id);
      if (!conductor) {
        return res.status(404).json({ message: "Perfil de conductor no encontrado" });
      }

      // Get driver vehicles
      const vehiculos = await storage.getConductorVehiculos(conductor.id);

      // Build public profile (only public information)
      const publicProfile = {
        id: driverUser.id,
        nombre: driverUser.nombre,
        apellido: driverUser.apellido,
        fotoUrl: driverUser.fotoUrl,
        calificacionPromedio: driverUser.calificacionPromedio,
        licenciaCategoria: conductor.licenciaCategoria,
        licenciaRestricciones: conductor.licenciaRestricciones,
        licenciaCategoriaVerificada: conductor.licenciaCategoriaVerificada,
        vehiculos: vehiculos.map(v => ({
          id: v.id,
          categoria: v.categoria,
          placa: v.placa,
          color: v.color,
          marca: v.marca,
          modelo: v.modelo,
          fotoUrl: v.fotoUrl,
        })),
      };

      res.json(publicProfile);
    } catch (error: any) {
      logSystem.error('Get driver public profile error', error);
      res.status(500).json({ message: "Failed to get driver public profile" });
    }
  });

  // Optimized endpoint for driver dashboard - returns all data in a single call
  // Performance optimizations:
  // 1. Uses getActiveServiceByConductorId instead of fetching all services
  // 2. Fetches only essential wallet data (balance, status)
  // 3. All queries run in parallel with Promise.all
  app.get("/api/drivers/init", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.user!.id;
      
      // Fetch conductor first to get conductorId
      const conductor = await storage.getConductorByUserId(userId);
      
      if (!conductor) {
        return res.json({
          conductor: null,
          documents: [],
          activeService: null,
          nearbyRequests: [],
          wallet: null
        });
      }

      // Fetch all data in parallel for maximum speed
      // Optimized: Uses dedicated active service query instead of fetching all services
      // Optimized: Uses wallet summary (basic fields only) instead of full wallet with debts
      const [documents, activeService, nearbyRequests, wallet] = await Promise.all([
        storage.getDocumentosByUsuarioId(userId),
        storage.getActiveServiceByConductorId(conductor.id),
        conductor.disponible ? storage.getPendingServicios() : Promise.resolve([]),
        storage.getWalletSummaryByConductorId(conductor.id).catch(() => null)
      ]);

      res.json({
        conductor,
        documents: documents || [],
        activeService,
        nearbyRequests: nearbyRequests || [],
        wallet: wallet || null
      });
    } catch (error: any) {
      logSystem.error('Get driver init data error', error);
      res.status(500).json({ message: "Failed to get driver data" });
    }
  });

  // Get driver's service categories
  app.get("/api/drivers/me/servicios", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      let conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        // Auto-create conductor record if it doesn't exist
        logSystem.info('Creating conductor record for user during get services', { userId: req.user!.id });
        conductor = await storage.createConductor({
          userId: req.user!.id,
          licencia: '',
          placaGrua: '',
          marcaGrua: '',
          modeloGrua: '',
        });
      }

      const servicios = await storage.getConductorServicios(conductor.id);
      res.json(servicios);
    } catch (error: any) {
      logSystem.error('Get driver services error', error);
      res.status(500).json({ message: "Failed to get driver services" });
    }
  });

  // Set/update driver's service categories
  app.put("/api/drivers/me/servicios", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      let conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        // Auto-create conductor record if it doesn't exist
        logSystem.info('Creating conductor record for user during set services', { userId: req.user!.id });
        conductor = await storage.createConductor({
          userId: req.user!.id,
          licencia: '',
          placaGrua: '',
          marcaGrua: '',
          modeloGrua: '',
        });
      }

      const { categorias } = req.body;
      
      if (!Array.isArray(categorias)) {
        return res.status(400).json({ message: "Categorias must be an array" });
      }

      if (categorias.length === 0) {
        return res.status(400).json({ message: "Debes seleccionar al menos una categoría de servicio" });
      }

      const invalidCategories: string[] = [];
      const missingCategories: number[] = [];
      
      for (let i = 0; i < categorias.length; i++) {
        const cat = categorias[i];
        if (!cat.categoria || typeof cat.categoria !== 'string' || cat.categoria.trim() === '') {
          missingCategories.push(i + 1);
        } else if (!VALID_SERVICE_CATEGORIES.includes(cat.categoria as typeof VALID_SERVICE_CATEGORIES[number])) {
          invalidCategories.push(cat.categoria);
        }
      }

      if (missingCategories.length > 0) {
        return res.status(400).json({ 
          message: `Elementos sin categoría válida en posiciones: ${missingCategories.join(', ')}`,
          missingCategories 
        });
      }

      if (invalidCategories.length > 0) {
        return res.status(400).json({ 
          message: `Categorías inválidas: ${invalidCategories.join(', ')}`,
          invalidCategories 
        });
      }

      await storage.setConductorServicios(conductor.id, categorias);
      
      // Mark categories as configured
      await storage.updateConductor(conductor.id, { categoriasConfiguradas: true });
      
      // Refresh session with updated user data (includes conductor with categoriasConfiguradas)
      const updatedUser = await storage.getUserById(req.user!.id);
      if (updatedUser) {
        await new Promise<void>((resolve, reject) => {
          req.login(updatedUser as any, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      const servicios = await storage.getConductorServicios(conductor.id);
      
      logSystem.info('Driver services updated', { conductorId: conductor.id, count: servicios.length });
      res.json(servicios);
    } catch (error: any) {
      logSystem.error('Update driver services error', error);
      res.status(500).json({ message: "Failed to update driver services" });
    }
  });

  // Update driver's license data (from verification flow)
  app.put("/api/drivers/me/license-data", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      let conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        logSystem.info('Creating conductor record for user during license data update', { userId: req.user!.id });
        conductor = await storage.createConductor({
          userId: req.user!.id,
          licencia: '',
          placaGrua: '',
          marcaGrua: '',
          modeloGrua: '',
        });
      }

      const { licenciaVerificada, licenciaNumero, licenciaClase, licenciaVencimiento } = req.body;
      
      const updateData: Record<string, any> = {};
      
      if (licenciaVerificada !== undefined) {
        updateData.licenciaVerificada = licenciaVerificada;
      }
      
      if (licenciaNumero) {
        updateData.licencia = licenciaNumero;
      }
      
      if (licenciaClase) {
        updateData.licenciaCategoria = licenciaClase;
        updateData.licenciaCategoriaVerificada = true;
      }
      
      if (licenciaVencimiento) {
        const parsedDate = new Date(licenciaVencimiento);
        if (!isNaN(parsedDate.getTime())) {
          updateData.licenciaFechaVencimiento = parsedDate;
        }
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No hay datos válidos para actualizar" });
      }
      
      await storage.updateConductor(conductor.id, updateData);
      
      // Refresh session with updated user data (includes conductor with licenciaVerificada)
      const updatedUser = await storage.getUserById(req.user!.id);
      if (updatedUser) {
        await new Promise<void>((resolve, reject) => {
          req.login(updatedUser as any, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      logSystem.info('Driver license data updated', { 
        conductorId: conductor.id, 
        licenciaVerificada: updateData.licenciaVerificada,
        hasLicenseNumber: !!updateData.licencia,
        hasCategory: !!updateData.licenciaCategoria,
        hasExpiration: !!updateData.licenciaFechaVencimiento
      });
      
      res.json({ 
        success: true, 
        message: "Datos de licencia actualizados correctamente" 
      });
    } catch (error: any) {
      logSystem.error('Update driver license data error', error);
      res.status(500).json({ message: "Error al actualizar datos de licencia" });
    }
  });

  // Get all vehicles for the current driver
  app.get("/api/drivers/me/vehiculos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const vehiculos = await storage.getConductorVehiculos(conductor.id);
      res.json(vehiculos);
    } catch (error: any) {
      logSystem.error('Get driver vehicles error', error);
      res.status(500).json({ message: "Failed to get driver vehicles" });
    }
  });

  // Get a specific vehicle by category
  app.get("/api/drivers/me/vehiculos/:categoria", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const { categoria } = req.params;
      const vehiculo = await storage.getConductorVehiculoByCategoria(conductor.id, categoria);
      
      if (!vehiculo) {
        return res.status(404).json({ message: "Vehículo no encontrado para esta categoría" });
      }

      res.json(vehiculo);
    } catch (error: any) {
      logSystem.error('Get driver vehicle by category error', error);
      res.status(500).json({ message: "Failed to get driver vehicle" });
    }
  });

  // Create or update a vehicle for a category
  app.post("/api/drivers/me/vehiculos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const { categoria, placa, color, capacidad, marca, modelo, anio, detalles, fotoUrl } = req.body;
      
      if (!categoria || !placa || !color || !modelo) {
        return res.status(400).json({ message: "Categoría, placa, color y modelo son requeridos" });
      }

      const PLACA_DOMINICANA_REGEX = /^[A-Z]{1,2}\d{4,6}$/;
      const placaNormalizada = placa.toUpperCase().trim();
      if (!PLACA_DOMINICANA_REGEX.test(placaNormalizada)) {
        return res.status(400).json({ 
          message: "Formato de placa inválido. Use formato dominicano (ej: A123456)" 
        });
      }

      const vehiculo = await storage.createConductorVehiculo({
        conductorId: conductor.id,
        categoria,
        placa: placaNormalizada,
        color,
        capacidad,
        marca,
        modelo,
        anio,
        detalles,
        fotoUrl,
      });

      // Check if all selected categories have vehicles registered
      const [servicios, vehiculos] = await Promise.all([
        storage.getConductorServicios(conductor.id),
        storage.getConductorVehiculos(conductor.id)
      ]);
      
      const selectedCategories = servicios.map(s => s.categoriaServicio);
      const vehicleCategories = vehiculos.filter(v => v.activo).map(v => v.categoria);
      const allCategoriesHaveVehicles = selectedCategories.length > 0 && 
        selectedCategories.every(cat => vehicleCategories.includes(cat));
      
      if (allCategoriesHaveVehicles) {
        await storage.updateConductor(conductor.id, { vehiculosRegistrados: true });
        logSystem.info('All categories have vehicles, marked vehiculosRegistrados', { conductorId: conductor.id });
        
        // Refresh session with updated user data (includes conductor with vehiculosRegistrados)
        const updatedUser = await storage.getUserById(req.user!.id);
        if (updatedUser) {
          await new Promise<void>((resolve, reject) => {
            req.login(updatedUser as any, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }

      logSystem.info('Driver vehicle created/updated', { conductorId: conductor.id, categoria, vehiculoId: vehiculo.id });
      res.json(vehiculo);
    } catch (error: any) {
      logSystem.error('Create driver vehicle error', { 
        message: error?.message, 
        stack: error?.stack,
        conductorId: req.user?.id 
      });
      res.status(500).json({ 
        message: error?.message || "Failed to create driver vehicle",
        details: process.env.NODE_ENV !== 'production' ? error?.stack : undefined
      });
    }
  });

  // Update a specific vehicle
  app.patch("/api/drivers/me/vehiculos/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const { id } = req.params;
      const { placa, color, capacidad, marca, modelo, anio, detalles, fotoUrl } = req.body;

      if (!placa || !color || !modelo) {
        return res.status(400).json({ message: "Placa, color y modelo son requeridos" });
      }

      const PLACA_DOMINICANA_REGEX = /^[A-Z]{1,2}\d{4,6}$/;
      const placaNormalizada = placa.toUpperCase().trim();
      if (!PLACA_DOMINICANA_REGEX.test(placaNormalizada)) {
        return res.status(400).json({ 
          message: "Formato de placa inválido. Use formato dominicano (ej: A123456)" 
        });
      }

      const vehiculo = await storage.updateConductorVehiculo(id, {
        placa: placaNormalizada,
        color,
        capacidad,
        marca,
        modelo,
        anio,
        detalles,
        fotoUrl,
      });

      logSystem.info('Driver vehicle updated', { conductorId: conductor.id, vehiculoId: id });
      res.json(vehiculo);
    } catch (error: any) {
      logSystem.error('Update driver vehicle error', error);
      res.status(500).json({ message: "Failed to update driver vehicle" });
    }
  });

  // Delete a vehicle (soft delete)
  app.delete("/api/drivers/me/vehiculos/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const { id } = req.params;
      await storage.deleteConductorVehiculo(id);

      logSystem.info('Driver vehicle deleted', { conductorId: conductor.id, vehiculoId: id });
      res.json({ success: true });
    } catch (error: any) {
      logSystem.error('Delete driver vehicle error', error);
      res.status(500).json({ message: "Failed to delete driver vehicle" });
    }
  });

  // Validate document with Verifik API (face or license)
  app.post("/api/documents/:id/validate", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      const documento = await storage.getDocumentoById(id);
      
      if (!documento) {
        return res.status(404).json({ message: "Documento no encontrado" });
      }

      // Verify the user owns this document or is admin
      if (req.user!.userType !== 'admin' && documento.usuarioId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado para validar este documento" });
      }

      const { validateFacePhoto, validateDriverLicense, validateDriverLicenseBack, isVerifikConfigured } = await import('./services/verifik-ocr');
      
      if (!isVerifikConfigured()) {
        return res.status(503).json({ 
          message: "El servicio de validación no está configurado",
          configured: false 
        });
      }

      // Determine validation type based on document type
      let validationResult: any;
      let validationType: string;
      let licenseBackData: { category?: string; restrictions?: string; expirationDate?: string } | null = null;
      
      if (documento.tipo === 'foto_perfil') {
        validationType = 'face';
        // Get base64 from URL or fetch the image
        const imageResponse = await fetch(documento.url);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const mimeType = documento.mimeType || 'image/jpeg';
        const imageData = `data:${mimeType};base64,${base64}`;
        
        validationResult = await validateFacePhoto(imageData);
      } else if (documento.tipo === 'licencia') {
        validationType = 'license';
        // Get base64 from URL or fetch the image
        const imageResponse = await fetch(documento.url);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const mimeType = documento.mimeType || 'image/jpeg';
        const imageData = `data:${mimeType};base64,${base64}`;
        
        validationResult = await validateDriverLicense(imageData);
      } else if (documento.tipo === 'licencia_trasera') {
        validationType = 'license_back';
        // Get base64 from URL or fetch the image
        const imageResponse = await fetch(documento.url);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const mimeType = documento.mimeType || 'image/jpeg';
        const imageData = `data:${mimeType};base64,${base64}`;
        
        validationResult = await validateDriverLicenseBack(imageData);
        
        // Store extracted data for conductor update
        if (validationResult.success && validationResult.isValid) {
          licenseBackData = {
            category: validationResult.category,
            restrictions: validationResult.restrictions,
            expirationDate: validationResult.expirationDate,
          };
        }
      } else {
        return res.status(400).json({ 
          message: "Este tipo de documento no requiere validación Verifik" 
        });
      }

      // Update document with validation results
      const MINIMUM_SCORE = 0.6;
      const isValid = validationResult.success && validationResult.score >= MINIMUM_SCORE;
      
      await storage.updateDocumentoVerifikValidation(id, {
        verifikScanId: validationResult.scanId || null,
        verifikScore: validationResult.score.toString(),
        verifikValidado: isValid,
        verifikTipoValidacion: validationType,
        verifikRespuesta: JSON.stringify(validationResult.rawResponse || {}),
        verifikFechaValidacion: new Date(),
        estado: isValid ? 'aprobado' : 'rechazado',
      });

      // If license back was validated successfully, update conductor with extracted data
      if (validationType === 'license_back' && isValid && licenseBackData && documento.conductorId) {
        const updateData: any = {
          licenciaCategoriaVerificada: true,
        };
        
        if (licenseBackData.category) {
          updateData.licenciaCategoria = licenseBackData.category;
        }
        if (licenseBackData.restrictions) {
          updateData.licenciaRestricciones = licenseBackData.restrictions;
        }
        if (licenseBackData.expirationDate) {
          const parsedDate = new Date(licenseBackData.expirationDate);
          if (!isNaN(parsedDate.getTime())) {
            updateData.licenciaFechaVencimiento = parsedDate;
          }
        }
        
        await storage.updateConductor(documento.conductorId, updateData);
        
        logSystem.info('Conductor license back data updated', {
          conductorId: documento.conductorId,
          category: licenseBackData.category,
          restrictions: licenseBackData.restrictions,
        });
      }

      logSystem.info('Document validation completed', { 
        documentoId: id, 
        validationType,
        score: validationResult.score,
        isValid,
        userId: req.user!.id 
      });

      res.json({
        success: validationResult.success,
        isValid,
        score: validationResult.score,
        validationType,
        details: validationResult.details || validationResult.error,
        scanId: validationResult.scanId,
      });
    } catch (error: any) {
      logSystem.error('Document validation error', error);
      res.status(500).json({ message: "Error al validar el documento" });
    }
  });

  app.put("/api/drivers/availability", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { disponible } = req.body;
      
      // If trying to go online, validate all required documents are approved
      if (disponible === true) {
        const conductor = await storage.getConductorByUserId(req.user!.id);
        
        if (!conductor) {
          return res.status(404).json({ message: "Conductor no encontrado" });
        }

        // Fetch all documents for this conductor
        const documentos = await storage.getDocumentosByConductor(conductor.id);
        
        // Get user to check verification flags
        const userInfo = await storage.getUserById(req.user!.id);
        
        // Get conductor vehicles to check matricula and foto_vehiculo
        const conductorVehiculos = await storage.getConductorVehiculos(conductor.id);
        const hasActiveVehicle = conductorVehiculos.some(v => v.activo);
        // If vehicle is registered with placa, consider both matricula and foto as complete
        // (foto is optional when vehicle is registered in the system)
        
        // Required document types
        const requiredTypes = ['licencia', 'matricula', 'foto_vehiculo', 'cedula_frontal', 'cedula_trasera'];
        
        // Document types that can expire
        const documentosConVencimiento = ['licencia', 'matricula'];
        
        // Map document types to Spanish names for user-friendly messages
        const documentTypeNames: Record<string, string> = {
          'licencia': 'Licencia de Conducir',
          'matricula': 'Matrícula del Vehículo',
          'foto_vehiculo': 'Foto del Vehículo',
          'cedula_frontal': 'Cédula (Frente)',
          'cedula_trasera': 'Cédula (Atrás)',
        };
        
        // Check which required documents are missing or not approved
        const missingDocuments: string[] = [];
        const expiredDocuments: string[] = [];
        const now = new Date();
        
        for (const requiredType of requiredTypes) {
          // Skip cedula documents if user has cedulaVerificada = true (verified via identity scan)
          if ((requiredType === 'cedula_frontal' || requiredType === 'cedula_trasera') && userInfo?.cedulaVerificada) {
            continue;
          }
          
          // Skip licencia document if conductor has licenciaVerificada = true (verified via Verifik)
          if (requiredType === 'licencia' && conductor.licenciaVerificada) {
            continue;
          }
          
          // Skip matricula if conductor has an active vehicle registered (placa is required)
          if (requiredType === 'matricula' && hasActiveVehicle) {
            continue;
          }
          
          // Skip foto_vehiculo if conductor has an active vehicle registered
          // (foto is optional - having a registered vehicle is sufficient)
          if (requiredType === 'foto_vehiculo' && hasActiveVehicle) {
            continue;
          }
          
          const doc = documentos.find(d => d.tipo === requiredType);
          
          if (!doc) {
            // Document doesn't exist
            missingDocuments.push(documentTypeNames[requiredType]);
          } else if (doc.estado !== 'aprobado') {
            // Document exists but not approved
            missingDocuments.push(documentTypeNames[requiredType]);
          } else if (documentosConVencimiento.includes(requiredType) && doc.validoHasta) {
            // Check if document has expired
            const expirationDate = new Date(doc.validoHasta);
            if (expirationDate < now) {
              expiredDocuments.push(documentTypeNames[requiredType]);
            }
          }
        }
        
        // If any documents are missing or not approved, reject the request
        if (missingDocuments.length > 0) {
          return res.status(403).json({
            message: "No puedes activar disponibilidad sin documentos aprobados",
            missingDocuments: missingDocuments,
          });
        }
        
        // Check for expired documents (specifically insurance)
        if (expiredDocuments.length > 0) {
          // Special message for insurance
          const seguroVencido = expiredDocuments.includes('Seguro de Grúa');
          const message = seguroVencido 
            ? "Tu seguro de grúa ha vencido. Por favor, sube un documento actualizado."
            : `Los siguientes documentos han vencido: ${expiredDocuments.join(', ')}. Por favor, sube documentos actualizados.`;
          
          return res.status(403).json({
            message: message,
            expiredDocuments: expiredDocuments,
          });
        }
      }
      
      // All validations passed or going offline - proceed with update
      const conductor = await storage.updateDriverAvailability(req.user!.id, disponible);
      res.json(conductor);
    } catch (error: any) {
      logSystem.error('Update availability error', error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.put("/api/drivers/location", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { lat, lng } = req.body;
      const conductor = await storage.updateDriverLocation(req.user!.id, lat, lng);
      res.json(conductor);
    } catch (error: any) {
      logSystem.error('Update location error', error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.get("/api/drivers/nearby-requests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const requests = await storage.getPendingServicios();
      
      const conductorServicios = await storage.getConductorServicios(conductor.id);
      const driverCategories = conductorServicios.map(s => s.categoriaServicio);
      
      const conductorVehiculos = await storage.getConductorVehiculos(conductor.id);
      const vehicleCategories = conductorVehiculos.filter(v => v.activo).map(v => v.categoria);
      
      const dismissedServiceIds = await storage.getDismissedServiceIds(conductor.id);
      
      const filteredRequests = requests.filter(request => {
        if (dismissedServiceIds.includes(request.id)) {
          return false;
        }
        
        const serviceCategory = request.servicioCategoria;
        
        if (!serviceCategory) {
          if (driverCategories.includes('remolque_estandar') && vehicleCategories.includes('remolque_estandar')) {
            return true;
          }
          return false;
        }
        
        if (!driverCategories.includes(serviceCategory)) {
          return false;
        }
        
        if (!vehicleCategories.includes(serviceCategory)) {
          return false;
        }
        
        return true;
      });
      
      res.json(filteredRequests);
    } catch (error: any) {
      logSystem.error('Get nearby requests error', error);
      res.status(500).json({ message: "Failed to get requests" });
    }
  });

  app.post("/api/services/:id/dismiss", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const serviceId = req.params.id;
      
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }
      
      const servicio = await storage.getServicioById(serviceId);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }
      
      if (servicio.estado !== 'pendiente') {
        return res.status(400).json({ message: "Solo se pueden rechazar servicios pendientes" });
      }
      
      await storage.dismissService(conductor.id, serviceId);
      
      res.json({ success: true, message: "Servicio rechazado" });
    } catch (error: any) {
      logSystem.error('Dismiss service error', error);
      res.status(500).json({ message: "Error al rechazar servicio" });
    }
  });

  app.get("/api/drivers/active-service", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const services = await storage.getServiciosByConductorId(req.user!.id);
      const activeStates = ['aceptado', 'conductor_en_sitio', 'cargando', 'en_progreso'];
      const activeService = services.find(s => activeStates.includes(s.estado));
      res.json(activeService || null);
    } catch (error: any) {
      logSystem.error('Get active service error', error);
      res.status(500).json({ message: "Failed to get active service" });
    }
  });

  app.post("/api/services/:id/accept", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const existingServicio = await storage.getServicioById(req.params.id);
      if (!existingServicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      // TODO: Implementar flujo de pago con tarjeta con Azul API

      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(400).json({ message: "Perfil de conductor no encontrado" });
      }

      let vehiculoId: string | undefined;
      if (existingServicio.servicioCategoria) {
        const vehiculo = await storage.getConductorVehiculoByCategoria(conductor.id, existingServicio.servicioCategoria);
        if (vehiculo) {
          vehiculoId = vehiculo.id;
        } else {
          return res.status(400).json({ 
            message: "No tienes un vehículo configurado para esta categoría de servicio. Por favor, configura tu vehículo en tu perfil.",
            noVehicleForCategory: true 
          });
        }
      }

      const servicio = await storage.acceptServicio(req.params.id, req.user!.id, vehiculoId);
      
      logService.accepted(servicio.id, req.user!.id);
      
      // Build driver public profile for client notification
      const vehiculos = await storage.getConductorVehiculos(conductor.id);
      const vehiculoAsignado = vehiculoId ? vehiculos.find(v => v.id === vehiculoId) : null;
      
      const conductorPublicInfo = {
        id: req.user!.id,
        nombre: req.user!.nombre,
        apellido: req.user!.apellido,
        fotoUrl: req.user!.fotoUrl,
        calificacionPromedio: req.user!.calificacionPromedio,
        licenciaCategoria: conductor.licenciaCategoria,
        licenciaRestricciones: conductor.licenciaRestricciones,
        licenciaCategoriaVerificada: conductor.licenciaCategoriaVerificada,
        vehiculo: vehiculoAsignado ? {
          id: vehiculoAsignado.id,
          placa: vehiculoAsignado.placa,
          color: vehiculoAsignado.color,
          marca: vehiculoAsignado.marca,
          modelo: vehiculoAsignado.modelo,
          fotoUrl: vehiculoAsignado.fotoUrl,
        } : null,
      };
      
      if (serviceSessions.has(servicio.id)) {
        const broadcast = JSON.stringify({
          type: 'service_status_change',
          payload: {
            ...servicio,
            conductorInfo: conductorPublicInfo,
          },
        });
        serviceSessions.get(servicio.id)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      const conductorName = `${req.user!.nombre} ${req.user!.apellido}`;
      
      // Send notification to client about accepted service
      await pushService.notifyServiceAccepted(servicio.id, servicio.clienteId, conductorName);

      // Include conductor info in response
      res.json({
        ...servicio,
        conductorInfo: conductorPublicInfo,
      });
    } catch (error: any) {
      logSystem.error('Accept service error', error, { servicioId: req.params.id, conductorId: req.user!.id });
      res.status(500).json({ message: "Failed to accept service" });
    }
  });

  const arrivedSchema = z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  });

  app.post("/api/services/:id/arrived", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const parseResult = arrivedSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Coordenadas de ubicación inválidas. Se requieren lat y lng válidos.",
          errors: parseResult.error.issues
        });
      }

      const { lat, lng } = parseResult.data;
      const existingServicio = await storage.getServicioById(req.params.id);
      
      if (!existingServicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      const driverLocation: Coordinates = { lat, lng };
      const pickupLocation: Coordinates = {
        lat: Number(existingServicio.origenLat),
        lng: Number(existingServicio.origenLng)
      };
      
      const distance = calculateHaversineDistance(driverLocation, pickupLocation);
      
      if (distance > GEOFENCE_RADIUS_METERS) {
        return res.status(400).json({
          success: false,
          message: `Debes estar a menos de ${GEOFENCE_RADIUS_METERS} metros del punto de recogida`,
          distancia: Math.round(distance),
          required: GEOFENCE_RADIUS_METERS
        });
      }

      const servicio = await storage.updateServicio(req.params.id, {
        estado: 'conductor_en_sitio',
        conductorEnSitioAt: new Date(),
      });

      logService.stateChanged(servicio.id, 'aceptado', 'conductor_en_sitio');

      if (serviceSessions.has(servicio.id)) {
        const broadcast = JSON.stringify({
          type: 'service_status_change',
          payload: servicio,
        });
        serviceSessions.get(servicio.id)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      await pushService.notifyServiceUpdate(servicio.id, servicio.clienteId, 'El conductor ha llegado al punto de origen');

      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Arrived service error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Failed to update service status" });
    }
  });

  app.post("/api/services/:id/loading", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicio = await storage.updateServicio(req.params.id, {
        estado: 'cargando',
        cargandoAt: new Date(),
      });

      logService.stateChanged(servicio.id, 'conductor_en_sitio', 'cargando');

      if (serviceSessions.has(servicio.id)) {
        const broadcast = JSON.stringify({
          type: 'service_status_change',
          payload: servicio,
        });
        serviceSessions.get(servicio.id)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      await pushService.notifyServiceUpdate(servicio.id, servicio.clienteId, 'El conductor está cargando tu vehículo');

      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Loading service error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Failed to update service status" });
    }
  });

  app.post("/api/services/:id/start", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicio = await storage.updateServicio(req.params.id, {
        estado: 'en_progreso',
        iniciadoAt: new Date(),
      });

      logService.started(servicio.id);

      if (serviceSessions.has(servicio.id)) {
        const broadcast = JSON.stringify({
          type: 'service_status_change',
          payload: servicio,
        });
        serviceSessions.get(servicio.id)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      await pushService.notifyServiceStarted(servicio.id, servicio.clienteId);

      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Start service error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Failed to start service" });
    }
  });

  app.post("/api/services/:id/complete", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const oldService = await storage.getServicioById(req.params.id);
      if (!oldService) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }
      
      const startTime = oldService?.iniciadoAt ? new Date(oldService.iniciadoAt).getTime() : Date.now();
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      if (!oldService.costoTotal) {
        return res.status(400).json({ message: "El servicio no tiene un costo definido" });
      }
      
      const serviceAmount = parseFloat(oldService.costoTotal);
      if (isNaN(serviceAmount) || serviceAmount <= 0) {
        return res.status(400).json({ message: "El costo del servicio es inválido" });
      }
      
      let azulPaymentData: Record<string, any> = {};
      
      if (oldService.metodoPago === 'tarjeta' && oldService.azulDataVaultToken) {
        if (!AzulPaymentService.isConfigured()) {
          return res.status(503).json({ 
            message: "El servicio de pagos con tarjeta no está disponible en este momento." 
          });
        }
        
        const amountInCentavos = Math.round(serviceAmount * 100);
        const itbis = Math.round(amountInCentavos * 0.18);
        
        const azulResult = await AzulPaymentService.processPaymentWithToken(
          oldService.azulDataVaultToken,
          {
            amount: amountInCentavos,
            itbis: itbis,
            customOrderId: `SVC-${oldService.id}-${Date.now()}`,
            orderDescription: `Servicio de grúa #${oldService.id}`,
          }
        );
        
        if (!azulResult.success) {
          logSystem.error('Azul payment failed on service completion', null, {
            servicioId: oldService.id,
            isoCode: azulResult.isoCode,
            message: azulResult.responseMessage
          });
          
          await storage.updateServicio(req.params.id, {
            azulPaymentStatus: 'failed',
          });
          
          return res.status(402).json({ 
            message: azulResult.responseMessage || "Error al procesar el pago con tarjeta",
            paymentFailed: true,
            isoCode: azulResult.isoCode
          });
        }
        
        azulPaymentData = {
          azulOrderId: azulResult.azulOrderId,
          azulPaymentStatus: 'completed',
          azulAuthorizationCode: azulResult.authorizationCode,
          azulReferenceNumber: azulResult.rrn,
        };
        
        logSystem.info('Azul payment processed on service completion', {
          servicioId: oldService.id,
          azulOrderId: azulResult.azulOrderId,
          authorizationCode: azulResult.authorizationCode,
          amount: serviceAmount
        });
      }

      const servicio = await storage.updateServicio(req.params.id, {
        estado: 'completado',
        completadoAt: new Date(),
        ...azulPaymentData,
      });

      logService.completed(servicio.id, duration);

      if (servicio.metodoPago && servicio.costoTotal && !servicio.commissionProcessed) {
        try {
          const paymentMethod = servicio.metodoPago as 'efectivo' | 'tarjeta';
          
          const walletResult = await WalletService.processServicePayment(
            servicio.id,
            paymentMethod,
            serviceAmount
          );
          
          if (servicio.metodoPago === 'tarjeta' && azulPaymentData.azulOrderId) {
            const existingComision = await storage.getComisionByServicioId(servicio.id);
            if (existingComision) {
              await storage.updateComision(existingComision.id, {
                azulPayoutReference: azulPaymentData.azulOrderId,
                azulPayoutStatus: 'pending_payout',
                azulNetAmount: walletResult.operatorEarnings.toString(),
              });
            }
          }
          
          logSystem.info('Wallet processed on service completion', {
            servicioId: servicio.id,
            conductorId: servicio.conductorId,
            paymentMethod,
            serviceAmount,
            commission: walletResult.commission,
            operatorEarnings: walletResult.operatorEarnings,
            azulOrderId: azulPaymentData.azulOrderId || null
          });
        } catch (walletError: any) {
          logSystem.error('Wallet processing error on service completion', walletError, {
            servicioId: servicio.id,
            conductorId: servicio.conductorId
          });
        }
      }

      if (serviceSessions.has(servicio.id)) {
        const broadcast = JSON.stringify({
          type: 'service_status_change',
          payload: servicio,
        });
        serviceSessions.get(servicio.id)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      await pushService.notifyServiceCompleted(servicio.id, servicio.clienteId);

      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Complete service error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Failed to complete service" });
    }
  });

  // Endpoint for driver to extend destination up to 1.5km beyond original destination
  const extendDestinationSchema = z.object({
    destinoExtendidoLat: z.number().finite().min(-90).max(90),
    destinoExtendidoLng: z.number().finite().min(-180).max(180),
    destinoExtendidoDireccion: z.string().min(1).max(500),
  });

  app.post("/api/services/:id/extend-destination", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const servicioId = req.params.id;
      const servicio = await storage.getServicioById(servicioId);
      
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "Solo el conductor asignado puede extender el destino" });
      }

      if (servicio.estado !== 'en_progreso') {
        return res.status(400).json({ message: "Solo se puede extender el destino cuando el servicio está en progreso" });
      }

      const parseResult = extendDestinationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Datos de extensión inválidos",
          errors: parseResult.error.issues
        });
      }

      const { destinoExtendidoLat, destinoExtendidoLng, destinoExtendidoDireccion } = parseResult.data;

      // Calculate distance from original destination to extended destination
      const originalDestLat = parseFloat(servicio.destinoLat);
      const originalDestLng = parseFloat(servicio.destinoLng);
      
      // Haversine formula to calculate distance in km
      const toRad = (deg: number) => deg * (Math.PI / 180);
      const R = 6371; // Earth's radius in km
      const dLat = toRad(destinoExtendidoLat - originalDestLat);
      const dLng = toRad(destinoExtendidoLng - originalDestLng);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(originalDestLat)) * Math.cos(toRad(destinoExtendidoLat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const extensionKm = R * c;

      // Maximum extension is 1.5km
      const MAX_EXTENSION_KM = 1.5;
      if (extensionKm > MAX_EXTENSION_KM) {
        return res.status(400).json({ 
          message: `La extensión máxima permitida es ${MAX_EXTENSION_KM}km. La distancia solicitada es ${extensionKm.toFixed(2)}km.`,
          maxExtensionKm: MAX_EXTENSION_KM,
          requestedExtensionKm: extensionKm
        });
      }

      const updatedServicio = await storage.updateServicio(servicioId, {
        destinoExtendidoLat: destinoExtendidoLat.toString(),
        destinoExtendidoLng: destinoExtendidoLng.toString(),
        destinoExtendidoDireccion,
        distanciaExtensionKm: extensionKm.toFixed(2),
        extensionAprobada: true,
      });

      logSystem.info('Service destination extended', {
        servicioId,
        conductorId: req.user!.id,
        extensionKm: extensionKm.toFixed(2),
        newDestination: destinoExtendidoDireccion
      });

      // Notify client about the extension
      if (servicio.clienteId) {
        await pushService.sendToUser(servicio.clienteId, {
          title: 'Destino extendido',
          body: `El operador ha extendido el destino ${extensionKm.toFixed(1)}km adicional a: ${destinoExtendidoDireccion}`,
          data: { type: 'destination_extended', servicioId }
        });
      }

      // Broadcast update to connected clients
      if (serviceSessions.has(servicioId)) {
        const broadcast = JSON.stringify({
          type: 'service_status_change',
          payload: updatedServicio,
        });
        serviceSessions.get(servicioId)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      res.json({
        success: true,
        servicio: updatedServicio,
        extensionKm: extensionKm.toFixed(2)
      });
    } catch (error: any) {
      logSystem.error('Extend destination error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Error al extender el destino" });
    }
  });

  app.post("/api/services/:id/confirm-payment", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const servicioId = req.params.id;
      const servicio = await storage.getServicioById(servicioId);
      
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.clienteId !== req.user!.id) {
        return res.status(403).json({ message: "Solo el cliente puede confirmar el pago" });
      }

      logSystem.info('Payment confirmed by client', { 
        servicioId, 
        clienteId: req.user!.id,
        montoConfirmado: req.body.montoConfirmado,
        metodoPago: servicio.metodoPago
      });

      res.json({ success: true, message: "Pago confirmado" });
    } catch (error: any) {
      logSystem.error('Confirm payment error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Error al confirmar el pago" });
    }
  });

  app.post("/api/services/:id/cancel", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const servicioId = req.params.id;
      const servicio = await storage.getServicioById(servicioId);
      
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      const isClient = servicio.clienteId === req.user!.id;
      const isDriver = servicio.conductorId === req.user!.id;
      const isAdmin = req.user!.userType === 'admin';

      if (!isClient && !isDriver && !isAdmin) {
        return res.status(403).json({ message: "No autorizado para cancelar este servicio" });
      }

      if (servicio.estado === 'cancelado') {
        return res.status(400).json({ message: "El servicio ya está cancelado" });
      }

      if (servicio.estado === 'completado') {
        return res.status(400).json({ message: "No se puede cancelar un servicio completado" });
      }

      // TODO: Implementar reembolso con Azul API si el servicio fue pagado con tarjeta

      const cancelledService = await storage.updateServicio(servicioId, {
        estado: 'cancelado',
        canceladoAt: new Date(),
      });

      logService.cancelled(servicioId, `Cancelled by ${req.user!.userType}`);

      if (isDriver && servicio.clienteId) {
        await pushService.sendToUser(servicio.clienteId, {
          title: 'Servicio cancelado',
          body: 'El operador ha cancelado el servicio. Puedes solicitar uno nuevo.',
          data: { type: 'service_cancelled', servicioId }
        });
      } else if (isClient && servicio.conductorId) {
        await pushService.sendToUser(servicio.conductorId, {
          title: 'Servicio cancelado',
          body: 'El cliente ha cancelado el servicio.',
          data: { type: 'service_cancelled', servicioId }
        });
      }

      res.json(cancelledService);
    } catch (error: any) {
      logSystem.error('Cancel service error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Error al cancelar el servicio" });
    }
  });

  // Rating endpoints (Module 3.3)
  app.post("/api/services/:id/calificar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const servicioId = req.params.id;

      const servicio = await storage.getServicioById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.clienteId !== req.user!.id) {
        return res.status(403).json({ message: "Solo el cliente puede calificar el servicio" });
      }

      if (servicio.estado !== 'completado') {
        return res.status(400).json({ message: "Solo se pueden calificar servicios completados" });
      }

      const existingRating = await storage.getCalificacionesByServicioId(servicioId);
      if (existingRating.length > 0) {
        return res.status(400).json({ message: "Este servicio ya ha sido calificado" });
      }

      const validatedData = insertCalificacionSchema.parse({
        servicioId,
        puntuacion: parseInt(req.body.puntuacion),
        comentario: req.body.comentario || null,
      });

      const calificacion = await storage.createCalificacion(validatedData);

      logSystem.info('Service rated', { 
        servicioId, 
        puntuacion: validatedData.puntuacion, 
        clienteId: req.user!.id,
        conductorId: servicio.conductorId 
      });

      res.json(calificacion);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0]?.message || "Puntuación debe ser entre 1 y 5" });
      }
      logSystem.error('Rate service error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Error al calificar el servicio" });
    }
  });

  app.get("/api/services/:id/calificacion", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const servicioId = req.params.id;
      const servicio = await storage.getServicioById(servicioId);
      
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.clienteId !== req.user!.id && servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado" });
      }

      const calificaciones = await storage.getCalificacionesByServicioId(servicioId);
      res.json(calificaciones[0] || null);
    } catch (error: any) {
      logSystem.error('Get rating error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Error al obtener la calificación" });
    }
  });

  app.post("/api/chat/send", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicioId = req.body.servicioId;
      
      const servicio = await storage.getServicioById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (servicio.clienteId !== req.user!.id && servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to send messages in this service" });
      }

      const validatedData = insertMensajeChatSchema.parse({
        servicioId: req.body.servicioId,
        remitenteId: req.user!.id,
        contenido: req.body.contenido,
      });

      const mensaje = await storage.createMensajeChat(validatedData);

      const recipientId = servicio.clienteId === req.user!.id ? servicio.conductorId! : servicio.clienteId;
      const senderName = `${req.user!.nombre} ${req.user!.apellido}`;
      await pushService.notifyNewMessage(recipientId, senderName, mensaje.contenido);

      if (serviceSessions.has(servicioId)) {
        const broadcast = JSON.stringify({
          type: 'new_chat_message',
          payload: mensaje,
        });
        serviceSessions.get(servicioId)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      res.json(mensaje);
    } catch (error: any) {
      logSystem.error('Send message error', error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/chat/:servicioId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicio = await storage.getServicioById(req.params.servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (servicio.clienteId !== req.user!.id && servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to view messages in this service" });
      }

      const mensajes = await storage.getMensajesByServicioId(req.params.servicioId);
      res.json(mensajes);
    } catch (error: any) {
      logSystem.error('Get messages error', error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/chat/:servicioId/mark-read", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicio = await storage.getServicioById(req.params.servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (servicio.clienteId !== req.user!.id && servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to mark messages as read in this service" });
      }

      await storage.marcarMensajesComoLeidos(req.params.servicioId, req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      logSystem.error('Mark messages read error', error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Negotiation Chat System Endpoints
  app.get("/api/drivers/available-requests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user!.userType !== 'conductor' && req.user!.userType !== 'admin') {
      return res.status(403).json({ message: "Solo conductores pueden ver solicitudes disponibles" });
    }

    try {
      const availableServices = await storage.getAvailableServicesForDrivers();
      res.json(availableServices);
    } catch (error: any) {
      logSystem.error('Get available requests error', error);
      res.status(500).json({ message: "Failed to get available requests" });
    }
  });

  app.post("/api/services/:id/propose-amount", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Solo conductores pueden proponer montos" });
    }

    try {
      const servicioId = req.params.id;
      const { monto, notas } = req.body;

      if (!monto || typeof monto !== 'number' || monto < 500 || monto > 500000) {
        return res.status(400).json({ message: "El monto debe ser un número entre RD$500 y RD$500,000" });
      }

      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Perfil de conductor no encontrado" });
      }

      const servicio = await storage.getServicioById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (!servicio.requiereNegociacion) {
        return res.status(400).json({ message: "Este servicio no requiere negociación" });
      }

      const updated = await storage.proposeNegotiationAmount(servicioId, req.user!.id, monto, notas);

      const mensaje = await storage.createMensajeChatWithMedia({
        servicioId,
        remitenteId: req.user!.id,
        contenido: `Propuesta de monto: RD$ ${monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}${notas ? `\n\nNotas: ${notas}` : ''}`,
        tipoMensaje: 'monto_propuesto',
        montoAsociado: monto.toString(),
      });

      await pushService.notifyNegotiationAmountProposed(servicio.clienteId, monto);

      if (serviceSessions.has(servicioId)) {
        const broadcast = JSON.stringify({
          type: 'amount_proposed',
          payload: { servicio: updated, mensaje },
        });
        serviceSessions.get(servicioId)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      res.json(updated);
    } catch (error: any) {
      logSystem.error('Propose amount error', error);
      res.status(500).json({ message: "Error al proponer monto" });
    }
  });

  app.post("/api/services/:id/confirm-amount", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Solo conductores pueden confirmar montos" });
    }

    try {
      const servicioId = req.params.id;

      const servicio = await storage.getServicioById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado para este servicio" });
      }

      if (servicio.estadoNegociacion !== 'propuesto') {
        return res.status(400).json({ message: "El servicio no tiene un monto propuesto" });
      }

      const updated = await storage.confirmNegotiationAmount(servicioId, req.user!.id);

      const mensaje = await storage.createMensajeChatWithMedia({
        servicioId,
        remitenteId: req.user!.id,
        contenido: `Monto confirmado: RD$ ${updated.montoNegociado ? parseFloat(updated.montoNegociado).toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '0.00'}`,
        tipoMensaje: 'monto_confirmado',
        montoAsociado: updated.montoNegociado || undefined,
      });

      await pushService.notifyNegotiationAmountConfirmed(servicio.clienteId, parseFloat(updated.montoNegociado || '0'));

      if (serviceSessions.has(servicioId)) {
        const broadcast = JSON.stringify({
          type: 'amount_confirmed',
          payload: { servicio: updated, mensaje },
        });
        serviceSessions.get(servicioId)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      res.json(updated);
    } catch (error: any) {
      logSystem.error('Confirm amount error', error);
      res.status(500).json({ message: "Error al confirmar monto" });
    }
  });

  app.post("/api/services/:id/accept-amount", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicioId = req.params.id;

      const servicio = await storage.getServicioById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.clienteId !== req.user!.id) {
        return res.status(403).json({ message: "Solo el cliente puede aceptar el monto" });
      }

      if (servicio.estadoNegociacion !== 'confirmado') {
        return res.status(400).json({ message: "El monto debe estar confirmado para ser aceptado" });
      }

      const updated = await storage.acceptNegotiationAmount(servicioId, req.user!.id);

      const mensaje = await storage.createMensajeChatWithMedia({
        servicioId,
        remitenteId: req.user!.id,
        contenido: `Monto aceptado: RD$ ${updated.costoTotal ? parseFloat(updated.costoTotal).toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '0.00'}`,
        tipoMensaje: 'monto_aceptado',
        montoAsociado: updated.costoTotal || undefined,
      });

      if (servicio.conductorId) {
        await pushService.notifyNegotiationAmountAccepted(servicio.conductorId, parseFloat(updated.costoTotal || '0'));
      }

      if (serviceSessions.has(servicioId)) {
        const broadcast = JSON.stringify({
          type: 'amount_accepted',
          payload: { servicio: updated, mensaje },
        });
        serviceSessions.get(servicioId)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      res.json(updated);
    } catch (error: any) {
      logSystem.error('Accept amount error', error);
      res.status(500).json({ message: "Error al aceptar monto" });
    }
  });

  app.post("/api/services/:id/reject-amount", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicioId = req.params.id;

      const servicio = await storage.getServicioById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.clienteId !== req.user!.id) {
        return res.status(403).json({ message: "Solo el cliente puede rechazar el monto" });
      }

      if (servicio.estadoNegociacion !== 'confirmado' && servicio.estadoNegociacion !== 'propuesto') {
        return res.status(400).json({ message: "No hay monto pendiente para rechazar" });
      }

      const conductorIdAnterior = servicio.conductorId;
      const updated = await storage.rejectNegotiationAmount(servicioId, req.user!.id);

      const mensaje = await storage.createMensajeChatWithMedia({
        servicioId,
        remitenteId: req.user!.id,
        contenido: 'El cliente ha rechazado el monto propuesto. El servicio está disponible nuevamente.',
        tipoMensaje: 'monto_rechazado',
      });

      if (conductorIdAnterior) {
        await pushService.notifyNegotiationAmountRejected(conductorIdAnterior);
      }

      if (serviceSessions.has(servicioId)) {
        const broadcast = JSON.stringify({
          type: 'amount_rejected',
          payload: { servicio: updated, mensaje },
        });
        serviceSessions.get(servicioId)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      res.json(updated);
    } catch (error: any) {
      logSystem.error('Reject amount error', error);
      res.status(500).json({ message: "Error al rechazar monto" });
    }
  });

  app.post("/api/push/subscribe", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const validatedData = insertPushSubscriptionSchema.parse({
        userId: req.user!.id,
        endpoint: req.body.endpoint,
        p256dhKey: req.body.keys.p256dh,
        authKey: req.body.keys.auth,
        userAgent: req.get('User-Agent'),
      });

      const subscription = await storage.createPushSubscription(validatedData);
      res.json({ success: true, subscription });
    } catch (error: any) {
      logSystem.error('Subscribe to push error', error);
      res.status(500).json({ message: "Failed to subscribe to push notifications" });
    }
  });

  app.post("/api/push/unsubscribe", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      await storage.deletePushSubscription(req.body.endpoint);
      res.json({ success: true });
    } catch (error: any) {
      logSystem.error('Unsubscribe from push error', error);
      res.status(500).json({ message: "Failed to unsubscribe from push notifications" });
    }
  });

  app.get("/api/push/subscriptions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const subscriptions = await storage.getPushSubscriptionsByUserId(req.user!.id);
      res.json(subscriptions);
    } catch (error: any) {
      logSystem.error('Get push subscriptions error', error);
      res.status(500).json({ message: "Failed to get push subscriptions" });
    }
  });

  app.get("/api/admin/dashboard", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      logSystem.error('Get dashboard stats error', error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // TODO: Actualizar cuando se integre Azul API para calcular fees reales
  app.get("/api/admin/payment-fees", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const allComisiones = await storage.getAllComisiones();
      
      let totalCollected = 0;
      let totalGatewayFees = 0;
      let totalOperatorShare = 0;
      let totalCompanyShare = 0;
      
      const byPeriodMap: Record<string, { collected: number; fees: number; net: number }> = {};
      
      for (const comision of allComisiones) {
        const montoTotal = parseFloat(comision.montoTotal || '0');
        const gatewayFee = parseFloat((comision as any).gatewayFeeAmount || '0');
        const montoOperador = parseFloat(comision.montoOperador || '0');
        const montoEmpresa = parseFloat(comision.montoEmpresa || '0');
        
        totalCollected += montoTotal;
        totalGatewayFees += gatewayFee;
        totalOperatorShare += montoOperador;
        totalCompanyShare += montoEmpresa;
        
        const dateKey = comision.createdAt 
          ? new Date(comision.createdAt).toISOString().split('T')[0]
          : 'unknown';
        
        if (!byPeriodMap[dateKey]) {
          byPeriodMap[dateKey] = { collected: 0, fees: 0, net: 0 };
        }
        byPeriodMap[dateKey].collected += montoTotal;
        byPeriodMap[dateKey].fees += gatewayFee;
        byPeriodMap[dateKey].net += montoTotal - gatewayFee;
      }
      
      const netReceived = totalCollected - totalGatewayFees;
      const feePercentage = totalCollected > 0 ? (totalGatewayFees / totalCollected) * 100 : 0;
      
      const byPeriod = Object.entries(byPeriodMap)
        .map(([date, data]) => ({
          date,
          collected: data.collected,
          fees: data.fees,
          net: data.net,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      
      // Sort by createdAt descending to get most recent first
      const sortedComisiones = [...allComisiones].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      const recentTransactions = sortedComisiones
        .slice(0, 50)
        .map((c) => {
          const montoTotal = parseFloat(c.montoTotal || '0');
          const gatewayFee = parseFloat((c as any).gatewayFeeAmount || '0');
          const netAmount = (c as any).gatewayNetAmount 
            ? parseFloat((c as any).gatewayNetAmount) 
            : montoTotal - gatewayFee;
          
          return {
            id: c.id,
            servicioId: c.servicioId,
            amount: montoTotal,
            gatewayFee: gatewayFee,
            netAmount: netAmount,
            operatorShare: parseFloat(c.montoOperador || '0'),
            companyShare: parseFloat(c.montoEmpresa || '0'),
            createdAt: c.createdAt?.toISOString() || '',
          };
        });
      
      res.json({
        summary: {
          totalCollected,
          totalGatewayFees,
          netReceived,
          feePercentage,
          totalOperatorShare,
          totalCompanyShare,
        },
        byPeriod,
        recentTransactions,
      });
    } catch (error: any) {
      logSystem.error('Get payment fees error', error);
      res.status(500).json({ message: "Failed to get payment fees" });
    }
  });

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const users = await storage.getAllUsers();
      // Sanitize user data to remove password hashes
      res.json(getSafeUsersForAdmin(users));
    } catch (error: any) {
      logSystem.error('Get users error', error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/admin/drivers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const drivers = await storage.getAllDrivers();
      // Sanitize all driver data including embedded user objects
      res.json(getSafeDrivers(drivers));
    } catch (error: any) {
      logSystem.error('Get drivers error', error);
      res.status(500).json({ message: "Failed to get drivers" });
    }
  });

  // Update driver's user info (name, surname, email) - admin only
  app.put("/api/admin/drivers/:driverId/user-info", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { driverId } = req.params;
      const { nombre, apellido, email } = req.body;
      
      if (!nombre || !apellido) {
        return res.status(400).json({ message: "Nombre y apellido son requeridos" });
      }

      // Get driver to find user ID
      const driver = await storage.getConductor(driverId);
      if (!driver) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      // Prepare update data
      const updateData: { nombre: string; apellido: string; email?: string } = { nombre, apellido };
      
      // If email is provided and different from current, validate and update
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Formato de correo electrónico inválido" });
        }
        
        // Check if email is already in use by another user
        const existingUsers = await storage.getUsersByEmail(email);
        const otherUser = existingUsers.find(u => u.id !== driver.userId);
        if (otherUser) {
          return res.status(409).json({ 
            message: "Este correo electrónico ya está en uso por otra cuenta" 
          });
        }
        
        updateData.email = email;
      }

      // Update user info
      const updatedUser = await storage.updateUser(driver.userId, updateData);
      
      logSystem.info('Driver user info updated by admin', { 
        adminId: req.user!.id, 
        driverId, 
        userId: driver.userId,
        nombre, 
        apellido,
        emailChanged: !!email
      });
      
      res.json({ 
        success: true, 
        user: { 
          nombre: updatedUser.nombre, 
          apellido: updatedUser.apellido,
          email: updatedUser.email
        } 
      });
    } catch (error: any) {
      logSystem.error('Update driver user info (admin) error', error);
      res.status(500).json({ message: "Failed to update driver user info" });
    }
  });

  // Get driver's service categories (admin)
  app.get("/api/admin/drivers/:driverId/servicios", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { driverId } = req.params;
      const servicios = await storage.getConductorServicios(driverId);
      res.json(servicios);
    } catch (error: any) {
      logSystem.error('Get driver services (admin) error', error);
      res.status(500).json({ message: "Failed to get driver services" });
    }
  });

  // Update driver's service categories (admin)
  app.put("/api/admin/drivers/:driverId/servicios", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { driverId } = req.params;
      const { categorias } = req.body;
      
      if (!Array.isArray(categorias)) {
        return res.status(400).json({ message: "Categorias must be an array" });
      }

      await storage.setConductorServicios(driverId, categorias);
      const servicios = await storage.getConductorServicios(driverId);
      
      logSystem.info('Driver services updated by admin', { adminId: req.user!.id, driverId, count: servicios.length });
      res.json(servicios);
    } catch (error: any) {
      logSystem.error('Update driver services (admin) error', error);
      res.status(500).json({ message: "Failed to update driver services" });
    }
  });

  app.get("/api/admin/services", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const services = await storage.getAllServicios();
      res.json(services);
    } catch (error: any) {
      logSystem.error('Get services error', error);
      res.status(500).json({ message: "Failed to get services" });
    }
  });

  app.get("/api/admin/active-drivers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const drivers = await storage.getAvailableDrivers();
      res.json(getSafeDrivers(drivers));
    } catch (error: any) {
      logSystem.error('Get active drivers error', error);
      res.status(500).json({ message: "Failed to get active drivers" });
    }
  });

  app.get("/api/admin/monitoring-drivers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const allDrivers = await storage.getAllDrivers();
      res.json(getSafeDrivers(allDrivers));
    } catch (error: any) {
      logSystem.error('Get monitoring drivers error', error);
      res.status(500).json({ message: "Failed to get monitoring drivers" });
    }
  });

  app.get("/api/admin/pricing", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const pricing = await storage.getAllTarifas();
      res.json(pricing);
    } catch (error: any) {
      logSystem.error('Get pricing error', error);
      res.status(500).json({ message: "Failed to get pricing" });
    }
  });

  app.post("/api/admin/pricing", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const tarifa = await storage.createTarifa(req.body);
      res.json(tarifa);
    } catch (error: any) {
      logSystem.error('Create pricing error', error);
      res.status(500).json({ message: "Failed to create pricing" });
    }
  });

  app.put("/api/admin/pricing/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const tarifa = await storage.updateTarifa(req.params.id, req.body);
      res.json(tarifa);
    } catch (error: any) {
      logSystem.error('Update pricing error', error);
      res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  app.get("/api/pricing/active", async (req: Request, res: Response) => {
    try {
      const tarifa = await storage.getActiveTarifa();
      res.json(tarifa);
    } catch (error: any) {
      logSystem.error('Get active pricing error', error);
      res.status(500).json({ message: "Failed to get active pricing" });
    }
  });

  const verificationStatusQuerySchema = z.object({
    search: z.string().optional(),
    status: z.enum(['verified', 'pending-phone', 'pending-cedula', 'unverified']).optional(),
    userType: z.enum(['cliente', 'conductor', 'admin']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  });

  app.get("/api/admin/verification-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const queryValidation = verificationStatusQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({ message: "Invalid query parameters", errors: queryValidation.error });
      }

      const { search, status, userType, page = '1', limit = '50' } = queryValidation.data;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const allUsers = await storage.getAllUsers();

      let filteredUsers = allUsers.filter((user) => {
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch = 
            user.nombre.toLowerCase().includes(searchLower) ||
            user.apellido.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            (user.cedula && user.cedula.includes(search));
          if (!matchesSearch) return false;
        }

        if (userType && user.userType !== userType) {
          return false;
        }

        if (status) {
          const isFullyVerified = user.cedulaVerificada && user.telefonoVerificado;
          const hasPendingPhone = !user.telefonoVerificado;
          const hasPendingCedula = !user.cedulaVerificada;
          const isUnverified = !user.cedulaVerificada && !user.telefonoVerificado;

          if (status === 'verified' && !isFullyVerified) return false;
          if (status === 'pending-phone' && !hasPendingPhone) return false;
          if (status === 'pending-cedula' && !hasPendingCedula) return false;
          if (status === 'unverified' && !isUnverified) return false;
        }

        return true;
      });

      const total = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(offset, offset + limitNum);

      const stats = {
        totalUsers: allUsers.length,
        fullyVerified: allUsers.filter(u => u.cedulaVerificada && u.telefonoVerificado).length,
        pendingPhone: allUsers.filter(u => !u.telefonoVerificado).length,
        pendingCedula: allUsers.filter(u => !u.cedulaVerificada).length,
      };

      const usersWithLastAttempt = paginatedUsers.map(user => ({
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        cedula: user.cedula,
        cedulaVerificada: user.cedulaVerificada,
        telefono: user.phone,
        telefonoVerificado: user.telefonoVerificado,
        userType: user.userType,
        createdAt: user.createdAt,
      }));

      res.json({
        users: usersWithLastAttempt,
        total,
        stats,
        page: pageNum,
        limit: limitNum,
      });
    } catch (error: any) {
      logSystem.error('Get verification status error', error);
      res.status(500).json({ message: "Failed to get verification status" });
    }
  });

  app.get("/api/admin/users/:id/verification-history", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.params.id;
      const history = await getVerificationHistory(userId);
      res.json(history);
    } catch (error: any) {
      logSystem.error('Get verification history error', error);
      res.status(500).json({ message: "Failed to get verification history" });
    }
  });

  app.get("/api/admin/pending-photo-verifications", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const allUsers = await storage.getAllUsers();
      const driversWithPendingPhoto = allUsers.filter(user => 
        user.userType === 'conductor' && 
        !user.fotoVerificada &&
        user.fotoUrl
      );

      const pendingPhotos = driversWithPendingPhoto.map(user => ({
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        cedula: user.cedula,
        phone: user.phone,
        photoUrl: user.fotoUrl,
        cedulaVerificada: user.cedulaVerificada,
        telefonoVerificado: user.telefonoVerificado,
        fotoVerificada: user.fotoVerificada,
        fotoVerificadaScore: user.fotoVerificadaScore,
        createdAt: user.createdAt,
      }));

      const stats = {
        totalPending: pendingPhotos.length,
        totalDrivers: allUsers.filter(u => u.userType === 'conductor').length,
        totalWithPhoto: allUsers.filter(u => u.userType === 'conductor' && u.fotoUrl).length,
        totalVerified: allUsers.filter(u => u.userType === 'conductor' && u.fotoVerificada).length,
      };

      res.json({
        pendingPhotos,
        stats,
      });
    } catch (error: any) {
      logSystem.error('Get pending photo verifications error', error);
      res.status(500).json({ message: "Failed to get pending photo verifications" });
    }
  });

  app.post("/api/admin/users/:userId/approve-photo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.params.userId;
      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.userType !== 'conductor') {
        return res.status(400).json({ message: "User is not a driver" });
      }

      if (!user.fotoUrl) {
        return res.status(400).json({ message: "User has no profile photo to approve" });
      }

      await storage.updateUser(userId, {
        fotoVerificada: true,
        fotoVerificadaScore: "1.00",
      });

      logSystem.info('Admin approved photo manually', { 
        adminId: req.user!.id, 
        userId, 
        adminEmail: req.user!.email 
      });

      res.json({ 
        success: true, 
        message: "Photo approved successfully",
        userId,
      });
    } catch (error: any) {
      logSystem.error('Approve photo error', error);
      res.status(500).json({ message: "Failed to approve photo" });
    }
  });

  app.post("/api/admin/users/:userId/reject-photo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.params.userId;
      const { reason } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.userType !== 'conductor') {
        return res.status(400).json({ message: "User is not a driver" });
      }

      await storage.updateUser(userId, {
        fotoVerificada: false,
        fotoVerificadaScore: null,
        fotoUrl: null,
      });

      logSystem.info('Admin rejected photo', { 
        adminId: req.user!.id, 
        userId, 
        adminEmail: req.user!.email,
        reason: reason || 'No reason provided'
      });

      res.json({ 
        success: true, 
        message: "Photo rejected successfully. User will need to upload a new photo.",
        userId,
      });
    } catch (error: any) {
      logSystem.error('Reject photo error', error);
      res.status(500).json({ message: "Failed to reject photo" });
    }
  });

  // Admin manual cédula verification
  app.post("/api/admin/users/:userId/approve-cedula", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.params.userId;
      const { cedula } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updateData: any = {
        cedulaVerificada: true,
      };
      
      if (cedula && typeof cedula === 'string' && cedula.length === 11) {
        updateData.cedula = cedula;
      }

      await storage.updateUser(userId, updateData);

      logSystem.info('Admin approved cédula manually', { 
        adminId: req.user!.id, 
        userId, 
        adminEmail: req.user!.email,
        cedula: user.cedula || cedula || 'not provided'
      });

      res.json({ 
        success: true, 
        message: "Cédula verified successfully",
        userId,
      });
    } catch (error: any) {
      logSystem.error('Approve cédula error', error);
      res.status(500).json({ message: "Failed to approve cédula" });
    }
  });

  app.post("/api/admin/users/:userId/reject-cedula", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.params.userId;
      const { reason } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(userId, {
        cedulaVerificada: false,
        cedula: null,
      });

      logSystem.info('Admin rejected cédula', { 
        adminId: req.user!.id, 
        userId, 
        adminEmail: req.user!.email,
        reason: reason || 'No reason provided'
      });

      res.json({ 
        success: true, 
        message: "Cédula rejected. User will need to re-verify.",
        userId,
      });
    } catch (error: any) {
      logSystem.error('Reject cédula error', error);
      res.status(500).json({ message: "Failed to reject cédula" });
    }
  });

  // Get pending cédula verifications for admin
  app.get("/api/admin/pending-cedula-verifications", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const allUsers = await storage.getAllUsers();
      const usersWithPendingCedula = allUsers.filter(user => 
        (user.userType === 'conductor' || user.userType === 'cliente') && 
        !user.cedulaVerificada
      );

      const pendingCedulas = usersWithPendingCedula.map(user => ({
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        cedula: user.cedula,
        cedulaImageUrl: user.cedulaImageUrl,
        phone: user.phone,
        photoUrl: user.fotoUrl,
        userType: user.userType,
        cedulaVerificada: user.cedulaVerificada,
        telefonoVerificado: user.telefonoVerificado,
        createdAt: user.createdAt,
      }));

      const stats = {
        totalPending: pendingCedulas.length,
        totalDrivers: allUsers.filter(u => u.userType === 'conductor').length,
        totalClients: allUsers.filter(u => u.userType === 'cliente').length,
        totalVerified: allUsers.filter(u => u.cedulaVerificada).length,
      };

      res.json({
        pendingCedulas,
        stats,
      });
    } catch (error: any) {
      logSystem.error('Get pending cédula verifications error', error);
      res.status(500).json({ message: "Failed to get pending cédula verifications" });
    }
  });

  // Serve cedula image from object storage (admin only)
  app.get("/api/admin/cedula-image/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.cedulaImageUrl) {
        return res.status(404).json({ message: "No cedula image available for this user" });
      }

      // Download the image from object storage
      const imageBuffer = await storageService.downloadFile(user.cedulaImageUrl);
      
      // Determine content type based on file extension
      const contentType = user.cedulaImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(imageBuffer);
    } catch (error: any) {
      logSystem.error('Get cedula image error', error);
      res.status(500).json({ message: "Failed to retrieve cedula image" });
    }
  });

  // ==================== MANUAL VERIFICATION ROUTES (Admin Only) ====================

  // Get users with pending email verification
  app.get("/api/admin/pending-email-verifications", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const allUsers = await storage.getAllUsers();
      const usersWithPendingEmail = allUsers.filter(user => 
        (user.userType === 'conductor' || user.userType === 'cliente') && 
        !user.emailVerificado
      );

      const pendingEmails = usersWithPendingEmail.map(user => ({
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        emailVerificado: user.emailVerificado,
        cedulaVerificada: user.cedulaVerificada,
        createdAt: user.createdAt,
      }));

      const stats = {
        totalPending: pendingEmails.length,
        totalDrivers: allUsers.filter(u => u.userType === 'conductor' && !u.emailVerificado).length,
        totalClients: allUsers.filter(u => u.userType === 'cliente' && !u.emailVerificado).length,
        totalVerified: allUsers.filter(u => u.emailVerificado).length,
      };

      res.json({
        pendingEmails,
        stats,
      });
    } catch (error: any) {
      logSystem.error('Get pending email verifications error', error);
      res.status(500).json({ message: "Failed to get pending email verifications" });
    }
  });

  // Manually verify email for a user
  app.post("/api/admin/users/:userId/verify-email", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(userId, {
        emailVerificado: true,
      });

      logSystem.info('Admin manually verified email', { 
        adminId: req.user!.id, 
        userId, 
        adminEmail: req.user!.email,
        userEmail: user.email
      });

      res.json({ 
        success: true, 
        message: "Email verified successfully",
        userId,
      });
    } catch (error: any) {
      logSystem.error('Verify email error', error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Revoke email verification for a user
  app.post("/api/admin/users/:userId/revoke-email", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(userId, {
        emailVerificado: false,
      });

      logSystem.info('Admin revoked email verification', { 
        adminId: req.user!.id, 
        userId, 
        adminEmail: req.user!.email,
        userEmail: user.email
      });

      res.json({ 
        success: true, 
        message: "Email verification revoked",
        userId,
      });
    } catch (error: any) {
      logSystem.error('Revoke email verification error', error);
      res.status(500).json({ message: "Failed to revoke email verification" });
    }
  });

  // Get drivers with pending license verification
  app.get("/api/admin/pending-license-verifications", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const allDrivers = await storage.getAllDrivers();
      const driversWithPendingLicense = allDrivers.filter(driver => 
        !driver.licenciaVerificada
      );

      const pendingLicenses = driversWithPendingLicense.map(driver => ({
        id: driver.id,
        conductorId: driver.id,
        userId: driver.userId,
        nombre: driver.user?.nombre || '',
        apellido: driver.user?.apellido || '',
        email: driver.user?.email || '',
        phone: driver.user?.phone || '',
        licencia: driver.licencia,
        licenciaCategoria: driver.licenciaCategoria,
        licenciaRestricciones: driver.licenciaRestricciones,
        licenciaFechaVencimiento: driver.licenciaFechaVencimiento,
        licenciaFrontalUrl: driver.licenciaFrontalUrl,
        licenciaTraseraUrl: driver.licenciaTraseraUrl,
        licenciaVerificada: driver.licenciaVerificada,
        licenciaCategoriaVerificada: driver.licenciaCategoriaVerificada,
        createdAt: driver.user?.createdAt,
      }));

      const stats = {
        totalPending: pendingLicenses.length,
        totalDrivers: allDrivers.length,
        totalVerified: allDrivers.filter(d => d.licenciaVerificada).length,
      };

      res.json({
        pendingLicenses,
        stats,
      });
    } catch (error: any) {
      logSystem.error('Get pending license verifications error', error);
      res.status(500).json({ message: "Failed to get pending license verifications" });
    }
  });

  // Manually verify license for a driver
  app.post("/api/admin/conductores/:conductorId/verify-license", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductorId = req.params.conductorId;
      const { licencia, licenciaCategoria, licenciaRestricciones, licenciaFechaVencimiento } = req.body;

      if (!conductorId) {
        return res.status(400).json({ message: "Invalid conductor ID" });
      }

      const conductor = await storage.getConductorById(conductorId);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor not found" });
      }

      const updateData: any = {
        licenciaVerificada: true,
        licenciaCategoriaVerificada: true,
      };

      if (licencia && typeof licencia === 'string') {
        updateData.licencia = licencia;
      }
      if (licenciaCategoria && typeof licenciaCategoria === 'string') {
        updateData.licenciaCategoria = licenciaCategoria;
      }
      if (licenciaRestricciones && typeof licenciaRestricciones === 'string') {
        updateData.licenciaRestricciones = licenciaRestricciones;
      }
      if (licenciaFechaVencimiento) {
        updateData.licenciaFechaVencimiento = new Date(licenciaFechaVencimiento);
      }

      await storage.updateConductor(conductorId, updateData);

      logSystem.info('Admin manually verified license', { 
        adminId: req.user!.id, 
        conductorId, 
        adminEmail: req.user!.email,
        licencia: updateData.licencia || conductor.licencia,
        licenciaCategoria: updateData.licenciaCategoria || conductor.licenciaCategoria,
      });

      res.json({ 
        success: true, 
        message: "License verified successfully",
        conductorId,
      });
    } catch (error: any) {
      logSystem.error('Verify license error', error);
      res.status(500).json({ message: "Failed to verify license" });
    }
  });

  // Reject license for a driver
  app.post("/api/admin/conductores/:conductorId/reject-license", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductorId = req.params.conductorId;
      const { reason } = req.body;

      if (!conductorId) {
        return res.status(400).json({ message: "Invalid conductor ID" });
      }

      const conductor = await storage.getConductorById(conductorId);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor not found" });
      }

      await storage.updateConductor(conductorId, {
        licenciaVerificada: false,
        licenciaCategoriaVerificada: false,
      });

      logSystem.info('Admin rejected license', { 
        adminId: req.user!.id, 
        conductorId, 
        adminEmail: req.user!.email,
        reason: reason || 'No reason provided'
      });

      res.json({ 
        success: true, 
        message: "License rejected. Driver will need to re-verify.",
        conductorId,
      });
    } catch (error: any) {
      logSystem.error('Reject license error', error);
      res.status(500).json({ message: "Failed to reject license" });
    }
  });

  // Serve license front image from object storage (admin only)
  app.get("/api/admin/license-image/:conductorId/front", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { conductorId } = req.params;
      
      if (!conductorId) {
        return res.status(400).json({ message: "Conductor ID is required" });
      }

      const conductor = await storage.getConductorById(conductorId);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor not found" });
      }

      if (!conductor.licenciaFrontalUrl) {
        return res.status(404).json({ message: "No license front image available" });
      }

      const imageBuffer = await storageService.downloadFile(conductor.licenciaFrontalUrl);
      const contentType = conductor.licenciaFrontalUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(imageBuffer);
    } catch (error: any) {
      logSystem.error('Get license front image error', error);
      res.status(500).json({ message: "Failed to retrieve license image" });
    }
  });

  // Serve license back image from object storage (admin only)
  app.get("/api/admin/license-image/:conductorId/back", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { conductorId } = req.params;
      
      if (!conductorId) {
        return res.status(400).json({ message: "Conductor ID is required" });
      }

      const conductor = await storage.getConductorById(conductorId);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor not found" });
      }

      if (!conductor.licenciaTraseraUrl) {
        return res.status(404).json({ message: "No license back image available" });
      }

      const imageBuffer = await storageService.downloadFile(conductor.licenciaTraseraUrl);
      const contentType = conductor.licenciaTraseraUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(imageBuffer);
    } catch (error: any) {
      logSystem.error('Get license back image error', error);
      res.status(500).json({ message: "Failed to retrieve license image" });
    }
  });

  app.post("/api/pricing/calculate", pricingLimiter, async (req: Request, res: Response) => {
    try {
      const { distanceKm, servicioCategoria, servicioSubtipo } = req.body;
      
      // Default fallback prices (used when no tariff is configured)
      const DEFAULT_PRECIO_BASE = 150;
      const DEFAULT_TARIFA_POR_KM = 20;
      
      // Default prices for onsite services (auxilio vial) when no specific tariff exists
      const DEFAULT_ONSITE_PRICES: Record<string, number> = {
        'cambio_goma': 500,
        'inflado_neumatico': 300,
        'paso_corriente': 400,
        'cerrajero_automotriz': 800,
        'suministro_combustible': 350,
        'envio_bateria': 1500,
        'diagnostico_obd': 600,
      };

      // List of onsite services (no distance required)
      const ONSITE_SUBTYPES = [
        'cambio_goma', 'inflado_neumatico', 'paso_corriente', 
        'cerrajero_automotriz', 'suministro_combustible', 'envio_bateria', 'diagnostico_obd'
      ];

      const isOnsiteService = servicioCategoria === 'auxilio_vial' && 
        servicioSubtipo && 
        ONSITE_SUBTYPES.includes(servicioSubtipo);

      // Get the specific tariff for this category/subtype combination
      const tarifa = await storage.getTarifaByCategoriaySubtipo(
        servicioCategoria || null, 
        servicioSubtipo || null
      );

      if (isOnsiteService && servicioSubtipo) {
        // For onsite services, use the tariff's precioBase if available, otherwise use defaults
        const total = tarifa 
          ? parseFloat(tarifa.precioBase as string) 
          : (DEFAULT_ONSITE_PRICES[servicioSubtipo] || 500);
        
        return res.json({
          total,
          precioBase: total,
          tarifaPorKm: 0,
          distanceKm: 0,
          isOnsiteService: true,
          servicioSubtipo,
          tarifaNombre: tarifa?.nombre || 'Tarifa por defecto',
          isDefaultPricing: !tarifa,
        });
      }

      const parsedDistance = typeof distanceKm === 'number' ? distanceKm : parseFloat(distanceKm);
      if (isNaN(parsedDistance) || parsedDistance < 0) {
        return res.status(400).json({ 
          message: "Distancia inválida para servicio de transporte",
          error: "INVALID_DISTANCE"
        });
      }

      if (parsedDistance === 0) {
        return res.status(400).json({ 
          message: "Servicios de transporte requieren una distancia mayor a 0",
          error: "ZERO_DISTANCE"
        });
      }

      // Use the tariff values directly - no multipliers needed since
      // each subcategory now has its own configured tariff
      const precioBase = tarifa ? parseFloat(tarifa.precioBase as string) : DEFAULT_PRECIO_BASE;
      const tarifaPorKm = tarifa ? parseFloat(tarifa.tarifaPorKm as string) : DEFAULT_TARIFA_POR_KM;
      
      // Calculate total: base price + (distance * per-km rate)
      const total = precioBase + (parsedDistance * tarifaPorKm);

      res.json({ 
        total, 
        precioBase, 
        tarifaPorKm, 
        distanceKm: parsedDistance,
        tarifaNombre: tarifa?.nombre || 'Tarifa por defecto',
        tarifaId: tarifa?.id || null,
        servicioCategoria: tarifa?.servicioCategoria || servicioCategoria,
        servicioSubtipo: tarifa?.servicioSubtipo || servicioSubtipo,
        isDefaultPricing: !tarifa,
        isOnsiteService: false,
      });
    } catch (error: any) {
      logSystem.error('Calculate pricing error', error);
      res.status(500).json({ message: "Failed to calculate pricing" });
    }
  });

  app.get("/api/admin/analytics/revenue", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { startDate, endDate, period } = req.query;
      
      if (!startDate || !endDate || !period) {
        return res.status(400).json({ message: "startDate, endDate, and period are required" });
      }

      if (period !== 'day' && period !== 'week' && period !== 'month') {
        return res.status(400).json({ message: "period must be 'day', 'week', or 'month'" });
      }

      const data = await storage.getRevenueByPeriod(
        startDate as string,
        endDate as string,
        period as 'day' | 'week' | 'month'
      );
      res.json(data);
    } catch (error: any) {
      logSystem.error('Get revenue by period error', error);
      res.status(500).json({ message: "Failed to get revenue data" });
    }
  });

  app.get("/api/admin/analytics/services", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { startDate, endDate, period } = req.query;
      
      if (!startDate || !endDate || !period) {
        return res.status(400).json({ message: "startDate, endDate, and period are required" });
      }

      if (period !== 'day' && period !== 'week' && period !== 'month') {
        return res.status(400).json({ message: "period must be 'day', 'week', or 'month'" });
      }

      const data = await storage.getServicesByPeriod(
        startDate as string,
        endDate as string,
        period as 'day' | 'week' | 'month'
      );
      res.json(data);
    } catch (error: any) {
      logSystem.error('Get services by period error', error);
      res.status(500).json({ message: "Failed to get services data" });
    }
  });

  app.get("/api/admin/analytics/drivers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const data = await storage.getDriverRankings();
      res.json(data);
    } catch (error: any) {
      logSystem.error('Get driver rankings error', error);
      res.status(500).json({ message: "Failed to get driver rankings" });
    }
  });

  app.get("/api/admin/analytics/peak-hours", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const data = await storage.getServicesByHour();
      res.json(data);
    } catch (error: any) {
      logSystem.error('Get services by hour error', error);
      res.status(500).json({ message: "Failed to get peak hours data" });
    }
  });

  app.get("/api/admin/analytics/status-breakdown", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { startDate, endDate } = req.query;
      const data = await storage.getServiceStatusBreakdown(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(data);
    } catch (error: any) {
      logSystem.error('Get service status breakdown error', error);
      res.status(500).json({ message: "Failed to get status breakdown" });
    }
  });

  // Advanced Analytics Endpoints (Module 2.3)
  app.get("/api/admin/analytics/heatmap", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { startDate, endDate, precision } = req.query;
      const data = await storage.getServiceLocationsForHeatmap(
        startDate as string | undefined,
        endDate as string | undefined,
        precision ? parseInt(precision as string) : 3
      );
      res.json(data);
    } catch (error: any) {
      logSystem.error('Get heatmap data error', error);
      res.status(500).json({ message: "Failed to get heatmap data" });
    }
  });

  app.get("/api/admin/analytics/kpis", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { startDate, endDate } = req.query;
      const data = await storage.getAdvancedKPIs(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(data);
    } catch (error: any) {
      logSystem.error('Get KPIs error', error);
      res.status(500).json({ message: "Failed to get KPIs" });
    }
  });

  app.get("/api/admin/analytics/vehicles", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { startDate, endDate } = req.query;
      const data = await storage.getVehicleTypeDistribution(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(data);
    } catch (error: any) {
      logSystem.error('Get vehicle distribution error', error);
      res.status(500).json({ message: "Failed to get vehicle distribution" });
    }
  });

  app.get("/api/admin/analytics/pdf", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const [kpis, vehicles, statusBreakdown, driverRankings] = await Promise.all([
        storage.getAdvancedKPIs(startDate as string, endDate as string),
        storage.getVehicleTypeDistribution(startDate as string, endDate as string),
        storage.getServiceStatusBreakdown(startDate as string, endDate as string),
        storage.getDriverRankings(),
      ]);

      const pdfBuffer = await pdfService.generateAnalyticsReport({
        startDate: startDate as string,
        endDate: endDate as string,
        kpis,
        vehicles,
        statusBreakdown,
        driverRankings,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-gruard-${startDate}-${endDate}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      logSystem.error('Generate analytics PDF error', error);
      res.status(500).json({ message: "Failed to generate analytics PDF" });
    }
  });

  // Insurance Validation Endpoints (Module 2.1)
  app.get("/api/insurance/insurers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const insurers = getSupportedInsurers();
      res.json(insurers);
    } catch (error: any) {
      logSystem.error('Get insurers error', error);
      res.status(500).json({ message: "Failed to get insurers list" });
    }
  });

  app.post("/api/insurance/validate-policy", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { policyNumber, vehiclePlate, insurerCode } = req.body;

      if (!policyNumber || !vehiclePlate) {
        return res.status(400).json({ message: "Policy number and vehicle plate are required" });
      }

      const result = await insuranceValidationService.validatePolicyByNumber(
        policyNumber,
        vehiclePlate,
        insurerCode as InsurerCode | undefined
      );

      res.json(result);
    } catch (error: any) {
      logSystem.error('Validate policy error', error);
      res.status(500).json({ message: "Failed to validate policy" });
    }
  });

  app.post("/api/insurance/validate-by-cedula", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { cedula, vehiclePlate } = req.body;

      if (!cedula || !vehiclePlate) {
        return res.status(400).json({ message: "Cedula and vehicle plate are required" });
      }

      const result = await insuranceValidationService.validatePolicyByCedula(cedula, vehiclePlate);
      res.json(result);
    } catch (error: any) {
      logSystem.error('Validate by cedula error', error);
      res.status(500).json({ message: "Failed to validate by cedula" });
    }
  });

  app.post("/api/insurance/request-authorization", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { policyNumber, vehiclePlate, insurerCode } = req.body;

      if (!policyNumber || !vehiclePlate || !insurerCode) {
        return res.status(400).json({ 
          message: "Policy number, vehicle plate, and insurer code are required" 
        });
      }

      const authorization = await insuranceValidationService.requestTowingAuthorization(
        policyNumber,
        vehiclePlate,
        insurerCode as InsurerCode
      );

      res.json(authorization);
    } catch (error: any) {
      logSystem.error('Request authorization error', error);
      res.status(500).json({ message: "Failed to request towing authorization" });
    }
  });

  app.post("/api/insurance/submit-claim", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['admin', 'conductor'].includes(req.user!.userType)) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { insurerCode, claimData } = req.body;

      if (!insurerCode || !claimData) {
        return res.status(400).json({ message: "Insurer code and claim data are required" });
      }

      const result = await insuranceValidationService.submitTowingClaim(
        insurerCode as InsurerCode,
        claimData
      );

      res.json(result);
    } catch (error: any) {
      logSystem.error('Submit claim error', error);
      res.status(500).json({ message: "Failed to submit insurance claim" });
    }
  });

  app.post("/api/insurance/cancel-authorization", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { insurerCode, authorizationCode } = req.body;

      if (!insurerCode || !authorizationCode) {
        return res.status(400).json({ 
          message: "Insurer code and authorization code are required" 
        });
      }

      const cancelled = await insuranceValidationService.cancelAuthorization(
        insurerCode as InsurerCode,
        authorizationCode
      );

      res.json({ cancelled });
    } catch (error: any) {
      logSystem.error('Cancel authorization error', error);
      res.status(500).json({ message: "Failed to cancel authorization" });
    }
  });

  app.get("/api/insurance/health", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const healthResults = await insuranceValidationService.checkAllAdaptersHealth();
      const resultsObject: Record<string, any> = {};
      
      healthResults.forEach((health, code) => {
        resultsObject[code] = health;
      });

      res.json(resultsObject);
    } catch (error: any) {
      logSystem.error('Health check error', error);
      res.status(500).json({ message: "Failed to check adapter health" });
    }
  });

  // Document Management Endpoints
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Formato de archivo no permitido'));
      }
    },
  });

  // Chat media upload for negotiation
  const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB for chat media
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime', 'video/webm'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Formato de archivo no permitido. Solo imágenes y videos.'));
      }
    },
  });

  app.post("/api/chat/send-media", chatUpload.single('file'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { servicioId, contenido, tipoMensaje } = req.body;
      
      const servicio = await storage.getServicioById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (servicio.clienteId !== req.user!.id && servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to send messages in this service" });
      }

      let urlArchivo: string | undefined;
      let nombreArchivo: string | undefined;
      let detectedTipoMensaje = tipoMensaje || 'texto';

      if (req.file) {
        // Check storage availability before uploading
        if (!isStorageInitialized()) {
          return res.status(503).json({ 
            message: "El servicio de almacenamiento no está disponible temporalmente. Por favor intenta de nuevo.",
            retryable: true
          });
        }
        const fileName = `chat/${servicioId}/${Date.now()}-${req.file.originalname}`;
        const uploadResult = await uploadDocument({
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          userId: req.user!.id,
          documentType: 'chat_media',
        });
        urlArchivo = uploadResult.url;
        nombreArchivo = req.file.originalname;
        
        if (req.file.mimetype.startsWith('video/')) {
          detectedTipoMensaje = 'video';
        } else if (req.file.mimetype.startsWith('image/')) {
          detectedTipoMensaje = 'imagen';
        }
      }

      const mensaje = await storage.createMensajeChatWithMedia({
        servicioId,
        remitenteId: req.user!.id,
        contenido: contenido || '',
        tipoMensaje: detectedTipoMensaje,
        urlArchivo,
        nombreArchivo,
      });

      const recipientId = servicio.clienteId === req.user!.id ? servicio.conductorId! : servicio.clienteId;
      const senderName = `${req.user!.nombre} ${req.user!.apellido}`;
      await pushService.notifyNewMessage(recipientId, senderName, nombreArchivo ? `📎 ${nombreArchivo}` : contenido);

      if (serviceSessions.has(servicioId)) {
        const broadcast = JSON.stringify({
          type: 'new_chat_message',
          payload: mensaje,
        });
        serviceSessions.get(servicioId)!.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      res.json(mensaje);
    } catch (error: any) {
      logSystem.error('Send media message error', error);
      res.status(500).json({ message: "Failed to send media message" });
    }
  });

  // Upload document (driver only)
  app.post("/api/documents/upload", upload.single('document'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Solo conductores pueden subir documentos" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó ningún archivo" });
    }

    // Check storage availability BEFORE processing
    if (!isStorageInitialized()) {
      return res.status(503).json({ 
        message: "El servicio de almacenamiento no está disponible temporalmente. Por favor intenta de nuevo en unos segundos.",
        retryable: true
      });
    }

    try {
      const { tipoDocumento, fechaVencimiento } = req.body;
      
      if (!tipoDocumento) {
        return res.status(400).json({ message: "Tipo de documento es requerido" });
      }

      let conductor = await storage.getConductorByUserId(req.user!.id);
      let conductorCreated = false;
      if (!conductor) {
        // Auto-create conductor record if it doesn't exist (fixes Bug #1 - conductor not found)
        logSystem.info('Creating conductor record for user during document upload', { userId: req.user!.id });
        conductor = await storage.createConductor({
          userId: req.user!.id,
          licencia: '',
          placaGrua: '',
          marcaGrua: '',
          modeloGrua: '',
        });
        conductorCreated = true;
      }

      // Refresh session with updated user data if conductor was created (fixes stale session bug)
      if (conductorCreated) {
        const updatedUser = await storage.getUserById(req.user!.id);
        if (updatedUser) {
          await new Promise<void>((resolve, reject) => {
            req.login(updatedUser as any, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }

      // Document types that require expiration date
      const documentosConVencimiento = ['licencia', 'matricula'];
      
      // Parse expiration date if provided and document type supports it
      let validoHasta: Date | undefined = undefined;
      let expirationDateSource: 'manual' | 'ocr' | 'calculated' = 'manual';
      
      // For license documents, try OCR if no expiration date provided
      if (tipoDocumento === 'licencia' && !fechaVencimiento) {
        const { validateDriverLicense, isVerifikConfigured } = await import("./services/verifik-ocr");
        
        if (isVerifikConfigured()) {
          // Try to extract expiration date via OCR
          const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          const ocrResult = await validateDriverLicense(imageBase64);
          
          logSystem.info('License OCR for expiration date extraction', {
            success: ocrResult.success,
            expirationDate: ocrResult.expirationDate,
            expirationDateSource: ocrResult.expirationDateSource
          });
          
          // Check if OCR failed completely
          if (!ocrResult.success) {
            logSystem.warn('OCR failed for license', { error: ocrResult.error });
            return res.status(400).json({ 
              message: "No pudimos leer tu licencia automáticamente. Por favor, ingresa la fecha de vencimiento que aparece en tu licencia.",
              requiresManualDate: true,
              code: 'OCR_FAILED',
              errorType: 'ocr_error'
            });
          }
          
          if (ocrResult.success && ocrResult.expirationDate && ocrResult.expirationDateSource !== 'manual_required') {
            // Parse the OCR extracted date (formats: DD/MM/YYYY or YYYY-MM-DD)
            let parsedOcrDate: Date | undefined;
            const dateStr = ocrResult.expirationDate;
            
            // Try DD/MM/YYYY format first
            const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (dmyMatch) {
              parsedOcrDate = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
            } else {
              // Try ISO format
              parsedOcrDate = new Date(dateStr);
            }
            
            if (parsedOcrDate && !isNaN(parsedOcrDate.getTime())) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              if (parsedOcrDate <= today) {
                return res.status(400).json({ 
                  message: `Tu licencia venció el ${ocrResult.expirationDate}. Debes renovarla antes de poder registrarte como conductor.`,
                  requiresManualDate: false,
                  code: 'LICENSE_EXPIRED',
                  errorType: 'expired'
                });
              }
              
              validoHasta = parsedOcrDate;
              expirationDateSource = ocrResult.expirationDateSource === 'calculated_from_issue' ? 'calculated' : 'ocr';
              logSystem.info('Using OCR extracted expiration date', {
                expirationDate: ocrResult.expirationDate,
                source: expirationDateSource
              });
            }
          }
          
          // If OCR couldn't extract the date, require manual entry
          if (!validoHasta) {
            return res.status(400).json({ 
              message: "No pudimos detectar la fecha de vencimiento en tu licencia. Por favor, ingrésala manualmente mirando el documento.",
              requiresManualDate: true,
              code: 'DATE_NOT_DETECTED',
              errorType: 'manual_required'
            });
          }
        } else {
          // Verifik not configured, require manual date
          return res.status(400).json({ 
            message: "Por favor, ingresa la fecha de vencimiento de tu licencia.",
            requiresManualDate: true,
            code: 'VERIFIK_NOT_CONFIGURED',
            errorType: 'manual_required'
          });
        }
      } else if (fechaVencimiento && documentosConVencimiento.includes(tipoDocumento)) {
        // Manual date provided
        const parsedDate = new Date(fechaVencimiento);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ 
            message: "La fecha ingresada no es válida. Por favor, usa el formato correcto (día/mes/año).",
            code: 'INVALID_DATE_FORMAT',
            errorType: 'validation'
          });
        }
        // Validate that expiration date is in the future for all documents with expiration
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate <= today) {
          return res.status(400).json({ 
            message: "La fecha de vencimiento que ingresaste ya pasó. Por favor, ingresa una fecha futura.",
            code: 'DATE_IN_PAST',
            errorType: 'validation'
          });
        }
        validoHasta = parsedDate;
        expirationDateSource = 'manual';
      } else if (documentosConVencimiento.includes(tipoDocumento) && tipoDocumento !== 'licencia' && !fechaVencimiento) {
        // Non-license documents that require expiration date
        const documentName = tipoDocumento === 'matricula' ? 'la matrícula' : 'este documento';
        return res.status(400).json({ 
          message: `Por favor, ingresa la fecha de vencimiento de ${documentName}.`,
          requiresManualDate: true,
          code: 'DATE_REQUIRED',
          errorType: 'manual_required'
        });
      }
      
      // Upload to object storage (after validation)
      const uploadResult = await uploadDocument({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        userId: conductor.id,
        documentType: tipoDocumento,
      });

      // Save document metadata to database
      const documento = await storage.createDocumento({
        conductorId: conductor.id,
        tipo: tipoDocumento,
        url: uploadResult.key,
        nombreArchivo: uploadResult.fileName,
        tamanoArchivo: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        validoHasta: validoHasta,
      });

      logDocument.uploaded(documento.id, tipoDocumento, conductor.id);
      res.json(documento);
    } catch (error: any) {
      logSystem.error('Upload document error', error);
      res.status(500).json({ message: error.message || "Failed to upload document" });
    }
  });

  // Upload license document (driver verification flow)
  app.post("/api/driver/documents", upload.single('document'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Solo conductores pueden subir documentos" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó ningún archivo" });
    }

    // Check storage availability BEFORE processing
    if (!isStorageInitialized()) {
      return res.status(503).json({ 
        message: "El servicio de almacenamiento no está disponible temporalmente. Por favor intenta de nuevo en unos segundos.",
        retryable: true
      });
    }

    try {
      const { type } = req.body;
      
      if (!type || !['licencia', 'licencia_trasera'].includes(type)) {
        return res.status(400).json({ message: "Tipo de documento inválido. Debe ser 'licencia' o 'licencia_trasera'" });
      }

      let conductor = await storage.getConductorByUserId(req.user!.id);
      let conductorCreated = false;
      if (!conductor) {
        // Auto-create conductor record if it doesn't exist (for operators who registered without vehicle data)
        logSystem.info('Creating conductor record for user during document upload', { userId: req.user!.id });
        conductor = await storage.createConductor({
          userId: req.user!.id,
          licencia: '',
          placaGrua: '',
          marcaGrua: '',
          modeloGrua: '',
        });
        conductorCreated = true;
      }

      // Refresh session with updated user data if conductor was created (fixes stale session bug)
      if (conductorCreated) {
        const updatedUser = await storage.getUserById(req.user!.id);
        if (updatedUser) {
          await new Promise<void>((resolve, reject) => {
            req.login(updatedUser as any, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }

      // For front license, validate with Verifik before uploading
      let verifikValidation: { verified: boolean; error?: string; nombre?: string; apellido?: string; licenseNumber?: string } = { verified: false };
      
      if (type === 'licencia') {
        const { scanAndVerifyLicense, isVerifikConfigured } = await import("./services/verifik-ocr");
        
        if (isVerifikConfigured()) {
          // Convert buffer to base64 for Verifik
          const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          
          // Get user data for name comparison
          const user = await storage.getUserById(req.user!.id);
          const userNombre = user?.nombre;
          const userApellido = user?.apellido ?? undefined;
          
          const result = await scanAndVerifyLicense(imageBase64, userNombre, userApellido);
          
          logSystem.info('Verifik license validation result', {
            conductorId: conductor.id,
            success: result.success,
            verified: result.verified,
            nameMatch: result.nameMatch,
            confidenceScore: result.confidenceScore,
            licenseNumber: result.licenseNumber ? result.licenseNumber.slice(0, 4) + '***' : undefined
          });
          
          if (!result.success) {
            return res.status(400).json({ 
              message: result.error || "No se pudo validar la licencia con el servicio de verificación",
              verified: false
            });
          }
          
          if (!result.verified) {
            // License not verified - still save but warn
            logSystem.warn('License uploaded but not verified by Verifik', {
              conductorId: conductor.id,
              nameMatch: result.nameMatch,
              confidenceScore: result.confidenceScore,
              error: result.error
            });
          }
          
          verifikValidation = {
            verified: result.verified,
            error: result.error,
            nombre: result.nombre,
            apellido: result.apellido,
            licenseNumber: result.licenseNumber
          };
        } else {
          logSystem.warn('Verifik not configured, license requires manual verification', { conductorId: conductor.id });
        }
      }

      // Upload to object storage
      const uploadResult = await uploadDocument({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        userId: conductor.id,
        documentType: type,
      });

      // Update conductor record with the license URL
      const updateData: Record<string, any> = {};
      if (type === 'licencia') {
        updateData.licenciaFrontalUrl = uploadResult.url;
      } else {
        updateData.licenciaTraseraUrl = uploadResult.url;
      }

      // Get updated conductor to check if both license images are now present
      const updatedConductor = await storage.updateConductor(conductor.id, updateData);

      // Only set licenciaVerificada to true if:
      // 1. Both front and back are uploaded AND
      // 2. Front license was verified by Verifik (or Verifik is not configured)
      if (updatedConductor.licenciaFrontalUrl && updatedConductor.licenciaTraseraUrl) {
        const { isVerifikConfigured } = await import("./services/verifik-ocr");
        
        // If Verifik is configured, only verify if the front was validated
        // If Verifik is not configured, mark for manual review (don't auto-verify)
        if (isVerifikConfigured()) {
          if (type === 'licencia' && verifikValidation.verified) {
            // Front license was just verified
            await storage.updateConductor(conductor.id, { licenciaVerificada: true });
            logSystem.info('License verified via Verifik', { conductorId: conductor.id });
          } else if (type === 'licencia_trasera') {
            // For back upload, check if front license document was actually verified
            // Look for an approved front license document in the database
            const frontLicenseDoc = await storage.getDocumentoByConductorAndTipo(conductor.id, 'licencia');
            const frontIsVerified = frontLicenseDoc && frontLicenseDoc.estado === 'aprobado';
            
            if (frontIsVerified) {
              await storage.updateConductor(conductor.id, { licenciaVerificada: true });
              logSystem.info('License verified - both sides uploaded and front was validated', { conductorId: conductor.id });
            } else {
              logSystem.warn('Back license uploaded but front was not verified', { 
                conductorId: conductor.id,
                frontDocExists: !!frontLicenseDoc,
                frontDocEstado: frontLicenseDoc?.estado
              });
            }
          } else {
            logSystem.warn('License images uploaded but not verified - Verifik validation failed', { 
              conductorId: conductor.id,
              verifikError: verifikValidation.error 
            });
          }
        } else {
          // Verifik not configured - requires manual verification
          logSystem.info('License images uploaded - requires manual verification (Verifik not configured)', { conductorId: conductor.id });
        }
      }

      logDocument.uploaded(conductor.id, type, conductor.id);
      res.json({ 
        url: uploadResult.url,
        type: type,
        success: true,
        verified: verifikValidation.verified,
        verifikValidation: type === 'licencia' ? {
          nameMatch: verifikValidation.verified,
          extractedName: verifikValidation.nombre && verifikValidation.apellido 
            ? `${verifikValidation.nombre} ${verifikValidation.apellido}` 
            : undefined,
          licenseNumber: verifikValidation.licenseNumber
        } : undefined
      });
    } catch (error: any) {
      logSystem.error('Upload license document error', error);
      res.status(500).json({ message: error.message || "Failed to upload license document" });
    }
  });

  // Get my documents (driver)
  app.get("/api/documents/my-documents", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Solo conductores pueden ver sus documentos" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const documentos = await storage.getDocumentosByConductor(conductor.id);
      res.json(documentos);
    } catch (error: any) {
      logSystem.error('Get my documents error', error);
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  // Get documents by conductor ID (admin only)
  app.get("/api/documents/conductor/:conductorId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { conductorId } = req.params;
      const documentos = await storage.getDocumentosByConductor(conductorId);
      res.json(documentos);
    } catch (error: any) {
      logSystem.error('Get conductor documents error', error);
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  // Download document
  app.get("/api/documents/download/:documentId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { documentId } = req.params;
      const documento = await storage.getDocumentoById(documentId);

      if (!documento) {
        return res.status(404).json({ message: "Documento no encontrado" });
      }

      // Check authorization
      if (req.user!.userType === 'conductor') {
        const conductor = await storage.getConductorByUserId(req.user!.id);
        if (!conductor || conductor.id !== documento.conductorId) {
          return res.status(403).json({ message: "No autorizado" });
        }
      } else if (req.user!.userType !== 'admin') {
        return res.status(403).json({ message: "No autorizado" });
      }

      // Get document from object storage
      const fileBuffer = await getDocument(documento.url);
      if (!fileBuffer) {
        return res.status(404).json({ message: "Archivo no encontrado" });
      }

      res.setHeader('Content-Type', documento.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${documento.nombreArchivo}"`);
      res.send(fileBuffer);
    } catch (error: any) {
      logSystem.error('Download document error', error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:documentId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { documentId } = req.params;
      const documento = await storage.getDocumentoById(documentId);

      if (!documento) {
        return res.status(404).json({ message: "Documento no encontrado" });
      }

      // Check authorization
      if (req.user!.userType === 'conductor') {
        const conductor = await storage.getConductorByUserId(req.user!.id);
        if (!conductor || conductor.id !== documento.conductorId) {
          return res.status(403).json({ message: "No autorizado" });
        }
        if (documento.estado === 'aprobado') {
          return res.status(403).json({ message: "No puedes eliminar documentos aprobados" });
        }
        // Protect verified license documents from deletion
        if ((documento.tipo === 'licencia' || documento.tipo === 'licencia_trasera') && conductor.licenciaVerificada) {
          return res.status(403).json({ 
            message: "No puedes eliminar documentos de licencia verificados. Tu licencia ha sido validada por el sistema." 
          });
        }
      } else if (req.user!.userType !== 'admin') {
        return res.status(403).json({ message: "No autorizado" });
      }

      // Delete from object storage
      await storage.deleteDocumento(documentId);

      logDocument.deleted(documentId);
      res.json({ message: "Documento eliminado" });
    } catch (error: any) {
      logSystem.error('Delete document error', error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Update document status (admin only)
  app.put("/api/documents/:documentId/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { documentId } = req.params;
      const { estado, motivoRechazo } = req.body;

      if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        return res.status(400).json({ message: "Estado inválido" });
      }

      const documento = await storage.updateDocumentoStatus(
        documentId,
        estado,
        req.user!.id,
        motivoRechazo
      );

      if (!documento) {
        return res.status(404).json({ message: "Documento no encontrado" });
      }

      // Send push notification to document owner (driver or client)
      const estadoTexto = estado === 'aprobado' ? 'aprobado' : 'rechazado';
      const tipoLabel = documento.tipo === 'seguro_cliente' ? 'seguro' : documento.tipo;
      
      if (documento.conductorId) {
        // Document belongs to a driver
        const conductor = await storage.getConductorById(documento.conductorId);
        if (conductor) {
          const user = await storage.getUserById(conductor.userId);
          if (user) {
            await pushService.sendToUser(user.id, {
              title: `Documento ${estadoTexto}`,
              body: `Tu ${tipoLabel} ha sido ${estadoTexto}${motivoRechazo ? ': ' + motivoRechazo : ''}`,
              data: { type: 'document_review', documentId }
            });
          }
        }
      } else if (documento.usuarioId) {
        // Document belongs to a client (e.g., seguro_cliente)
        await pushService.sendToUser(documento.usuarioId, {
          title: `Documento ${estadoTexto}`,
          body: `Tu ${tipoLabel} ha sido ${estadoTexto}${motivoRechazo ? ': ' + motivoRechazo : ''}`,
          data: { type: 'document_review', documentId }
        });
      }

      logDocument.reviewed(req.user!.id, documentId, estado);
      res.json(documento);
    } catch (error: any) {
      logSystem.error('Update document status error', error);
      res.status(500).json({ message: "Failed to update document status" });
    }
  });

  // Get pending documents (admin only)
  app.get("/api/admin/documents/pending", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const documentos = await storage.getPendingDocuments();
      res.json(documentos);
    } catch (error: any) {
      logSystem.error('Get pending documents error', error);
      res.status(500).json({ message: "Failed to get pending documents" });
    }
  });

  // Get all documents (admin only)
  app.get("/api/admin/documents/all", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const documentos = await storage.getAllDocuments();
      res.json(documentos);
    } catch (error: any) {
      logSystem.error('Get all documents error', error);
      res.status(500).json({ message: "Failed to get all documents" });
    }
  });

  // ============================================
  // Document Validation System (Module 2.6)
  // ============================================

  // Get documents expiring within X days (admin only)
  app.get("/api/admin/documents/expiring", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const documentos = await storage.getDocumentosProximosAVencer(dias);
      res.json(documentos);
    } catch (error: any) {
      logSystem.error('Get expiring documents error', error);
      res.status(500).json({ message: "Failed to get expiring documents" });
    }
  });

  // Get expired documents (admin only)
  app.get("/api/admin/documents/expired", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const documentos = await storage.getDocumentosVencidos();
      res.json(documentos);
    } catch (error: any) {
      logSystem.error('Get expired documents error', error);
      res.status(500).json({ message: "Failed to get expired documents" });
    }
  });

  // Get drivers with expired documents (admin only)
  app.get("/api/admin/drivers/expired-documents", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductores = await storage.getConductoresConDocumentosVencidos();
      res.json(conductores);
    } catch (error: any) {
      logSystem.error('Get drivers with expired documents error', error);
      res.status(500).json({ message: "Failed to get drivers with expired documents" });
    }
  });

  // Manually trigger document validation check (admin only)
  app.post("/api/admin/documents/run-validation", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const result = await documentValidationService.forceRunCheck();
      logSystem.info('Manual document validation triggered by admin', { adminId: req.user!.id, result });
      res.json({
        message: "Validación de documentos ejecutada",
        ...result,
      });
    } catch (error: any) {
      logSystem.error('Manual document validation error', error);
      res.status(500).json({ message: "Failed to run document validation" });
    }
  });

  // Get document validation job status (admin only)
  app.get("/api/admin/documents/validation-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const status = await documentValidationService.getJobStatus();
      res.json(status);
    } catch (error: any) {
      logSystem.error('Get validation status error', error);
      res.status(500).json({ message: "Failed to get validation status" });
    }
  });

  // Suspend driver for expired documents (admin only)
  app.post("/api/admin/drivers/:driverId/suspend", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { driverId } = req.params;
      const { motivo } = req.body;
      
      if (!motivo) {
        return res.status(400).json({ message: "Motivo de suspensión es requerido" });
      }

      await storage.suspenderConductorPorDocumento(driverId, motivo);
      
      const conductor = await storage.getConductorById(driverId);
      if (conductor) {
        await pushService.sendToUser(conductor.userId, {
          title: 'Cuenta Suspendida',
          body: `Tu cuenta ha sido suspendida: ${motivo}`,
          data: { type: 'account_suspended', reason: 'admin_action' }
        });
      }
      
      logSystem.info('Driver suspended by admin', { adminId: req.user!.id, driverId, motivo });
      res.json({ message: "Conductor suspendido exitosamente" });
    } catch (error: any) {
      logSystem.error('Suspend driver error', error);
      res.status(500).json({ message: "Failed to suspend driver" });
    }
  });

  // Reactivate driver (admin only)
  app.post("/api/admin/drivers/:driverId/reactivate", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { driverId } = req.params;
      
      await storage.reactivarConductor(driverId);
      
      const conductor = await storage.getConductorById(driverId);
      if (conductor) {
        await pushService.sendToUser(conductor.userId, {
          title: 'Cuenta Reactivada',
          body: 'Tu cuenta ha sido reactivada. Ya puedes volver a aceptar servicios.',
          data: { type: 'account_reactivated' }
        });
      }
      
      logSystem.info('Driver reactivated by admin', { adminId: req.user!.id, driverId });
      res.json({ message: "Conductor reactivado exitosamente" });
    } catch (error: any) {
      logSystem.error('Reactivate driver error', error);
      res.status(500).json({ message: "Failed to reactivate driver" });
    }
  });

  // Driver document status summary (for driver dashboard)
  app.get("/api/drivers/me/document-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const summary = await storage.getDriverDocumentStatusSummary(conductor.id);
      res.json(summary);
    } catch (error: any) {
      logSystem.error('Get driver document status error', error);
      res.status(500).json({ message: "Failed to get document status" });
    }
  });

  // Client Insurance Document Management
  // Upload client insurance document (supports multiple insurances for multiple vehicles)
  app.post("/api/client/insurance", upload.single('document'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'cliente') {
      return res.status(403).json({ message: "Solo clientes pueden subir documentos de seguro" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó ningún archivo" });
    }

    // Check storage availability BEFORE processing
    if (!isStorageInitialized()) {
      return res.status(503).json({ 
        message: "El servicio de almacenamiento no está disponible temporalmente. Por favor intenta de nuevo en unos segundos.",
        retryable: true
      });
    }

    try {
      const { aseguradoraNombre, numeroPoliza, fechaVencimiento, vehiculoDescripcion } = req.body;
      
      if (!aseguradoraNombre || !numeroPoliza) {
        return res.status(400).json({ message: "Nombre de aseguradora y número de póliza son requeridos" });
      }

      // Upload to object storage
      const uploadResult = await uploadDocument({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        userId: req.user!.id,
        documentType: 'seguro_cliente',
      });

      // Parse expiration date if provided
      let validoHasta: Date | undefined = undefined;
      if (fechaVencimiento) {
        const parsedDate = new Date(fechaVencimiento);
        if (!isNaN(parsedDate.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (parsedDate <= today) {
            return res.status(400).json({ message: "La fecha de vencimiento debe ser una fecha futura" });
          }
          validoHasta = parsedDate;
        }
      }

      // Build document name with vehicle description if provided
      let nombreArchivo = `${aseguradoraNombre} - ${numeroPoliza}`;
      if (vehiculoDescripcion) {
        nombreArchivo = `${vehiculoDescripcion} - ${aseguradoraNombre} - ${numeroPoliza}`;
      }

      // Save document metadata to database
      const documento = await storage.createDocumento({
        usuarioId: req.user!.id,
        tipo: 'seguro_cliente',
        url: uploadResult.key,
        nombreArchivo,
        tamanoArchivo: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        validoHasta: validoHasta,
      });

      logDocument.uploaded(documento.id, 'seguro_cliente', req.user!.id);
      res.json(documento);
    } catch (error: any) {
      logSystem.error('Upload client insurance error', error);
      res.status(500).json({ message: error.message || "Error al subir documento de seguro" });
    }
  });

  // Get all client insurance documents
  app.get("/api/client/insurance", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'cliente') {
      return res.status(403).json({ message: "Solo clientes pueden ver su seguro" });
    }

    try {
      const documentos = await storage.getAllClientInsuranceDocuments(req.user!.id);
      res.json(documentos);
    } catch (error: any) {
      logSystem.error('Get client insurance error', error);
      res.status(500).json({ message: "Error al obtener documentos de seguro" });
    }
  });

  // Check if client has approved insurance (for payment method validation)
  app.get("/api/client/insurance/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'cliente') {
      return res.status(403).json({ message: "Solo clientes pueden verificar su seguro" });
    }

    try {
      const hasApprovedInsurance = await storage.hasApprovedClientInsurance(req.user!.id);
      const insuranceDocs = await storage.getAllClientInsuranceDocuments(req.user!.id);
      
      // Calculate overall status for backward compatibility
      // Priority: aprobado > pendiente > rechazado > null
      let insuranceStatus: 'pendiente' | 'aprobado' | 'rechazado' | null = null;
      if (insuranceDocs.length > 0) {
        if (insuranceDocs.some(d => d.estado === 'aprobado')) {
          insuranceStatus = 'aprobado';
        } else if (insuranceDocs.some(d => d.estado === 'pendiente')) {
          insuranceStatus = 'pendiente';
        } else if (insuranceDocs.some(d => d.estado === 'rechazado')) {
          insuranceStatus = 'rechazado';
        }
      }

      res.json({
        hasApprovedInsurance,
        // Backward compatibility fields
        insuranceStatus,
        insuranceDocument: insuranceDocs.length > 0 ? insuranceDocs[0] : null,
        // New array-based fields
        insuranceDocuments: insuranceDocs,
        totalDocuments: insuranceDocs.length,
        approvedCount: insuranceDocs.filter(d => d.estado === 'aprobado').length,
        pendingCount: insuranceDocs.filter(d => d.estado === 'pendiente').length,
        rejectedCount: insuranceDocs.filter(d => d.estado === 'rechazado').length,
      });
    } catch (error: any) {
      logSystem.error('Check client insurance status error', error);
      res.status(500).json({ message: "Error al verificar estado del seguro" });
    }
  });

  // Delete specific client insurance document by ID
  app.delete("/api/client/insurance/:documentId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'cliente') {
      return res.status(403).json({ message: "Solo clientes pueden eliminar su seguro" });
    }

    try {
      const { documentId } = req.params;
      const documento = await storage.getDocumentoById(documentId);
      
      if (!documento) {
        return res.status(404).json({ message: "No se encontró documento de seguro" });
      }

      // Verify the document belongs to this user
      if (documento.usuarioId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar este documento" });
      }

      // Verify it's a client insurance document
      if (documento.tipo !== 'seguro_cliente') {
        return res.status(400).json({ message: "Este documento no es un seguro de cliente" });
      }

      // Delete from object storage
      const { deleteDocument } = await import('./services/object-storage');
      await deleteDocument(documento.url);
      
      // Delete from database
      await storage.deleteDocumento(documento.id);
      
      logDocument.deleted(documento.id);
      res.json({ message: "Documento de seguro eliminado correctamente" });
    } catch (error: any) {
      logSystem.error('Delete client insurance error', error);
      res.status(500).json({ message: "Error al eliminar documento de seguro" });
    }
  });

  // Insurance Validation Endpoints (Module 1.9)
  app.get("/api/admin/servicios/pendientes-aseguradora", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicios = await storage.getServiciosPendientesAseguradora();
      res.json(servicios);
    } catch (error: any) {
      logSystem.error('Get pending insurance services error', error);
      res.status(500).json({ message: "Failed to get pending insurance services" });
    }
  });

  app.get("/api/admin/servicios/:id/documentos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { id } = req.params;
      const documentos = await storage.getDocumentosByServicioId(id);
      res.json(documentos);
    } catch (error: any) {
      logSystem.error('Get service documents error', error);
      res.status(500).json({ message: "Failed to get service documents" });
    }
  });

  app.post("/api/admin/servicios/:id/aseguradora/aprobar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { id } = req.params;
      
      const servicio = await storage.getServicioById(id);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.metodoPago !== 'aseguradora') {
        return res.status(400).json({ message: "Este servicio no es de aseguradora" });
      }

      if (servicio.aseguradoraEstado !== 'pendiente') {
        return res.status(400).json({ message: "Este servicio ya fue procesado" });
      }

      const updatedServicio = await storage.aprobarAseguradora(id, req.user!.id);
      
      logSystem.info('Insurance approved', { adminId: req.user!.id, servicioId: id, action: 'insurance_approved' });

      // Send push notification to client (with error handling)
      try {
        await pushService.sendToUser(servicio.clienteId, {
          title: 'Póliza de seguro aprobada',
          body: 'Tu solicitud de servicio con aseguradora ha sido aprobada. Los conductores ya pueden aceptar tu solicitud.',
          data: { type: 'insurance_approved', servicioId: id }
        });
      } catch (pushError) {
        logSystem.warn('Push notification failed for insurance approval', { servicioId: id, error: pushError });
      }

      res.json(updatedServicio);
    } catch (error: any) {
      logSystem.error('Approve insurance error', error);
      res.status(500).json({ message: "Failed to approve insurance" });
    }
  });

  app.post("/api/admin/servicios/:id/aseguradora/rechazar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { id } = req.params;
      const { motivoRechazo } = req.body;

      if (!motivoRechazo || motivoRechazo.trim() === '') {
        return res.status(400).json({ message: "Motivo de rechazo es requerido" });
      }
      
      const servicio = await storage.getServicioById(id);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.metodoPago !== 'aseguradora') {
        return res.status(400).json({ message: "Este servicio no es de aseguradora" });
      }

      if (servicio.aseguradoraEstado !== 'pendiente') {
        return res.status(400).json({ message: "Este servicio ya fue procesado" });
      }

      const updatedServicio = await storage.rechazarAseguradora(id, req.user!.id, motivoRechazo);
      
      logSystem.info('Insurance rejected', { adminId: req.user!.id, servicioId: id, action: 'insurance_rejected', reason: motivoRechazo });

      // Send push notification to client (with error handling)
      try {
        await pushService.sendToUser(servicio.clienteId, {
          title: 'Póliza de seguro rechazada',
          body: `Tu solicitud de servicio con aseguradora fue rechazada: ${motivoRechazo}`,
          data: { type: 'insurance_rejected', servicioId: id, reason: motivoRechazo }
        });
      } catch (pushError) {
        logSystem.warn('Push notification failed for insurance rejection', { servicioId: id, error: pushError });
      }

      res.json(updatedServicio);
    } catch (error: any) {
      logSystem.error('Reject insurance error', error);
      res.status(500).json({ message: "Failed to reject insurance" });
    }
  });

  // Get all services with insurance for admin stats
  app.get("/api/admin/servicios/aseguradora/all", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const allServicios = await storage.getAllServicios();
      const serviciosAseguradora = allServicios.filter(s => s.metodoPago === 'aseguradora');
      res.json(serviciosAseguradora);
    } catch (error: any) {
      logSystem.error('Get all insurance services error', error);
      res.status(500).json({ message: "Failed to get all insurance services" });
    }
  });

  app.post("/api/maps/calculate-route", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { origin, destination } = req.body;

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=full`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const durationMinutes = route.duration / 60;
        
        res.json({
          distanceKm: distanceKm,
          durationMinutes: durationMinutes,
          distanceText: `${distanceKm.toFixed(1)} km`,
          durationText: `${Math.round(durationMinutes)} min`,
          geometry: route.geometry,
        });
      } else {
        res.status(400).json({ message: "Failed to calculate route" });
      }
    } catch (error: any) {
      logSystem.error('Calculate route error', error);
      res.status(500).json({ message: "Failed to calculate route" });
    }
  });

  app.post("/api/maps/geocode", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { address } = req.body;

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=DO&limit=1`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        res.json({ lat, lng });
      } else {
        res.status(400).json({ message: "Failed to geocode address" });
      }
    } catch (error: any) {
      logSystem.error('Geocode error', error);
      res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  app.get("/api/maps/autocomplete", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { query, proximity } = req.query;

      if (!query || typeof query !== 'string' || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=DO&limit=5&types=address,poi,place,locality,neighborhood`;
      
      if (proximity && typeof proximity === 'string') {
        const [lng, lat] = proximity.split(',');
        if (lng && lat) {
          url += `&proximity=${lng},${lat}`;
        }
      }
      
      const response = await fetch(url);
      const data = await response.json();

      const suggestions = (data.features || []).map((feature: any) => ({
        id: feature.id,
        placeName: feature.place_name,
        text: feature.text,
        coordinates: {
          lat: feature.center[1],
          lng: feature.center[0],
        },
      }));

      res.json({ suggestions });
    } catch (error: any) {
      logSystem.error('Autocomplete error', error);
      res.status(500).json({ message: "Failed to get autocomplete suggestions" });
    }
  });

  // TODO: Implementar con Azul API
  app.post("/api/payments/create-intent", async (req: Request, res: Response) => {
    // Endpoint deshabilitado durante migración a Azul API
    return res.status(503).json({ 
      message: "El servicio de pagos está en proceso de migración. Por favor intente más tarde.",
      configured: false 
    });
  });

  // TODO: Implementar con Azul API
  app.post("/api/payments/create-setup-intent", async (req: Request, res: Response) => {
    // Endpoint deshabilitado durante migración a Azul API
    return res.status(503).json({ 
      message: "El servicio de pagos está en proceso de migración. Por favor intente más tarde.",
      configured: false 
    });
  });

  // ========================================
  // DRIVER BANK ACCOUNT ENDPOINTS
  // TODO: Implementar con Azul API para payouts
  // ========================================

  // Get list of available banks in Dominican Republic
  app.get("/api/drivers/banks", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can access this endpoint" });
    }

    // Static list of major banks in Dominican Republic
    const banks = [
      { id: 'banreservas', name: 'Banco de Reservas (Banreservas)' },
      { id: 'popular', name: 'Banco Popular Dominicano' },
      { id: 'bhd_leon', name: 'Banco BHD León' },
      { id: 'scotiabank', name: 'Scotiabank' },
      { id: 'banesco', name: 'Banesco' },
      { id: 'banco_santa_cruz', name: 'Banco Santa Cruz' },
      { id: 'asociacion_popular', name: 'Asociación Popular de Ahorros y Préstamos' },
      { id: 'banco_caribe', name: 'Banco Caribe' },
      { id: 'banco_lopez', name: 'Banco López de Haro' },
      { id: 'banco_vimenca', name: 'Banco Vimenca' },
      { id: 'banco_promerica', name: 'Banco Promerica' },
      { id: 'banco_ademi', name: 'Banco ADEMI' },
      { id: 'banco_lafise', name: 'Banco LAFISE' },
      { id: 'otro', name: 'Otro' },
    ];

    res.json({ banks });
  });

  // Register or update conductor bank account for payouts
  app.post("/api/drivers/bank-account", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can register bank accounts" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const { banco, tipoCuenta, numeroCuenta, nombreTitular, cedula } = req.body;

      if (!banco || !tipoCuenta || !numeroCuenta || !nombreTitular || !cedula) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
      }

      // Check if bank account already exists
      const existingAccount = await storage.getOperatorBankAccountByCondutorId(conductor.id);

      if (existingAccount) {
        // Update existing account
        const updated = await storage.updateOperatorBankAccount(existingAccount.id, {
          banco,
          tipoCuenta,
          numeroCuenta,
          nombreTitular,
          cedula,
          estado: 'pendiente_verificacion',
        });
        return res.json({ 
          success: true, 
          message: "Cuenta bancaria actualizada correctamente",
          bankAccount: updated 
        });
      }

      // Create new account
      const newAccount = await storage.createOperatorBankAccount({
        conductorId: conductor.id,
        banco,
        tipoCuenta,
        numeroCuenta,
        nombreTitular,
        cedula,
        estado: 'pendiente_verificacion',
      });

      res.json({ 
        success: true, 
        message: "Cuenta bancaria registrada correctamente",
        bankAccount: newAccount 
      });
    } catch (error: any) {
      logSystem.error('Register bank account error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Error al registrar la cuenta bancaria" });
    }
  });

  // Get conductor's bank account status
  app.get("/api/drivers/bank-account-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can access this endpoint" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const bankAccount = await storage.getOperatorBankAccountByCondutorId(conductor.id);

      res.json({
        hasBankAccount: !!bankAccount,
        payoutEnabled: bankAccount?.estado === 'activo',
        bankAccount: bankAccount ? {
          id: bankAccount.id,
          banco: bankAccount.banco,
          tipoCuenta: bankAccount.tipoCuenta,
          numeroCuenta: bankAccount.numeroCuenta,
          nombreTitular: bankAccount.nombreTitular,
          cedula: bankAccount.cedula,
          estado: bankAccount.estado,
          last4: bankAccount.numeroCuenta?.slice(-4),
        } : null,
        balance: {
          available: conductor.balanceDisponible || "0.00",
          pending: conductor.balancePendiente || "0.00",
        },
      });
    } catch (error: any) {
      logSystem.error('Get bank account status error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get bank account status" });
    }
  });

  // Request withdrawal (payout) to bank account
  // TODO: Implementar con Azul API cuando esté disponible
  app.post("/api/drivers/request-withdrawal", async (req: Request, res: Response) => {
    return res.status(503).json({ 
      message: "El servicio de retiros está en proceso de migración. Por favor intente más tarde.",
      configured: false 
    });
  });

  // Delete conductor's bank account
  app.delete("/api/drivers/bank-account", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can delete bank accounts" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const bankAccount = await storage.getOperatorBankAccountByCondutorId(conductor.id);
      if (!bankAccount) {
        return res.status(404).json({ message: "No bank account found" });
      }

      await storage.deleteOperatorBankAccount(bankAccount.id);
      res.json({ success: true, message: "Cuenta bancaria eliminada correctamente" });
    } catch (error: any) {
      logSystem.error('Delete bank account error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Error al eliminar la cuenta bancaria" });
    }
  });

  // Get conductor's withdrawal history
  app.get("/api/drivers/withdrawal-history", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can view withdrawal history" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const withdrawals = await storage.getOperatorWithdrawals(conductor.id);

      res.json({
        withdrawals: withdrawals.map(w => ({
          id: w.id,
          monto: w.monto,
          montoNeto: w.montoNeto,
          comision: w.comision,
          tipoRetiro: w.tipoRetiro,
          estado: w.estado,
          createdAt: w.createdAt,
          procesadoAt: w.procesadoAt,
        })),
        total: withdrawals.length,
      });
    } catch (error: any) {
      logSystem.error('Get withdrawal history error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get withdrawal history" });
    }
  });

  // Get next scheduled payout date
  app.get("/api/drivers/next-payout", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can view payout schedule" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const { getNextPayoutDate, SAME_DAY_WITHDRAWAL_COMMISSION, SCHEDULED_PAYOUT_DAYS } = await import('./services/scheduled-payouts');
      const nextPayoutDate = getNextPayoutDate();
      
      const payoutDayNames = SCHEDULED_PAYOUT_DAYS.map(d => 
        ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d]
      );

      res.json({
        nextPayoutDate: nextPayoutDate.toISOString(),
        nextPayoutFormatted: nextPayoutDate.toLocaleDateString('es-DO', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        scheduledDays: payoutDayNames,
        immediateWithdrawalCommission: SAME_DAY_WITHDRAWAL_COMMISSION,
        balanceDisponible: conductor.balanceDisponible,
        balancePendiente: conductor.balancePendiente,
      });
    } catch (error: any) {
      logSystem.error('Get next payout error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get payout schedule" });
    }
  });

  // Request immediate withdrawal (with commission)
  app.post("/api/drivers/immediate-withdrawal", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can request withdrawals" });
    }

    try {
      const { amount } = req.body;
      
      const parsedAmount = parseFloat(amount);
      if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "Monto inválido", success: false });
      }

      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found", success: false });
      }

      const { requestImmediateWithdrawal, SAME_DAY_WITHDRAWAL_COMMISSION } = await import('./services/scheduled-payouts');
      
      const availableBalance = parseFloat(conductor.balanceDisponible || '0');
      if (parsedAmount > availableBalance) {
        return res.status(400).json({ 
          message: `Saldo insuficiente. Disponible: RD$${availableBalance.toFixed(2)}`,
          success: false 
        });
      }

      if (parsedAmount < 500) {
        return res.status(400).json({ 
          message: "El monto mínimo de retiro es RD$500",
          success: false 
        });
      }

      if (parsedAmount <= SAME_DAY_WITHDRAWAL_COMMISSION) {
        return res.status(400).json({ 
          message: `El monto debe ser mayor a la comisión de RD$${SAME_DAY_WITHDRAWAL_COMMISSION}`,
          success: false 
        });
      }
      
      const result = await requestImmediateWithdrawal(conductor.id, parsedAmount);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: result.error || "Error al procesar el retiro",
          success: false 
        });
      }

      const netAmount = parsedAmount - SAME_DAY_WITHDRAWAL_COMMISSION;

      logSystem.info('Immediate withdrawal requested', {
        conductorId: conductor.id,
        amount: parsedAmount,
        commission: SAME_DAY_WITHDRAWAL_COMMISSION,
        netAmount,
        withdrawalId: result.withdrawalId,
      });

      res.json({
        success: true,
        message: "Retiro procesado exitosamente",
        withdrawalId: result.withdrawalId,
        amount: parsedAmount,
        commission: SAME_DAY_WITHDRAWAL_COMMISSION,
        netAmount,
        estimatedArrival: "Mismo día hábil",
      });
    } catch (error: any) {
      logSystem.error('Immediate withdrawal error', error, { userId: req.user!.id });
      res.status(500).json({ message: error.message || "Failed to process withdrawal", success: false });
    }
  });

  // Admin: Get all scheduled payouts
  app.get("/api/admin/scheduled-payouts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const payouts = await storage.getScheduledPayouts();
      
      res.json({
        payouts: payouts.map(p => ({
          id: p.id,
          fechaProgramada: p.fechaProgramada,
          fechaProcesado: p.fechaProcesado,
          estado: p.estado,
          totalPagos: p.totalPagos,
          montoTotal: p.montoTotal,
          notas: p.notas,
          createdAt: p.createdAt,
        })),
        total: payouts.length,
      });
    } catch (error: any) {
      logSystem.error('Get scheduled payouts error', error);
      res.status(500).json({ message: "Failed to get scheduled payouts" });
    }
  });

  // Admin: Get scheduled payout details with items
  app.get("/api/admin/scheduled-payouts/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const payout = await storage.getScheduledPayoutById(req.params.id);
      
      if (!payout) {
        return res.status(404).json({ message: "Scheduled payout not found" });
      }

      const items = await storage.getScheduledPayoutItems(payout.id);
      
      // Get conductor details for each item
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          const conductor = await storage.getConductorById(item.conductorId);
          const user = conductor ? await storage.getUserById(conductor.userId) : null;
          return {
            ...item,
            conductorName: user ? `${user.nombre} ${user.apellido}` : 'Unknown',
            conductorEmail: user?.email,
          };
        })
      );

      res.json({
        payout: {
          id: payout.id,
          fechaProgramada: payout.fechaProgramada,
          fechaProcesado: payout.fechaProcesado,
          estado: payout.estado,
          totalPagos: payout.totalPagos,
          montoTotal: payout.montoTotal,
          notas: payout.notas,
          createdAt: payout.createdAt,
        },
        items: itemsWithDetails,
      });
    } catch (error: any) {
      logSystem.error('Get scheduled payout details error', error);
      res.status(500).json({ message: "Failed to get scheduled payout details" });
    }
  });

  // ==================== ADMIN WITHDRAWALS MANAGEMENT (Manual Payouts) ====================

  // Admin: Get all withdrawals
  app.get("/api/admin/withdrawals", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { estado } = req.query;
      let withdrawals = await storage.getAllWithdrawals();
      
      if (estado && typeof estado === 'string') {
        withdrawals = withdrawals.filter(w => w.estado === estado);
      }

      const withdrawalsWithDetails = await Promise.all(
        withdrawals.map(async (w) => {
          const conductor = await storage.getConductorById(w.conductorId);
          const user = conductor ? await storage.getUserById(conductor.userId) : null;
          const bankAccount = conductor ? await storage.getOperatorBankAccountByCondutorId(conductor.id) : null;
          
          return {
            id: w.id,
            conductorId: w.conductorId,
            conductorName: user ? `${user.nombre} ${user.apellido}` : 'Desconocido',
            conductorEmail: user?.email,
            conductorPhone: user?.phone,
            monto: w.monto,
            montoNeto: w.montoNeto,
            comision: w.comision,
            tipoRetiro: w.tipoRetiro,
            estado: w.estado,
            errorMessage: w.errorMessage,
            procesadoAt: w.procesadoAt,
            createdAt: w.createdAt,
            bankAccount: bankAccount ? {
              banco: bankAccount.banco,
              tipoCuenta: bankAccount.tipoCuenta,
              numeroCuenta: bankAccount.numeroCuenta,
              nombreTitular: bankAccount.nombreTitular,
              cedula: bankAccount.cedula,
            } : null,
          };
        })
      );

      res.json({
        withdrawals: withdrawalsWithDetails,
        total: withdrawalsWithDetails.length,
        pendientes: withdrawalsWithDetails.filter(w => w.estado === 'pendiente').length,
      });
    } catch (error: any) {
      logSystem.error('Get all withdrawals error', error);
      res.status(500).json({ message: "Failed to get withdrawals" });
    }
  });

  // Admin: Process withdrawal manually (mark as paid via bank transfer)
  app.post("/api/admin/withdrawals/:id/process-manual", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { id } = req.params;
      const { referenciaBancaria, notas } = req.body;

      const withdrawal = await storage.getOperatorWithdrawal(id);
      if (!withdrawal) {
        return res.status(404).json({ message: "Retiro no encontrado" });
      }

      if (withdrawal.estado !== 'pendiente') {
        return res.status(400).json({ 
          message: `El retiro ya fue procesado con estado: ${withdrawal.estado}` 
        });
      }

      const conductor = await storage.getConductorById(withdrawal.conductorId);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      await storage.deductFromOperatorBalance(conductor.id, withdrawal.monto);

      const updatedWithdrawal = await storage.updateOperatorWithdrawal(id, {
        estado: 'pagado',
        azulPayoutReference: referenciaBancaria || `MANUAL-${Date.now()}`,
        azulPayoutStatus: 'COMPLETED_MANUAL',
        errorMessage: notas || 'Procesado manualmente por administrador',
        procesadoAt: new Date(),
      });

      const user = await storage.getUserById(conductor.userId);
      
      logSystem.info('Manual withdrawal processed', { 
        withdrawalId: id,
        conductorId: conductor.id,
        amount: withdrawal.monto,
        reference: referenciaBancaria,
        processedBy: req.user!.id,
      });

      res.json({
        success: true,
        message: "Retiro procesado exitosamente",
        withdrawal: {
          id: updatedWithdrawal.id,
          monto: updatedWithdrawal.monto,
          montoNeto: updatedWithdrawal.montoNeto,
          estado: updatedWithdrawal.estado,
          procesadoAt: updatedWithdrawal.procesadoAt,
        },
        conductor: {
          nombre: user ? `${user.nombre} ${user.apellido}` : 'Desconocido',
          email: user?.email,
        },
      });
    } catch (error: any) {
      logSystem.error('Process manual withdrawal error', error);
      res.status(500).json({ message: "Error al procesar el retiro" });
    }
  });

  // Admin: Reject withdrawal
  app.post("/api/admin/withdrawals/:id/reject", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const withdrawal = await storage.getOperatorWithdrawal(id);
      if (!withdrawal) {
        return res.status(404).json({ message: "Retiro no encontrado" });
      }

      if (withdrawal.estado !== 'pendiente') {
        return res.status(400).json({ 
          message: `El retiro ya fue procesado con estado: ${withdrawal.estado}` 
        });
      }

      const updatedWithdrawal = await storage.updateOperatorWithdrawal(id, {
        estado: 'fallido',
        errorMessage: motivo || 'Rechazado por administrador',
        procesadoAt: new Date(),
      });

      logSystem.info('Withdrawal rejected', { 
        withdrawalId: id,
        conductorId: withdrawal.conductorId,
        reason: motivo,
        rejectedBy: req.user!.id,
      });

      res.json({
        success: true,
        message: "Retiro rechazado",
        withdrawal: {
          id: updatedWithdrawal.id,
          estado: updatedWithdrawal.estado,
          errorMessage: updatedWithdrawal.errorMessage,
        },
      });
    } catch (error: any) {
      logSystem.error('Reject withdrawal error', error);
      res.status(500).json({ message: "Error al rechazar el retiro" });
    }
  });

  // ==================== CLIENT PAYMENT METHODS (AZUL) ====================

  // Get client's payment methods
  app.get("/api/client/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const methods = await storage.getClientPaymentMethodsByUserId(req.user!.id);
      res.json(methods);
    } catch (error: any) {
      logSystem.error('Get client payment methods error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get payment methods" });
    }
  });

  // Add a new payment method for client
  app.post("/api/client/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { cardNumber, cardExpiry, cardCVV, cardholderName } = req.body;

      if (!cardNumber || !cardExpiry || !cardCVV) {
        return res.status(400).json({ 
          message: "Datos de tarjeta incompletos (cardNumber, cardExpiry, cardCVV son requeridos)" 
        });
      }

      const cleanNumber = cardNumber.replace(/\s/g, '');
      const cleanExpiry = cardExpiry.replace('/', '');
      
      if (!/^\d{15,16}$/.test(cleanNumber)) {
        return res.status(400).json({ 
          message: "Número de tarjeta inválido. Debe contener 15-16 dígitos." 
        });
      }
      
      if (!/^\d{4}$/.test(cleanExpiry)) {
        return res.status(400).json({ 
          message: "Fecha de vencimiento inválida. Usa formato MMYY." 
        });
      }
      
      const month = parseInt(cleanExpiry.substring(0, 2), 10);
      const year = 2000 + parseInt(cleanExpiry.substring(2, 4), 10);
      if (month < 1 || month > 12) {
        return res.status(400).json({ 
          message: "Mes de vencimiento inválido." 
        });
      }
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return res.status(400).json({ 
          message: "La tarjeta ha expirado." 
        });
      }
      
      if (!/^\d{3,4}$/.test(cardCVV)) {
        return res.status(400).json({ 
          message: "CVV inválido. Debe contener 3-4 dígitos." 
        });
      }

      // Check if Azul is configured
      if (!AzulPaymentService.isConfigured()) {
        logSystem.warn('Azul API not configured for client payment method creation', { userId: req.user!.id });
        return res.status(503).json({ 
          message: "El servicio de pagos no está configurado. Contacte al administrador.",
          configured: false 
        });
      }

      // Convert expiry to Azul format (YYYYMM)
      const azulExpiration = `${year}${month.toString().padStart(2, '0')}`;

      // Tokenize card with Azul DataVault
      const tokenResult = await AzulPaymentService.createToken({
        cardNumber: cleanNumber,
        expiration: azulExpiration,
        cvc: cardCVV,
        cardHolderName: cardholderName || undefined,
      });

      if (!tokenResult.success || !tokenResult.tokenData) {
        logSystem.warn('Azul token creation failed for client', { 
          userId: req.user!.id, 
          isoCode: tokenResult.isoCode,
          message: tokenResult.responseMessage 
        });
        return res.status(400).json({ 
          message: tokenResult.responseMessage || "No se pudo tokenizar la tarjeta",
          errorCode: tokenResult.isoCode,
        });
      }

      // Save tokenized card to database
      const paymentMethod = await storage.createClientPaymentMethod({
        userId: req.user!.id,
        azulDataVaultToken: tokenResult.tokenData.dataVaultToken,
        cardBrand: tokenResult.tokenData.cardBrand,
        last4: tokenResult.tokenData.last4,
        expiryMonth: tokenResult.tokenData.expiryMonth,
        expiryYear: tokenResult.tokenData.expiryYear,
        cardholderName: cardholderName || null,
      });

      logSystem.info('Client payment method created with Azul', {
        userId: req.user!.id,
        paymentMethodId: paymentMethod.id,
        cardBrand: tokenResult.tokenData.cardBrand,
        last4: tokenResult.tokenData.last4,
      });

      res.status(201).json({
        success: true,
        message: "Tarjeta guardada correctamente",
        paymentMethod: {
          id: paymentMethod.id,
          cardBrand: paymentMethod.cardBrand,
          last4: paymentMethod.last4,
          expiryMonth: paymentMethod.expiryMonth,
          expiryYear: paymentMethod.expiryYear,
          isDefault: paymentMethod.isDefault,
        },
      });
    } catch (error: any) {
      logSystem.error('Create client payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: error.message || "Error al guardar la tarjeta" });
    }
  });

  // Set default payment method
  app.put("/api/client/payment-methods/:id/default", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      
      // Verify ownership
      const method = await storage.getClientPaymentMethodById(id);
      if (!method) {
        return res.status(404).json({ message: "Método de pago no encontrado" });
      }
      
      if (method.userId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado" });
      }

      const updatedMethod = await storage.setDefaultClientPaymentMethod(id, req.user!.id);

      logSystem.info('Client payment method set as default', { 
        userId: req.user!.id,
        paymentMethodId: id,
      });

      res.json({
        success: true,
        message: "Tarjeta predeterminada actualizada",
        paymentMethod: updatedMethod,
      });
    } catch (error: any) {
      logSystem.error('Set default payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Error al actualizar la tarjeta predeterminada" });
    }
  });

  // Delete payment method
  app.delete("/api/client/payment-methods/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      
      // Verify ownership
      const method = await storage.getClientPaymentMethodById(id);
      if (!method) {
        return res.status(404).json({ message: "Método de pago no encontrado" });
      }
      
      if (method.userId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado" });
      }

      // Delete token from Azul DataVault if configured
      if (method.azulDataVaultToken && AzulPaymentService.isConfigured()) {
        try {
          await AzulPaymentService.deleteToken(method.azulDataVaultToken);
        } catch (azulError) {
          logSystem.warn('Failed to delete Azul token, continuing with local deletion', { 
            userId: req.user!.id, 
            paymentMethodId: id,
            error: azulError 
          });
        }
      }

      await storage.deleteClientPaymentMethod(id);

      // If this was the default, set another one as default
      if (method.isDefault) {
        const remainingMethods = await storage.getClientPaymentMethodsByUserId(req.user!.id);
        if (remainingMethods.length > 0) {
          await storage.setDefaultClientPaymentMethod(remainingMethods[0].id, req.user!.id);
        }
      }

      logSystem.info('Client payment method deleted', { 
        userId: req.user!.id,
        paymentMethodId: id,
      });

      res.json({
        success: true,
        message: "Tarjeta eliminada correctamente",
      });
    } catch (error: any) {
      logSystem.error('Delete client payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Error al eliminar la tarjeta" });
    }
  });

  // Check payment service status (Azul API)
  app.get("/api/client/payment-service-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const isConfigured = AzulPaymentService.isConfigured();
      res.json({
        configured: isConfigured,
        gateway: 'azul',
        message: isConfigured 
          ? 'Servicio de pagos disponible' 
          : 'Servicio de pagos no configurado. Contacte al administrador.',
      });
    } catch (error: any) {
      logSystem.error('Get payment service status error', error);
      res.status(500).json({ message: "Error checking payment service status" });
    }
  });

  // ==================== END CLIENT PAYMENT METHODS ====================

  // ==================== OPERATOR PAYMENT METHODS (for debt payment) ====================

  // Get operator's payment methods
  app.get("/api/operator/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const methods = await storage.getOperatorPaymentMethodsByConductorId(conductor.id);
      res.json(methods);
    } catch (error: any) {
      logSystem.error('Get operator payment methods error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get payment methods" });
    }
  });

  // Add a new payment method for operator
  app.post("/api/operator/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const { cardNumber, cardExpiry, cardCVV, cardholderName } = req.body;

      if (!cardNumber || !cardExpiry || !cardCVV) {
        return res.status(400).json({ 
          message: "Datos de tarjeta incompletos (cardNumber, cardExpiry, cardCVV son requeridos)" 
        });
      }

      const cleanNumber = cardNumber.replace(/\s/g, '');
      const cleanExpiry = cardExpiry.replace('/', '');
      
      if (!/^\d{15,16}$/.test(cleanNumber)) {
        return res.status(400).json({ 
          message: "Número de tarjeta inválido. Debe contener 15-16 dígitos." 
        });
      }
      
      if (!/^\d{4}$/.test(cleanExpiry)) {
        return res.status(400).json({ 
          message: "Fecha de vencimiento inválida. Usa formato MMYY." 
        });
      }
      
      const month = parseInt(cleanExpiry.substring(0, 2), 10);
      const year = 2000 + parseInt(cleanExpiry.substring(2, 4), 10);
      if (month < 1 || month > 12) {
        return res.status(400).json({ 
          message: "Mes de vencimiento inválido." 
        });
      }
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return res.status(400).json({ 
          message: "La tarjeta ha expirado." 
        });
      }
      
      if (!/^\d{3,4}$/.test(cardCVV)) {
        return res.status(400).json({ 
          message: "CVV inválido. Debe contener 3-4 dígitos." 
        });
      }

      // Check if Azul is configured
      if (!AzulPaymentService.isConfigured()) {
        logSystem.warn('Azul API not configured for operator payment method creation', { conductorId: conductor.id });
        return res.status(503).json({ 
          message: "El servicio de pagos no está configurado. Contacte al administrador.",
          configured: false 
        });
      }

      // Convert expiry to Azul format (YYYYMM)
      const azulExpiration = `${year}${month.toString().padStart(2, '0')}`;

      // Tokenize card with Azul DataVault
      const tokenResult = await AzulPaymentService.createToken({
        cardNumber: cleanNumber,
        expiration: azulExpiration,
        cvc: cardCVV,
        cardHolderName: cardholderName || undefined,
      });

      if (!tokenResult.success || !tokenResult.tokenData) {
        logSystem.warn('Azul token creation failed for operator', { 
          conductorId: conductor.id, 
          isoCode: tokenResult.isoCode,
          message: tokenResult.responseMessage 
        });
        return res.status(400).json({ 
          message: tokenResult.responseMessage || "No se pudo tokenizar la tarjeta",
          errorCode: tokenResult.isoCode,
        });
      }

      // Save tokenized card to database
      const paymentMethod = await storage.createOperatorPaymentMethod({
        conductorId: conductor.id,
        azulDataVaultToken: tokenResult.tokenData.dataVaultToken,
        cardBrand: tokenResult.tokenData.cardBrand,
        last4: tokenResult.tokenData.last4,
        expiryMonth: tokenResult.tokenData.expiryMonth,
        expiryYear: tokenResult.tokenData.expiryYear,
        cardholderName: cardholderName || null,
      });

      logSystem.info('Operator payment method created with Azul', {
        conductorId: conductor.id,
        paymentMethodId: paymentMethod.id,
        cardBrand: tokenResult.tokenData.cardBrand,
        last4: tokenResult.tokenData.last4,
      });

      res.status(201).json({
        success: true,
        message: "Tarjeta guardada correctamente",
        paymentMethod: {
          id: paymentMethod.id,
          cardBrand: paymentMethod.cardBrand,
          last4: paymentMethod.last4,
          expiryMonth: paymentMethod.expiryMonth,
          expiryYear: paymentMethod.expiryYear,
          isDefault: paymentMethod.isDefault,
        },
      });
    } catch (error: any) {
      logSystem.error('Create operator payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: error.message || "Error al guardar la tarjeta" });
    }
  });

  // Set default payment method for operator
  app.put("/api/operator/payment-methods/:id/default", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const { id } = req.params;
      
      // Verify ownership
      const method = await storage.getOperatorPaymentMethodById(id);
      if (!method) {
        return res.status(404).json({ message: "Método de pago no encontrado" });
      }
      
      if (method.conductorId !== conductor.id) {
        return res.status(403).json({ message: "No autorizado" });
      }

      const updatedMethod = await storage.setDefaultOperatorPaymentMethod(id, conductor.id);

      logSystem.info('Operator payment method set as default', { 
        conductorId: conductor.id,
        paymentMethodId: id,
      });

      res.json({
        success: true,
        message: "Tarjeta predeterminada actualizada",
        paymentMethod: updatedMethod,
      });
    } catch (error: any) {
      logSystem.error('Set default operator payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Error al actualizar la tarjeta predeterminada" });
    }
  });

  // Delete operator payment method
  app.delete("/api/operator/payment-methods/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const { id } = req.params;
      
      // Verify ownership
      const method = await storage.getOperatorPaymentMethodById(id);
      if (!method) {
        return res.status(404).json({ message: "Método de pago no encontrado" });
      }
      
      if (method.conductorId !== conductor.id) {
        return res.status(403).json({ message: "No autorizado" });
      }

      // Delete token from Azul DataVault if configured
      if (method.azulDataVaultToken && AzulPaymentService.isConfigured()) {
        try {
          await AzulPaymentService.deleteToken(method.azulDataVaultToken);
        } catch (azulError) {
          logSystem.warn('Failed to delete Azul token for operator, continuing with local deletion', { 
            conductorId: conductor.id, 
            paymentMethodId: id,
            error: azulError 
          });
        }
      }

      await storage.deleteOperatorPaymentMethod(id);

      // If this was the default, set another one as default
      if (method.isDefault) {
        const remainingMethods = await storage.getOperatorPaymentMethodsByConductorId(conductor.id);
        if (remainingMethods.length > 0) {
          await storage.setDefaultOperatorPaymentMethod(remainingMethods[0].id, conductor.id);
        }
      }

      logSystem.info('Operator payment method deleted', { 
        conductorId: conductor.id,
        paymentMethodId: id,
      });

      res.json({
        success: true,
        message: "Tarjeta eliminada correctamente",
      });
    } catch (error: any) {
      logSystem.error('Delete operator payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Error al eliminar la tarjeta" });
    }
  });

  // Pay debt with saved card using Azul
  app.post("/api/operator/pay-debt-with-card", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor profile not found" });
      }

      const { paymentMethodId, amount } = req.body;

      if (!paymentMethodId || !amount) {
        return res.status(400).json({ 
          message: "Se requiere el método de pago y el monto" 
        });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ 
          message: "Monto inválido" 
        });
      }

      // Check if Azul is configured
      if (!AzulPaymentService.isConfigured()) {
        logSystem.warn('Azul API not configured for debt payment', { conductorId: conductor.id });
        return res.status(503).json({ 
          message: "El servicio de pagos no está configurado. Contacte al administrador.",
          configured: false 
        });
      }

      // Verify payment method ownership
      const paymentMethod = await storage.getOperatorPaymentMethodById(paymentMethodId);
      if (!paymentMethod) {
        return res.status(404).json({ message: "Método de pago no encontrado" });
      }
      
      if (paymentMethod.conductorId !== conductor.id) {
        return res.status(403).json({ message: "No autorizado" });
      }

      // Get wallet and verify debt
      const wallet = await WalletService.getWallet(conductor.id);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet no encontrado" });
      }

      const totalDebt = parseFloat(wallet.totalDebt);
      if (totalDebt <= 0) {
        return res.status(400).json({ message: "No tienes deuda pendiente" });
      }

      const paymentAmount = Math.min(parsedAmount, totalDebt);
      const customOrderId = `DEBT-${conductor.id}-${Date.now()}`;

      // Process payment with Azul
      const paymentResult = await AzulPaymentService.processPaymentWithToken(
        paymentMethod.azulDataVaultToken,
        {
          amount: AzulPaymentService.toAzulAmount(paymentAmount),
          customOrderId,
          orderDescription: `Pago de deuda - Operador ${conductor.id}`,
        }
      );

      if (!paymentResult.success) {
        logSystem.error('Operator debt payment failed', null, {
          conductorId: conductor.id,
          amount: paymentAmount,
          isoCode: paymentResult.isoCode,
          message: paymentResult.responseMessage,
        });
        return res.status(400).json({ 
          message: paymentResult.responseMessage || "Error al procesar el pago",
          errorCode: paymentResult.isoCode,
        });
      }

      // Update wallet to reduce debt
      await WalletService.payDebt(conductor.id, paymentAmount, {
        paymentMethod: 'azul_card',
        azulOrderId: paymentResult.azulOrderId,
        authorizationCode: paymentResult.authorizationCode,
        customOrderId,
      });

      logSystem.info('Operator debt paid with Azul', {
        conductorId: conductor.id,
        amount: paymentAmount,
        azulOrderId: paymentResult.azulOrderId,
        remainingDebt: totalDebt - paymentAmount,
      });

      res.json({
        success: true,
        message: "Pago procesado exitosamente",
        payment: {
          amount: paymentAmount,
          azulOrderId: paymentResult.azulOrderId,
          authorizationCode: paymentResult.authorizationCode,
          remainingDebt: Math.max(0, totalDebt - paymentAmount),
        },
      });
    } catch (error: any) {
      logSystem.error('Pay debt with card error', error, { userId: req.user!.id });
      res.status(500).json({ message: error.message || "Error al procesar el pago" });
    }
  });

  // ==================== END OPERATOR PAYMENT METHODS ====================

  // Payment status polling for clients
  app.get("/api/payments/:servicioId/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const servicio = await storage.getServicioById(req.params.servicioId);

      if (!servicio) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (req.user!.userType !== 'admin' && 
          servicio.clienteId !== req.user!.id && 
          servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to view payment status" });
      }

      const comision = await storage.getComisionByServicioId(servicio.id);

      let paymentStatus = 'unknown';
      if (servicio.metodoPago === 'efectivo') {
        paymentStatus = servicio.estado === 'completado' ? 'paid_cash' : 'pending_cash';
      } else if (servicio.metodoPago === 'tarjeta') {
        // TODO: Actualizar cuando se integre Azul API
        paymentStatus = comision ? 'paid_card' : 'awaiting_payment';
      } else if (servicio.metodoPago === 'aseguradora') {
        paymentStatus = servicio.aseguradoraEstado === 'aprobado' ? 'approved_insurance' : 
                        servicio.aseguradoraEstado === 'rechazado' ? 'rejected_insurance' : 'pending_insurance';
      }

      res.json({
        servicioId: servicio.id,
        metodoPago: servicio.metodoPago,
        estado: servicio.estado,
        costoTotal: servicio.costoTotal,
        paymentStatus,
        comision: comision ? {
          id: comision.id,
          montoTotal: comision.montoTotal,
          montoOperador: comision.montoOperador,
          montoEmpresa: comision.montoEmpresa,
          estadoPagoOperador: comision.estadoPagoOperador,
          estadoPagoEmpresa: comision.estadoPagoEmpresa,
        } : null,
      });
    } catch (error: any) {
      logSystem.error('Get payment status error', error, { servicioId: req.params.servicioId });
      res.status(500).json({ message: "Failed to get payment status" });
    }
  });

  // TODO: Implementar payout automático con Azul API
  // Por ahora usar el endpoint mark-paid para pagos manuales

  // Admin: Mark commission as paid manually (for cash or bank transfers)
  app.post("/api/admin/comisiones/:id/mark-paid", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user!.userType !== 'admin') {
      return res.status(403).json({ message: "Forbidden: admin access required" });
    }

    try {
      const { tipo, notas, referencia } = req.body;
      
      if (!tipo || (tipo !== 'operador' && tipo !== 'empresa')) {
        return res.status(400).json({ message: "Valid tipo (operador/empresa) is required" });
      }

      const comision = await storage.getComisionById(req.params.id);
      if (!comision) {
        return res.status(404).json({ message: "Commission not found" });
      }

      const updatedComision = await storage.marcarComisionPagada(req.params.id, tipo, referencia);
      
      if (notas) {
        await storage.updateComisionNotas(req.params.id, notas);
      }

      logSystem.info('Admin marked commission as paid', {
        comisionId: req.params.id,
        tipo,
        referencia,
        adminId: req.user!.id,
      });

      res.json({
        success: true,
        comision: updatedComision,
      });
    } catch (error: any) {
      logSystem.error('Mark commission paid error', error, { comisionId: req.params.id });
      res.status(500).json({ message: "Failed to mark commission as paid" });
    }
  });

  // Conductor: Get my pending commissions
  app.get("/api/drivers/mis-comisiones", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can access this endpoint" });
    }

    try {
      const comisiones = await storage.getComisionesByConductor(req.user!.id);
      
      const resumen = {
        total: comisiones.length,
        pendientes: comisiones.filter(c => c.estadoPagoOperador === 'pendiente').length,
        pagadas: comisiones.filter(c => c.estadoPagoOperador === 'pagado').length,
        montoTotalPendiente: comisiones
          .filter(c => c.estadoPagoOperador === 'pendiente')
          .reduce((sum, c) => sum + parseFloat(c.montoOperador), 0)
          .toFixed(2),
        montoTotalPagado: comisiones
          .filter(c => c.estadoPagoOperador === 'pagado')
          .reduce((sum, c) => sum + parseFloat(c.montoOperador), 0)
          .toFixed(2),
      };

      res.json({
        resumen,
        comisiones,
      });
    } catch (error: any) {
      logSystem.error('Get driver commissions error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get commissions" });
    }
  });

  app.get("/api/comisiones", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user!.userType !== 'admin') {
      return res.status(403).json({ message: "Forbidden: admin access required" });
    }

    try {
      const comisiones = await storage.getAllComisiones();
      res.json(comisiones);
    } catch (error: any) {
      logSystem.error('Get commissions error', error);
      res.status(500).json({ message: "Failed to get commissions" });
    }
  });

  app.get("/api/comisiones/pendientes/:tipo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user!.userType !== 'admin') {
      return res.status(403).json({ message: "Forbidden: admin access required" });
    }

    try {
      const { tipo } = req.params;
      
      if (tipo !== 'operador' && tipo !== 'empresa') {
        return res.status(400).json({ message: "Invalid tipo parameter" });
      }

      const comisiones = await storage.getComisionesByEstado('pendiente', tipo);
      res.json(comisiones);
    } catch (error: any) {
      logSystem.error('Get pending commissions error', error);
      res.status(500).json({ message: "Failed to get pending commissions" });
    }
  });

  app.put("/api/comisiones/:id/pagar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user!.userType !== 'admin') {
      return res.status(403).json({ message: "Forbidden: admin access required" });
    }

    try {
      const { tipo, referenciaPago } = req.body;
      
      if (!tipo || (tipo !== 'operador' && tipo !== 'empresa')) {
        return res.status(400).json({ message: "Valid tipo (operador/empresa) is required" });
      }

      const comision = await storage.marcarComisionPagada(req.params.id, tipo, referenciaPago);
      res.json(comision);
    } catch (error: any) {
      logSystem.error('Mark commission paid error', error);
      res.status(500).json({ message: "Failed to mark commission as paid" });
    }
  });

  app.get("/api/servicios/:id/recibo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const servicio = await storage.getServicioById(req.params.id);

      if (!servicio) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (req.user!.userType !== 'admin' && 
          servicio.clienteId !== req.user!.id && 
          servicio.conductorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=recibo-${servicio.id}.pdf`);

      doc.pipe(res);

      doc.fontSize(20).text('Grúa RD', { align: 'center' });
      doc.fontSize(16).text('Recibo de Servicio', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Número de Servicio: ${servicio.id}`);
      doc.text(`Fecha: ${new Date(servicio.createdAt).toLocaleDateString('es-DO')}`);
      doc.moveDown();

      doc.text(`Cliente: ${servicio.cliente?.nombre} ${servicio.cliente?.apellido}`);
      if (servicio.conductor) {
        doc.text(`Conductor: ${servicio.conductor.nombre} ${servicio.conductor.apellido}`);
      }
      doc.moveDown();

      doc.text(`Origen: ${servicio.origenDireccion}`);
      doc.text(`Destino: ${servicio.destinoDireccion}`);
      doc.text(`Distancia: ${servicio.distanciaKm} km`);
      doc.moveDown();

      doc.font('Helvetica-Bold').fontSize(14).text(`Costo Total: RD$ ${parseFloat(servicio.costoTotal).toFixed(2)}`);
      doc.font('Helvetica').fontSize(12).text(`Método de Pago: ${servicio.metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}`);
      if ((servicio as any).transactionId) {
        doc.text(`ID de Transacción: ${(servicio as any).transactionId}`);
      }
      doc.moveDown();

      doc.fontSize(10).text('Información Fiscal', { underline: true });
      doc.text('GruaRD - República Dominicana');
      doc.text('Este documento es válido como comprobante de pago');

      doc.end();
    } catch (error: any) {
      logSystem.error('Generate receipt error', error);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });

  // ========================================
  // TODO: Implementar con Azul API - PAYOUT ACCOUNT ENDPOINTS
  // ========================================
  // Note: Driver bank account registration and payout functionality has been moved to:
  // - POST /api/drivers/bank-account - Register bank account
  // - GET /api/drivers/bank-account-status - Get bank account status
  // - POST /api/drivers/request-withdrawal - Request withdrawal
  // - DELETE /api/drivers/bank-account - Delete bank account
  // - GET /api/drivers/banks - Get list of available banks

  // Legacy endpoint - returns 503 until Azul API is implemented
  app.post("/api/drivers/payout-onboarding", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can access this endpoint" });
    }

    // TODO: Implementar con Azul API
    return res.status(503).json({ 
      message: "El servicio de pagos está en proceso de actualización. Por favor, intente más tarde.",
      configured: false 
    });
  });

  app.get("/api/drivers/payout-account-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can access this endpoint" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      // TODO: Actualizar con campos de Azul API cuando esté implementado
      // Bank account info is stored in operatorBankAccounts table, not on conductor
      const bankAccount = await storage.getOperatorBankAccountByCondutorId?.(conductor.id);
      res.json({
        hasBankAccount: !!bankAccount,
        payoutEnabled: (conductor as any).payoutEnabled || false,
        bankAccount: bankAccount ? {
          bankName: bankAccount.banco,
          accountType: bankAccount.tipoCuenta,
          last4: bankAccount.numeroCuenta?.slice(-4),
          accountHolder: bankAccount.nombreTitular,
        } : null,
        balance: {
          available: conductor.balanceDisponible || "0.00",
          pending: conductor.balancePendiente || "0.00",
        },
      });
    } catch (error: any) {
      logSystem.error('Get payout account status error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get account status" });
    }
  });

  // ========================================
  // PAYMENT METHODS ENDPOINTS - Delegated to user-type specific endpoints
  // ========================================
  // Clients should use /api/client/payment-methods
  // Operators should use /api/operator/payment-methods

  app.post("/api/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userType = req.user!.userType;
    if (userType === 'cliente') {
      return res.status(308).json({ 
        message: "Use el endpoint /api/client/payment-methods para agregar tarjetas",
        redirectTo: "/api/client/payment-methods"
      });
    } else if (userType === 'conductor') {
      return res.status(308).json({ 
        message: "Use el endpoint /api/operator/payment-methods para agregar tarjetas",
        redirectTo: "/api/operator/payment-methods"
      });
    }
    
    return res.status(403).json({ message: "Tipo de usuario no válido para métodos de pago" });
  });

  app.get("/api/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userType = req.user!.userType;
      
      if (userType === 'cliente') {
        const methods = await storage.getClientPaymentMethodsByUserId(req.user!.id);
        res.json(methods.map(m => ({
          id: m.id,
          cardBrand: m.cardBrand,
          lastFourDigits: m.last4,
          expirationMonth: m.expiryMonth,
          expirationYear: m.expiryYear,
          isDefault: m.isDefault,
          createdAt: m.createdAt,
        })));
      } else if (userType === 'conductor') {
        const conductor = await storage.getConductorByUserId(req.user!.id);
        if (!conductor) {
          return res.status(404).json({ message: "Conductor profile not found" });
        }
        const methods = await storage.getOperatorPaymentMethodsByConductorId(conductor.id);
        res.json(methods.map(m => ({
          id: m.id,
          cardBrand: m.cardBrand,
          lastFourDigits: m.last4,
          expirationMonth: m.expiryMonth,
          expirationYear: m.expiryYear,
          isDefault: m.isDefault,
          createdAt: m.createdAt,
        })));
      } else {
        return res.status(403).json({ message: "Tipo de usuario no válido para métodos de pago" });
      }
    } catch (error: any) {
      logSystem.error('Get payment methods error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get payment methods" });
    }
  });

  app.delete("/api/payment-methods/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userType = req.user!.userType;
      
      if (userType === 'cliente') {
        const method = await storage.getClientPaymentMethodById(req.params.id);
        if (!method || method.userId !== req.user!.id) {
          return res.status(404).json({ message: "Payment method not found" });
        }
        await storage.deleteClientPaymentMethod(req.params.id);
        if (method.isDefault) {
          const remainingMethods = await storage.getClientPaymentMethodsByUserId(req.user!.id);
          if (remainingMethods.length > 0) {
            await storage.setDefaultClientPaymentMethod(remainingMethods[0].id, req.user!.id);
          }
        }
      } else if (userType === 'conductor') {
        const conductor = await storage.getConductorByUserId(req.user!.id);
        if (!conductor) {
          return res.status(404).json({ message: "Conductor profile not found" });
        }
        const method = await storage.getOperatorPaymentMethodById(req.params.id);
        if (!method || method.conductorId !== conductor.id) {
          return res.status(404).json({ message: "Payment method not found" });
        }
        await storage.deleteOperatorPaymentMethod(req.params.id);
        if (method.isDefault) {
          const remainingMethods = await storage.getOperatorPaymentMethodsByConductorId(conductor.id);
          if (remainingMethods.length > 0) {
            await storage.setDefaultOperatorPaymentMethod(remainingMethods[0].id, conductor.id);
          }
        }
      } else {
        return res.status(403).json({ message: "Tipo de usuario no válido para métodos de pago" });
      }

      logSystem.info('Payment method deleted via generic endpoint', { 
        userId: req.user!.id,
        methodId: req.params.id 
      });

      res.json({ success: true });
    } catch (error: any) {
      logSystem.error('Delete payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  app.put("/api/payment-methods/:id/default", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userType = req.user!.userType;
      
      if (userType === 'cliente') {
        const method = await storage.getClientPaymentMethodById(req.params.id);
        if (!method || method.userId !== req.user!.id) {
          return res.status(404).json({ message: "Payment method not found" });
        }
        await storage.setDefaultClientPaymentMethod(req.params.id, req.user!.id);
      } else if (userType === 'conductor') {
        const conductor = await storage.getConductorByUserId(req.user!.id);
        if (!conductor) {
          return res.status(404).json({ message: "Conductor profile not found" });
        }
        const method = await storage.getOperatorPaymentMethodById(req.params.id);
        if (!method || method.conductorId !== conductor.id) {
          return res.status(404).json({ message: "Payment method not found" });
        }
        await storage.setDefaultOperatorPaymentMethod(req.params.id, conductor.id);
      } else {
        return res.status(403).json({ message: "Tipo de usuario no válido para métodos de pago" });
      }

      logSystem.info('Payment method set as default via generic endpoint', { 
        userId: req.user!.id,
        methodId: req.params.id 
      });

      res.json({ success: true });
    } catch (error: any) {
      logSystem.error('Set default payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to set default payment method" });
    }
  });

  // ============================================
  // ASEGURADORA PORTAL ENDPOINTS
  // ============================================

  // Get current aseguradora profile
  app.get("/api/aseguradora/perfil", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }
      res.json(aseguradora);
    } catch (error: any) {
      logSystem.error('Get insurance profile error', error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Update aseguradora profile
  app.put("/api/aseguradora/perfil", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    const validationResult = updateAseguradoraPerfilSchema.safeParse(req.body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return res.status(400).json({
        message: firstError.message || "Datos de perfil inválidos",
        errors: validationResult.error.errors
      });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const { telefono, direccion, emailContacto, personaContacto } = validationResult.data;
      const updated = await storage.updateAseguradora(aseguradora.id, {
        telefono,
        direccion,
        emailContacto,
        personaContacto,
      });
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Update insurance profile error', error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get aseguradora dashboard stats
  app.get("/api/aseguradora/dashboard", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const { startDate, endDate } = req.query;
      const resumen = await storage.getResumenAseguradora(
        aseguradora.id,
        startDate as string,
        endDate as string
      );
      res.json(resumen);
    } catch (error: any) {
      logSystem.error('Get insurance dashboard error', error);
      res.status(500).json({ message: "Failed to get dashboard" });
    }
  });

  // Get pending services for aseguradora approval
  app.get("/api/aseguradora/servicios/pendientes", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const servicios = await storage.getServiciosAseguradoraPendientes(aseguradora.id);
      res.json(servicios);
    } catch (error: any) {
      logSystem.error('Get pending insurance services error', error);
      res.status(500).json({ message: "Failed to get pending services" });
    }
  });

  // Get all services for aseguradora
  app.get("/api/aseguradora/servicios", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const servicios = await storage.getServiciosAseguradoraByAseguradoraId(aseguradora.id);
      res.json(servicios);
    } catch (error: any) {
      logSystem.error('Get insurance services error', error);
      res.status(500).json({ message: "Failed to get services" });
    }
  });

  // Get single service for aseguradora
  app.get("/api/aseguradora/servicios/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const servicio = await storage.getServicioAseguradoraById(req.params.id);
      if (!servicio || servicio.aseguradoraId !== aseguradora.id) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Get insurance service error', error);
      res.status(500).json({ message: "Failed to get service" });
    }
  });

  // Approve service by aseguradora
  app.post("/api/aseguradora/servicios/:id/aprobar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    const validationResult = aprobarServicioSchema.safeParse(req.body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return res.status(400).json({
        message: firstError.message || "Datos de aprobación inválidos",
        errors: validationResult.error.errors
      });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const servicio = await storage.getServicioAseguradoraById(req.params.id);
      if (!servicio || servicio.aseguradoraId !== aseguradora.id) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (servicio.aprobadoPor || servicio.rechazadoPor) {
        return res.status(400).json({ message: "Service already processed" });
      }

      const { montoAprobado } = validationResult.data;
      const updated = await storage.aprobarServicioAseguradora(req.params.id, req.user!.id, String(montoAprobado));
      
      logSystem.info('Insurance approved by insurer', { userId: req.user!.id, servicioId: req.params.id, action: 'insurance_approved_by_insurer', monto: montoAprobado });

      // Send notification to client
      if (servicio.servicio?.clienteId) {
        try {
          await pushService.sendToUser(servicio.servicio.clienteId, {
            title: 'Servicio aprobado por aseguradora',
            body: `Tu servicio de grúa ha sido aprobado por ${aseguradora.nombreEmpresa}`,
            data: { type: 'insurance_approved', servicioId: servicio.servicioId }
          });
        } catch (pushError) {
          logSystem.warn('Push notification failed for insurance approval', { servicioId: req.params.id });
        }
      }

      res.json(updated);
    } catch (error: any) {
      logSystem.error('Approve insurance service error', error);
      res.status(500).json({ message: "Failed to approve service" });
    }
  });

  // Reject service by aseguradora
  app.post("/api/aseguradora/servicios/:id/rechazar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    const validationResult = rechazarServicioSchema.safeParse(req.body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return res.status(400).json({
        message: firstError.message || "Datos de rechazo inválidos",
        errors: validationResult.error.errors
      });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const servicio = await storage.getServicioAseguradoraById(req.params.id);
      if (!servicio || servicio.aseguradoraId !== aseguradora.id) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (servicio.aprobadoPor || servicio.rechazadoPor) {
        return res.status(400).json({ message: "Service already processed" });
      }

      const { motivo } = validationResult.data;
      const updated = await storage.rechazarServicioAseguradora(req.params.id, req.user!.id, motivo);
      
      logSystem.info('Insurance rejected by insurer', { userId: req.user!.id, servicioId: req.params.id, action: 'insurance_rejected_by_insurer', motivo });

      // Send notification to client
      if (servicio.servicio?.clienteId) {
        try {
          await pushService.sendToUser(servicio.servicio.clienteId, {
            title: 'Servicio rechazado por aseguradora',
            body: `Tu servicio de grúa fue rechazado: ${motivo}`,
            data: { type: 'insurance_rejected', servicioId: servicio.servicioId, reason: motivo }
          });
        } catch (pushError) {
          logSystem.warn('Push notification failed for insurance rejection', { servicioId: req.params.id });
        }
      }

      res.json(updated);
    } catch (error: any) {
      logSystem.error('Reject insurance service error', error);
      res.status(500).json({ message: "Failed to reject service" });
    }
  });

  // Mark service as billed
  app.post("/api/aseguradora/servicios/:id/facturar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    const validationResult = facturarServicioSchema.safeParse(req.body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return res.status(400).json({
        message: firstError.message || "Datos de facturación inválidos",
        errors: validationResult.error.errors
      });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const servicio = await storage.getServicioAseguradoraById(req.params.id);
      if (!servicio || servicio.aseguradoraId !== aseguradora.id) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (!servicio.aprobadoPor) {
        return res.status(400).json({ message: "Service not approved yet" });
      }

      const { numeroFactura } = validationResult.data;
      const updated = await storage.marcarServicioAseguradoraFacturado(req.params.id, numeroFactura);
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Bill insurance service error', error);
      res.status(500).json({ message: "Failed to bill service" });
    }
  });

  // Mark service as paid
  app.post("/api/aseguradora/servicios/:id/pagar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'aseguradora') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const aseguradora = await storage.getAseguradoraByUserId(req.user!.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company profile not found" });
      }

      const servicio = await storage.getServicioAseguradoraById(req.params.id);
      if (!servicio || servicio.aseguradoraId !== aseguradora.id) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (servicio.estadoPago !== 'facturado') {
        return res.status(400).json({ message: "Service not billed yet" });
      }

      const updated = await storage.marcarServicioAseguradoraPagado(req.params.id);
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Pay insurance service error', error);
      res.status(500).json({ message: "Failed to mark service as paid" });
    }
  });

  // ============================================
  // ADMIN - ASEGURADORA MANAGEMENT
  // ============================================

  // List all aseguradoras (admin only)
  app.get("/api/admin/aseguradoras", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const aseguradoras = await storage.getAllAseguradoras();
      res.json(aseguradoras);
    } catch (error: any) {
      logSystem.error('Get all insurance companies error', error);
      res.status(500).json({ message: "Failed to get insurance companies" });
    }
  });

  // Get single aseguradora (admin only)
  app.get("/api/admin/aseguradoras/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const aseguradora = await storage.getAseguradoraById(req.params.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company not found" });
      }
      res.json(aseguradora);
    } catch (error: any) {
      logSystem.error('Get insurance company error', error);
      res.status(500).json({ message: "Failed to get insurance company" });
    }
  });

  // Create aseguradora (admin only)
  app.post("/api/admin/aseguradoras", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    const validationResult = createAseguradoraSchema.safeParse(req.body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return res.status(400).json({
        message: firstError.message || "Datos de aseguradora inválidos",
        errors: validationResult.error.errors
      });
    }

    try {
      const { email, password, nombreEmpresa, rnc, telefono, direccion, emailContacto, personaContacto } = validationResult.data;

      // Check if RNC already exists
      const existingByRnc = await storage.getAseguradoraByRnc(rnc);
      if (existingByRnc) {
        return res.status(400).json({ message: "An insurance company with this RNC already exists" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create user account for the insurance company
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        passwordHash,
        nombre: nombreEmpresa,
        apellido: 'Aseguradora',
        userType: 'aseguradora',
        estadoCuenta: 'activo',
      } as any);

      // Create aseguradora profile
      const aseguradora = await storage.createAseguradora({
        userId: user.id,
        nombreEmpresa,
        rnc,
        telefono,
        direccion,
        emailContacto,
        personaContacto,
      });

      logSystem.info('Insurance company created', { aseguradoraId: aseguradora.id, rnc });
      // Return sanitized user data
      res.json({ user: getSafeUser(user), aseguradora });
    } catch (error: any) {
      logSystem.error('Create insurance company error', error);
      res.status(500).json({ message: "Failed to create insurance company" });
    }
  });

  // Update aseguradora (admin only)
  app.put("/api/admin/aseguradoras/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    const validationResult = updateAseguradoraAdminSchema.safeParse(req.body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return res.status(400).json({
        message: firstError.message || "Datos de aseguradora inválidos",
        errors: validationResult.error.errors
      });
    }

    try {
      const aseguradora = await storage.getAseguradoraById(req.params.id);
      if (!aseguradora) {
        return res.status(404).json({ message: "Insurance company not found" });
      }

      const { nombreEmpresa, rnc, telefono, direccion, emailContacto, personaContacto } = validationResult.data;
      
      // Check if RNC is being changed and if new RNC already exists
      if (rnc && rnc !== aseguradora.rnc) {
        const existingByRnc = await storage.getAseguradoraByRnc(rnc);
        if (existingByRnc && existingByRnc.id !== aseguradora.id) {
          return res.status(400).json({ message: "An insurance company with this RNC already exists" });
        }
      }

      const updated = await storage.updateAseguradora(req.params.id, {
        nombreEmpresa,
        rnc,
        telefono,
        direccion,
        emailContacto,
        personaContacto,
      });

      res.json(updated);
    } catch (error: any) {
      logSystem.error('Update insurance company error', error);
      res.status(500).json({ message: "Failed to update insurance company" });
    }
  });

  // Toggle aseguradora active status (admin only)
  app.put("/api/admin/aseguradoras/:id/toggle-activo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const updated = await storage.toggleAseguradoraActivo(req.params.id);
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Toggle insurance company status error', error);
      res.status(500).json({ message: "Failed to toggle status" });
    }
  });

  // Get list of active aseguradoras (for client dropdown)
  app.get("/api/aseguradoras/activas", async (req: Request, res: Response) => {
    try {
      const aseguradoras = await storage.getActiveAseguradoras();
      res.json(aseguradoras.map(a => ({
        id: a.id,
        nombre: a.nombreEmpresa,
      })));
    } catch (error: any) {
      logSystem.error('Get active insurance companies error', error);
      res.status(500).json({ message: "Failed to get insurance companies" });
    }
  });

  // ==================== TICKETS (Module 2.7) ====================

  // Create ticket (authenticated users: clients and drivers)
  app.post("/api/tickets", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const validationResult = insertTicketSchema.safeParse({
      ...req.body,
      usuarioId: req.user!.id,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return res.status(400).json({
        message: firstError.message || "Datos de ticket inválidos",
        errors: validationResult.error.errors
      });
    }

    try {
      const ticket = await storage.createTicket(validationResult.data);
      logSystem.info('Ticket created', { ticketId: ticket.id, userId: req.user!.id, categoria: ticket.categoria });
      
      res.json(ticket);
      
      // Send email notification asynchronously (fire-and-forget)
      const userId = req.user!.id;
      const ticketSnapshot = {
        id: ticket.id,
        titulo: ticket.titulo,
        descripcion: ticket.descripcion || '',
        categoria: ticket.categoria,
        prioridad: ticket.prioridad,
        estado: ticket.estado
      };
      void (async () => {
        try {
          const emailService = await getEmailService();
          if (!emailService) {
            logSystem.warn('Email service not configured, skipping ticket created email');
            return;
          }
          const user = await storage.getUserById(userId);
          if (user?.email) {
            await emailService.sendTicketCreatedEmail(user.email, user.nombre || 'Usuario', ticketSnapshot);
          }
        } catch (err) {
          logSystem.error('Failed to send ticket created email', err);
        }
      })();
    } catch (error: any) {
      logSystem.error('Create ticket error', error);
      res.status(500).json({ message: "Error al crear ticket" });
    }
  });

  // Get my tickets (authenticated users)
  app.get("/api/tickets", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const tickets = await storage.getTicketsByUsuarioId(req.user!.id);
      res.json(tickets);
    } catch (error: any) {
      logSystem.error('Get my tickets error', error);
      res.status(500).json({ message: "Error al obtener tickets" });
    }
  });

  // Get ticket by ID (authenticated users - owner or admin)
  app.get("/api/tickets/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket no encontrado" });
      }

      if (ticket.usuarioId !== req.user!.id && req.user!.userType !== 'admin') {
        return res.status(403).json({ message: "No autorizado para ver este ticket" });
      }

      res.json(ticket);
    } catch (error: any) {
      logSystem.error('Get ticket error', error);
      res.status(500).json({ message: "Error al obtener ticket" });
    }
  });

  // Add message to ticket (owner or admin)
  app.post("/api/tickets/:id/mensaje", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const ticket = await storage.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    const isAdmin = req.user!.userType === 'admin';
    if (ticket.usuarioId !== req.user!.id && !isAdmin) {
      return res.status(403).json({ message: "No autorizado para responder este ticket" });
    }

    const validationResult = insertMensajeTicketSchema.safeParse({
      ...req.body,
      ticketId: req.params.id,
      usuarioId: req.user!.id,
      esStaff: isAdmin,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return res.status(400).json({
        message: firstError.message || "Datos de mensaje inválidos",
        errors: validationResult.error.errors
      });
    }

    try {
      const mensaje = await storage.createMensajeTicket(validationResult.data);

      if (isAdmin && ticket.estado === 'abierto') {
        await storage.cambiarEstadoTicket(req.params.id, 'en_proceso');
      }

      logSystem.info('Ticket message sent', { ticketId: req.params.id, messageId: mensaje.id, isStaff: isAdmin });
      res.json(mensaje);

      // Send email to ticket owner when staff responds (fire-and-forget)
      if (isAdmin) {
        const ticketSnapshot = {
          id: ticket.id,
          titulo: ticket.titulo,
          descripcion: ticket.descripcion || '',
          categoria: ticket.categoria,
          prioridad: ticket.prioridad,
          estado: ticket.estado,
          usuarioId: ticket.usuarioId
        };
        const contenido = String(req.body.contenido || '');
        void (async () => {
          try {
            const emailService = await getEmailService();
            if (!emailService) {
              logSystem.warn('Email service not configured, skipping ticket response email');
              return;
            }
            const ticketOwner = await storage.getUserById(ticketSnapshot.usuarioId);
            if (ticketOwner?.email) {
              await emailService.sendTicketSupportResponseEmail(ticketOwner.email, ticketOwner.nombre || 'Usuario', {
                id: ticketSnapshot.id,
                titulo: ticketSnapshot.titulo,
                descripcion: ticketSnapshot.descripcion,
                categoria: ticketSnapshot.categoria,
                prioridad: ticketSnapshot.prioridad,
                estado: ticketSnapshot.estado
              }, contenido);
            }
          } catch (err) {
            logSystem.error('Failed to send ticket response email', err);
          }
        })();
      }
    } catch (error: any) {
      logSystem.error('Create ticket message error', error);
      res.status(500).json({ message: "Error al enviar mensaje" });
    }
  });

  // Get ticket messages (owner or admin)
  app.get("/api/tickets/:id/mensajes", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const ticket = await storage.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticket.usuarioId !== req.user!.id && req.user!.userType !== 'admin') {
      return res.status(403).json({ message: "No autorizado para ver este ticket" });
    }

    try {
      const mensajes = await storage.getMensajesByTicketId(req.params.id);
      await storage.marcarMensajesTicketComoLeidos(req.params.id, req.user!.id);
      res.json(mensajes);
    } catch (error: any) {
      logSystem.error('Get ticket messages error', error);
      res.status(500).json({ message: "Error al obtener mensajes" });
    }
  });

  // Close ticket (owner)
  app.put("/api/tickets/:id/cerrar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const ticket = await storage.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticket.usuarioId !== req.user!.id && req.user!.userType !== 'admin') {
      return res.status(403).json({ message: "No autorizado para cerrar este ticket" });
    }

    try {
      const updated = await storage.cerrarTicket(req.params.id);
      logSystem.info('Ticket closed', { ticketId: req.params.id, closedBy: req.user!.id });
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Close ticket error', error);
      res.status(500).json({ message: "Error al cerrar ticket" });
    }
  });

  // ==================== ADMIN TICKETS ====================

  // Get all tickets (admin only)
  app.get("/api/admin/tickets", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { estado, prioridad, categoria } = req.query;
      
      let tickets;
      if (estado && typeof estado === 'string') {
        tickets = await storage.getTicketsByEstado(estado as any);
      } else {
        tickets = await storage.getAllTickets();
      }

      if (prioridad && typeof prioridad === 'string') {
        tickets = tickets.filter(t => t.prioridad === prioridad);
      }
      if (categoria && typeof categoria === 'string') {
        tickets = tickets.filter(t => t.categoria === categoria);
      }

      res.json(tickets);
    } catch (error: any) {
      logSystem.error('Get all tickets error', error);
      res.status(500).json({ message: "Error al obtener tickets" });
    }
  });

  // Get ticket stats (admin only)
  app.get("/api/admin/tickets/stats", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const stats = await storage.getTicketsStats();
      res.json(stats);
    } catch (error: any) {
      logSystem.error('Get ticket stats error', error);
      res.status(500).json({ message: "Error al obtener estadísticas" });
    }
  });

  // Assign ticket (admin only)
  app.put("/api/admin/tickets/:id/asignar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket no encontrado" });
      }

      const adminId = req.body.adminId || req.user!.id;
      const updated = await storage.asignarTicket(req.params.id, adminId);
      logSystem.info('Ticket assigned', { ticketId: req.params.id, assignedTo: adminId, assignedBy: req.user!.id });
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Assign ticket error', error);
      res.status(500).json({ message: "Error al asignar ticket" });
    }
  });

  // Change ticket status (admin only)
  app.put("/api/admin/tickets/:id/estado", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { estado } = req.body;
    if (!estado || !['abierto', 'en_proceso', 'resuelto', 'cerrado'].includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket no encontrado" });
      }

      const oldStatus = ticket.estado;
      const updated = await storage.cambiarEstadoTicket(req.params.id, estado);
      logSystem.info('Ticket status changed', { ticketId: req.params.id, newStatus: estado, changedBy: req.user!.id });
      
      res.json(updated);

      // Send email notification to ticket owner (fire-and-forget)
      const ticketSnapshot = {
        id: ticket.id,
        titulo: ticket.titulo,
        descripcion: ticket.descripcion || '',
        categoria: ticket.categoria,
        prioridad: ticket.prioridad,
        usuarioId: ticket.usuarioId
      };
      const previousStatus = oldStatus;
      const newStatus = estado;
      void (async () => {
        try {
          const emailService = await getEmailService();
          if (!emailService) {
            logSystem.warn('Email service not configured, skipping ticket status email');
            return;
          }
          const ticketOwner = await storage.getUserById(ticketSnapshot.usuarioId);
          if (ticketOwner?.email) {
            await emailService.sendTicketStatusChangedEmail(ticketOwner.email, ticketOwner.nombre || 'Usuario', {
              id: ticketSnapshot.id,
              titulo: ticketSnapshot.titulo,
              descripcion: ticketSnapshot.descripcion,
              categoria: ticketSnapshot.categoria,
              prioridad: ticketSnapshot.prioridad,
              estado: newStatus
            }, previousStatus, newStatus);
          }
        } catch (err) {
          logSystem.error('Failed to send ticket status email', err);
        }
      })();
    } catch (error: any) {
      logSystem.error('Change ticket status error', error);
      res.status(500).json({ message: "Error al cambiar estado del ticket" });
    }
  });

  // Update ticket priority (admin only)
  app.put("/api/admin/tickets/:id/prioridad", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { prioridad } = req.body;
    if (!prioridad || !['baja', 'media', 'alta', 'urgente'].includes(prioridad)) {
      return res.status(400).json({ message: "Prioridad inválida" });
    }

    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket no encontrado" });
      }

      const updated = await storage.updateTicket(req.params.id, { prioridad });
      logSystem.info('Ticket priority changed', { ticketId: req.params.id, newPriority: prioridad, changedBy: req.user!.id });
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Change ticket priority error', error);
      res.status(500).json({ message: "Error al cambiar prioridad del ticket" });
    }
  });

  // Get tickets assigned to current admin
  app.get("/api/admin/tickets/mis-asignados", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const tickets = await storage.getTicketsAsignadosA(req.user!.id);
      res.json(tickets);
    } catch (error: any) {
      logSystem.error('Get assigned tickets error', error);
      res.status(500).json({ message: "Error al obtener tickets asignados" });
    }
  });

  // ==================== SOCIOS/PARTNERS PORTAL (Module 2.5) ====================

  // Get current partner's profile and dashboard data
  app.get("/api/socio/dashboard", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'socio') {
      return res.status(401).json({ message: "No autorizado. Solo socios pueden acceder." });
    }

    try {
      const socio = await storage.getSocioByUserId(req.user!.id);
      if (!socio) {
        return res.status(404).json({ message: "Perfil de socio no encontrado" });
      }

      const resumen = await storage.getResumenSocio(socio.id);
      const distribuciones = await storage.getDistribucionesBySocioId(socio.id);

      res.json({
        socio,
        resumen,
        distribuciones,
      });
    } catch (error: any) {
      logSystem.error('Get partner dashboard error', error);
      res.status(500).json({ message: "Error al obtener dashboard de socio" });
    }
  });

  // Get partner's distributions history
  app.get("/api/socio/distribuciones", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'socio') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const socio = await storage.getSocioByUserId(req.user!.id);
      if (!socio) {
        return res.status(404).json({ message: "Perfil de socio no encontrado" });
      }

      const distribuciones = await storage.getDistribucionesBySocioId(socio.id);
      res.json(distribuciones);
    } catch (error: any) {
      logSystem.error('Get partner distributions error', error);
      res.status(500).json({ message: "Error al obtener distribuciones" });
    }
  });

  // Get partner's investment summary
  app.get("/api/socio/resumen", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'socio') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const socio = await storage.getSocioByUserId(req.user!.id);
      if (!socio) {
        return res.status(404).json({ message: "Perfil de socio no encontrado" });
      }

      const resumen = await storage.getResumenSocio(socio.id);
      res.json(resumen);
    } catch (error: any) {
      logSystem.error('Get partner summary error', error);
      res.status(500).json({ message: "Error al obtener resumen" });
    }
  });

  // Generate financial statement PDF for partner
  app.get("/api/socio/estado-financiero/:periodo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'socio') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { periodo } = req.params;
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ message: "Período inválido. Use formato YYYY-MM" });
    }

    try {
      const socio = await storage.getSocioByUserId(req.user!.id);
      if (!socio) {
        return res.status(404).json({ message: "Perfil de socio no encontrado" });
      }

      const distribuciones = await storage.getDistribucionesByPeriodo(periodo);
      const distribucionSocio = distribuciones.find(d => d.socioId === socio.id);
      const resumen = await storage.getResumenSocio(socio.id);

      // Generate PDF using pdfService
      const pdfBuffer = await pdfService.generarEstadoFinancieroSocio({
        socio,
        periodo,
        distribucion: distribucionSocio as any || null,
        resumen,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=estado-financiero-${periodo}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      logSystem.error('Generate partner financial statement error', error);
      res.status(500).json({ message: "Error al generar estado financiero" });
    }
  });

  // ==================== ADMIN SOCIOS ====================

  // Get all partners (admin only)
  app.get("/api/admin/socios", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const socios = await storage.getAllSocios();
      res.json(socios);
    } catch (error: any) {
      logSystem.error('Get all partners error', error);
      res.status(500).json({ message: "Error al obtener socios" });
    }
  });

  // Get partner statistics (admin only)
  app.get("/api/admin/socios/stats", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const stats = await storage.getSociosStats();
      res.json(stats);
    } catch (error: any) {
      logSystem.error('Get partner stats error', error);
      res.status(500).json({ message: "Error al obtener estadísticas de socios" });
    }
  });

  // Get specific partner details (admin only)
  app.get("/api/admin/socios/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const socio = await storage.getSocioById(req.params.id);
      if (!socio) {
        return res.status(404).json({ message: "Socio no encontrado" });
      }

      const resumen = await storage.getResumenSocio(req.params.id);
      res.json({ socio, resumen });
    } catch (error: any) {
      logSystem.error('Get partner details error', error);
      res.status(500).json({ message: "Error al obtener detalles del socio" });
    }
  });

  // Create new partner (admin only)
  app.post("/api/admin/socios", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const parsed = createSocioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Datos inválidos",
        errors: parsed.error.errors 
      });
    }

    const { email, password, nombre, telefono, porcentajeParticipacion, montoInversion, fechaInversion, notas } = parsed.data;

    try {
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "El email ya está registrado" });
      }

      // Validate total participation doesn't exceed 100%
      const currentSocios = await storage.getActiveSocios();
      const currentTotal = currentSocios.reduce((sum, s) => sum + parseFloat(s.porcentajeParticipacion), 0);
      const newPercentage = parseFloat(String(porcentajeParticipacion));
      
      if (currentTotal + newPercentage > 100) {
        return res.status(400).json({ 
          message: `La participación total no puede exceder 100%. Disponible: ${(100 - currentTotal).toFixed(2)}%` 
        });
      }

      // Create user account with 'socio' role
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        passwordHash,
        nombre,
        apellido: '',
        phone: telefono ?? undefined,
        userType: 'socio',
        emailVerificado: true,
      });

      // Create partner profile
      const socio = await storage.createSocio({
        userId: user.id,
        porcentajeParticipacion: String(porcentajeParticipacion),
        montoInversion: String(montoInversion),
        fechaInversion: fechaInversion ? new Date(fechaInversion) : new Date(),
        notas: notas || null,
      });

      // Send welcome email to new socio with credentials
      try {
        const emailService = await getEmailService();
        await emailService.sendSocioCreatedEmail(
          email,
          nombre,
          password,
          String(porcentajeParticipacion)
        );
        logSystem.info('Socio welcome email sent', { socioId: socio.id, email });
      } catch (emailError) {
        logSystem.error('Failed to send socio welcome email', emailError, { socioId: socio.id, email });
      }

      logSystem.info('Partner created', { socioId: socio.id, createdBy: req.user!.id });
      res.status(201).json(socio);
    } catch (error: any) {
      logSystem.error('Create partner error', error);
      res.status(500).json({ message: "Error al crear socio" });
    }
  });

  // Update partner (admin only)
  app.put("/api/admin/socios/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const parsed = updateSocioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Datos inválidos",
        errors: parsed.error.errors 
      });
    }

    try {
      const existingSocio = await storage.getSocioById(req.params.id);
      if (!existingSocio) {
        return res.status(404).json({ message: "Socio no encontrado" });
      }

      // Validate participation if being updated
      if (parsed.data.porcentajeParticipacion) {
        const currentSocios = await storage.getActiveSocios();
        const currentTotal = currentSocios
          .filter(s => s.id !== req.params.id)
          .reduce((sum, s) => sum + parseFloat(s.porcentajeParticipacion), 0);
        const newPercentage = parseFloat(String(parsed.data.porcentajeParticipacion));
        
        if (currentTotal + newPercentage > 100) {
          return res.status(400).json({ 
            message: `La participación total no puede exceder 100%. Disponible: ${(100 - currentTotal).toFixed(2)}%` 
          });
        }
      }

      const updates: any = {};
      if (parsed.data.porcentajeParticipacion) {
        updates.porcentajeParticipacion = String(parsed.data.porcentajeParticipacion);
      }
      if (parsed.data.montoInversion !== undefined) {
        updates.montoInversion = String(parsed.data.montoInversion);
      }
      if (parsed.data.notas !== undefined) {
        updates.notas = parsed.data.notas;
      }

      const socio = await storage.updateSocio(req.params.id, updates);
      logSystem.info('Partner updated', { socioId: socio.id, updatedBy: req.user!.id });
      res.json(socio);
    } catch (error: any) {
      logSystem.error('Update partner error', error);
      res.status(500).json({ message: "Error al actualizar socio" });
    }
  });

  // Toggle partner active status (admin only)
  app.put("/api/admin/socios/:id/toggle-activo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const socio = await storage.toggleSocioActivo(req.params.id);
      logSystem.info('Partner status toggled', { socioId: socio.id, activo: socio.activo, toggledBy: req.user!.id });
      res.json(socio);
    } catch (error: any) {
      logSystem.error('Toggle partner status error', error);
      res.status(500).json({ message: "Error al cambiar estado del socio" });
    }
  });

  // ==================== DISTRIBUCIONES (PROFIT DISTRIBUTION) ====================

  // Get all distributions (admin only)
  app.get("/api/admin/distribuciones", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { periodo } = req.query;

    try {
      let distribuciones;
      if (periodo && typeof periodo === 'string') {
        distribuciones = await storage.getDistribucionesByPeriodo(periodo);
      } else {
        distribuciones = await storage.getAllDistribuciones();
      }
      res.json(distribuciones);
    } catch (error: any) {
      logSystem.error('Get distributions error', error);
      res.status(500).json({ message: "Error al obtener distribuciones" });
    }
  });

  // Calculate distribution for a period (admin only)
  app.post("/api/admin/distribuciones/calcular", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const parsed = calcularDistribucionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Datos inválidos",
        errors: parsed.error.errors 
      });
    }

    const { periodo } = parsed.data;

    try {
      // Check if distributions already exist for this period
      const existingDistribuciones = await storage.getDistribucionesByPeriodo(periodo);
      if (existingDistribuciones.length > 0) {
        return res.status(409).json({ 
          message: "Ya existen distribuciones calculadas para este período",
          distribuciones: existingDistribuciones 
        });
      }

      // Calculate distribution
      const calculo = await storage.calcularDistribucionPeriodo(periodo);
      
      // Create distribution records for each active partner
      const distribuciones = [];
      for (const dist of calculo.distribucionesPorSocio) {
        const distribucion = await storage.createDistribucionSocio({
          socioId: dist.socioId,
          periodo,
          ingresosTotales: String(calculo.ingresosTotales),
          comisionEmpresa: String(calculo.comisionEmpresa),
          montoSocio: String(dist.montoSocio),
          calculadoPor: req.user!.id,
        } as any);
        distribuciones.push(distribucion);
      }

      logSystem.info('Distributions calculated', { 
        periodo, 
        totalIngresos: calculo.ingresosTotales,
        distribucionesCreadas: distribuciones.length,
        calculadoPor: req.user!.id 
      });

      res.status(201).json({
        calculo,
        distribuciones,
      });
    } catch (error: any) {
      logSystem.error('Calculate distributions error', error);
      res.status(500).json({ message: "Error al calcular distribuciones" });
    }
  });

  // Preview distribution calculation (without creating records)
  app.get("/api/admin/distribuciones/preview/:periodo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { periodo } = req.params;
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ message: "Período inválido. Use formato YYYY-MM" });
    }

    try {
      const calculo = await storage.calcularDistribucionPeriodo(periodo);
      const sociosActivos = await storage.getActiveSocios();

      res.json({
        periodo,
        ...calculo,
        sociosActivos: sociosActivos.map(s => ({
          id: s.id,
          nombre: s.user?.nombre,
          porcentaje: parseFloat(s.porcentajeParticipacion),
        })),
      });
    } catch (error: any) {
      logSystem.error('Preview distributions error', error);
      res.status(500).json({ message: "Error al previsualizar distribuciones" });
    }
  });

  // Approve distribution (admin only)
  app.put("/api/admin/distribuciones/:id/aprobar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const distribucion = await storage.getDistribucionById(req.params.id);
      if (!distribucion) {
        return res.status(404).json({ message: "Distribución no encontrada" });
      }

      if (distribucion.estado === 'pagado') {
        return res.status(400).json({ message: "La distribución ya fue pagada" });
      }

      const updated = await storage.aprobarDistribucion(req.params.id, req.user!.id);
      logSystem.info('Distribution approved', { distribucionId: req.params.id, aprobadoPor: req.user!.id });
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Approve distribution error', error);
      res.status(500).json({ message: "Error al aprobar distribución" });
    }
  });

  // Mark distribution as paid (admin only)
  app.put("/api/admin/distribuciones/:id/pagar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const parsed = marcarPagadaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Datos inválidos",
        errors: parsed.error.errors 
      });
    }

    try {
      const distribucion = await storage.getDistribucionById(req.params.id);
      if (!distribucion) {
        return res.status(404).json({ message: "Distribución no encontrada" });
      }

      if (distribucion.estado === 'pagado') {
        return res.status(400).json({ message: "La distribución ya fue pagada" });
      }

      const updated = await storage.marcarDistribucionPagada(
        req.params.id,
        parsed.data.metodoPago,
        parsed.data.referenciaTransaccion
      );
      
      logSystem.info('Distribution paid', { 
        distribucionId: req.params.id, 
        metodoPago: parsed.data.metodoPago,
        referencia: parsed.data.referenciaTransaccion 
      });
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Pay distribution error', error);
      res.status(500).json({ message: "Error al marcar distribución como pagada" });
    }
  });

  // Get distribution details (admin only)
  app.get("/api/admin/distribuciones/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const distribucion = await storage.getDistribucionById(req.params.id);
      if (!distribucion) {
        return res.status(404).json({ message: "Distribución no encontrada" });
      }
      res.json(distribucion);
    } catch (error: any) {
      logSystem.error('Get distribution error', error);
      res.status(500).json({ message: "Error al obtener distribución" });
    }
  });

  // ==================== ADMINISTRADORES (ADMIN USERS WITH PERMISSIONS) ====================

  // Validation schema for creating administrators
  const createAdministradorSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    nombre: z.string().min(1, "Nombre es requerido"),
    apellido: z.string().optional(),
    permisos: z.array(z.enum(ADMIN_PERMISOS)).min(1, "Debe tener al menos un permiso"),
    notas: z.string().optional().nullable(),
  });

  // Validation schema for updating administrators
  const updateAdministradorSchema = z.object({
    permisos: z.array(z.enum(ADMIN_PERMISOS)).min(1, "Debe tener al menos un permiso").optional(),
    notas: z.string().optional().nullable(),
  });

  // Helper function to verify admin has required permission
  async function verifyAdminPermission(req: Request, res: Response, requiredPermission: AdminPermiso): Promise<boolean> {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      res.status(401).json({ message: "No autorizado" });
      return false;
    }

    const currentAdmin = await storage.getAdministradorByUserId(req.user!.id);
    
    // If no administrator record exists (legacy full admin), allow access
    if (!currentAdmin) {
      return true;
    }

    // Check if admin is active
    if (!currentAdmin.activo) {
      res.status(403).json({ message: "Tu cuenta de administrador está desactivada" });
      return false;
    }

    // Check if admin has the required permission
    if (!currentAdmin.permisos || !currentAdmin.permisos.includes(requiredPermission)) {
      res.status(403).json({ message: "No tienes permisos para gestionar administradores" });
      return false;
    }

    return true;
  }

  // Get all administrators (admin only with admin_usuarios permission)
  app.get("/api/admin/administradores", async (req: Request, res: Response) => {
    const hasPermission = await verifyAdminPermission(req, res, 'admin_usuarios');
    if (!hasPermission) return;

    try {
      const administradores = await storage.getAdministradores();
      res.json(administradores);
    } catch (error: any) {
      logSystem.error('Get all administrators error', error);
      res.status(500).json({ message: "Error al obtener administradores" });
    }
  });

  // Get administrator by ID (admin only with admin_usuarios permission)
  app.get("/api/admin/administradores/:id", async (req: Request, res: Response) => {
    const hasPermission = await verifyAdminPermission(req, res, 'admin_usuarios');
    if (!hasPermission) return;

    try {
      const admin = await storage.getAdministradorById(req.params.id);
      if (!admin) {
        return res.status(404).json({ message: "Administrador no encontrado" });
      }
      res.json(admin);
    } catch (error: any) {
      logSystem.error('Get administrator by ID error', error);
      res.status(500).json({ message: "Error al obtener administrador" });
    }
  });

  // Create new administrator (admin only with admin_usuarios permission)
  app.post("/api/admin/administradores", async (req: Request, res: Response) => {
    const hasPermission = await verifyAdminPermission(req, res, 'admin_usuarios');
    if (!hasPermission) return;

    const parsed = createAdministradorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Datos inválidos",
        errors: parsed.error.errors 
      });
    }

    try {
      const existingUser = await storage.getUserByEmail(parsed.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Ya existe un usuario con ese email" });
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      const newUser = await storage.createUser({
        email: parsed.data.email,
        passwordHash,
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido || '',
        userType: 'admin',
        emailVerificado: true,
        estadoCuenta: 'activo',
      } as any);

      const admin = await storage.createAdministrador({
        userId: newUser.id,
        permisos: parsed.data.permisos,
        notas: parsed.data.notas || null,
        creadoPor: req.user!.id,
        activo: true,
      });

      const emailService = await getEmailService();
      await emailService.sendAdminCreatedEmail(
        parsed.data.email,
        parsed.data.nombre,
        parsed.data.password,
        parsed.data.permisos
      );

      logSystem.info('Administrator created', { 
        adminId: admin.id, 
        userId: newUser.id,
        email: parsed.data.email,
        createdBy: req.user!.id 
      });

      const adminWithDetails = await storage.getAdministradorById(admin.id);
      res.status(201).json(adminWithDetails);
    } catch (error: any) {
      logSystem.error('Create administrator error', error);
      res.status(500).json({ message: "Error al crear administrador" });
    }
  });

  // Update administrator permissions (admin only with admin_usuarios permission)
  app.put("/api/admin/administradores/:id", async (req: Request, res: Response) => {
    const hasPermission = await verifyAdminPermission(req, res, 'admin_usuarios');
    if (!hasPermission) return;

    const parsed = updateAdministradorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Datos inválidos",
        errors: parsed.error.errors 
      });
    }

    try {
      const admin = await storage.getAdministradorById(req.params.id);
      if (!admin) {
        return res.status(404).json({ message: "Administrador no encontrado" });
      }

      const updated = await storage.updateAdministrador(req.params.id, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "No se pudo actualizar el administrador" });
      }

      logSystem.info('Administrator updated', { 
        adminId: req.params.id, 
        updatedBy: req.user!.id 
      });

      const adminWithDetails = await storage.getAdministradorById(req.params.id);
      res.json(adminWithDetails);
    } catch (error: any) {
      logSystem.error('Update administrator error', error);
      res.status(500).json({ message: "Error al actualizar administrador" });
    }
  });

  // Toggle administrator active status (admin only with admin_usuarios permission)
  app.put("/api/admin/administradores/:id/toggle", async (req: Request, res: Response) => {
    const hasPermission = await verifyAdminPermission(req, res, 'admin_usuarios');
    if (!hasPermission) return;

    try {
      const admin = await storage.getAdministradorById(req.params.id);
      if (!admin) {
        return res.status(404).json({ message: "Administrador no encontrado" });
      }

      if (admin.userId === req.user!.id) {
        return res.status(400).json({ message: "No puedes desactivar tu propia cuenta" });
      }

      const updated = await storage.toggleAdministradorActivo(req.params.id);
      if (!updated) {
        return res.status(404).json({ message: "No se pudo cambiar el estado" });
      }

      logSystem.info('Administrator status toggled', { 
        adminId: req.params.id, 
        newStatus: updated.activo,
        changedBy: req.user!.id 
      });

      const adminWithDetails = await storage.getAdministradorById(req.params.id);
      res.json(adminWithDetails);
    } catch (error: any) {
      logSystem.error('Toggle administrator status error', error);
      res.status(500).json({ message: "Error al cambiar estado del administrador" });
    }
  });

  // Get current admin permissions (for sidebar filtering)
  app.get("/api/admin/me/permissions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const admin = await storage.getAdministradorByUserId(req.user!.id);
      if (!admin) {
        return res.json({ permisos: ADMIN_PERMISOS, isFullAdmin: true });
      }
      res.json({ 
        permisos: admin.permisos,
        isFullAdmin: false,
        activo: admin.activo,
        primerInicioSesion: admin.primerInicioSesion
      });
    } catch (error: any) {
      logSystem.error('Get admin permissions error', error);
      res.status(500).json({ message: "Error al obtener permisos" });
    }
  });

  // ==================== EMPRESAS / CONTRATOS EMPRESARIALES (MODULE 6) ====================

  // Get empresa profile for logged-in empresa user
  app.get("/api/empresa/profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }
      res.json(empresa);
    } catch (error: any) {
      logSystem.error('Get empresa profile error', error);
      res.status(500).json({ message: "Error al obtener perfil de empresa" });
    }
  });

  // Update empresa profile
  app.put("/api/empresa/profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const parsed = updateEmpresaPerfilSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const updated = await storage.updateEmpresa(empresa.id, parsed.data);
      logSystem.info('Empresa profile updated', { empresaId: empresa.id, updatedBy: req.user!.id });
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Update empresa profile error', error);
      res.status(500).json({ message: "Error al actualizar perfil de empresa" });
    }
  });

  // Get empresa dashboard stats
  app.get("/api/empresa/dashboard", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const stats = await storage.getEmpresaDashboardStats(empresa.id);
      const contratoActivo = await storage.getEmpresaContratoActivo(empresa.id);
      const facturasRecientes = await storage.getEmpresaFacturas(empresa.id);
      const serviciosRecientes = await storage.getEmpresaServiciosHistory(empresa.id, 10);

      res.json({
        ...stats,
        contratoActivo,
        facturasRecientes: facturasRecientes.slice(0, 5),
        serviciosRecientes,
        empresa: {
          id: empresa.id,
          nombreEmpresa: empresa.nombreEmpresa,
          limiteCredito: empresa.limiteCredito,
          verificado: empresa.verificado,
        },
      });
    } catch (error: any) {
      logSystem.error('Get empresa dashboard error', error);
      res.status(500).json({ message: "Error al obtener dashboard" });
    }
  });

  // Get empresa employees
  app.get("/api/empresa/empleados", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const empleados = await storage.getEmpresaEmpleados(empresa.id);
      res.json(empleados);
    } catch (error: any) {
      logSystem.error('Get empresa empleados error', error);
      res.status(500).json({ message: "Error al obtener empleados" });
    }
  });

  // Add empresa employee
  app.post("/api/empresa/empleados", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const { email, rol, departamento, puedeCrearServicios, puedeProgramarServicios, puedeVerFacturas, puedeGestionarEmpleados } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuario no encontrado con ese email" });
      }

      const empleado = await storage.addEmpresaEmpleado({
        empresaId: empresa.id,
        userId: existingUser.id,
        rol: rol || 'empleado',
        departamento,
        puedeCrearServicios: puedeCrearServicios ?? true,
        puedeProgramarServicios: puedeProgramarServicios ?? true,
        puedeVerFacturas: puedeVerFacturas ?? false,
        puedeGestionarEmpleados: puedeGestionarEmpleados ?? false,
      });

      logSystem.info('Empresa employee added', { empresaId: empresa.id, empleadoId: empleado.id });
      res.status(201).json(empleado);
    } catch (error: any) {
      logSystem.error('Add empresa employee error', error);
      res.status(500).json({ message: "Error al agregar empleado" });
    }
  });

  // Update empresa employee
  app.put("/api/empresa/empleados/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const empleado = await storage.updateEmpresaEmpleado(req.params.id, req.body);
      logSystem.info('Empresa employee updated', { empleadoId: req.params.id });
      res.json(empleado);
    } catch (error: any) {
      logSystem.error('Update empresa employee error', error);
      res.status(500).json({ message: "Error al actualizar empleado" });
    }
  });

  // Remove empresa employee
  app.delete("/api/empresa/empleados/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      await storage.removeEmpresaEmpleado(req.params.id);
      logSystem.info('Empresa employee removed', { empleadoId: req.params.id });
      res.json({ message: "Empleado eliminado" });
    } catch (error: any) {
      logSystem.error('Remove empresa employee error', error);
      res.status(500).json({ message: "Error al eliminar empleado" });
    }
  });

  // Get empresa contracts
  app.get("/api/empresa/contratos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const contratos = await storage.getEmpresaContratos(empresa.id);
      res.json(contratos);
    } catch (error: any) {
      logSystem.error('Get empresa contratos error', error);
      res.status(500).json({ message: "Error al obtener contratos" });
    }
  });

  // Get empresa projects
  app.get("/api/empresa/proyectos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const proyectos = await storage.getEmpresaProyectos(empresa.id);
      res.json(proyectos);
    } catch (error: any) {
      logSystem.error('Get empresa proyectos error', error);
      res.status(500).json({ message: "Error al obtener proyectos" });
    }
  });

  // Create empresa project
  app.post("/api/empresa/proyectos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const proyecto = await storage.createEmpresaProyecto({
        empresaId: empresa.id,
        ...req.body,
      });

      logSystem.info('Empresa project created', { proyectoId: proyecto.id, empresaId: empresa.id });
      res.status(201).json(proyecto);
    } catch (error: any) {
      logSystem.error('Create empresa project error', error);
      res.status(500).json({ message: "Error al crear proyecto" });
    }
  });

  // Update empresa project
  app.put("/api/empresa/proyectos/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const proyecto = await storage.updateEmpresaProyecto(req.params.id, req.body);
      logSystem.info('Empresa project updated', { proyectoId: req.params.id });
      res.json(proyecto);
    } catch (error: any) {
      logSystem.error('Update empresa project error', error);
      res.status(500).json({ message: "Error al actualizar proyecto" });
    }
  });

  // Get project by ID
  app.get("/api/empresa/proyectos/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const proyecto = await storage.getEmpresaProyectoById(req.params.id);
      if (!proyecto) {
        return res.status(404).json({ message: "Proyecto no encontrado" });
      }
      res.json(proyecto);
    } catch (error: any) {
      logSystem.error('Get empresa project error', error);
      res.status(500).json({ message: "Error al obtener proyecto" });
    }
  });

  // Get empresa scheduled services
  app.get("/api/empresa/solicitudes", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const servicios = await storage.getServiciosProgramadosEmpresa(empresa.id);
      res.json(servicios);
    } catch (error: any) {
      logSystem.error('Get empresa solicitudes error', error);
      res.status(500).json({ message: "Error al obtener solicitudes programadas" });
    }
  });

  // Create scheduled service request
  app.post("/api/empresa/solicitudes", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const parsed = createServicioProgramadoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      if (!empresa.verificado) {
        return res.status(403).json({ message: "Su empresa debe estar verificada para programar servicios" });
      }

      const servicio = await storage.createServicioProgramado({
        empresaId: empresa.id,
        solicitadoPor: req.user!.id,
        fechaProgramada: new Date(parsed.data.fechaProgramada),
        horaInicio: parsed.data.horaInicio,
        horaFin: parsed.data.horaFin || null,
        origenLat: parsed.data.origenLat,
        origenLng: parsed.data.origenLng,
        origenDireccion: parsed.data.origenDireccion,
        destinoLat: parsed.data.destinoLat || null,
        destinoLng: parsed.data.destinoLng || null,
        destinoDireccion: parsed.data.destinoDireccion || null,
        proyectoId: parsed.data.proyectoId || null,
        contratoId: parsed.data.contratoId || null,
        servicioCategoria: parsed.data.servicioCategoria as any || 'remolque_estandar',
        servicioSubtipo: parsed.data.servicioSubtipo as any || null,
        descripcion: parsed.data.descripcion || null,
        recurrente: parsed.data.recurrente ?? false,
        frecuenciaRecurrencia: parsed.data.frecuenciaRecurrencia || null,
        notasInternas: parsed.data.notasInternas || null,
      });

      logSystem.info('Scheduled service created', { servicioId: servicio.id, empresaId: empresa.id });
      res.status(201).json(servicio);
    } catch (error: any) {
      logSystem.error('Create scheduled service error', error);
      res.status(500).json({ message: "Error al crear solicitud programada" });
    }
  });

  // Update scheduled service
  app.put("/api/empresa/solicitudes/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const servicio = await storage.updateServicioProgramado(req.params.id, req.body);
      logSystem.info('Scheduled service updated', { servicioId: req.params.id });
      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Update scheduled service error', error);
      res.status(500).json({ message: "Error al actualizar solicitud programada" });
    }
  });

  // Cancel scheduled service
  app.put("/api/empresa/solicitudes/:id/cancelar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const servicio = await storage.updateServicioProgramado(req.params.id, { 
        estado: 'cancelado' as any,
      });
      logSystem.info('Scheduled service cancelled', { servicioId: req.params.id });
      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Cancel scheduled service error', error);
      res.status(500).json({ message: "Error al cancelar solicitud programada" });
    }
  });

  // Get empresa special pricing
  app.get("/api/empresa/tarifas", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const tarifas = await storage.getEmpresaTarifas(empresa.id);
      res.json(tarifas);
    } catch (error: any) {
      logSystem.error('Get empresa tarifas error', error);
      res.status(500).json({ message: "Error al obtener tarifas especiales" });
    }
  });

  // Get empresa assigned drivers
  app.get("/api/empresa/conductores", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const conductores = await storage.getConductoresAsignadosEmpresa(empresa.id);
      res.json(conductores);
    } catch (error: any) {
      logSystem.error('Get empresa conductores error', error);
      res.status(500).json({ message: "Error al obtener conductores asignados" });
    }
  });

  // Get empresa invoices
  app.get("/api/empresa/facturas", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const facturas = await storage.getEmpresaFacturas(empresa.id);
      res.json(facturas);
    } catch (error: any) {
      logSystem.error('Get empresa facturas error', error);
      res.status(500).json({ message: "Error al obtener facturas" });
    }
  });

  // Get specific invoice
  app.get("/api/empresa/facturas/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const factura = await storage.getEmpresaFacturaById(req.params.id);
      if (!factura) {
        return res.status(404).json({ message: "Factura no encontrada" });
      }
      res.json(factura);
    } catch (error: any) {
      logSystem.error('Get empresa factura error', error);
      res.status(500).json({ message: "Error al obtener factura" });
    }
  });

  // Get empresa service history
  app.get("/api/empresa/historial", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'empresa') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaByUserId(req.user!.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const historial = await storage.getEmpresaServiciosHistory(empresa.id, limit);
      res.json(historial);
    } catch (error: any) {
      logSystem.error('Get empresa historial error', error);
      res.status(500).json({ message: "Error al obtener historial de servicios" });
    }
  });

  // ==================== ADMIN: EMPRESA MANAGEMENT ====================

  // Get all empresas (admin only)
  app.get("/api/admin/empresas", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const { tipo, verificado } = req.query;
      let empresas;
      
      if (tipo && typeof tipo === 'string') {
        empresas = await storage.getEmpresasByTipo(tipo);
      } else {
        empresas = await storage.getAllEmpresas();
      }

      if (verificado !== undefined) {
        const isVerificado = verificado === 'true';
        empresas = empresas.filter(e => e.verificado === isVerificado);
      }

      res.json(empresas);
    } catch (error: any) {
      logSystem.error('Get all empresas error', error);
      res.status(500).json({ message: "Error al obtener empresas" });
    }
  });

  // Get empresa by ID (admin only)
  app.get("/api/admin/empresas/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaById(req.params.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }
      res.json(empresa);
    } catch (error: any) {
      logSystem.error('Get empresa by id error', error);
      res.status(500).json({ message: "Error al obtener empresa" });
    }
  });

  // Create new empresa (admin only)
  app.post("/api/admin/empresas", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const parsed = createEmpresaAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }

    try {
      const existingUser = await storage.getUserByEmail(parsed.data.email);
      if (existingUser) {
        return res.status(409).json({ message: "Ya existe un usuario con ese email" });
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      const user = await storage.createUser({
        email: parsed.data.email,
        passwordHash,
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido || "",
        phone: parsed.data.phone ?? undefined,
        userType: 'empresa',
      });

      const empresa = await storage.createEmpresa({
        userId: user.id,
        nombreEmpresa: parsed.data.nombreEmpresa,
        rnc: parsed.data.rnc,
        tipoEmpresa: parsed.data.tipoEmpresa as any,
        direccion: parsed.data.direccion || null,
        telefono: parsed.data.telefono || null,
        emailContacto: parsed.data.emailContacto || null,
        personaContacto: parsed.data.personaContacto || null,
        limiteCredito: parsed.data.limiteCredito || "0.00",
        diasCredito: parsed.data.diasCredito || 30,
        descuentoVolumen: parsed.data.descuentoVolumen || "0.00",
      });

      logSystem.info('Empresa created by admin', { empresaId: empresa.id, createdBy: req.user!.id });
      res.status(201).json({ user, empresa });
    } catch (error: any) {
      logSystem.error('Create empresa error', error);
      if (error.code === '23505' && error.constraint?.includes('rnc')) {
        return res.status(409).json({ message: "Ya existe una empresa con ese RNC" });
      }
      res.status(500).json({ message: "Error al crear empresa" });
    }
  });

  // Update empresa (admin only)
  app.put("/api/admin/empresas/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const parsed = updateEmpresaAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }

    try {
      const empresa = await storage.updateEmpresa(req.params.id, parsed.data as any);
      logSystem.info('Empresa updated by admin', { empresaId: empresa.id, updatedBy: req.user!.id });
      res.json(empresa);
    } catch (error: any) {
      logSystem.error('Update empresa error', error);
      res.status(500).json({ message: "Error al actualizar empresa" });
    }
  });

  // Verify empresa (admin only)
  app.put("/api/admin/empresas/:id/verificar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.updateEmpresa(req.params.id, {
        verificado: true,
        verificadoPor: req.user!.id,
        fechaVerificacion: new Date(),
      });
      logSystem.info('Empresa verified', { empresaId: empresa.id, verifiedBy: req.user!.id });
      res.json(empresa);
    } catch (error: any) {
      logSystem.error('Verify empresa error', error);
      res.status(500).json({ message: "Error al verificar empresa" });
    }
  });

  // Toggle empresa active status (admin only)
  app.put("/api/admin/empresas/:id/toggle-activo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaById(req.params.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const updated = await storage.updateEmpresa(req.params.id, { activo: !empresa.activo });
      logSystem.info('Empresa status toggled', { empresaId: updated.id, activo: updated.activo });
      res.json(updated);
    } catch (error: any) {
      logSystem.error('Toggle empresa status error', error);
      res.status(500).json({ message: "Error al cambiar estado de empresa" });
    }
  });

  // Create empresa contract (admin only)
  app.post("/api/admin/empresas/:id/contratos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaById(req.params.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const contrato = await storage.createEmpresaContrato({
        empresaId: empresa.id,
        numeroContrato: req.body.numeroContrato,
        tipoContrato: req.body.tipoContrato,
        fechaInicio: new Date(req.body.fechaInicio),
        fechaFin: req.body.fechaFin ? new Date(req.body.fechaFin) : null,
        horasContratadas: req.body.horasContratadas || null,
        serviciosContratados: req.body.serviciosContratados || null,
        tarifaHora: req.body.tarifaHora || null,
        tarifaDia: req.body.tarifaDia || null,
        tarifaServicio: req.body.tarifaServicio || null,
        descuentoPorcentaje: req.body.descuentoPorcentaje || "0.00",
        montoMensualMinimo: req.body.montoMensualMinimo || null,
        notas: req.body.notas || null,
      });

      logSystem.info('Empresa contract created', { contratoId: contrato.id, empresaId: empresa.id });
      res.status(201).json(contrato);
    } catch (error: any) {
      logSystem.error('Create empresa contract error', error);
      res.status(500).json({ message: "Error al crear contrato" });
    }
  });

  // Create special pricing for empresa (admin only)
  app.post("/api/admin/empresas/:id/tarifas", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaById(req.params.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const tarifa = await storage.createEmpresaTarifa({
        empresaId: empresa.id,
        servicioCategoria: req.body.servicioCategoria || null,
        precioBase: req.body.precioBase,
        tarifaPorKm: req.body.tarifaPorKm,
        descuentoPorcentaje: req.body.descuentoPorcentaje || "0.00",
        minimoServicios: req.body.minimoServicios || 1,
      });

      logSystem.info('Empresa tarifa created', { tarifaId: tarifa.id, empresaId: empresa.id });
      res.status(201).json(tarifa);
    } catch (error: any) {
      logSystem.error('Create empresa tarifa error', error);
      res.status(500).json({ message: "Error al crear tarifa especial" });
    }
  });

  // Assign driver to empresa (admin only)
  app.post("/api/admin/empresas/:id/conductores", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaById(req.params.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const asignacion = await storage.asignarConductorEmpresa({
        empresaId: empresa.id,
        conductorId: req.body.conductorId,
        esPrioridad: req.body.esPrioridad ?? false,
        notas: req.body.notas || null,
      });

      logSystem.info('Driver assigned to empresa', { empresaId: empresa.id, conductorId: req.body.conductorId });
      res.status(201).json(asignacion);
    } catch (error: any) {
      logSystem.error('Assign driver to empresa error', error);
      res.status(500).json({ message: "Error al asignar conductor" });
    }
  });

  // Remove driver assignment (admin only)
  app.delete("/api/admin/empresas/:empresaId/conductores/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      await storage.removeAsignacionConductor(req.params.id);
      logSystem.info('Driver unassigned from empresa', { asignacionId: req.params.id });
      res.json({ message: "Conductor desasignado" });
    } catch (error: any) {
      logSystem.error('Remove driver assignment error', error);
      res.status(500).json({ message: "Error al desasignar conductor" });
    }
  });

  // Generate monthly invoice for empresa (admin only)
  app.post("/api/admin/empresas/:id/facturas/generar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresa = await storage.getEmpresaById(req.params.id);
      if (!empresa) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }

      const { periodo } = req.body;
      if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
        return res.status(400).json({ message: "Formato de período inválido (YYYY-MM)" });
      }

      const servicios = await storage.getServiciosProgramadosEmpresa(empresa.id);
      const serviciosPeriodo = servicios.filter(s => {
        const fecha = new Date(s.fechaProgramada);
        const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        return mes === periodo && s.estado === 'ejecutado';
      });

      if (serviciosPeriodo.length === 0) {
        return res.status(400).json({ message: "No hay servicios completados para facturar en este período" });
      }

      const numeroFactura = `FAC-${empresa.id.substring(0, 8).toUpperCase()}-${periodo.replace('-', '')}`;
      const subtotal = serviciosPeriodo.length * 1500;
      const descuento = parseFloat(empresa.descuentoVolumen || '0') * subtotal / 100;
      const itbis = (subtotal - descuento) * 0.18;
      const total = subtotal - descuento + itbis;

      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + (empresa.diasCredito || 30));

      const factura = await storage.createEmpresaFactura({
        empresaId: empresa.id,
        numeroFactura,
        periodo,
        fechaVencimiento,
        totalServicios: serviciosPeriodo.length,
        subtotal: subtotal.toFixed(2),
        descuento: descuento.toFixed(2),
        itbis: itbis.toFixed(2),
        total: total.toFixed(2),
      });

      for (const servicio of serviciosPeriodo) {
        await storage.createEmpresaFacturaItem({
          facturaId: factura.id,
          servicioId: servicio.servicioCreado || null,
          proyectoId: servicio.proyectoId || null,
          descripcion: `Servicio ${servicio.servicioCategoria} - ${servicio.origenDireccion}`,
          cantidad: 1,
          precioUnitario: "1500.00",
          descuento: "0.00",
          subtotal: "1500.00",
        });
      }

      logSystem.info('Invoice generated', { facturaId: factura.id, empresaId: empresa.id, periodo });
      res.status(201).json(factura);
    } catch (error: any) {
      logSystem.error('Generate invoice error', error);
      if (error.code === '23505') {
        return res.status(409).json({ message: "Ya existe una factura para este período" });
      }
      res.status(500).json({ message: "Error al generar factura" });
    }
  });

  // Mark invoice as paid (admin only)
  app.put("/api/admin/facturas/:id/pagar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const { metodoPago, referenciaTransaccion } = req.body;
      
      const factura = await storage.updateEmpresaFactura(req.params.id, {
        estado: 'pagado' as any,
        fechaPago: new Date(),
        metodoPago,
        referenciaTransaccion,
      });

      logSystem.info('Invoice marked as paid', { facturaId: req.params.id });
      res.json(factura);
    } catch (error: any) {
      logSystem.error('Mark invoice paid error', error);
      res.status(500).json({ message: "Error al marcar factura como pagada" });
    }
  });

  // Get empresa stats for admin dashboard
  app.get("/api/admin/empresas-stats", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const empresas = await storage.getAllEmpresas();
      const stats = {
        totalEmpresas: empresas.length,
        empresasVerificadas: empresas.filter(e => e.verificado).length,
        empresasPendientes: empresas.filter(e => !e.verificado).length,
        empresasActivas: empresas.filter(e => e.activo).length,
        porTipo: {} as Record<string, number>,
      };

      for (const empresa of empresas) {
        const tipo = empresa.tipoEmpresa || 'otro';
        stats.porTipo[tipo] = (stats.porTipo[tipo] || 0) + 1;
      }

      res.json(stats);
    } catch (error: any) {
      logSystem.error('Get empresas stats error', error);
      res.status(500).json({ message: "Error al obtener estadísticas de empresas" });
    }
  });

  // ==================== END EMPRESAS / CONTRATOS EMPRESARIALES ====================

  // ==================== OPERATOR WALLET SYSTEM ====================

  // Zod schemas for wallet endpoints
  const payDebtSchema = z.object({
    amount: z.number()
      .positive("El monto debe ser mayor a cero")
      .max(1000000, "El monto excede el límite permitido"),
  });

  const processPaymentSchema = z.object({
    servicioId: z.string().min(1, "ID de servicio es requerido"),
    paymentMethod: z.enum(["efectivo", "tarjeta"]),
    serviceAmount: z.number()
      .positive("El monto debe ser mayor a cero")
      .max(1000000, "El monto excede el límite permitido"),
  });

  const completeDebtPaymentSchema = z.object({
    paymentMethodId: z.string().min(1, "ID del método de pago es requerido"),
    amount: z.number()
      .positive("El monto debe ser mayor a cero")
      .max(1000000, "El monto excede el límite permitido"),
  });

  const adminAdjustmentSchema = z.object({
    adjustmentType: z.enum(["balance", "debt"]),
    amount: z.number()
      .min(-100000, "El ajuste mínimo es -100,000")
      .max(100000, "El ajuste máximo es 100,000"),
    reason: z.string().min(5, "La razón debe tener al menos 5 caracteres").max(500, "La razón es muy larga"),
  });

  // Get operator wallet
  app.get("/api/wallet", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      let wallet = await WalletService.getWallet(conductor.id);
      if (!wallet) {
        wallet = await WalletService.createWallet(conductor.id);
        wallet = await WalletService.getWallet(conductor.id);
      }

      res.json(wallet);
    } catch (error: any) {
      logSystem.error('Get wallet error', error);
      res.status(500).json({ message: "Error al obtener billetera" });
    }
  });

  // Get wallet transaction history
  app.get("/api/wallet/transactions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await WalletService.getTransactionHistory(conductor.id, limit);
      res.json(transactions);
    } catch (error: any) {
      logSystem.error('Get wallet transactions error', error);
      res.status(500).json({ message: "Error al obtener transacciones" });
    }
  });

  // Get wallet debts
  app.get("/api/wallet/debts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const wallet = await WalletService.getWallet(conductor.id);
      if (!wallet) {
        return res.json({ debts: [], totalDebt: 0 });
      }

      res.json({
        debts: wallet.pendingDebts || [],
        totalDebt: parseFloat(wallet.totalDebt),
        cashServicesBlocked: wallet.cashServicesBlocked,
      });
    } catch (error: any) {
      logSystem.error('Get wallet debts error', error);
      res.status(500).json({ message: "Error al obtener deudas" });
    }
  });

  // Check if operator can accept cash services
  app.get("/api/wallet/can-accept-cash", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const result = await WalletService.canAcceptCashService(conductor.id);
      res.json(result);
    } catch (error: any) {
      logSystem.error('Check cash acceptance error', error);
      res.status(500).json({ message: "Error al verificar estado" });
    }
  });

  // Process service payment (internal use - called when service is completed)
  app.post("/api/wallet/process-payment", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const validation = processPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { servicioId, paymentMethod, serviceAmount } = validation.data;
      
      const servicio = await storage.getServicioById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      if (servicio.commissionProcessed) {
        return res.status(400).json({ message: "La comisión ya fue procesada para este servicio" });
      }

      const servicioMetodoPago = servicio.metodoPago;
      if (servicioMetodoPago && servicioMetodoPago !== paymentMethod) {
        return res.status(400).json({ 
          message: `El método de pago no coincide con el servicio. Esperado: ${servicioMetodoPago}` 
        });
      }

      const servicioCostoTotal = parseFloat(servicio.costoTotal);
      const tolerance = 0.01;
      if (Math.abs(serviceAmount - servicioCostoTotal) > tolerance) {
        return res.status(400).json({ 
          message: `El monto no coincide con el costo del servicio. Esperado: ${servicioCostoTotal}` 
        });
      }
      
      const result = await WalletService.processServicePayment(
        servicioId,
        paymentMethod,
        servicioCostoTotal
      );

      res.json(result);
    } catch (error: any) {
      logSystem.error('Process payment error', error);
      res.status(500).json({ message: error.message || "Error al procesar pago" });
    }
  });

  // Create payment intent for direct debt payment
  app.post("/api/wallet/create-payment-intent", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const validation = payDebtSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      const result = await WalletService.createDebtPaymentIntent(
        conductor.id,
        validation.data.amount
      );

      res.json(result);
    } catch (error: any) {
      logSystem.error('Create payment intent error', error);
      res.status(400).json({ message: error.message || "Error al crear intento de pago" });
    }
  });

  // Pay debt with saved card using Azul API
  app.post("/api/wallet/pay-debt", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const validation = completeDebtPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { paymentMethodId, amount } = validation.data;

      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      // Check if Azul is configured
      if (!AzulPaymentService.isConfigured()) {
        logSystem.warn('Azul API not configured for wallet debt payment', { conductorId: conductor.id });
        return res.status(503).json({ 
          message: "El servicio de pagos no está configurado. Contacte al administrador.",
          configured: false 
        });
      }

      // Verify payment method ownership
      const paymentMethod = await storage.getOperatorPaymentMethodById(paymentMethodId);
      if (!paymentMethod) {
        return res.status(404).json({ message: "Método de pago no encontrado" });
      }
      
      if (paymentMethod.conductorId !== conductor.id) {
        return res.status(403).json({ message: "No autorizado para usar este método de pago" });
      }

      // Get wallet and verify debt
      const wallet = await WalletService.getWallet(conductor.id);
      if (!wallet) {
        return res.status(404).json({ message: "Billetera no encontrada" });
      }

      const totalDebt = parseFloat(wallet.totalDebt);
      if (totalDebt <= 0) {
        return res.status(400).json({ message: "No tienes deuda pendiente" });
      }

      // Cap payment to actual debt amount
      const paymentAmount = Math.min(amount, totalDebt);
      const customOrderId = `WALLET-DEBT-${conductor.id}-${Date.now()}`;

      // Process payment with Azul
      const paymentResult = await AzulPaymentService.processPaymentWithToken(
        paymentMethod.azulDataVaultToken,
        {
          amount: AzulPaymentService.toAzulAmount(paymentAmount),
          customOrderId,
          orderDescription: `Pago de deuda wallet - Operador ${conductor.id}`,
        }
      );

      if (!paymentResult.success) {
        logSystem.error('Wallet debt payment failed', null, {
          conductorId: conductor.id,
          amount: paymentAmount,
          isoCode: paymentResult.isoCode,
          message: paymentResult.responseMessage,
        });
        return res.status(400).json({ 
          message: paymentResult.responseMessage || "Error al procesar el pago",
          errorCode: paymentResult.isoCode,
        });
      }

      // Update wallet to reduce debt
      await WalletService.payDebt(conductor.id, paymentAmount, {
        paymentMethod: 'azul_card',
        azulOrderId: paymentResult.azulOrderId,
        authorizationCode: paymentResult.authorizationCode,
        customOrderId,
      });

      logSystem.info('Wallet debt paid with Azul', {
        conductorId: conductor.id,
        amount: paymentAmount,
        azulOrderId: paymentResult.azulOrderId,
        remainingDebt: totalDebt - paymentAmount,
      });

      res.json({
        success: true,
        message: "Pago procesado exitosamente",
        payment: {
          amount: paymentAmount,
          azulOrderId: paymentResult.azulOrderId,
          authorizationCode: paymentResult.authorizationCode,
          remainingDebt: Math.max(0, totalDebt - paymentAmount),
        },
      });
    } catch (error: any) {
      logSystem.error('Wallet pay debt error', error);
      res.status(400).json({ message: error.message || "Error al procesar pago" });
    }
  });

  // Admin: Get all operator wallets
  app.get("/api/admin/wallets", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductores = await storage.getAllDrivers();
      const wallets = [];

      for (const conductor of conductores) {
        const wallet = await WalletService.getWallet(conductor.id);
        if (wallet) {
          wallets.push({
            ...wallet,
            conductorNombre: conductor.user.nombre + ' ' + conductor.user.apellido,
            conductorEmail: conductor.user.email,
          });
        }
      }

      wallets.sort((a, b) => parseFloat(b.totalDebt) - parseFloat(a.totalDebt));
      res.json(wallets);
    } catch (error: any) {
      logSystem.error('Get all wallets error', error);
      res.status(500).json({ message: "Error al obtener billeteras" });
    }
  });

  // Admin: Get wallet by conductor ID
  app.get("/api/admin/wallets/:conductorId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const wallet = await WalletService.getWallet(req.params.conductorId);
      if (!wallet) {
        return res.status(404).json({ message: "Billetera no encontrada" });
      }

      const conductor = await storage.getConductorById(req.params.conductorId);
      const user = conductor ? await storage.getUserById(conductor.userId) : null;

      res.json({
        ...wallet,
        conductorNombre: user ? `${user.nombre} ${user.apellido}` : 'N/A',
        conductorEmail: user?.email || 'N/A',
      });
    } catch (error: any) {
      logSystem.error('Get wallet by conductor error', error);
      res.status(500).json({ message: "Error al obtener billetera" });
    }
  });

  // Admin: Adjust wallet balance or debt
  app.post("/api/admin/wallets/:walletId/adjust", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const validation = adminAdjustmentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { adjustmentType, amount, reason } = validation.data;

      const updatedWallet = await WalletService.adminAdjustment(
        req.params.walletId,
        adjustmentType,
        amount,
        reason,
        req.user!.id
      );

      res.json(updatedWallet);
    } catch (error: any) {
      logSystem.error('Admin wallet adjustment error', error);
      res.status(400).json({ message: error.message || "Error al ajustar billetera" });
    }
  });

  // Admin: Unblock cash services manually
  app.post("/api/admin/wallets/:walletId/unblock", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      await WalletService.unblockCashServices(req.params.walletId);
      res.json({ message: "Servicios en efectivo desbloqueados" });
    } catch (error: any) {
      logSystem.error('Admin unblock cash services error', error);
      res.status(400).json({ message: error.message || "Error al desbloquear servicios" });
    }
  });

  // Admin: Get wallet statistics
  app.get("/api/admin/wallets-stats", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductores = await storage.getAllDrivers();
      let totalBalance = 0;
      let totalDebt = 0;
      let operatorsWithDebt = 0;
      let blockedOperators = 0;

      for (const conductor of conductores) {
        const wallet = await WalletService.getWallet(conductor.id);
        if (wallet) {
          totalBalance += parseFloat(wallet.balance);
          totalDebt += parseFloat(wallet.totalDebt);
          if (parseFloat(wallet.totalDebt) > 0) operatorsWithDebt++;
          if (wallet.cashServicesBlocked) blockedOperators++;
        }
      }

      res.json({
        totalOperators: conductores.length,
        totalBalance: totalBalance.toFixed(2),
        totalDebt: totalDebt.toFixed(2),
        operatorsWithDebt,
        blockedOperators,
      });
    } catch (error: any) {
      logSystem.error('Get wallet stats error', error);
      res.status(500).json({ message: "Error al obtener estadísticas" });
    }
  });

  // Admin: Process pending commissions for completed services that weren't processed
  app.post("/api/admin/wallets/process-pending-commissions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      // Get all completed services that haven't had commission processed
      const allServices = await storage.getAllServicios();
      const pendingServices = allServices.filter(s => 
        s.estado === 'completado' && 
        !s.commissionProcessed && 
        s.conductorId && 
        s.metodoPago && 
        s.costoTotal
      );

      const results = [];
      let processedCount = 0;
      let failedCount = 0;

      for (const servicio of pendingServices) {
        try {
          const paymentMethod = servicio.metodoPago as 'efectivo' | 'tarjeta';
          const serviceAmount = parseFloat(servicio.costoTotal);
          
          const walletResult = await WalletService.processServicePayment(
            servicio.id,
            paymentMethod,
            serviceAmount
          );
          
          results.push({
            servicioId: servicio.id,
            conductorId: servicio.conductorId,
            paymentMethod,
            serviceAmount,
            commission: walletResult.commission,
            operatorEarnings: walletResult.operatorEarnings,
            success: true
          });
          processedCount++;
          
          logSystem.info('Retroactively processed wallet for service', {
            servicioId: servicio.id,
            conductorId: servicio.conductorId,
            paymentMethod,
            serviceAmount,
            commission: walletResult.commission
          });
        } catch (error: any) {
          results.push({
            servicioId: servicio.id,
            conductorId: servicio.conductorId,
            error: error.message,
            success: false
          });
          failedCount++;
          
          logSystem.error('Failed to process wallet for service', error, {
            servicioId: servicio.id,
            conductorId: servicio.conductorId
          });
        }
      }

      res.json({
        message: `Procesados ${processedCount} servicios, ${failedCount} fallidos`,
        total: pendingServices.length,
        processed: processedCount,
        failed: failedCount,
        results
      });
    } catch (error: any) {
      logSystem.error('Process pending commissions error', error);
      res.status(500).json({ message: "Error al procesar comisiones pendientes" });
    }
  });

  // Admin: Get operator statement (earnings, services, debts for a period)
  app.get("/api/admin/operators/:id/statement", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductorId = req.params.id;
      
      // Parse optional date filters
      let periodStart: Date | undefined;
      let periodEnd: Date | undefined;
      
      if (req.query.startDate && typeof req.query.startDate === 'string') {
        periodStart = new Date(req.query.startDate);
        if (isNaN(periodStart.getTime())) {
          return res.status(400).json({ message: "Fecha de inicio inválida" });
        }
      }
      
      if (req.query.endDate && typeof req.query.endDate === 'string') {
        periodEnd = new Date(req.query.endDate);
        if (isNaN(periodEnd.getTime())) {
          return res.status(400).json({ message: "Fecha de fin inválida" });
        }
      }
      
      if (periodStart && periodEnd && periodStart > periodEnd) {
        return res.status(400).json({ message: "La fecha de inicio no puede ser posterior a la fecha de fin" });
      }
      
      const statement = await storage.getOperatorStatement(conductorId, periodStart, periodEnd);
      
      if (!statement) {
        return res.status(404).json({ message: "Conductor no encontrado o sin billetera" });
      }
      
      logSystem.info('Admin retrieved operator statement', { 
        adminId: req.user!.id, 
        conductorId,
        periodStart: periodStart?.toISOString(),
        periodEnd: periodEnd?.toISOString()
      });
      
      res.json(statement);
    } catch (error: any) {
      logSystem.error('Get operator statement error', error);
      res.status(500).json({ message: "Error al obtener estado de cuenta" });
    }
  });

  // Admin: Record manual payout to operator
  app.post("/api/admin/operators/:id/manual-payout", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductorId = req.params.id;
      const { amount, notes, evidenceUrl } = req.body;
      
      // Validate amount is a positive number string
      if (!amount || typeof amount !== 'string') {
        return res.status(400).json({ message: "Monto es requerido y debe ser un string" });
      }
      
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "Monto debe ser un número positivo" });
      }
      
      // Get wallet by conductorId to get walletId
      const wallet = await storage.getWalletByConductorId(conductorId);
      if (!wallet) {
        return res.status(404).json({ message: "Billetera del conductor no encontrada" });
      }
      
      // Record manual payout
      const transaction = await storage.recordManualPayout(
        wallet.id,
        amount,
        req.user!.id,
        notes || undefined,
        evidenceUrl || undefined
      );
      
      logSystem.info('Admin recorded manual payout', { 
        adminId: req.user!.id, 
        conductorId,
        walletId: wallet.id,
        amount,
        transactionId: transaction.id
      });
      
      res.json(transaction);
    } catch (error: any) {
      logSystem.error('Record manual payout error', error);
      res.status(500).json({ message: error.message || "Error al registrar pago manual" });
    }
  });

  // Admin: Generate operator statement PDF
  app.get("/api/admin/operators/:id/statement.pdf", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const conductorId = req.params.id;
      
      // Parse query params for period (support both startDate/endDate and periodStart/periodEnd)
      let periodStart: Date | undefined;
      let periodEnd: Date | undefined;
      
      const startDateParam = req.query.startDate || req.query.periodStart;
      const endDateParam = req.query.endDate || req.query.periodEnd;
      
      if (startDateParam && typeof startDateParam === 'string') {
        periodStart = new Date(startDateParam);
        if (isNaN(periodStart.getTime())) {
          return res.status(400).json({ message: "Fecha de inicio inválida" });
        }
      }
      
      if (endDateParam && typeof endDateParam === 'string') {
        periodEnd = new Date(endDateParam);
        if (isNaN(periodEnd.getTime())) {
          return res.status(400).json({ message: "Fecha de fin inválida" });
        }
      }
      
      if (periodStart && periodEnd && periodStart > periodEnd) {
        return res.status(400).json({ message: "La fecha de inicio no puede ser posterior a la fecha de fin" });
      }
      
      // Get operator statement data
      const statement = await storage.getOperatorStatement(conductorId, periodStart, periodEnd);
      
      if (!statement) {
        return res.status(404).json({ message: "Conductor no encontrado o sin billetera" });
      }
      
      // Generate statement number
      const statementNumber = pdfService.generateStatementNumber();
      
      // Transform data to OperatorStatementPDFData format
      const pdfData = {
        statementNumber,
        operatorName: statement.operatorName,
        operatorId: statement.operatorId,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        generatedDate: new Date(),
        openingBalance: statement.openingBalance,
        currentBalance: statement.currentBalance,
        totalDebt: statement.totalDebt,
        totalCredits: statement.totalCredits,
        totalDebits: statement.totalDebits,
        completedServices: statement.completedServices,
        transactions: statement.transactions.map(tx => ({
          date: tx.createdAt,
          type: tx.type,
          description: tx.description || '',
          amount: tx.amount,
          servicioId: tx.servicioId || undefined,
        })),
        pendingDebts: statement.pendingDebts.map(debt => ({
          id: debt.id,
          originalAmount: debt.originalAmount,
          remainingAmount: debt.remainingAmount,
          dueDate: debt.dueDate,
          status: debt.status,
          daysRemaining: debt.daysRemaining,
        })),
        manualPayouts: statement.manualPayouts.map(payout => ({
          date: payout.createdAt,
          amount: payout.amount,
          notes: payout.notes || undefined,
          evidenceUrl: payout.evidenceUrl || undefined,
          adminName: payout.recordedByAdmin?.nombre || undefined,
        })),
      };
      
      // Generate PDF
      const pdfBuffer = await pdfService.generateOperatorStatement(pdfData);
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `estado_cuenta_${conductorId.substring(0, 8)}_${dateStr}.pdf`;
      
      logSystem.info('Admin generated operator statement PDF', { 
        adminId: req.user!.id, 
        conductorId,
        statementNumber,
        periodStart: statement.periodStart.toISOString(),
        periodEnd: statement.periodEnd.toISOString()
      });
      
      // Return PDF with proper headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: any) {
      logSystem.error('Generate operator statement PDF error', error);
      res.status(500).json({ message: "Error al generar PDF del estado de cuenta" });
    }
  });

  // ==================== END OPERATOR WALLET SYSTEM ====================

  // ==================== TEST EMAIL ENDPOINT (Admin Only) ====================
  
  app.post("/api/admin/email/test", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { template, email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: "Email es requerido" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    try {
      const emailService = await getEmailService();
      const isConfigured = await emailService.isConfigured();
      
      if (!isConfigured) {
        return res.status(500).json({ 
          message: "Servicio de email no configurado. Verifique RESEND_API_KEY",
          configured: false
        });
      }

      const results: { template: string; success: boolean; error?: string }[] = [];
      
      const mockTicket = {
        id: 'TEST-12345678-ABCD-EFGH-IJKL-MNOPQRSTUVWX',
        titulo: 'Ticket de Prueba - Verificación de Plantilla',
        descripcion: 'Esta es una descripción de prueba para verificar el formato del correo',
        categoria: 'consulta_servicio',
        prioridad: 'media',
        estado: 'abierto'
      };

      const templates: { name: string; send: () => Promise<boolean> }[] = [
        {
          name: 'OTP/Verificación',
          send: () => emailService.sendOTPEmail(email, '123456', 'Usuario de Prueba')
        },
        {
          name: 'Bienvenida General',
          send: () => emailService.sendWelcomeEmail(email, 'Usuario de Prueba')
        },
        {
          name: 'Bienvenida Cliente',
          send: () => emailService.sendClientWelcomeEmail(email, 'Cliente de Prueba')
        },
        {
          name: 'Bienvenida Operador',
          send: () => emailService.sendOperatorWelcomeEmail(email, 'Operador de Prueba')
        },
        {
          name: 'Notificación de Servicio',
          send: () => emailService.sendServiceNotification(email, 'Prueba de Servicio', 'Este es un mensaje de prueba para verificar la plantilla de notificación de servicios.')
        },
        {
          name: 'Restablecer Contraseña',
          send: () => emailService.sendPasswordResetEmail(email, 'https://gruard.com/reset-password?token=test-token-12345', 'Usuario de Prueba')
        },
        {
          name: 'Documento Aprobado',
          send: () => emailService.sendDocumentApprovalEmail(email, 'Licencia de Conducir', true)
        },
        {
          name: 'Documento Rechazado',
          send: () => emailService.sendDocumentApprovalEmail(email, 'Seguro del Vehículo', false, 'El documento está vencido o ilegible')
        },
        {
          name: 'Ticket Creado',
          send: () => emailService.sendTicketCreatedEmail(email, 'Usuario de Prueba', mockTicket)
        },
        {
          name: 'Ticket Estado Cambiado',
          send: () => emailService.sendTicketStatusChangedEmail(email, 'Usuario de Prueba', mockTicket, 'abierto', 'en_proceso')
        },
        {
          name: 'Respuesta de Soporte',
          send: () => emailService.sendTicketSupportResponseEmail(email, 'Usuario de Prueba', mockTicket, 'Gracias por contactarnos. Estamos revisando su solicitud y le responderemos a la brevedad.')
        },
        {
          name: 'Socio/Inversor Creado',
          send: () => emailService.sendSocioCreatedEmail(email, 'Inversor de Prueba', 'TempPass123!', '5.00')
        },
        {
          name: 'Socio Primer Login',
          send: () => emailService.sendSocioFirstLoginEmail(email, 'Inversor de Prueba')
        },
        {
          name: 'Administrador Creado',
          send: () => emailService.sendAdminCreatedEmail(email, 'Admin de Prueba', 'AdminPass123!', ['dashboard', 'analytics', 'usuarios'])
        }
      ];

      if (template && template !== 'all') {
        const selectedTemplate = templates.find(t => t.name === template);
        if (!selectedTemplate) {
          return res.status(400).json({ 
            message: `Plantilla "${template}" no encontrada`,
            availableTemplates: templates.map(t => t.name)
          });
        }
        
        const success = await selectedTemplate.send();
        results.push({ template: selectedTemplate.name, success });
      } else {
        for (const tmpl of templates) {
          try {
            const success = await tmpl.send();
            results.push({ template: tmpl.name, success });
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error: any) {
            results.push({ template: tmpl.name, success: false, error: error.message });
          }
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      logSystem.info('Test emails sent', { 
        targetEmail: email,
        successCount,
        failedCount,
        sentBy: req.user!.id
      });

      res.json({
        message: `Enviados ${successCount} correos de prueba${failedCount > 0 ? `, ${failedCount} fallidos` : ''}`,
        email,
        results
      });
    } catch (error: any) {
      logSystem.error('Send test emails error', error);
      res.status(500).json({ message: "Error al enviar correos de prueba", error: error.message });
    }
  });

  // Get available email templates
  app.get("/api/admin/email/templates", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "No autorizado" });
    }

    const templates = [
      { name: 'OTP/Verificación', description: 'Código de verificación de 6 dígitos' },
      { name: 'Bienvenida General', description: 'Email de bienvenida genérico' },
      { name: 'Bienvenida Cliente', description: 'Bienvenida para nuevos clientes' },
      { name: 'Bienvenida Operador', description: 'Bienvenida para nuevos operadores' },
      { name: 'Notificación de Servicio', description: 'Notificaciones de estado de servicio' },
      { name: 'Restablecer Contraseña', description: 'Link para restablecer contraseña' },
      { name: 'Documento Aprobado', description: 'Notificación de documento aprobado' },
      { name: 'Documento Rechazado', description: 'Notificación de documento rechazado' },
      { name: 'Ticket Creado', description: 'Confirmación de ticket de soporte' },
      { name: 'Ticket Estado Cambiado', description: 'Cambio de estado de ticket' },
      { name: 'Respuesta de Soporte', description: 'Respuesta del equipo de soporte' },
      { name: 'Socio/Inversor Creado', description: 'Credenciales para nuevos socios' },
      { name: 'Socio Primer Login', description: 'Confirmación de primer acceso' },
      { name: 'Administrador Creado', description: 'Credenciales para nuevos administradores' }
    ];

    const emailService = await getEmailService();
    const isConfigured = await emailService.isConfigured();

    res.json({
      configured: isConfigured,
      templates
    });
  });

  // ==================== END TEST EMAIL ENDPOINT ====================

  initServiceAutoCancellation(serviceSessions);
  initWalletService();
  logSystem.info(`Service auto-cancellation initialized (timeout: ${SERVICE_TIMEOUT_MINUTES} minutes)`);

  return httpServer;
}
