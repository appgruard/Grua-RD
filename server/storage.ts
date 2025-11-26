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
  pushSubscriptions,
  verificationCodes,
  documentos,
  comisiones,
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
  type InsertPushSubscription,
  type PushSubscription,
  type InsertVerificationCode,
  type VerificationCode,
  type Documento,
  type InsertDocumento,
  type Comision,
  type InsertComision,
  type UserWithConductor,
  type ServicioWithDetails,
  type MensajeChatWithRemitente,
  type DocumentoWithDetails,
  type ComisionWithDetails,
} from '@shared/schema';
import {
  conductorStripeAccounts,
  paymentMethods,
  serviceReceipts,
} from './schema-extensions';

export interface IStorage {
  // Users
  getUserById(id: string): Promise<UserWithConductor | undefined>;
  getUserByEmail(email: string): Promise<UserWithConductor | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Conductores
  createConductor(conductor: InsertConductor): Promise<Conductor>;
  getConductorById(id: string): Promise<Conductor | undefined>;
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

  // Push Subscriptions
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deleteUserPushSubscriptions(userId: string): Promise<void>;

  // Verification Codes
  createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode>;
  getVerificationCode(telefono: string, codigo: string, tipoOperacion: string): Promise<VerificationCode | undefined>;
  getActiveVerificationCode(telefono: string, tipoOperacion: string): Promise<VerificationCode | undefined>;
  incrementVerificationAttempts(id: string): Promise<void>;
  markVerificationCodeAsUsed(id: string): Promise<void>;
  deleteExpiredVerificationCodes(): Promise<void>;
  deletePriorVerificationCodes(telefono: string, tipoOperacion: string): Promise<void>;
  getUserByPhone(phone: string): Promise<User | undefined>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalDrivers: number;
    totalServices: number;
    totalRevenue: number;
    activeDrivers: number;
    pendingServices: number;
  }>;

  // Analytics
  getRevenueByPeriod(startDate: string, endDate: string, period: 'day' | 'week' | 'month'): Promise<Array<{ period: string; revenue: number }>>;
  getServicesByPeriod(startDate: string, endDate: string, period: 'day' | 'week' | 'month'): Promise<Array<{ period: string; count: number }>>;
  getDriverRankings(): Promise<Array<{ driverId: string; driverName: string; completedServices: number; averageRating: number }>>;
  getServicesByHour(): Promise<Array<{ hour: number; count: number }>>;
  getServiceStatusBreakdown(startDate?: string, endDate?: string): Promise<Array<{ status: string; count: number }>>;

  // Documentos
  createDocumento(documento: InsertDocumento): Promise<Documento>;
  getDocumentoById(id: string): Promise<DocumentoWithDetails | undefined>;
  getDocumentosByUsuarioId(usuarioId: string): Promise<DocumentoWithDetails[]>;
  getDocumentosByConductorId(conductorId: string): Promise<DocumentoWithDetails[]>;
  getDocumentosByServicioId(servicioId: string): Promise<DocumentoWithDetails[]>;
  getAllDocumentos(): Promise<DocumentoWithDetails[]>;
  updateDocumento(id: string, data: Partial<Documento>): Promise<Documento>;
  deleteDocumento(id: string): Promise<void>;
  aprobarDocumento(id: string, adminId: string): Promise<Documento>;
  rechazarDocumento(id: string, adminId: string, motivo: string): Promise<Documento>;

  // Servicios con Aseguradora
  getServiciosPendientesAseguradora(): Promise<ServicioWithDetails[]>;
  aprobarAseguradora(id: string, adminId: string): Promise<Servicio>;
  rechazarAseguradora(id: string, adminId: string, motivo: string): Promise<Servicio>;

  // Comisiones
  createComision(comision: InsertComision): Promise<Comision>;
  getComisionByServicioId(servicioId: string): Promise<ComisionWithDetails | undefined>;
  getComisionesByEstado(estado: string, tipo: 'operador' | 'empresa'): Promise<ComisionWithDetails[]>;
  getAllComisiones(): Promise<ComisionWithDetails[]>;
  updateComision(id: string, data: Partial<Comision>): Promise<Comision>;
  marcarComisionPagada(id: string, tipo: 'operador' | 'empresa', stripeTransferId?: string): Promise<Comision>;

  // Stripe Connect Accounts
  createConductorStripeAccount(data: { conductorId: string; stripeAccountId: string }): Promise<any>;
  getConductorStripeAccount(conductorId: string): Promise<any | undefined>;
  getConductorStripeAccountByAccountId(stripeAccountId: string): Promise<any | undefined>;
  updateConductorStripeAccount(conductorId: string, data: any): Promise<any>;

  // Payment Methods
  createPaymentMethod(data: { userId: string; stripePaymentMethodId: string; brand: string; last4: string; expiryMonth: number; expiryYear: number; isDefault?: boolean }): Promise<any>;
  getPaymentMethodsByUserId(userId: string): Promise<any[]>;
  deletePaymentMethod(id: string): Promise<void>;
  setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void>;

  // Service Receipts
  createServiceReceipt(data: { servicioId: string; receiptNumber: string; pdfUrl: string | null; metadata: any }): Promise<any>;
  getServiceReceiptByServiceId(servicioId: string): Promise<any | undefined>;

  // Documentos
  createDocumento(documento: InsertDocumento): Promise<Documento>;
  getDocumentoById(id: string): Promise<Documento | undefined>;
  getDocumentosByConductor(conductorId: string): Promise<Documento[]>;
  deleteDocumento(id: string): Promise<void>;
  updateDocumentoStatus(id: string, estado: 'pendiente' | 'aprobado' | 'rechazado', revisadoPor: string, motivoRechazo?: string): Promise<Documento | undefined>;
  getPendingDocuments(): Promise<DocumentoWithDetails[]>;
  getAllDocuments(): Promise<DocumentoWithDetails[]>;
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

  async getConductorById(id: string): Promise<Conductor | undefined> {
    const [conductor] = await db.select().from(conductores).where(eq(conductores.id, id));
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

  // Push Subscriptions
  async createPushSubscription(insertSubscription: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, insertSubscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(pushSubscriptions)
        .set(insertSubscription)
        .where(eq(pushSubscriptions.endpoint, insertSubscription.endpoint))
        .returning();
      return updated;
    }

    const [subscription] = await db.insert(pushSubscriptions).values(insertSubscription).returning();
    return subscription;
  }

  async getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deleteUserPushSubscriptions(userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
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

  // Analytics
  async getRevenueByPeriod(startDate: string, endDate: string, period: 'day' | 'week' | 'month'): Promise<Array<{ period: string; revenue: number }>> {
    const formatMap = {
      day: 'YYYY-MM-DD',
      week: 'IYYY-IW',
      month: 'YYYY-MM',
    };
    
    const format = formatMap[period];
    const periodExpression = sql.raw(`to_char(${servicios.createdAt.name}, '${format}')`);
    
    const results = await db
      .select({
        period: sql<string>`${periodExpression}`.as('period'),
        revenue: sql<number>`COALESCE(SUM(CAST(${servicios.costoTotal} AS NUMERIC)), 0)`.as('revenue'),
      })
      .from(servicios)
      .where(
        and(
          eq(servicios.estado, 'completado'),
          sql`${servicios.createdAt} >= ${startDate}::timestamp`,
          sql`${servicios.createdAt} <= ${endDate}::timestamp`
        )
      )
      .groupBy(sql`${periodExpression}`)
      .orderBy(sql`${periodExpression}`);

    return results.map(r => ({ period: r.period, revenue: Number(r.revenue) }));
  }

  async getServicesByPeriod(startDate: string, endDate: string, period: 'day' | 'week' | 'month'): Promise<Array<{ period: string; count: number }>> {
    const formatMap = {
      day: 'YYYY-MM-DD',
      week: 'IYYY-IW',
      month: 'YYYY-MM',
    };
    
    const format = formatMap[period];
    const periodExpression = sql.raw(`to_char(${servicios.createdAt.name}, '${format}')`);
    
    const results = await db
      .select({
        period: sql<string>`${periodExpression}`.as('period'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(servicios)
      .where(
        and(
          sql`${servicios.createdAt} >= ${startDate}::timestamp`,
          sql`${servicios.createdAt} <= ${endDate}::timestamp`
        )
      )
      .groupBy(sql`${periodExpression}`)
      .orderBy(sql`${periodExpression}`);

    return results;
  }

  async getDriverRankings(): Promise<Array<{ driverId: string; driverName: string; completedServices: number; averageRating: number }>> {
    const results = await db
      .select({
        driverId: users.id,
        driverName: sql<string>`${users.nombre} || ' ' || ${users.apellido}`,
        completedServices: sql<number>`COUNT(DISTINCT ${servicios.id})::int`,
        averageRating: sql<number>`COALESCE(AVG(${calificaciones.puntuacion}), 0)`,
      })
      .from(users)
      .innerJoin(conductores, eq(conductores.userId, users.id))
      .leftJoin(servicios, and(
        eq(servicios.conductorId, users.id),
        eq(servicios.estado, 'completado')
      ))
      .leftJoin(calificaciones, eq(calificaciones.servicioId, servicios.id))
      .groupBy(users.id, users.nombre, users.apellido)
      .orderBy(desc(sql`COUNT(DISTINCT ${servicios.id})`));

    return results.map(r => ({
      driverId: r.driverId,
      driverName: r.driverName,
      completedServices: r.completedServices,
      averageRating: Number(r.averageRating),
    }));
  }

  async getServicesByHour(): Promise<Array<{ hour: number; count: number }>> {
    const results = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${servicios.createdAt})::int`.as('hour'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(servicios)
      .groupBy(sql`EXTRACT(HOUR FROM ${servicios.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${servicios.createdAt})`);

    return results;
  }

  async getServiceStatusBreakdown(startDate?: string, endDate?: string): Promise<Array<{ status: string; count: number }>> {
    let query = db
      .select({
        status: servicios.estado,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(servicios);

    if (startDate && endDate) {
      query = query.where(
        and(
          sql`${servicios.createdAt} >= ${startDate}::timestamp`,
          sql`${servicios.createdAt} <= ${endDate}::timestamp`
        )
      ) as any;
    }

    const results = await query
      .groupBy(servicios.estado)
      .orderBy(desc(sql`COUNT(*)`));

    return results.map(r => ({ status: r.status as string, count: r.count }));
  }

  // Verification Codes
  async createVerificationCode(insertCode: InsertVerificationCode): Promise<VerificationCode> {
    const [code] = await db.insert(verificationCodes).values(insertCode).returning();
    return code;
  }

  async getVerificationCode(telefono: string, codigo: string, tipoOperacion: string): Promise<VerificationCode | undefined> {
    const [code] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.telefono, telefono),
          eq(verificationCodes.codigo, codigo),
          eq(verificationCodes.tipoOperacion, tipoOperacion),
          eq(verificationCodes.verificado, false),
          sql`${verificationCodes.expiraEn} > NOW()`
        )
      )
      .limit(1);
    return code;
  }

  async getActiveVerificationCode(telefono: string, tipoOperacion: string): Promise<VerificationCode | undefined> {
    const [code] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.telefono, telefono),
          eq(verificationCodes.tipoOperacion, tipoOperacion),
          eq(verificationCodes.verificado, false),
          sql`${verificationCodes.expiraEn} > NOW()`
        )
      )
      .orderBy(desc(verificationCodes.createdAt))
      .limit(1);
    return code;
  }

  async incrementVerificationAttempts(id: string): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ intentos: sql`${verificationCodes.intentos} + 1` })
      .where(eq(verificationCodes.id, id));
  }

  async markVerificationCodeAsUsed(id: string): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ verificado: true })
      .where(eq(verificationCodes.id, id));
  }

  async deleteExpiredVerificationCodes(): Promise<void> {
    await db
      .delete(verificationCodes)
      .where(sql`${verificationCodes.expiraEn} < NOW()`);
  }

  async deletePriorVerificationCodes(telefono: string, tipoOperacion: string): Promise<void> {
    await db
      .delete(verificationCodes)
      .where(
        and(
          eq(verificationCodes.telefono, telefono),
          eq(verificationCodes.tipoOperacion, tipoOperacion),
          eq(verificationCodes.verificado, false)
        )
      );
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    return user;
  }

  async createDocumento(documento: InsertDocumento): Promise<Documento> {
    const [newDocumento] = await db
      .insert(documentos)
      .values(documento)
      .returning();
    return newDocumento;
  }

  async getDocumentoById(id: string): Promise<DocumentoWithDetails | undefined> {
    const result = await db.query.documentos.findFirst({
      where: eq(documentos.id, id),
      with: {
        usuario: true,
        conductor: true,
        servicio: true,
        revisadoPorUsuario: true,
      },
    });
    return result;
  }

  async getDocumentosByUsuarioId(usuarioId: string): Promise<DocumentoWithDetails[]> {
    const results = await db.query.documentos.findMany({
      where: eq(documentos.usuarioId, usuarioId),
      with: {
        usuario: true,
        conductor: true,
        servicio: true,
        revisadoPorUsuario: true,
      },
      orderBy: desc(documentos.createdAt),
    });
    return results;
  }

  async getDocumentosByConductorId(conductorId: string): Promise<DocumentoWithDetails[]> {
    const results = await db.query.documentos.findMany({
      where: eq(documentos.conductorId, conductorId),
      with: {
        usuario: true,
        conductor: true,
        servicio: true,
        revisadoPorUsuario: true,
      },
      orderBy: desc(documentos.createdAt),
    });
    return results;
  }

  async getAllDocumentos(): Promise<DocumentoWithDetails[]> {
    const results = await db.query.documentos.findMany({
      with: {
        usuario: true,
        conductor: true,
        servicio: true,
        revisadoPorUsuario: true,
      },
      orderBy: desc(documentos.createdAt),
    });
    return results;
  }

  async updateDocumento(id: string, data: Partial<Documento>): Promise<Documento> {
    const [updated] = await db
      .update(documentos)
      .set(data)
      .where(eq(documentos.id, id))
      .returning();
    return updated;
  }

  async deleteDocumento(id: string): Promise<void> {
    await db.delete(documentos).where(eq(documentos.id, id));
  }

  async aprobarDocumento(id: string, adminId: string): Promise<Documento> {
    const [updated] = await db
      .update(documentos)
      .set({
        estado: 'aprobado',
        revisadoPor: adminId,
      })
      .where(eq(documentos.id, id))
      .returning();
    return updated;
  }

  async rechazarDocumento(id: string, adminId: string, motivo: string): Promise<Documento> {
    const [updated] = await db
      .update(documentos)
      .set({
        estado: 'rechazado',
        revisadoPor: adminId,
        motivoRechazo: motivo,
      })
      .where(eq(documentos.id, id))
      .returning();
    return updated;
  }

  // Comisiones
  async createComision(insertComision: InsertComision): Promise<Comision> {
    const [comision] = await db.insert(comisiones).values(insertComision).returning();
    return comision;
  }

  async getComisionByServicioId(servicioId: string): Promise<ComisionWithDetails | undefined> {
    const result = await db.query.comisiones.findFirst({
      where: eq(comisiones.servicioId, servicioId),
      with: {
        servicio: {
          with: {
            cliente: true,
            conductor: true,
          },
        },
      },
    });
    return result as ComisionWithDetails | undefined;
  }

  async getComisionesByEstado(estado: string, tipo: 'operador' | 'empresa'): Promise<ComisionWithDetails[]> {
    const field = tipo === 'operador' ? comisiones.estadoPagoOperador : comisiones.estadoPagoEmpresa;
    const results = await db.query.comisiones.findMany({
      where: eq(field, estado),
      with: {
        servicio: {
          with: {
            cliente: true,
            conductor: true,
          },
        },
      },
      orderBy: desc(comisiones.createdAt),
    });
    return results as ComisionWithDetails[];
  }

  async getAllComisiones(): Promise<ComisionWithDetails[]> {
    const results = await db.query.comisiones.findMany({
      with: {
        servicio: {
          with: {
            cliente: true,
            conductor: true,
          },
        },
      },
      orderBy: desc(comisiones.createdAt),
    });
    return results as ComisionWithDetails[];
  }

  async updateComision(id: string, data: Partial<Comision>): Promise<Comision> {
    const [updated] = await db
      .update(comisiones)
      .set(data)
      .where(eq(comisiones.id, id))
      .returning();
    return updated;
  }

  async marcarComisionPagada(id: string, tipo: 'operador' | 'empresa', stripeTransferId?: string): Promise<Comision> {
    const updateData: Partial<Comision> = tipo === 'operador' 
      ? {
          estadoPagoOperador: 'pagado',
          fechaPagoOperador: new Date(),
          stripeTransferId,
        }
      : {
          estadoPagoEmpresa: 'pagado',
          fechaPagoEmpresa: new Date(),
        };

    const [updated] = await db
      .update(comisiones)
      .set(updateData)
      .where(eq(comisiones.id, id))
      .returning();
    return updated;
  }

  // Stripe Connect Accounts
  async createConductorStripeAccount(data: { conductorId: string; stripeAccountId: string }): Promise<any> {
    const [account] = await db
      .insert(conductorStripeAccounts)
      .values({
        conductorId: data.conductorId,
        stripeAccountId: data.stripeAccountId,
        accountStatus: 'pending',
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      })
      .returning();
    return account;
  }

  async getConductorStripeAccount(conductorId: string): Promise<any | undefined> {
    const [account] = await db
      .select()
      .from(conductorStripeAccounts)
      .where(eq(conductorStripeAccounts.conductorId, conductorId))
      .limit(1);
    return account;
  }

  async getConductorStripeAccountByAccountId(stripeAccountId: string): Promise<any | undefined> {
    const [account] = await db
      .select()
      .from(conductorStripeAccounts)
      .where(eq(conductorStripeAccounts.stripeAccountId, stripeAccountId))
      .limit(1);
    return account;
  }

  async updateConductorStripeAccount(conductorId: string, data: any): Promise<any> {
    const [updated] = await db
      .update(conductorStripeAccounts)
      .set(data)
      .where(eq(conductorStripeAccounts.conductorId, conductorId))
      .returning();
    return updated;
  }

  // Payment Methods
  async createPaymentMethod(data: { userId: string; stripePaymentMethodId: string; brand: string; last4: string; expiryMonth: number; expiryYear: number; isDefault?: boolean }): Promise<any> {
    if (data.isDefault) {
      await db
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.userId, data.userId));
    }

    const [paymentMethod] = await db
      .insert(paymentMethods)
      .values({
        userId: data.userId,
        stripePaymentMethodId: data.stripePaymentMethodId,
        brand: data.brand,
        last4: data.last4,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        isDefault: data.isDefault ?? false,
      })
      .returning();
    return paymentMethod;
  }

  async getPaymentMethodsByUserId(userId: string): Promise<any[]> {
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId))
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
    return methods;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    await db
      .update(paymentMethods)
      .set({ isDefault: false })
      .where(eq(paymentMethods.userId, userId));

    await db
      .update(paymentMethods)
      .set({ isDefault: true })
      .where(eq(paymentMethods.id, paymentMethodId));
  }

  // Service Receipts
  async createServiceReceipt(data: { servicioId: string; receiptNumber: string; pdfUrl: string | null; metadata: any }): Promise<any> {
    const [receipt] = await db
      .insert(serviceReceipts)
      .values({
        servicioId: data.servicioId,
        receiptNumber: data.receiptNumber,
        pdfUrl: data.pdfUrl,
        metadata: data.metadata,
      })
      .returning();
    return receipt;
  }

  async getServiceReceiptByServiceId(servicioId: string): Promise<any | undefined> {
    const [receipt] = await db
      .select()
      .from(serviceReceipts)
      .where(eq(serviceReceipts.servicioId, servicioId))
      .limit(1);
    return receipt;
  }

  // Documentos
  async createDocumento(documento: InsertDocumento): Promise<Documento> {
    const [newDocumento] = await db.insert(documentos).values(documento).returning();
    return newDocumento;
  }

  async getDocumentoById(id: string): Promise<Documento | undefined> {
    const [documento] = await db
      .select()
      .from(documentos)
      .where(eq(documentos.id, id))
      .limit(1);
    return documento;
  }

  async getDocumentosByConductor(conductorId: string): Promise<Documento[]> {
    return db
      .select()
      .from(documentos)
      .where(eq(documentos.conductorId, conductorId))
      .orderBy(desc(documentos.createdAt));
  }

  async deleteDocumento(id: string): Promise<void> {
    const documento = await this.getDocumentoById(id);
    if (documento) {
      // Delete from object storage
      const { deleteDocument } = await import('./services/object-storage');
      await deleteDocument(documento.url);
      
      // Delete from database
      await db.delete(documentos).where(eq(documentos.id, id));
    }
  }

  async updateDocumentoStatus(
    id: string,
    estado: 'pendiente' | 'aprobado' | 'rechazado',
    revisadoPor: string,
    motivoRechazo?: string
  ): Promise<Documento | undefined> {
    const [updated] = await db
      .update(documentos)
      .set({
        estado,
        revisadoPor,
        motivoRechazo,
        fechaRevision: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(documentos.id, id))
      .returning();
    return updated;
  }

  async getPendingDocuments(): Promise<DocumentoWithDetails[]> {
    const results = await db.query.documentos.findMany({
      where: eq(documentos.estado, 'pendiente'),
      with: {
        usuario: true,
        conductor: {
          with: {
            user: true,
          },
        },
        servicio: true,
        revisadoPorUsuario: true,
      },
      orderBy: desc(documentos.createdAt),
    });
    return results;
  }

  async getAllDocuments(): Promise<DocumentoWithDetails[]> {
    const results = await db.query.documentos.findMany({
      with: {
        usuario: true,
        conductor: {
          with: {
            user: true,
          },
        },
        servicio: true,
        revisadoPorUsuario: true,
      },
      orderBy: desc(documentos.createdAt),
    });
    return results;
  }

  async getDocumentosByServicioId(servicioId: string): Promise<DocumentoWithDetails[]> {
    const results = await db.query.documentos.findMany({
      where: eq(documentos.servicioId, servicioId),
      with: {
        usuario: true,
        conductor: {
          with: {
            user: true,
          },
        },
        servicio: true,
        revisadoPorUsuario: true,
      },
      orderBy: desc(documentos.createdAt),
    });
    return results;
  }

  async getServiciosPendientesAseguradora(): Promise<ServicioWithDetails[]> {
    const results = await db.query.servicios.findMany({
      where: and(
        eq(servicios.metodoPago, 'aseguradora'),
        eq(servicios.aseguradoraEstado, 'pendiente')
      ),
      with: {
        cliente: true,
        conductor: true,
        calificacion: true,
      },
      orderBy: desc(servicios.createdAt),
    });
    return results as any;
  }

  async aprobarAseguradora(id: string, adminId: string): Promise<Servicio> {
    const [servicio] = await db
      .update(servicios)
      .set({
        aseguradoraEstado: 'aprobado',
      })
      .where(eq(servicios.id, id))
      .returning();
    return servicio;
  }

  async rechazarAseguradora(id: string, adminId: string, motivo: string): Promise<Servicio> {
    const [servicio] = await db
      .update(servicios)
      .set({
        aseguradoraEstado: 'rechazado',
        estado: 'cancelado',
        canceladoAt: new Date(),
      })
      .where(eq(servicios.id, id))
      .returning();
    return servicio;
  }
}

export const storage = new DatabaseStorage();
