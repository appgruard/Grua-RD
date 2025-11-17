import { db } from './db';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import {
  users,
  conductores,
  servicios,
  tarifas,
  calificaciones,
  ubicacionesTracking,
  mensajesChat,
  type User,
  type InsertUser,
  type Conductor,
  type InsertConductor,
  type Servicio,
  type InsertServicio,
  type Tarifa,
  type InsertTarifa,
  type Calificacion,
  type InsertCalificacion,
  type InsertUbicacionTracking,
  type InsertMensajeChat,
  type MensajeChat,
  type UserWithConductor,
  type ServicioWithDetails,
  type MensajeChatWithRemitente,
} from '@shared/schema';

export interface IStorage {
  // Users
  getUserById(id: string): Promise<UserWithConductor | undefined>;
  getUserByEmail(email: string): Promise<UserWithConductor | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Conductores
  createConductor(conductor: InsertConductor): Promise<Conductor>;
  getConductorByUserId(userId: string): Promise<Conductor | undefined>;
  updateConductor(id: string, data: Partial<Conductor>): Promise<Conductor>;
  updateDriverAvailability(userId: string, disponible: boolean): Promise<Conductor>;
  updateDriverLocation(userId: string, lat: number, lng: number): Promise<Conductor>;
  getAvailableDrivers(): Promise<Array<Conductor & { user: User }>>;
  getAllDrivers(): Promise<Array<Conductor & { user: User }>>;

  // Servicios
  createServicio(servicio: InsertServicio): Promise<Servicio>;
  getServicioById(id: string): Promise<ServicioWithDetails | undefined>;
  getServiciosByClientId(clientId: string): Promise<ServicioWithDetails[]>;
  getServiciosByConductorId(conductorId: string): Promise<ServicioWithDetails[]>;
  getPendingServicios(): Promise<Servicio[]>;
  getAllServicios(): Promise<ServicioWithDetails[]>;
  updateServicio(id: string, data: Partial<Servicio>): Promise<Servicio>;
  acceptServicio(id: string, conductorId: string): Promise<Servicio>;

  // Tarifas
  createTarifa(tarifa: InsertTarifa): Promise<Tarifa>;
  getActiveTarifa(): Promise<Tarifa | undefined>;
  getAllTarifas(): Promise<Tarifa[]>;
  updateTarifa(id: string, data: Partial<Tarifa>): Promise<Tarifa>;

  // Calificaciones
  createCalificacion(calificacion: InsertCalificacion): Promise<Calificacion>;
  getCalificacionesByServicioId(servicioId: string): Promise<Calificacion[]>;

  // Ubicaciones Tracking
  createUbicacionTracking(ubicacion: InsertUbicacionTracking): Promise<void>;
  getUbicacionesByServicioId(servicioId: string): Promise<any[]>;

