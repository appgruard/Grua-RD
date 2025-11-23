import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { storageService } from "./storage-service";
import { pushService } from "./push-service";
import { smsService, generateOTP } from "./sms-service";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import multer from "multer";
import { insertUserSchema, insertServicioSchema, insertTarifaSchema, insertMensajeChatSchema, insertPushSubscriptionSchema, insertDocumentoSchema } from "@shared/schema";
import type { User, Servicio } from "@shared/schema";

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
          return done(null, false);
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
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
            console.error(`Webhook: Service ${servicioId} not found`);
            return res.json({ received: true });
          }

          if (servicio.stripePaymentId === paymentIntent.id) {
            console.log(`Webhook: Payment ${paymentIntent.id} already processed (idempotent)`);
            return res.json({ received: true });
          }

          const existingComision = await storage.getComisionByServicioId(servicioId);
          if (existingComision) {
            console.log(`Webhook: Commission for service ${servicioId} already exists`);
            return res.json({ received: true });
          }

          await storage.updateServicio(servicioId, {
            stripePaymentId: paymentIntent.id,
          });

          const montoTotal = parseFloat(servicio.costoTotal);
          const montoOperador = montoTotal * 0.7;
          const montoEmpresa = montoTotal * 0.3;

          await storage.createComision({
            servicioId,
            montoTotal: servicio.costoTotal,
            montoOperador: montoOperador.toFixed(2),
            montoEmpresa: montoEmpresa.toFixed(2),
          });

          console.log(`Webhook: Created commission for service ${servicioId}, payment ${paymentIntent.id}`);
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
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
        console.log('WebSocket connection rejected: Not authenticated');
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
        console.log('WebSocket connection terminated due to no pong response');
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
        console.log('WebSocket rejected: User not found');
        ws.close();
        return;
      }

      const extWs = ws as ExtendedWebSocket;
      extWs.isAlive = true;
      extWs.userId = user.id;
      extWs.userType = user.userType;

      console.log(`WebSocket authenticated: user ${user.id} (${user.userType})`);

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
              console.log(`join_service rejected: Service ${serviceId} not found`);
              break;
            }
            
            if (servicio.clienteId !== extWs.userId && servicio.conductorId !== extWs.userId) {
              console.log(`join_service rejected: User ${extWs.userId} not authorized for service ${serviceId}`);
              break;
            }
            
            if (!serviceSessions.has(serviceId)) {
              serviceSessions.set(serviceId, new Set());
            }
            serviceSessions.get(serviceId)!.add(ws);
            console.log(`User ${extWs.userId} joined service ${serviceId}`);
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
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket disconnected: user ${extWs.userId}`);
        
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
      console.error('WebSocket connection error:', error);
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
        return res.status(400).json({ message: "Email ya está registrado" });
      }

      if (userData.phone) {
        const existingPhone = await storage.getUserByPhone(userData.phone);
        if (existingPhone) {
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

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        res.json({ user });
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Error en el registro" });
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

      res.json({ 
        message: "Código enviado exitosamente",
        expiresIn: 600
      });
    } catch (error: any) {
      console.error('Send OTP error:', error);
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
        return res.status(400).json({ message: "Demasiados intentos. Solicita un nuevo código" });
      }

      if (verificationCode.codigo !== codigo) {
        await storage.incrementVerificationAttempts(verificationCode.id);
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

      res.json({ 
        message: "Código verificado exitosamente",
        verified: true
      });
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ message: "Error al verificar código" });
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
      console.error('Forgot password error:', error);
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

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Error al resetear contraseña" });
    }
  });

  app.post("/api/services/request", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const servicio = await storage.createServicio({
        clienteId: req.user!.id,
        ...req.body,
      });

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
      console.error('Create service error:', error);
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
      console.error('Get service error:', error);
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
      console.error('Get my services error:', error);
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
      console.error('Get driver data error:', error);
      res.status(500).json({ message: "Failed to get driver data" });
    }
  });

  app.put("/api/drivers/availability", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { disponible } = req.body;
      const conductor = await storage.updateDriverAvailability(req.user!.id, disponible);
      res.json(conductor);
    } catch (error: any) {
      console.error('Update availability error:', error);
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
      console.error('Update location error:', error);
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
      console.error('Get nearby requests error:', error);
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
      console.error('Get active service error:', error);
      res.status(500).json({ message: "Failed to get active service" });
    }
  });

  app.post("/api/services/:id/accept", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicio = await storage.acceptServicio(req.params.id, req.user!.id);
      
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
      console.error('Accept service error:', error);
      res.status(500).json({ message: "Failed to accept service" });
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

      await pushService.notifyServiceStarted(servicio.id, servicio.clienteId);

      res.json(servicio);
    } catch (error: any) {
      console.error('Start service error:', error);
      res.status(500).json({ message: "Failed to start service" });
    }
  });

  app.post("/api/services/:id/complete", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'conductor') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const servicio = await storage.updateServicio(req.params.id, {
        estado: 'completado',
        completadoAt: new Date(),
      });

      await pushService.notifyServiceCompleted(servicio.id, servicio.clienteId);

      res.json(servicio);
    } catch (error: any) {
      console.error('Complete service error:', error);
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
      console.error('Send message error:', error);
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
      console.error('Get messages error:', error);
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
      console.error('Mark messages read error:', error);
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
      console.error('Subscribe to push error:', error);
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
      console.error('Unsubscribe from push error:', error);
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
      console.error('Get push subscriptions error:', error);
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
      console.error('Get dashboard stats error:', error);
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
      console.error('Get users error:', error);
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
      console.error('Get drivers error:', error);
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
      console.error('Get services error:', error);
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
      console.error('Get active drivers error:', error);
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
      console.error('Get pricing error:', error);
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
      console.error('Create pricing error:', error);
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
      console.error('Update pricing error:', error);
      res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  app.get("/api/pricing/active", async (req: Request, res: Response) => {
    try {
      const tarifa = await storage.getActiveTarifa();
      res.json(tarifa);
    } catch (error: any) {
      console.error('Get active pricing error:', error);
      res.status(500).json({ message: "Failed to get active pricing" });
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
      console.error('Calculate pricing error:', error);
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
      console.error('Get revenue by period error:', error);
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
      console.error('Get services by period error:', error);
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
      console.error('Get driver rankings error:', error);
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
      console.error('Get services by hour error:', error);
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
      console.error('Get service status breakdown error:', error);
      res.status(500).json({ message: "Failed to get status breakdown" });
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
      console.error('Calculate route error:', error);
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
      console.error('Geocode error:', error);
      res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
      }
    },
  });

  app.post("/api/upload", upload.single('file'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { tipo, validoHasta } = req.body;
      
      if (!tipo) {
        return res.status(400).json({ message: "Document type is required" });
      }

      const validDocumentTypes = ['licencia', 'matricula', 'poliza', 'seguro_grua', 'foto_vehiculo', 'foto_perfil', 'cedula_frontal', 'cedula_trasera'];
      if (!validDocumentTypes.includes(tipo)) {
        return res.status(400).json({ message: "Invalid document type" });
      }

      let conductorId: number | null = null;
      let folder: string;

      if (req.user!.userType === 'conductor') {
        if (req.user!.estadoCuenta !== 'activo') {
          return res.status(403).json({ message: "Only active drivers can upload documents" });
        }

        const conductor = await storage.getConductorByUserId(req.user!.id);
        if (!conductor) {
          return res.status(403).json({ message: "Driver profile not found" });
        }
        conductorId = conductor.id;
        folder = `conductores/${conductorId}/documentos`;
      } else if (req.user!.userType === 'admin') {
        folder = `usuarios/${req.user!.id}/documentos`;
      } else {
        return res.status(403).json({ message: "Only drivers and admins can upload documents" });
      }

      const uploadResult = await storageService.uploadFile(req.file, folder);

      const documentoData = {
        tipo,
        usuarioId: req.user!.id,
        conductorId: conductorId,
        servicioId: null,
        url: uploadResult.url,
        nombreArchivo: uploadResult.filename,
        validoHasta: validoHasta ? new Date(validoHasta) : null,
      };

      const validated = insertDocumentoSchema.parse(documentoData);
      const documento = await storage.createDocumento(validated);

      res.json(documento);
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  app.get("/api/documentos/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const documento = await storage.getDocumentoById(req.params.id);
      
      if (!documento) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (req.user!.userType !== 'admin' && documento.usuarioId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to view this document" });
      }

      res.json(documento);
    } catch (error: any) {
      console.error('Get document error:', error);
      res.status(500).json({ message: "Failed to get document" });
    }
  });

  app.get("/api/documentos/user/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      if (req.user!.userType !== 'admin' && req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const documentos = await storage.getDocumentosByUsuarioId(req.params.userId);
      res.json(documentos);
    } catch (error: any) {
      console.error('Get user documents error:', error);
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  app.get("/api/documentos/conductor/:conductorId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const conductor = await storage.getConductorByUserId(req.user!.id);
      
      if (req.user!.userType !== 'admin' && (!conductor || conductor.id !== req.params.conductorId)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const documentos = await storage.getDocumentosByConductorId(req.params.conductorId);
      res.json(documentos);
    } catch (error: any) {
      console.error('Get driver documents error:', error);
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  app.get("/api/admin/documentos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const documentos = await storage.getAllDocumentos();
      res.json(documentos);
    } catch (error: any) {
      console.error('Get all documents error:', error);
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  app.delete("/api/documentos/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const documento = await storage.getDocumentoById(req.params.id);
      
      if (!documento) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (req.user!.userType !== 'admin' && documento.usuarioId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storageService.deleteFile(documento.url);
      await storage.deleteDocumento(req.params.id);

      res.json({ message: "Document deleted successfully" });
    } catch (error: any) {
      console.error('Delete document error:', error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.put("/api/admin/documentos/:id/aprobar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const documento = await storage.aprobarDocumento(req.params.id, req.user!.id);
      res.json(documento);
    } catch (error: any) {
      console.error('Approve document error:', error);
      res.status(500).json({ message: "Failed to approve document" });
    }
  });

  app.put("/api/admin/documentos/:id/rechazar", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'admin') {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { motivo } = req.body;
      
      if (!motivo) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const documento = await storage.rechazarDocumento(req.params.id, req.user!.id, motivo);
      res.json(documento);
    } catch (error: any) {
      console.error('Reject document error:', error);
      res.status(500).json({ message: "Failed to reject document" });
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

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: servicio.costoTotal,
      });
    } catch (error: any) {
      console.error('Create payment intent error:', error);
      res.status(500).json({ message: "Failed to create payment intent" });
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
      console.error('Get commissions error:', error);
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
      console.error('Get pending commissions error:', error);
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
      console.error('Mark commission paid error:', error);
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
      console.error('Generate receipt error:', error);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });

  return httpServer;
}
