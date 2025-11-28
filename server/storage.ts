import { db } from './db';
import { eq, and, desc, isNull, sql, gte, lte, between } from 'drizzle-orm';
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
  aseguradoras,
  serviciosAseguradora,
  documentoRecordatorios,
  systemJobs,
  tickets,
  mensajesTicket,
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
  type Aseguradora,
  type InsertAseguradora,
  type ServicioAseguradora,
  type InsertServicioAseguradora,
  type DocumentoRecordatorio,
  type InsertDocumentoRecordatorio,
  type SystemJob,
  type InsertSystemJob,
  type UserWithConductor,
  type ServicioWithDetails,
  type MensajeChatWithRemitente,
  type DocumentoWithDetails,
  type ComisionWithDetails,
  type AseguradoraWithDetails,
  type ServicioAseguradoraWithDetails,
  type Ticket,
  type InsertTicket,
  type MensajeTicket,
  type InsertMensajeTicket,
  type TicketWithDetails,
  type MensajeTicketWithUsuario,
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

  // Advanced Analytics (Module 2.3)
  getServiceLocationsForHeatmap(startDate?: string, endDate?: string, precision?: number): Promise<Array<{ lat: number; lng: number; count: number; weight: number }>>;
  getAdvancedKPIs(startDate?: string, endDate?: string): Promise<{
    avgResponseMinutes: number;
    avgServiceDurationMinutes: number;
    acceptanceRate: number;
    cancellationRate: number;
    avgRevenuePerService: number;
    totalServices: number;
    completedServices: number;
    cancelledServices: number;
  }>;
  getVehicleTypeDistribution(startDate?: string, endDate?: string): Promise<Array<{ tipoVehiculo: string; count: number; revenue: number }>>;

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

  // Seguro del Cliente
  getClientInsuranceDocument(userId: string): Promise<DocumentoWithDetails | undefined>;
  hasApprovedClientInsurance(userId: string): Promise<boolean>;

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

  // Aseguradoras (Insurance Companies)
  createAseguradora(aseguradora: InsertAseguradora): Promise<Aseguradora>;
  getAseguradoraById(id: string): Promise<AseguradoraWithDetails | undefined>;
  getAseguradoraByUserId(userId: string): Promise<AseguradoraWithDetails | undefined>;
  getAseguradoraByRnc(rnc: string): Promise<Aseguradora | undefined>;
  getAllAseguradoras(): Promise<AseguradoraWithDetails[]>;
  getActiveAseguradoras(): Promise<AseguradoraWithDetails[]>;
  updateAseguradora(id: string, data: Partial<Aseguradora>): Promise<Aseguradora>;
  toggleAseguradoraActivo(id: string): Promise<Aseguradora>;

  // Servicios Aseguradora (Insurance Services)
  createServicioAseguradora(servicio: InsertServicioAseguradora): Promise<ServicioAseguradora>;
  getServicioAseguradoraById(id: string): Promise<ServicioAseguradoraWithDetails | undefined>;
  getServicioAseguradoraByServicioId(servicioId: string): Promise<ServicioAseguradoraWithDetails | undefined>;
  getServiciosAseguradoraByAseguradoraId(aseguradoraId: string): Promise<ServicioAseguradoraWithDetails[]>;
  getServiciosAseguradoraPendientes(aseguradoraId: string): Promise<ServicioAseguradoraWithDetails[]>;
  aprobarServicioAseguradora(id: string, userId: string, montoAprobado: string): Promise<ServicioAseguradora>;
  rechazarServicioAseguradora(id: string, userId: string, motivo: string): Promise<ServicioAseguradora>;
  marcarServicioAseguradoraFacturado(id: string, numeroFactura: string): Promise<ServicioAseguradora>;
  marcarServicioAseguradoraPagado(id: string): Promise<ServicioAseguradora>;
  getResumenAseguradora(aseguradoraId: string, startDate?: string, endDate?: string): Promise<{
    totalServicios: number;
    pendientes: number;
    aprobados: number;
    rechazados: number;
    montoTotal: number;
    montoPendiente: number;
    montoFacturado: number;
    montoPagado: number;
  }>;

  // Document Validation System (Module 2.6)
  getDocumentosProximosAVencer(dias: number): Promise<Array<Documento & { conductor?: Conductor; user?: User }>>;
  getDocumentosVencidos(): Promise<Array<Documento & { conductor?: Conductor; user?: User }>>;
  getRecordatoriosEnviados(documentoId: string): Promise<DocumentoRecordatorio[]>;
  registrarRecordatorioEnviado(documentoId: string, tipoRecordatorio: '30_dias' | '15_dias' | '7_dias' | 'vencido'): Promise<DocumentoRecordatorio>;
  hasRecordatorioSent(documentoId: string, tipoRecordatorio: '30_dias' | '15_dias' | '7_dias' | 'vencido'): Promise<boolean>;
  
  // Driver Suspension/Reactivation
  suspenderConductorPorDocumento(conductorId: string, motivo: string): Promise<void>;
  reactivarConductor(conductorId: string): Promise<void>;
  getConductoresConDocumentosVencidos(): Promise<Array<Conductor & { user: User; documentosVencidos: Documento[] }>>;
  getDriverDocumentStatusSummary(conductorId: string): Promise<{
    totalDocumentos: number;
    documentosAprobados: number;
    documentosPendientes: number;
    documentosRechazados: number;
    documentosVencidos: number;
    documentosProximosAVencer: number;
    puedeEstarEnLinea: boolean;
    documentos: Documento[];
  }>;

  // System Jobs
  getSystemJob(jobName: string): Promise<SystemJob | undefined>;
  createOrUpdateSystemJob(jobName: string, data: Partial<SystemJob>): Promise<SystemJob>;
  setJobRunning(jobName: string, isRunning: boolean): Promise<void>;

  // Tickets (Module 2.7)
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicketById(id: string): Promise<TicketWithDetails | undefined>;
  getTicketsByUsuarioId(usuarioId: string): Promise<TicketWithDetails[]>;
  getAllTickets(): Promise<TicketWithDetails[]>;
  getTicketsByEstado(estado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'): Promise<TicketWithDetails[]>;
  getTicketsAsignadosA(adminId: string): Promise<TicketWithDetails[]>;
  updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket>;
  asignarTicket(id: string, adminId: string): Promise<Ticket>;
  cambiarEstadoTicket(id: string, estado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'): Promise<Ticket>;
  cerrarTicket(id: string): Promise<Ticket>;
  
  // Mensajes de Tickets
  createMensajeTicket(mensaje: InsertMensajeTicket): Promise<MensajeTicket>;
  getMensajesByTicketId(ticketId: string): Promise<MensajeTicketWithUsuario[]>;
  marcarMensajesTicketComoLeidos(ticketId: string, usuarioId: string): Promise<void>;
  getTicketsStats(): Promise<{
    totalTickets: number;
    abiertos: number;
    enProceso: number;
    resueltos: number;
    cerrados: number;
    urgentes: number;
    sinAsignar: number;
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

  // Advanced Analytics (Module 2.3)
  async getServiceLocationsForHeatmap(startDate?: string, endDate?: string, precision: number = 3): Promise<Array<{ lat: number; lng: number; count: number; weight: number }>> {
    const roundFactor = Math.pow(10, precision);
    
    let query = db
      .select({
        lat: sql<number>`ROUND(CAST(${servicios.origenLat} AS NUMERIC), ${precision})`.as('lat'),
        lng: sql<number>`ROUND(CAST(${servicios.origenLng} AS NUMERIC), ${precision})`.as('lng'),
        count: sql<number>`COUNT(*)::int`.as('count'),
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
      .groupBy(sql`ROUND(CAST(${servicios.origenLat} AS NUMERIC), ${precision}), ROUND(CAST(${servicios.origenLng} AS NUMERIC), ${precision})`)
      .orderBy(desc(sql`COUNT(*)`));

    const maxCount = Math.max(...results.map(r => r.count), 1);
    
    return results.map(r => ({
      lat: Number(r.lat),
      lng: Number(r.lng),
      count: r.count,
      weight: r.count / maxCount,
    }));
  }

  async getAdvancedKPIs(startDate?: string, endDate?: string): Promise<{
    avgResponseMinutes: number;
    avgServiceDurationMinutes: number;
    acceptanceRate: number;
    cancellationRate: number;
    avgRevenuePerService: number;
    totalServices: number;
    completedServices: number;
    cancelledServices: number;
  }> {
    let dateFilter = sql`1=1`;
    if (startDate && endDate) {
      dateFilter = and(
        sql`${servicios.createdAt} >= ${startDate}::timestamp`,
        sql`${servicios.createdAt} <= ${endDate}::timestamp`
      )!;
    }

    const [stats] = await db
      .select({
        totalServices: sql<number>`COUNT(*)::int`,
        completedServices: sql<number>`COUNT(*) FILTER (WHERE ${servicios.estado} = 'completado')::int`,
        cancelledServices: sql<number>`COUNT(*) FILTER (WHERE ${servicios.estado} = 'cancelado')::int`,
        acceptedServices: sql<number>`COUNT(*) FILTER (WHERE ${servicios.aceptadoAt} IS NOT NULL)::int`,
        avgResponseMinutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${servicios.aceptadoAt} - ${servicios.createdAt})) / 60) FILTER (WHERE ${servicios.aceptadoAt} IS NOT NULL), 0)`,
        avgServiceDurationMinutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${servicios.completadoAt} - ${servicios.aceptadoAt})) / 60) FILTER (WHERE ${servicios.completadoAt} IS NOT NULL AND ${servicios.aceptadoAt} IS NOT NULL), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${servicios.costoTotal} AS NUMERIC)) FILTER (WHERE ${servicios.estado} = 'completado'), 0)`,
      })
      .from(servicios)
      .where(dateFilter);

    const totalServices = stats.totalServices || 0;
    const completedServices = stats.completedServices || 0;
    const cancelledServices = stats.cancelledServices || 0;
    const acceptedServices = stats.acceptedServices || 0;

    return {
      avgResponseMinutes: Number(stats.avgResponseMinutes) || 0,
      avgServiceDurationMinutes: Number(stats.avgServiceDurationMinutes) || 0,
      acceptanceRate: totalServices > 0 ? (acceptedServices / totalServices) * 100 : 0,
      cancellationRate: totalServices > 0 ? (cancelledServices / totalServices) * 100 : 0,
      avgRevenuePerService: completedServices > 0 ? Number(stats.totalRevenue) / completedServices : 0,
      totalServices,
      completedServices,
      cancelledServices,
    };
  }

  async getVehicleTypeDistribution(startDate?: string, endDate?: string): Promise<Array<{ tipoVehiculo: string; count: number; revenue: number }>> {
    let query = db
      .select({
        tipoVehiculo: sql<string>`COALESCE(${servicios.tipoVehiculo}, 'no_especificado')`.as('tipo_vehiculo'),
        count: sql<number>`COUNT(*)::int`.as('count'),
        revenue: sql<number>`COALESCE(SUM(CAST(${servicios.costoTotal} AS NUMERIC)) FILTER (WHERE ${servicios.estado} = 'completado'), 0)`.as('revenue'),
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
      .groupBy(sql`COALESCE(${servicios.tipoVehiculo}, 'no_especificado')`)
      .orderBy(desc(sql`COUNT(*)`));

    return results.map(r => ({
      tipoVehiculo: r.tipoVehiculo,
      count: r.count,
      revenue: Number(r.revenue),
    }));
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

  // Seguro del Cliente
  async getClientInsuranceDocument(userId: string): Promise<DocumentoWithDetails | undefined> {
    const result = await db.query.documentos.findFirst({
      where: and(
        eq(documentos.usuarioId, userId),
        eq(documentos.tipo, 'seguro_cliente')
      ),
      with: {
        usuario: true,
        conductor: true,
        servicio: true,
        revisadoPorUsuario: true,
      },
      orderBy: desc(documentos.createdAt),
    });
    return result;
  }

  async hasApprovedClientInsurance(userId: string): Promise<boolean> {
    const result = await db.query.documentos.findFirst({
      where: and(
        eq(documentos.usuarioId, userId),
        eq(documentos.tipo, 'seguro_cliente'),
        eq(documentos.estado, 'aprobado')
      ),
    });
    return !!result;
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

  // Aseguradoras (Insurance Companies)
  async createAseguradora(aseguradora: InsertAseguradora): Promise<Aseguradora> {
    const [newAseguradora] = await db.insert(aseguradoras).values(aseguradora).returning();
    return newAseguradora;
  }

  async getAseguradoraById(id: string): Promise<AseguradoraWithDetails | undefined> {
    const result = await db.query.aseguradoras.findFirst({
      where: eq(aseguradoras.id, id),
      with: {
        user: true,
      },
    });
    return result;
  }

  async getAseguradoraByUserId(userId: string): Promise<AseguradoraWithDetails | undefined> {
    const result = await db.query.aseguradoras.findFirst({
      where: eq(aseguradoras.userId, userId),
      with: {
        user: true,
      },
    });
    return result;
  }

  async getAseguradoraByRnc(rnc: string): Promise<Aseguradora | undefined> {
    const [result] = await db
      .select()
      .from(aseguradoras)
      .where(eq(aseguradoras.rnc, rnc))
      .limit(1);
    return result;
  }

  async getAllAseguradoras(): Promise<AseguradoraWithDetails[]> {
    const results = await db.query.aseguradoras.findMany({
      with: {
        user: true,
      },
      orderBy: desc(aseguradoras.createdAt),
    });
    return results;
  }

  async getActiveAseguradoras(): Promise<AseguradoraWithDetails[]> {
    const results = await db.query.aseguradoras.findMany({
      where: eq(aseguradoras.activo, true),
      with: {
        user: true,
      },
      orderBy: desc(aseguradoras.nombreEmpresa),
    });
    return results;
  }

  async updateAseguradora(id: string, data: Partial<Aseguradora>): Promise<Aseguradora> {
    const [updated] = await db
      .update(aseguradoras)
      .set(data)
      .where(eq(aseguradoras.id, id))
      .returning();
    return updated;
  }

  async toggleAseguradoraActivo(id: string): Promise<Aseguradora> {
    const aseguradora = await this.getAseguradoraById(id);
    if (!aseguradora) {
      throw new Error('Aseguradora not found');
    }
    const [updated] = await db
      .update(aseguradoras)
      .set({ activo: !aseguradora.activo })
      .where(eq(aseguradoras.id, id))
      .returning();
    return updated;
  }

  // Servicios Aseguradora (Insurance Services)
  async createServicioAseguradora(servicio: InsertServicioAseguradora): Promise<ServicioAseguradora> {
    const [newServicio] = await db.insert(serviciosAseguradora).values(servicio).returning();
    return newServicio;
  }

  async getServicioAseguradoraById(id: string): Promise<ServicioAseguradoraWithDetails | undefined> {
    const result = await db.query.serviciosAseguradora.findFirst({
      where: eq(serviciosAseguradora.id, id),
      with: {
        servicio: {
          with: {
            cliente: true,
            conductor: true,
          },
        },
        aseguradora: true,
        aprobadoPorUsuario: true,
        rechazadoPorUsuario: true,
      },
    });
    return result as ServicioAseguradoraWithDetails | undefined;
  }

  async getServicioAseguradoraByServicioId(servicioId: string): Promise<ServicioAseguradoraWithDetails | undefined> {
    const result = await db.query.serviciosAseguradora.findFirst({
      where: eq(serviciosAseguradora.servicioId, servicioId),
      with: {
        servicio: {
          with: {
            cliente: true,
            conductor: true,
          },
        },
        aseguradora: true,
        aprobadoPorUsuario: true,
        rechazadoPorUsuario: true,
      },
    });
    return result as ServicioAseguradoraWithDetails | undefined;
  }

  async getServiciosAseguradoraByAseguradoraId(aseguradoraId: string): Promise<ServicioAseguradoraWithDetails[]> {
    const results = await db.query.serviciosAseguradora.findMany({
      where: eq(serviciosAseguradora.aseguradoraId, aseguradoraId),
      with: {
        servicio: {
          with: {
            cliente: true,
            conductor: true,
          },
        },
        aseguradora: true,
        aprobadoPorUsuario: true,
        rechazadoPorUsuario: true,
      },
      orderBy: desc(serviciosAseguradora.createdAt),
    });
    return results as ServicioAseguradoraWithDetails[];
  }

  async getServiciosAseguradoraPendientes(aseguradoraId: string): Promise<ServicioAseguradoraWithDetails[]> {
    const results = await db.query.serviciosAseguradora.findMany({
      where: and(
        eq(serviciosAseguradora.aseguradoraId, aseguradoraId),
        isNull(serviciosAseguradora.aprobadoPor),
        isNull(serviciosAseguradora.rechazadoPor)
      ),
      with: {
        servicio: {
          with: {
            cliente: true,
            conductor: true,
          },
        },
        aseguradora: true,
        aprobadoPorUsuario: true,
        rechazadoPorUsuario: true,
      },
      orderBy: desc(serviciosAseguradora.createdAt),
    });
    return results as ServicioAseguradoraWithDetails[];
  }

  async aprobarServicioAseguradora(id: string, userId: string, montoAprobado: string): Promise<ServicioAseguradora> {
    const [updated] = await db
      .update(serviciosAseguradora)
      .set({
        aprobadoPor: userId,
        fechaAprobacion: new Date(),
        montoAprobado: montoAprobado,
      })
      .where(eq(serviciosAseguradora.id, id))
      .returning();
    
    // Update the service status in servicios table
    const servicioAseg = await this.getServicioAseguradoraById(id);
    if (servicioAseg?.servicioId) {
      await db
        .update(servicios)
        .set({ aseguradoraEstado: 'aprobado' })
        .where(eq(servicios.id, servicioAseg.servicioId));
    }
    
    return updated;
  }

  async rechazarServicioAseguradora(id: string, userId: string, motivo: string): Promise<ServicioAseguradora> {
    const [updated] = await db
      .update(serviciosAseguradora)
      .set({
        rechazadoPor: userId,
        fechaRechazo: new Date(),
        motivoRechazo: motivo,
      })
      .where(eq(serviciosAseguradora.id, id))
      .returning();
    
    // Update the service status in servicios table
    const servicioAseg = await this.getServicioAseguradoraById(id);
    if (servicioAseg?.servicioId) {
      await db
        .update(servicios)
        .set({ aseguradoraEstado: 'rechazado' })
        .where(eq(servicios.id, servicioAseg.servicioId));
    }
    
    return updated;
  }

  async marcarServicioAseguradoraFacturado(id: string, numeroFactura: string): Promise<ServicioAseguradora> {
    const [updated] = await db
      .update(serviciosAseguradora)
      .set({
        estadoPago: 'facturado',
        numeroFactura: numeroFactura,
        fechaFactura: new Date(),
      })
      .where(eq(serviciosAseguradora.id, id))
      .returning();
    return updated;
  }

  async marcarServicioAseguradoraPagado(id: string): Promise<ServicioAseguradora> {
    const [updated] = await db
      .update(serviciosAseguradora)
      .set({
        estadoPago: 'pagado',
        fechaPago: new Date(),
      })
      .where(eq(serviciosAseguradora.id, id))
      .returning();
    return updated;
  }

  async getResumenAseguradora(aseguradoraId: string, startDate?: string, endDate?: string): Promise<{
    totalServicios: number;
    pendientes: number;
    aprobados: number;
    rechazados: number;
    montoTotal: number;
    montoPendiente: number;
    montoFacturado: number;
    montoPagado: number;
  }> {
    let query = db
      .select()
      .from(serviciosAseguradora)
      .where(eq(serviciosAseguradora.aseguradoraId, aseguradoraId));
    
    const allServicios = await query;
    
    let filteredServicios = allServicios;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredServicios = allServicios.filter(s => {
        const created = new Date(s.createdAt);
        return created >= start && created <= end;
      });
    }
    
    const pendientes = filteredServicios.filter(s => !s.aprobadoPor && !s.rechazadoPor);
    const aprobados = filteredServicios.filter(s => s.aprobadoPor);
    const rechazados = filteredServicios.filter(s => s.rechazadoPor);
    
    const montoTotal = aprobados.reduce((sum, s) => sum + (parseFloat(s.montoAprobado || '0')), 0);
    const montoPendiente = aprobados.filter(s => s.estadoPago === 'pendiente_facturar').reduce((sum, s) => sum + (parseFloat(s.montoAprobado || '0')), 0);
    const montoFacturado = aprobados.filter(s => s.estadoPago === 'facturado').reduce((sum, s) => sum + (parseFloat(s.montoAprobado || '0')), 0);
    const montoPagado = aprobados.filter(s => s.estadoPago === 'pagado').reduce((sum, s) => sum + (parseFloat(s.montoAprobado || '0')), 0);
    
    return {
      totalServicios: filteredServicios.length,
      pendientes: pendientes.length,
      aprobados: aprobados.length,
      rechazados: rechazados.length,
      montoTotal,
      montoPendiente,
      montoFacturado,
      montoPagado,
    };
  }

  // Document Validation System (Module 2.6)
  async getDocumentosProximosAVencer(dias: number): Promise<Array<Documento & { conductor?: Conductor; user?: User }>> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + dias);
    
    const results = await db.query.documentos.findMany({
      where: and(
        eq(documentos.estado, 'aprobado'),
        gte(documentos.validoHasta, now),
        lte(documentos.validoHasta, futureDate)
      ),
      with: {
        conductor: true,
        usuario: true,
      },
    });
    
    return results.map(doc => ({
      ...doc,
      user: doc.usuario,
    }));
  }

  async getDocumentosVencidos(): Promise<Array<Documento & { conductor?: Conductor; user?: User }>> {
    const now = new Date();
    
    const results = await db.query.documentos.findMany({
      where: and(
        eq(documentos.estado, 'aprobado'),
        lte(documentos.validoHasta, now)
      ),
      with: {
        conductor: true,
        usuario: true,
      },
    });
    
    return results.map(doc => ({
      ...doc,
      user: doc.usuario,
    }));
  }

  async getRecordatoriosEnviados(documentoId: string): Promise<DocumentoRecordatorio[]> {
    return db
      .select()
      .from(documentoRecordatorios)
      .where(eq(documentoRecordatorios.documentoId, documentoId))
      .orderBy(desc(documentoRecordatorios.sentAt));
  }

  async registrarRecordatorioEnviado(documentoId: string, tipoRecordatorio: '30_dias' | '15_dias' | '7_dias' | 'vencido'): Promise<DocumentoRecordatorio> {
    const [recordatorio] = await db
      .insert(documentoRecordatorios)
      .values({
        documentoId,
        tipoRecordatorio,
      })
      .returning();
    return recordatorio;
  }

  async hasRecordatorioSent(documentoId: string, tipoRecordatorio: '30_dias' | '15_dias' | '7_dias' | 'vencido'): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(documentoRecordatorios)
      .where(and(
        eq(documentoRecordatorios.documentoId, documentoId),
        eq(documentoRecordatorios.tipoRecordatorio, tipoRecordatorio)
      ))
      .limit(1);
    return !!existing;
  }

  async suspenderConductorPorDocumento(conductorId: string, motivo: string): Promise<void> {
    const conductor = await this.getConductorById(conductorId);
    if (!conductor) return;
    
    await db
      .update(conductores)
      .set({ disponible: false })
      .where(eq(conductores.id, conductorId));
    
    await db
      .update(users)
      .set({ estadoCuenta: 'suspendido' })
      .where(eq(users.id, conductor.userId));
  }

  async reactivarConductor(conductorId: string): Promise<void> {
    const conductor = await this.getConductorById(conductorId);
    if (!conductor) return;
    
    await db
      .update(users)
      .set({ estadoCuenta: 'activo' })
      .where(eq(users.id, conductor.userId));
  }

  async getConductoresConDocumentosVencidos(): Promise<Array<Conductor & { user: User; documentosVencidos: Documento[] }>> {
    const now = new Date();
    const allConductores = await db.query.conductores.findMany({
      with: {
        user: true,
      },
    });
    
    const result: Array<Conductor & { user: User; documentosVencidos: Documento[] }> = [];
    
    for (const conductor of allConductores) {
      const docs = await db
        .select()
        .from(documentos)
        .where(and(
          eq(documentos.conductorId, conductor.id),
          eq(documentos.estado, 'aprobado'),
          lte(documentos.validoHasta, now)
        ));
      
      if (docs.length > 0) {
        result.push({
          ...conductor,
          documentosVencidos: docs,
        });
      }
    }
    
    return result;
  }

  async getDriverDocumentStatusSummary(conductorId: string): Promise<{
    totalDocumentos: number;
    documentosAprobados: number;
    documentosPendientes: number;
    documentosRechazados: number;
    documentosVencidos: number;
    documentosProximosAVencer: number;
    puedeEstarEnLinea: boolean;
    documentos: Documento[];
  }> {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    
    const docs = await db
      .select()
      .from(documentos)
      .where(eq(documentos.conductorId, conductorId));
    
    const aprobados = docs.filter(d => d.estado === 'aprobado');
    const pendientes = docs.filter(d => d.estado === 'pendiente');
    const rechazados = docs.filter(d => d.estado === 'rechazado');
    
    const vencidos = aprobados.filter(d => d.validoHasta && new Date(d.validoHasta) < now);
    const proximosAVencer = aprobados.filter(d => {
      if (!d.validoHasta) return false;
      const expDate = new Date(d.validoHasta);
      return expDate >= now && expDate <= in30Days;
    });
    
    const requiredTypes = ['licencia', 'matricula', 'seguro_grua', 'foto_vehiculo', 'cedula_frontal', 'cedula_trasera'];
    const validDocs = aprobados.filter(d => {
      if (!d.validoHasta) return true;
      return new Date(d.validoHasta) >= now;
    });
    const validDocTypes = validDocs.map(d => d.tipo);
    const hasAllRequired = requiredTypes.every(t => validDocTypes.includes(t as any));
    
    return {
      totalDocumentos: docs.length,
      documentosAprobados: aprobados.length,
      documentosPendientes: pendientes.length,
      documentosRechazados: rechazados.length,
      documentosVencidos: vencidos.length,
      documentosProximosAVencer: proximosAVencer.length,
      puedeEstarEnLinea: hasAllRequired,
      documentos: docs,
    };
  }

  async getSystemJob(jobName: string): Promise<SystemJob | undefined> {
    const [job] = await db
      .select()
      .from(systemJobs)
      .where(eq(systemJobs.jobName, jobName))
      .limit(1);
    return job;
  }

  async createOrUpdateSystemJob(jobName: string, data: Partial<SystemJob>): Promise<SystemJob> {
    const existing = await this.getSystemJob(jobName);
    
    if (existing) {
      const [updated] = await db
        .update(systemJobs)
        .set(data)
        .where(eq(systemJobs.jobName, jobName))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemJobs)
        .values({
          jobName,
          ...data,
        })
        .returning();
      return created;
    }
  }

  async setJobRunning(jobName: string, isRunning: boolean): Promise<void> {
    await this.createOrUpdateSystemJob(jobName, { isRunning });
  }

  // ==================== TICKETS (Module 2.7) ====================

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db.insert(tickets).values(insertTicket).returning();
    return ticket;
  }

  async getTicketById(id: string): Promise<TicketWithDetails | undefined> {
    const result = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
      with: {
        usuario: true,
        servicioRelacionado: true,
        asignadoAUsuario: true,
        mensajes: {
          with: {
            usuario: true,
          },
          orderBy: (mensajesTicket, { asc }) => [asc(mensajesTicket.createdAt)],
        },
      },
    });
    
    if (!result) return undefined;
    
    return {
      ...result,
      mensajeCount: result.mensajes?.length || 0,
      ultimoMensaje: result.mensajes?.[result.mensajes.length - 1],
    } as TicketWithDetails;
  }

  async getTicketsByUsuarioId(usuarioId: string): Promise<TicketWithDetails[]> {
    const results = await db.query.tickets.findMany({
      where: eq(tickets.usuarioId, usuarioId),
      with: {
        usuario: true,
        servicioRelacionado: true,
        asignadoAUsuario: true,
        mensajes: {
          with: {
            usuario: true,
          },
          orderBy: (mensajesTicket, { desc }) => [desc(mensajesTicket.createdAt)],
          limit: 1,
        },
      },
      orderBy: desc(tickets.createdAt),
    });
    
    return results.map(result => ({
      ...result,
      mensajeCount: result.mensajes?.length || 0,
      ultimoMensaje: result.mensajes?.[0],
    })) as TicketWithDetails[];
  }

  async getAllTickets(): Promise<TicketWithDetails[]> {
    const results = await db.query.tickets.findMany({
      with: {
        usuario: true,
        servicioRelacionado: true,
        asignadoAUsuario: true,
        mensajes: {
          with: {
            usuario: true,
          },
          orderBy: (mensajesTicket, { desc }) => [desc(mensajesTicket.createdAt)],
          limit: 1,
        },
      },
      orderBy: desc(tickets.createdAt),
    });
    
    return results.map(result => ({
      ...result,
      mensajeCount: result.mensajes?.length || 0,
      ultimoMensaje: result.mensajes?.[0],
    })) as TicketWithDetails[];
  }

  async getTicketsByEstado(estado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'): Promise<TicketWithDetails[]> {
    const results = await db.query.tickets.findMany({
      where: eq(tickets.estado, estado),
      with: {
        usuario: true,
        servicioRelacionado: true,
        asignadoAUsuario: true,
        mensajes: {
          with: {
            usuario: true,
          },
          orderBy: (mensajesTicket, { desc }) => [desc(mensajesTicket.createdAt)],
          limit: 1,
        },
      },
      orderBy: desc(tickets.createdAt),
    });
    
    return results.map(result => ({
      ...result,
      mensajeCount: result.mensajes?.length || 0,
      ultimoMensaje: result.mensajes?.[0],
    })) as TicketWithDetails[];
  }

  async getTicketsAsignadosA(adminId: string): Promise<TicketWithDetails[]> {
    const results = await db.query.tickets.findMany({
      where: eq(tickets.asignadoA, adminId),
      with: {
        usuario: true,
        servicioRelacionado: true,
        asignadoAUsuario: true,
        mensajes: {
          with: {
            usuario: true,
          },
          orderBy: (mensajesTicket, { desc }) => [desc(mensajesTicket.createdAt)],
          limit: 1,
        },
      },
      orderBy: desc(tickets.createdAt),
    });
    
    return results.map(result => ({
      ...result,
      mensajeCount: result.mensajes?.length || 0,
      ultimoMensaje: result.mensajes?.[0],
    })) as TicketWithDetails[];
  }

  async updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket> {
    const [ticket] = await db
      .update(tickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return ticket;
  }

  async asignarTicket(id: string, adminId: string): Promise<Ticket> {
    const [ticket] = await db
      .update(tickets)
      .set({ 
        asignadoA: adminId, 
        estado: 'en_proceso',
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();
    return ticket;
  }

  async cambiarEstadoTicket(id: string, estado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'): Promise<Ticket> {
    const updates: Partial<Ticket> = {
      estado,
      updatedAt: new Date(),
    };
    
    if (estado === 'resuelto') {
      updates.resueltoAt = new Date();
    } else if (estado === 'cerrado') {
      updates.cerradoAt = new Date();
    }
    
    const [ticket] = await db
      .update(tickets)
      .set(updates)
      .where(eq(tickets.id, id))
      .returning();
    return ticket;
  }

  async cerrarTicket(id: string): Promise<Ticket> {
    return this.cambiarEstadoTicket(id, 'cerrado');
  }

  async createMensajeTicket(insertMensaje: InsertMensajeTicket): Promise<MensajeTicket> {
    const [mensaje] = await db.insert(mensajesTicket).values(insertMensaje).returning();
    
    await db
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, insertMensaje.ticketId));
    
    return mensaje;
  }

  async getMensajesByTicketId(ticketId: string): Promise<MensajeTicketWithUsuario[]> {
    const results = await db.query.mensajesTicket.findMany({
      where: eq(mensajesTicket.ticketId, ticketId),
      with: {
        usuario: true,
      },
      orderBy: (mensajesTicket, { asc }) => [asc(mensajesTicket.createdAt)],
    });
    return results as MensajeTicketWithUsuario[];
  }

  async marcarMensajesTicketComoLeidos(ticketId: string, usuarioId: string): Promise<void> {
    await db
      .update(mensajesTicket)
      .set({ leido: true })
      .where(
        and(
          eq(mensajesTicket.ticketId, ticketId),
          sql`${mensajesTicket.usuarioId} != ${usuarioId}`
        )
      );
  }

  async getTicketsStats(): Promise<{
    totalTickets: number;
    abiertos: number;
    enProceso: number;
    resueltos: number;
    cerrados: number;
    urgentes: number;
    sinAsignar: number;
  }> {
    const [stats] = await db
      .select({
        totalTickets: sql<number>`count(*)::int`,
        abiertos: sql<number>`count(*) filter (where ${tickets.estado} = 'abierto')::int`,
        enProceso: sql<number>`count(*) filter (where ${tickets.estado} = 'en_proceso')::int`,
        resueltos: sql<number>`count(*) filter (where ${tickets.estado} = 'resuelto')::int`,
        cerrados: sql<number>`count(*) filter (where ${tickets.estado} = 'cerrado')::int`,
        urgentes: sql<number>`count(*) filter (where ${tickets.prioridad} = 'urgente' and ${tickets.estado} != 'cerrado')::int`,
        sinAsignar: sql<number>`count(*) filter (where ${tickets.asignadoA} is null and ${tickets.estado} != 'cerrado')::int`,
      })
      .from(tickets);
    
    return stats;
  }
}

export const storage = new DatabaseStorage();