  // Mensajes Chat
  createMensajeChat(mensaje: InsertMensajeChat): Promise<MensajeChat>;
  getMensajesByServicioId(servicioId: string): Promise<MensajeChatWithRemitente[]>;
  marcarMensajesComoLeidos(servicioId: string, userId: string): Promise<void>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalDrivers: number;
    totalServices: number;
    totalRevenue: number;
    activeDrivers: number;
    pendingServices: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUserById(id: string): Promise<UserWithConductor | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        conductor: true,
      },
    });
    return result;
  }

  async getUserByEmail(email: string): Promise<UserWithConductor | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        conductor: true,
      },
    });
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Conductores
  async createConductor(insertConductor: InsertConductor): Promise<Conductor> {
    const [conductor] = await db.insert(conductores).values(insertConductor).returning();
    return conductor;
  }

  async getConductorByUserId(userId: string): Promise<Conductor | undefined> {
    const [conductor] = await db.select().from(conductores).where(eq(conductores.userId, userId));
    return conductor;
  }

  async updateConductor(id: string, data: Partial<Conductor>): Promise<Conductor> {
    const [conductor] = await db.update(conductores).set(data).where(eq(conductores.id, id)).returning();
    return conductor;
  }

  async updateDriverAvailability(userId: string, disponible: boolean): Promise<Conductor> {
    const [conductor] = await db
      .update(conductores)
      .set({ disponible })
      .where(eq(conductores.userId, userId))
      .returning();
    return conductor;
  }

  async updateDriverLocation(userId: string, lat: number, lng: number): Promise<Conductor> {
    const [conductor] = await db
      .update(conductores)
      .set({
        ubicacionLat: lat.toString(),
        ubicacionLng: lng.toString(),
        ultimaUbicacionUpdate: new Date(),
      })
      .where(eq(conductores.userId, userId))
      .returning();
    return conductor;
  }

  async getAvailableDrivers(): Promise<Array<Conductor & { user: User }>> {
    const results = await db.query.conductores.findMany({
      where: eq(conductores.disponible, true),
      with: {
        user: true,
      },
    });
    return results as any;
  }

  async getAllDrivers(): Promise<Array<Conductor & { user: User }>> {
    const results = await db.query.conductores.findMany({
      with: {
        user: true,
      },
    });
    return results as any;
  }

  // Servicios
  async createServicio(insertServicio: InsertServicio): Promise<Servicio> {
    const [servicio] = await db.insert(servicios).values(insertServicio).returning();
    return servicio;
  }

  async getServicioById(id: string): Promise<ServicioWithDetails | undefined> {
    const result = await db.query.servicios.findFirst({
      where: eq(servicios.id, id),
      with: {
        cliente: true,
        conductor: true,
        calificacion: true,
      },
    });
    return result as any;
  }

  async getServiciosByClientId(clientId: string): Promise<ServicioWithDetails[]> {
    const results = await db.query.servicios.findMany({
      where: eq(servicios.clienteId, clientId),
      with: {
        cliente: true,
        conductor: true,
        calificacion: true,
      },
      orderBy: desc(servicios.createdAt),
    });
    return results as any;
  }

  async getServiciosByConductorId(conductorId: string): Promise<ServicioWithDetails[]> {
    const results = await db.query.servicios.findMany({
      where: eq(servicios.conductorId, conductorId),
      with: {
        cliente: true,
        conductor: true,
        calificacion: true,
      },
      orderBy: desc(servicios.createdAt),
    });
    return results as any;
  }

  async getPendingServicios(): Promise<Servicio[]> {
    return db
      .select()
      .from(servicios)
      .where(eq(servicios.estado, 'pendiente'))
      .orderBy(desc(servicios.createdAt));
  }

  async getAllServicios(): Promise<ServicioWithDetails[]> {
    const results = await db.query.servicios.findMany({
      with: {
        cliente: true,
        conductor: true,
        calificacion: true,
      },
      orderBy: desc(servicios.createdAt),
    });
    return results as any;
  }

  async updateServicio(id: string, data: Partial<Servicio>): Promise<Servicio> {
    const [servicio] = await db.update(servicios).set(data).where(eq(servicios.id, id)).returning();
    return servicio;
  }

  async acceptServicio(id: string, conductorId: string): Promise<Servicio> {
    const [servicio] = await db
      .update(servicios)
      .set({
        conductorId,
        estado: 'aceptado',
        aceptadoAt: new Date(),
      })
      .where(eq(servicios.id, id))
      .returning();
    return servicio;
  }

  // Tarifas
  async createTarifa(insertTarifa: InsertTarifa): Promise<Tarifa> {
    const [tarifa] = await db.insert(tarifas).values(insertTarifa).returning();
    return tarifa;
  }

  async getActiveTarifa(): Promise<Tarifa | undefined> {
    const [tarifa] = await db
      .select()
      .from(tarifas)
      .where(eq(tarifas.activo, true))
      .orderBy(desc(tarifas.createdAt))
      .limit(1);
    return tarifa;
  }

  async getAllTarifas(): Promise<Tarifa[]> {
    return db.select().from(tarifas).orderBy(desc(tarifas.createdAt));
  }

  async updateTarifa(id: string, data: Partial<Tarifa>): Promise<Tarifa> {
    const [tarifa] = await db.update(tarifas).set(data).where(eq(tarifas.id, id)).returning();
    return tarifa;
  }

  // Calificaciones
  async createCalificacion(insertCalificacion: InsertCalificacion): Promise<Calificacion> {
    const [calificacion] = await db.insert(calificaciones).values(insertCalificacion).returning();

    const servicioCalificaciones = await this.getCalificacionesByServicioId(insertCalificacion.servicioId);
    const avgPuntuacion =
      servicioCalificaciones.reduce((sum, c) => sum + c.puntuacion, 0) / servicioCalificaciones.length;

    const servicio = await this.getServicioById(insertCalificacion.servicioId);
    if (servicio?.conductorId) {
      const conductorServicios = await this.getServiciosByConductorId(servicio.conductorId);
      const todasCalificaciones = await Promise.all(
        conductorServicios.map((s) => this.getCalificacionesByServicioId(s.id))
      );
      const allRatings = todasCalificaciones.flat();
      if (allRatings.length > 0) {
        const conductorAvg = allRatings.reduce((sum, c) => sum + c.puntuacion, 0) / allRatings.length;
        await this.updateUser(servicio.conductorId, { calificacionPromedio: conductorAvg.toString() });
      }
    }

    return calificacion;
  }

  async getCalificacionesByServicioId(servicioId: string): Promise<Calificacion[]> {
    return db.select().from(calificaciones).where(eq(calificaciones.servicioId, servicioId));
  }

  // Ubicaciones Tracking
  async createUbicacionTracking(insertUbicacion: InsertUbicacionTracking): Promise<void> {
    await db.insert(ubicacionesTracking).values(insertUbicacion);
  }

  async getUbicacionesByServicioId(servicioId: string): Promise<any[]> {
    return db
      .select()
      .from(ubicacionesTracking)
      .where(eq(ubicacionesTracking.servicioId, servicioId))
      .orderBy(desc(ubicacionesTracking.timestamp));
  }

  // Mensajes Chat
  async createMensajeChat(insertMensaje: InsertMensajeChat): Promise<MensajeChat> {
    const [mensaje] = await db.insert(mensajesChat).values(insertMensaje).returning();
    return mensaje;
  }

  async getMensajesByServicioId(servicioId: string): Promise<MensajeChatWithRemitente[]> {
    const results = await db.query.mensajesChat.findMany({
      where: eq(mensajesChat.servicioId, servicioId),
      with: {
        remitente: true,
      },
      orderBy: (mensajesChat, { asc }) => [asc(mensajesChat.createdAt)],
    });
    return results as any;
  }

  async marcarMensajesComoLeidos(servicioId: string, userId: string): Promise<void> {
    await db
      .update(mensajesChat)
      .set({ leido: true })
      .where(
        and(
          eq(mensajesChat.servicioId, servicioId),
          sql`${mensajesChat.remitenteId} != ${userId}`
        )
      );
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalDrivers: number;
    totalServices: number;
    totalRevenue: number;
    activeDrivers: number;
    pendingServices: number;
  }> {
    const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [driversCount] = await db.select({ count: sql<number>`count(*)::int` }).from(conductores);
    const [servicesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(servicios);
    
    const [activeDriversCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conductores)
      .where(eq(conductores.disponible, true));
    
    const [pendingServicesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(servicios)
      .where(eq(servicios.estado, 'pendiente'));

    const completedServices = await db
      .select()
      .from(servicios)
      .where(eq(servicios.estado, 'completado'));
    
    const totalRevenue = completedServices.reduce((sum, s) => sum + parseFloat(s.costoTotal as string), 0);

    return {
      totalUsers: usersCount.count,
      totalDrivers: driversCount.count,
      totalServices: servicesCount.count,
      totalRevenue,
      activeDrivers: activeDriversCount.count,
      pendingServices: pendingServicesCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
