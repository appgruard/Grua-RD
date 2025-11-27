import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { storageService } from "./storage-service";
import { pushService } from "./push-service";
import { smsService, generateOTP } from "./sms-service";
import { getVerificationHistory } from "./services/identity";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { insertUserSchema, insertServicioSchema, insertTarifaSchema, insertMensajeChatSchema, insertPushSubscriptionSchema, insertDocumentoSchema } from "@shared/schema";
import type { User, Servicio } from "@shared/schema";
import { logAuth, logTransaction, logService, logDocument, logSystem } from "./logger";
import { z } from "zod";
import { uploadDocument, getDocument, isStorageInitialized } from "./services/object-storage";
import { pdfService } from "./services/pdf-service";
import { insuranceValidationService, getSupportedInsurers, InsurerCode } from "./services/insurance";
import { documentValidationService } from "./services/document-validation";

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

const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;

declare global {
  namespace Express {
    interface User extends User {}
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          logAuth.loginFailed(email, "User not found");
          return done(null, false);
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          logAuth.loginFailed(email, "Invalid password");
          return done(null, false);
        }

        logAuth.loginSuccess(user.id, user.email);
        return done(null, user);
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
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/payments/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      return res.status(503).json({ message: "Payment service not configured" });
    }

    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-11-20.acacia' as any,
      });

      const sig = req.headers['stripe-signature'];
      
      if (!sig) {
        return res.status(400).json({ message: "No signature" });
      }

      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const servicioId = paymentIntent.metadata.servicioId;

        if (servicioId) {
          const servicio = await storage.getServicioById(servicioId);
          
          if (!servicio) {
            logSystem.error('Webhook: Service not found', null, { servicioId, paymentIntentId: paymentIntent.id });
            return res.json({ received: true });
          }

          if (servicio.stripePaymentId === paymentIntent.id) {
            logSystem.info('Webhook: Payment already processed (idempotent)', { paymentIntentId: paymentIntent.id, servicioId });
            return res.json({ received: true });
          }

          const existingComision = await storage.getComisionByServicioId(servicioId);
          if (existingComision) {
            logSystem.warn('Webhook: Commission already exists', { servicioId, comisionId: existingComision.id });
            return res.json({ received: true });
          }

          await storage.updateServicio(servicioId, {
            stripePaymentId: paymentIntent.id,
          });

          const montoTotal = parseFloat(servicio.costoTotal);
          const montoOperador = montoTotal * 0.7;
          const montoEmpresa = montoTotal * 0.3;

          const comision = await storage.createComision({
            servicioId,
            montoTotal: servicio.costoTotal,
            montoOperador: montoOperador.toFixed(2),
            montoEmpresa: montoEmpresa.toFixed(2),
          });

          logTransaction.paymentSuccess(servicioId, parseFloat(servicio.costoTotal), paymentIntent.id);
          logTransaction.commissionCreated(comision.id, servicioId, montoOperador, montoEmpresa);

          if (servicio.conductorId) {
            try {
              const { stripeConnectService } = await import('./services/stripe-connect');
              const conductor = await storage.getConductorById(servicio.conductorId);
              
              if (conductor && stripeConnectService.isConfigured()) {
                const stripeTransferId = await stripeConnectService.createTransfer(
                  montoOperador,
                  conductor.id,
                  servicioId
                );

                await storage.marcarComisionPagada(comision.id, 'operador', stripeTransferId);
                logSystem.info('Stripe Connect transfer created and commission marked as paid', {
                  transferId: stripeTransferId,
                  servicioId,
                  conductorId: conductor.id,
                  amount: montoOperador,
                  comisionId: comision.id,
                });
              } else if (!stripeConnectService.isConfigured()) {
                logSystem.warn('Stripe Connect not configured - cannot create transfer', {
                  servicioId,
                  conductorId: conductor?.id,
                });
              }
            } catch (error: any) {
              logSystem.error('Error creating Stripe Connect transfer', error, { servicioId, conductorId: servicio.conductorId });
            }
          }
        }
      } else if (event.type === 'account.updated') {
        try {
          const { stripeConnectService } = await import('./services/stripe-connect');
          await stripeConnectService.handleAccountUpdated(event);
          logSystem.info('Stripe Connect account updated webhook processed', {
            accountId: (event.data.object as any).id,
          });
        } catch (error: any) {
          logSystem.error('Error processing account.updated webhook', error);
        }
      } else if (event.type === 'payout.paid') {
        logSystem.info('Payout paid webhook received', {
          payoutId: (event.data.object as any).id,
        });
      }

      res.json({ received: true });
    } catch (error: any) {
      logSystem.error('Webhook error', error);
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });

  app.use(express.json());

  const sessionParser = session({
    secret: process.env.SESSION_SECRET || "gruard-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  });

  app.use(sessionParser);

  app.use(passport.initialize());
  app.use(passport.session());

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
            const { servicioId, conductorId, lat, lng } = message.payload;
            
            await storage.createUbicacionTracking({
              servicioId,
              conductorId,
              lat: lat.toString(),
              lng: lng.toString(),
            });

            if (serviceSessions.has(servicioId)) {
              const broadcast = JSON.stringify({
                type: 'driver_location_update',
                payload: { servicioId, lat, lng },
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

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { password, userType, conductorData, ...userData } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
      }

      const validationResult = insertUserSchema.safeParse({
        ...userData,
        passwordHash: password,
        userType: userType || 'cliente',
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return res.status(400).json({ 
          message: firstError.message || "Datos de registro inválidos",
          errors: validationResult.error.errors
        });
      }

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        logAuth.registerFailed(userData.email, "Email already registered");
        return res.status(400).json({ message: "Email ya está registrado" });
      }

      if (userData.phone) {
        const existingPhone = await storage.getUserByPhone(userData.phone);
        if (existingPhone) {
          logAuth.registerFailed(userData.email, "Phone already registered");
          return res.status(400).json({ message: "Teléfono ya está registrado" });
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        ...validationResult.data,
        passwordHash,
      });

      if (userType === 'conductor' && conductorData) {
        await storage.createConductor({
          userId: user.id,
          licencia: conductorData.licencia,
          placaGrua: conductorData.placaGrua,
          marcaGrua: conductorData.marcaGrua,
          modeloGrua: conductorData.modeloGrua,
        });
      }

      logAuth.registerSuccess(user.id, user.email, user.userType);

      req.login(user, (err) => {
        if (err) {
          logSystem.error("Login failed after registration", err, { userId: user.id });
          return res.status(500).json({ message: "Login failed after registration" });
        }
        res.json({ user });
      });
    } catch (error: any) {
      logSystem.error('Registration error', error);
      res.status(500).json({ message: "Error en el registro" });
    }
  });

  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      
      let dbStatus = 'unknown';
      let serviciosActivos = 0;
      let conductoresOnline = 0;
      
      try {
        const servicios = await storage.getAllServicios();
        const conductores = await storage.getAllConductores();
        
        dbStatus = 'connected';
        serviciosActivos = servicios.filter(s => 
          s.estado === 'aceptado' || s.estado === 'en_progreso'
        ).length;
        conductoresOnline = conductores.filter(c => c.disponible).length;
      } catch (error) {
        dbStatus = 'error';
        logSystem.error('Health check: Database error', error);
      }
      
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

  app.post("/api/auth/login", passport.authenticate("local"), (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { telefono, tipoOperacion } = req.body;

      if (!telefono || !tipoOperacion) {
        return res.status(400).json({ message: "Teléfono y tipo de operación son requeridos" });
      }

      if (!['registro', 'recuperacion_password'].includes(tipoOperacion)) {
        return res.status(400).json({ message: "Tipo de operación inválido" });
      }

      const codigo = generateOTP();
      const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

      await storage.deleteExpiredVerificationCodes();
      await storage.deletePriorVerificationCodes(telefono, tipoOperacion);

      await storage.createVerificationCode({
        telefono,
        codigo,
        expiraEn,
        tipoOperacion,
      });

      const mensaje = `Tu código de verificación para GruaRD es: ${codigo}. Válido por 10 minutos.`;
      await smsService.sendSMS(telefono, mensaje);

      logAuth.otpSent(telefono);

      res.json({ 
        message: "Código enviado exitosamente",
        expiresIn: 600
      });
    } catch (error: any) {
      logSystem.error('Send OTP error', error, { telefono });
      res.status(500).json({ message: "Error al enviar código de verificación" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { telefono, codigo, tipoOperacion } = req.body;

      if (!telefono || !codigo || !tipoOperacion) {
        return res.status(400).json({ message: "Datos incompletos" });
      }

      const verificationCode = await storage.getActiveVerificationCode(telefono, tipoOperacion);

      if (!verificationCode) {
        return res.status(400).json({ message: "Código inválido o expirado" });
      }

      if (verificationCode.intentos >= 3) {
        await storage.markVerificationCodeAsUsed(verificationCode.id);
        logAuth.otpFailed(telefono, verificationCode.intentos);
        return res.status(400).json({ message: "Demasiados intentos. Solicita un nuevo código" });
      }

      if (verificationCode.codigo !== codigo) {
        await storage.incrementVerificationAttempts(verificationCode.id);
        logAuth.otpFailed(telefono, verificationCode.intentos + 1);
        return res.status(400).json({ message: "Código incorrecto" });
      }

      await storage.markVerificationCodeAsUsed(verificationCode.id);

      if (tipoOperacion === 'registro') {
        const user = await storage.getUserByPhone(telefono);
        if (user) {
          await storage.updateUser(user.id, { 
            telefonoVerificado: true,
            estadoCuenta: 'activo'
          });
        }
      }

      logAuth.otpVerified(telefono);

      res.json({ 
        message: "Código verificado exitosamente",
        verified: true
      });
    } catch (error: any) {
      logSystem.error('Verify OTP error', error, { telefono });
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

      res.json({
        cedulaVerificada: user?.cedulaVerificada || false,
        telefonoVerificado: user?.telefonoVerificado || false,
        fullyVerified: verified,
        cedula: user?.cedulaVerificada ? user.cedula : null,
        phone: user?.telefonoVerificado ? user.phone : null
      });
    } catch (error: any) {
      logSystem.error('Get identity status error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al obtener estado de verificación" });
    }
  });

  app.patch("/api/users/me", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { nombre, apellido, conductorData } = req.body;
      const userId = req.user!.id;

      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (apellido !== undefined) updateData.apellido = apellido;

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

      res.json({ user: updatedUser });
    } catch (error: any) {
      logSystem.error('Update user profile error', error, { userId: req.user?.id });
      res.status(500).json({ message: "Error al actualizar perfil" });
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
      logSystem.error('Reset password error', error, { telefono });
      res.status(500).json({ message: "Error al resetear contraseña" });
    }
  });

  app.post("/api/services/request", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const validationSchema = insertServicioSchema.extend({
        clienteId: z.string().optional(),
      }).refine((data) => {
        if (data.metodoPago === "aseguradora") {
          return !!(data.aseguradoraNombre && data.aseguradoraPoliza);
        }
        return true;
      }, {
        message: "Nombre de aseguradora y número de póliza son requeridos cuando el método de pago es aseguradora",
      });

      const validatedData = validationSchema.parse(req.body);

      const servicioData: any = {
        clienteId: req.user!.id,
        ...validatedData,
      };

      if (validatedData.metodoPago === "aseguradora") {
        servicioData.aseguradoraEstado = "pendiente";
      }

      const servicio = await storage.createServicio(servicioData);

      logService.created(servicio.id, req.user!.id, req.body.origenDireccion || 'N/A', req.body.destinoDireccion || 'N/A');

      const availableDrivers = await storage.getAvailableDrivers();
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

  app.get("/api/services/my-services", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = req.user!;
      let services;

      if (user.userType === 'cliente') {
        services = await storage.getServiciosByClientId(user.id);
      } else if (user.userType === 'conductor') {
        services = await storage.getServiciosByConductorId(user.id);
      } else {
        services = [];
      }

      res.json(services);
    } catch (error: any) {
      logSystem.error('Get my services error', error);
      res.status(500).json({ message: "Failed to get services" });
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
        
        // Required document types
        const requiredTypes = ['licencia', 'matricula', 'seguro_grua', 'foto_vehiculo', 'cedula_frontal', 'cedula_trasera'];
        
        // Document types that can expire
        const documentosConVencimiento = ['seguro_grua', 'licencia', 'matricula'];
        
        // Map document types to Spanish names for user-friendly messages
        const documentTypeNames: Record<string, string> = {
          'licencia': 'Licencia de Conducir',
          'matricula': 'Matrícula del Vehículo',
          'seguro_grua': 'Seguro de Grúa',
          'foto_vehiculo': 'Foto del Vehículo',
          'cedula_frontal': 'Cédula (Frente)',
          'cedula_trasera': 'Cédula (Atrás)',
        };
        
        // Check which required documents are missing or not approved
        const missingDocuments: string[] = [];
        const expiredDocuments: string[] = [];
        const now = new Date();
        
        for (const requiredType of requiredTypes) {
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
      const requests = await storage.getPendingServicios();
      res.json(requests);
    } catch (error: any) {
      logSystem.error('Get nearby requests error', error);
      res.status(500).json({ message: "Failed to get requests" });
    }
  });

  app.get("/api/drivers/active-service", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const services = await storage.getServiciosByConductorId(req.user!.id);
      const activeService = services.find(s => s.estado === 'aceptado' || s.estado === 'en_progreso');
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
      const servicio = await storage.acceptServicio(req.params.id, req.user!.id);
      
      logService.accepted(servicio.id, req.user!.id);
      
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

      const conductorName = `${req.user!.nombre} ${req.user!.apellido}`;
      await pushService.notifyServiceAccepted(servicio.id, servicio.clienteId, conductorName);

      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Accept service error', error, { servicioId: req.params.id, conductorId: req.user!.id });
      res.status(500).json({ message: "Failed to accept service" });
    }
  });

  app.post("/api/services/:id/arrived", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicio = await storage.updateServicio(req.params.id, {
        estado: 'conductor_en_sitio',
      });

      logService.info('Driver arrived at origin', { servicioId: servicio.id });

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
      });

      logService.info('Driver loading vehicle', { servicioId: servicio.id });

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
      const startTime = oldService?.iniciadoAt ? new Date(oldService.iniciadoAt).getTime() : Date.now();
      const duration = Math.floor((Date.now() - startTime) / 1000);

      const servicio = await storage.updateServicio(req.params.id, {
        estado: 'completado',
        completadoAt: new Date(),
      });

      logService.completed(servicio.id, duration);

      await pushService.notifyServiceCompleted(servicio.id, servicio.clienteId);

      res.json(servicio);
    } catch (error: any) {
      logSystem.error('Complete service error', error, { servicioId: req.params.id });
      res.status(500).json({ message: "Failed to complete service" });
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

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const users = await storage.getAllUsers();
      res.json(users);
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
      res.json(drivers);
    } catch (error: any) {
      logSystem.error('Get drivers error', error);
      res.status(500).json({ message: "Failed to get drivers" });
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
      res.json(drivers);
    } catch (error: any) {
      logSystem.error('Get active drivers error', error);
      res.status(500).json({ message: "Failed to get active drivers" });
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

  app.post("/api/pricing/calculate", async (req: Request, res: Response) => {
    try {
      const { distanceKm } = req.body;
      const tarifa = await storage.getActiveTarifa();

      if (!tarifa) {
        return res.status(404).json({ message: "No active pricing found" });
      }

      const precioBase = parseFloat(tarifa.precioBase as string);
      const tarifaPorKm = parseFloat(tarifa.tarifaPorKm as string);
      const total = precioBase + (distanceKm * tarifaPorKm);

      res.json({ total, precioBase, tarifaPorKm, distanceKm });
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

    try {
      const { tipoDocumento, fechaVencimiento } = req.body;
      
      if (!tipoDocumento) {
        return res.status(400).json({ message: "Tipo de documento es requerido" });
      }

      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Conductor no encontrado" });
      }

      // Upload to object storage
      const uploadResult = await uploadDocument({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        userId: conductor.id,
        documentType: tipoDocumento,
      });

      // Document types that require expiration date
      const documentosConVencimiento = ['seguro_grua', 'licencia', 'matricula'];
      
      // Validate expiration date is required for all documents with expiration
      if (documentosConVencimiento.includes(tipoDocumento) && !fechaVencimiento) {
        return res.status(400).json({ message: "La fecha de vencimiento es requerida para este tipo de documento" });
      }
      
      // Parse expiration date if provided and document type supports it
      let validoHasta: Date | undefined = undefined;
      if (fechaVencimiento && documentosConVencimiento.includes(tipoDocumento)) {
        const parsedDate = new Date(fechaVencimiento);
        if (!isNaN(parsedDate.getTime())) {
          // Validate that expiration date is in the future for all documents with expiration
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (parsedDate <= today) {
            return res.status(400).json({ message: "La fecha de vencimiento debe ser una fecha futura" });
          }
          validoHasta = parsedDate;
        }
      }

      // Save document metadata to database
      const documento = await storage.createDocumento({
        conductorId: conductor.id,
        tipo: tipoDocumento,
        url: uploadResult.key,
        nombreArchivo: uploadResult.fileName,
        tamanoArchivo: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        estado: 'pendiente',
        validoHasta: validoHasta,
      });

      logDocument.uploaded(documento.id, tipoDocumento, conductor.id);
      res.json(documento);
    } catch (error: any) {
      logSystem.error('Upload document error', error);
      res.status(500).json({ message: error.message || "Failed to upload document" });
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

      res.setHeader('Content-Type', documento.mimeType);
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
            await pushService.sendNotification(
              user.id,
              `Documento ${estadoTexto}`,
              `Tu ${tipoLabel} ha sido ${estadoTexto}${motivoRechazo ? ': ' + motivoRechazo : ''}`,
              { type: 'document_review', documentId }
            );
          }
        }
      } else if (documento.usuarioId) {
        // Document belongs to a client (e.g., seguro_cliente)
        await pushService.sendNotification(
          documento.usuarioId,
          `Documento ${estadoTexto}`,
          `Tu ${tipoLabel} ha sido ${estadoTexto}${motivoRechazo ? ': ' + motivoRechazo : ''}`,
          { type: 'document_review', documentId }
        );
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
        await pushService.sendNotification(
          conductor.userId,
          'Cuenta Suspendida',
          `Tu cuenta ha sido suspendida: ${motivo}`,
          { type: 'account_suspended', reason: 'admin_action' }
        );
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
        await pushService.sendNotification(
          conductor.userId,
          'Cuenta Reactivada',
          'Tu cuenta ha sido reactivada. Ya puedes volver a aceptar servicios.',
          { type: 'account_reactivated' }
        );
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
  // Upload client insurance document
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

    try {
      const { aseguradoraNombre, numeroPoliza, fechaVencimiento } = req.body;
      
      if (!aseguradoraNombre || !numeroPoliza) {
        return res.status(400).json({ message: "Nombre de aseguradora y número de póliza son requeridos" });
      }

      // Check if client already has an insurance document
      const existingInsurance = await storage.getClientInsuranceDocument(req.user!.id);
      if (existingInsurance) {
        // Delete existing document first
        const { deleteDocument } = await import('./services/object-storage');
        await deleteDocument(existingInsurance.url);
        await storage.deleteDocumento(existingInsurance.id);
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

      // Save document metadata to database
      const documento = await storage.createDocumento({
        usuarioId: req.user!.id,
        tipo: 'seguro_cliente',
        url: uploadResult.key,
        nombreArchivo: `${aseguradoraNombre} - ${numeroPoliza}`,
        tamanoArchivo: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        estado: 'pendiente',
        validoHasta: validoHasta,
      });

      logDocument.uploaded(documento.id, 'seguro_cliente', req.user!.id);
      res.json(documento);
    } catch (error: any) {
      logSystem.error('Upload client insurance error', error);
      res.status(500).json({ message: error.message || "Error al subir documento de seguro" });
    }
  });

  // Get client insurance document
  app.get("/api/client/insurance", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'cliente') {
      return res.status(403).json({ message: "Solo clientes pueden ver su seguro" });
    }

    try {
      const documento = await storage.getClientInsuranceDocument(req.user!.id);
      res.json(documento || null);
    } catch (error: any) {
      logSystem.error('Get client insurance error', error);
      res.status(500).json({ message: "Error al obtener documento de seguro" });
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
      const insuranceDoc = await storage.getClientInsuranceDocument(req.user!.id);
      
      res.json({
        hasApprovedInsurance,
        insuranceStatus: insuranceDoc?.estado || null,
        insuranceDocument: insuranceDoc || null,
      });
    } catch (error: any) {
      logSystem.error('Check client insurance status error', error);
      res.status(500).json({ message: "Error al verificar estado del seguro" });
    }
  });

  // Delete client insurance document
  app.delete("/api/client/insurance", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'cliente') {
      return res.status(403).json({ message: "Solo clientes pueden eliminar su seguro" });
    }

    try {
      const documento = await storage.getClientInsuranceDocument(req.user!.id);
      
      if (!documento) {
        return res.status(404).json({ message: "No se encontró documento de seguro" });
      }

      // Delete from object storage
      const { deleteDocument } = await import('./services/object-storage');
      await deleteDocument(documento.url);
      
      // Delete from database
      await storage.deleteDocumento(documento.id);
      
      logDocument.deleted(req.user!.id, documento.id);
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
      
      logService.updated(req.user!.id, id, { action: 'insurance_approved' });

      // Send push notification to client (with error handling)
      try {
        await pushService.sendNotification(
          servicio.clienteId,
          'Póliza de seguro aprobada',
          'Tu solicitud de servicio con aseguradora ha sido aprobada. Los conductores ya pueden aceptar tu solicitud.',
          { type: 'insurance_approved', servicioId: id }
        );
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
      
      logService.updated(req.user!.id, id, { action: 'insurance_rejected', reason: motivoRechazo });

      // Send push notification to client (with error handling)
      try {
        await pushService.sendNotification(
          servicio.clienteId,
          'Póliza de seguro rechazada',
          `Tu solicitud de servicio con aseguradora fue rechazada: ${motivoRechazo}`,
          { type: 'insurance_rejected', servicioId: id, reason: motivoRechazo }
        );
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
    try {
      const { origin, destination } = req.body;

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
        const element = data.rows[0].elements[0];
        res.json({
          distanceKm: element.distance.value / 1000,
          durationMinutes: element.duration.value / 60,
          distanceText: element.distance.text,
          durationText: element.duration.text,
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
    try {
      const { address } = req.body;

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        res.json({ lat: location.lat, lng: location.lng });
      } else {
        res.status(400).json({ message: "Failed to geocode address" });
      }
    } catch (error: any) {
      logSystem.error('Geocode error', error);
      res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  app.post("/api/payments/create-intent", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { servicioId } = req.body;

      if (!servicioId) {
        return res.status(400).json({ message: "servicioId is required" });
      }

      const servicio = await storage.getServicioById(servicioId);

      if (!servicio) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (servicio.clienteId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to pay for this service" });
      }

      if (servicio.estado !== 'pendiente') {
        return res.status(400).json({ message: "Service is not in pending state" });
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey) {
        return res.status(503).json({ 
          message: "Payment service not configured. Please contact administrator.",
          configured: false 
        });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-11-20.acacia' as any,
      });

      const amount = Math.round(parseFloat(servicio.costoTotal) * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'dop',
        metadata: {
          servicioId,
          userId: req.user!.id,
        },
      });

      logTransaction.paymentStarted(servicioId, parseFloat(servicio.costoTotal), 'tarjeta');

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: servicio.costoTotal,
      });
    } catch (error: any) {
      logTransaction.paymentFailed(req.body.servicioId || 'unknown', 0, error.message);
      logSystem.error('Create payment intent error', error, { servicioId: req.body.servicioId });
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  app.post("/api/payments/create-setup-intent", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey) {
        return res.status(503).json({ 
          message: "Payment service not configured. Please contact administrator.",
          configured: false 
        });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-11-20.acacia' as any,
      });

      const setupIntent = await stripe.setupIntents.create({
        payment_method_types: ['card'],
        metadata: {
          userId: req.user!.id,
        },
      });

      logSystem.info('Setup intent created', { userId: req.user!.id, setupIntentId: setupIntent.id });

      res.json({
        clientSecret: setupIntent.client_secret,
      });
    } catch (error: any) {
      logSystem.error('Create setup intent error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to create setup intent" });
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
      const { tipo, stripeTransferId } = req.body;
      
      if (!tipo || (tipo !== 'operador' && tipo !== 'empresa')) {
        return res.status(400).json({ message: "Valid tipo (operador/empresa) is required" });
      }

      const comision = await storage.marcarComisionPagada(req.params.id, tipo, stripeTransferId);
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

      doc.fontSize(20).text('GruaRD', { align: 'center' });
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

      doc.fontSize(14).text(`Costo Total: RD$ ${parseFloat(servicio.costoTotal).toFixed(2)}`, { bold: true });
      doc.fontSize(12).text(`Método de Pago: ${servicio.metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}`);
      if (servicio.stripePaymentId) {
        doc.text(`ID de Transacción: ${servicio.stripePaymentId}`);
      }
      doc.moveDown();

      doc.fontSize(10).text('Información Fiscal', { underline: true });
      doc.text('GruaRD - República Dominicana');
      doc.text('RNC: XXXXXXXXX');
      doc.text('Este documento es válido como comprobante de pago');

      doc.end();
    } catch (error: any) {
      logSystem.error('Generate receipt error', error);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });

  // ========================================
  // STRIPE CONNECT ENDPOINTS
  // ========================================

  app.post("/api/drivers/stripe-onboarding", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can access this endpoint" });
    }

    try {
      const { stripeConnectService } = await import('./services/stripe-connect');
      
      if (!stripeConnectService.isConfigured()) {
        return res.status(503).json({ 
          message: "Stripe Connect not configured",
          configured: false 
        });
      }

      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const result = await stripeConnectService.createConnectedAccount(conductor.id);
      
      logSystem.info('Stripe Connect onboarding started', { 
        conductorId: conductor.id,
        userId: req.user!.id 
      });

      res.json(result);
    } catch (error: any) {
      logSystem.error('Stripe Connect onboarding error', error, { userId: req.user!.id });
      res.status(500).json({ message: error.message || "Failed to start Stripe onboarding" });
    }
  });

  app.get("/api/drivers/stripe-account-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user!.userType !== 'conductor') {
      return res.status(403).json({ message: "Only drivers can access this endpoint" });
    }

    try {
      const { stripeConnectService } = await import('./services/stripe-connect');

      const conductor = await storage.getConductorByUserId(req.user!.id);
      if (!conductor) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const status = await stripeConnectService.getAccountStatus(conductor.id);
      res.json(status);
    } catch (error: any) {
      logSystem.error('Get Stripe account status error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to get account status" });
    }
  });

  // ========================================
  // PAYMENT METHODS ENDPOINTS
  // ========================================

  app.post("/api/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json({ message: "paymentMethodId is required" });
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return res.status(503).json({ 
          message: "Payment service not configured",
          configured: false 
        });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-11-20.acacia' as any,
      });

      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      if (paymentMethod.type !== 'card') {
        return res.status(400).json({ message: "Only card payment methods are supported" });
      }

      const { db } = await import('./db');
      const { paymentMethods } = await import('./schema-extensions');
      const { eq } = await import('drizzle-orm');

      const existingMethods = await db.query.paymentMethods.findMany({
        where: eq(paymentMethods.userId, req.user!.id),
      });

      const isFirst = existingMethods.length === 0;

      const savedMethod = await db.insert(paymentMethods).values({
        userId: req.user!.id,
        stripePaymentMethodId: paymentMethodId,
        brand: paymentMethod.card!.brand,
        last4: paymentMethod.card!.last4,
        expiryMonth: paymentMethod.card!.exp_month,
        expiryYear: paymentMethod.card!.exp_year,
        isDefault: isFirst,
      }).returning();

      logSystem.info('Payment method added', { 
        userId: req.user!.id,
        methodId: paymentMethodId 
      });

      res.json(savedMethod[0]);
    } catch (error: any) {
      logSystem.error('Add payment method error', error, { userId: req.user!.id });
      res.status(500).json({ message: "Failed to add payment method" });
    }
  });

  app.get("/api/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { db } = await import('./db');
      const { paymentMethods } = await import('./schema-extensions');
      const { eq } = await import('drizzle-orm');

      const methods = await db.query.paymentMethods.findMany({
        where: eq(paymentMethods.userId, req.user!.id),
      });

      res.json(methods);
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
      const { db } = await import('./db');
      const { paymentMethods } = await import('./schema-extensions');
      const { eq, and } = await import('drizzle-orm');

      const method = await db.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.id, req.params.id),
          eq(paymentMethods.userId, req.user!.id)
        ),
      });

      if (!method) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      await db.delete(paymentMethods).where(eq(paymentMethods.id, req.params.id));

      if (method.isDefault) {
        const remainingMethods = await db.query.paymentMethods.findMany({
          where: eq(paymentMethods.userId, req.user!.id),
        });

        if (remainingMethods.length > 0) {
          await db
            .update(paymentMethods)
            .set({ isDefault: true })
            .where(eq(paymentMethods.id, remainingMethods[0].id));
        }
      }

      logSystem.info('Payment method deleted', { 
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
      const { db } = await import('./db');
      const { paymentMethods } = await import('./schema-extensions');
      const { eq, and } = await import('drizzle-orm');

      const method = await db.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.id, req.params.id),
          eq(paymentMethods.userId, req.user!.id)
        ),
      });

      if (!method) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      await db
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.userId, req.user!.id));

      await db
        .update(paymentMethods)
        .set({ isDefault: true })
        .where(eq(paymentMethods.id, req.params.id));

      logSystem.info('Payment method set as default', { 
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
      
      logService.updated(req.user!.id, req.params.id, { action: 'insurance_approved_by_insurer', monto: montoAprobado });

      // Send notification to client
      if (servicio.servicio?.clienteId) {
        try {
          await pushService.sendNotification(
            servicio.servicio.clienteId,
            'Servicio aprobado por aseguradora',
            `Tu servicio de grúa ha sido aprobado por ${aseguradora.nombreEmpresa}`,
            { type: 'insurance_approved', servicioId: servicio.servicioId }
          );
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
      
      logService.updated(req.user!.id, req.params.id, { action: 'insurance_rejected_by_insurer', motivo });

      // Send notification to client
      if (servicio.servicio?.clienteId) {
        try {
          await pushService.sendNotification(
            servicio.servicio.clienteId,
            'Servicio rechazado por aseguradora',
            `Tu servicio de grúa fue rechazado: ${motivo}`,
            { type: 'insurance_rejected', servicioId: servicio.servicioId, reason: motivo }
          );
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
      res.json({ user, aseguradora });
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

  return httpServer;
}
