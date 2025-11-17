import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { insertUserSchema, insertServicioSchema, insertTarifaSchema, insertMensajeChatSchema } from "@shared/schema";
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
  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "gruard-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const serviceSessions = new Map<string, Set<WebSocket>>();
  const driverSessions = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'join_service':
            const { serviceId, role } = message.payload;
            if (!serviceSessions.has(serviceId)) {
              serviceSessions.set(serviceId, new Set());
            }
            serviceSessions.get(serviceId)!.add(ws);
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

          case 'send_message':
            const { servicioId: chatServiceId, remitenteId, contenido, remitente } = message.payload;
            
            const nuevoMensaje = await storage.createMensajeChat({
              servicioId: chatServiceId,
              remitenteId,
              contenido,
            });

            if (serviceSessions.has(chatServiceId)) {
              const broadcast = JSON.stringify({
                type: 'new_message',
                payload: {
                  ...nuevoMensaje,
                  remitente,
                },
              });
              serviceSessions.get(chatServiceId)!.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(broadcast);
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      serviceSessions.forEach((clients, serviceId) => {
        clients.delete(ws);
        if (clients.size === 0) {
          serviceSessions.delete(serviceId);
        }
      });

      driverSessions.forEach((client, driverId) => {
        if (client === ws) {
          driverSessions.delete(driverId);
        }
      });
    });
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, nombre, apellido, phone, userType, conductorData } = req.body;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        email,
        passwordHash,
        nombre,
        apellido,
        phone: phone || null,
        userType: userType || 'cliente',
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
      res.status(500).json({ message: "Registration failed" });
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
      availableDrivers.forEach((driver) => {
        const ws = driverSessions.get(driver.userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'new_request',
            payload: servicio,
          }));
        }
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
      const validatedData = insertMensajeChatSchema.parse({
        servicioId: req.body.servicioId,
        remitenteId: req.user!.id,
        contenido: req.body.contenido,
      });

      const mensaje = await storage.createMensajeChat(validatedData);
      
      if (serviceSessions.has(validatedData.servicioId)) {
        const broadcast = JSON.stringify({
          type: 'new_message',
          payload: {
            ...mensaje,
            remitente: {
              id: req.user!.id,
              nombre: req.user!.nombre,
              apellido: req.user!.apellido,
            },
          },
        });
        serviceSessions.get(validatedData.servicioId)!.forEach((client) => {
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
      await storage.marcarMensajesComoLeidos(req.params.servicioId, req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Mark messages read error:', error);
      res.status(500).json({ message: "Failed to mark messages as read" });
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

  return httpServer;
}
