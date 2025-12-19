import { db } from './db';
import { eq, and, desc, isNull, sql, gte, lte, lt, between, ne, or, asc } from 'drizzle-orm';
import {
  users,
  conductores,
  conductorServicios,
  conductorServicioSubtipos,
  conductorVehiculos,
  dismissedServices,
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
  socios,
  distribucionesSocios,
  clientPaymentMethods,
  operatorPaymentMethods,
  operatorBankAccounts,
  operatorWithdrawals,
  scheduledPayouts,
  scheduledPayoutItems,
  empresas,
  empresaEmpleados,
  empresaContratos,
  empresaTarifas,
  empresaProyectos,
  empresaConductoresAsignados,
  serviciosProgramados,
  empresaFacturas,
  empresaFacturaItems,
  operatorWallets,
  walletTransactions,
  operatorDebts,
  razonesCancelacion,
  zonasDemanada,
  cancelacionesServicios,
  type User,
  type InsertUser,
  type Conductor,
  type InsertConductor,
  type ConductorServicio,
  type InsertConductorServicio,
  type ConductorServicioSubtipo,
  type InsertConductorServicioSubtipo,
  type ConductorVehiculo,
  type InsertConductorVehiculo,
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
  type Socio,
  type InsertSocio,
  type DistribucionSocio,
  type InsertDistribucionSocio,
  type SocioWithDetails,
  type DistribucionSocioWithDetails,
  type ClientPaymentMethod,
  type InsertClientPaymentMethod,
  type OperatorPaymentMethod,
  type InsertOperatorPaymentMethod,
  type OperatorBankAccount,
  type InsertOperatorBankAccount,
  type OperatorWithdrawal,
  type InsertOperatorWithdrawal,
  type ScheduledPayout,
  type InsertScheduledPayout,
  type ScheduledPayoutItem,
  type InsertScheduledPayoutItem,
  type Empresa,
  type InsertEmpresa,
  type EmpresaEmpleado,
  type InsertEmpresaEmpleado,
  type EmpresaContrato,
  type InsertEmpresaContrato,
  type EmpresaTarifa,
  type InsertEmpresaTarifa,
  type EmpresaProyecto,
  type InsertEmpresaProyecto,
  type EmpresaConductorAsignado,
  type InsertEmpresaConductorAsignado,
  type ServicioProgramado,
  type InsertServicioProgramado,
  type EmpresaFactura,
  type InsertEmpresaFactura,
  type EmpresaFacturaItem,
  type InsertEmpresaFacturaItem,
  type EmpresaWithDetails,
  type EmpresaEmpleadoWithUser,
  type EmpresaConductorAsignadoWithDetails,
  type ServicioProgramadoWithDetails,
  type EmpresaFacturaWithItems,
  type EmpresaFacturaItemWithDetails,
  type EmpresaProyectoWithDetails,
  type EmpresaContratoWithDetails,
  type OperatorWallet,
  type InsertOperatorWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type OperatorDebt,
  type InsertOperatorDebt,
  type WalletWithDetails,
  type OperatorDebtWithDaysRemaining,
  type WalletTransactionWithService,
  type WalletTransactionWithDetails,
  type OperatorStatementSummary,
  administradores,
  type Administrador,
  type InsertAdministrador,
  type AdministradorWithDetails,
  systemErrors,
  type SystemError,
  type InsertSystemError,
  type SystemErrorWithDetails,
  type RazonCancelacion,
  type ZonaDemanda,
  type CancelacionServicio,
  type InsertCancelacionServicio,
  type CancelacionServicioWithDetails,
} from '@shared/schema';
import {
  serviceReceipts,
} from './schema-extensions';

export interface IStorage {
  // Users
  getUserById(id: string): Promise<UserWithConductor | undefined>;
  getUserByEmail(email: string): Promise<UserWithConductor | undefined>;
  getUserByEmailAndType(email: string, userType: string): Promise<UserWithConductor | undefined>;
  getUsersByEmail(email: string): Promise<UserWithConductor[]>;
  getBasicUsersByEmail(email: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Conductores
  createConductor(conductor: InsertConductor): Promise<Conductor>;
  getConductorById(id: string): Promise<Conductor | undefined>;
  getConductorByUserId(userId: string): Promise<Conductor | undefined>;
  updateConductor(id: string, data: Partial<Conductor>): Promise<Conductor>;
  updateDriverAvailability(userId: string, disponible: boolean): Promise<Conductor>;
  updateDriverLocation(userId: string, lat: number, lng: number): Promise<Conductor>;
  getAvailableDrivers(): Promise<Array<Conductor & { user: User }>>;
  getAvailableDriversForCategory(categoria: string): Promise<Array<Conductor & { user: User; vehiculo: ConductorVehiculo }>>;
  getAllDrivers(): Promise<Array<Conductor & { user: User; vehiculos: ConductorVehiculo[] }>>;

  // Conductor Services (Service Categories and Subtypes)
  getConductorServicios(conductorId: string): Promise<Array<ConductorServicio & { subtipos: ConductorServicioSubtipo[] }>>;
  setConductorServicios(conductorId: string, categorias: Array<{ categoria: string; subtipos: string[] }>): Promise<void>;
  addConductorServicio(conductorId: string, categoriaServicio: string): Promise<ConductorServicio>;
  removeConductorServicio(conductorId: string, categoriaServicio: string): Promise<void>;
  addConductorServicioSubtipo(conductorServicioId: string, subtipoServicio: string): Promise<ConductorServicioSubtipo>;
  removeConductorServicioSubtipo(conductorServicioId: string, subtipoServicio: string): Promise<void>;

  // Conductor Vehicles (one vehicle per category per driver)
  getConductorVehiculos(conductorId: string): Promise<ConductorVehiculo[]>;
  getConductorVehiculoByCategoria(conductorId: string, categoria: string): Promise<ConductorVehiculo | undefined>;
  createConductorVehiculo(vehiculo: InsertConductorVehiculo): Promise<ConductorVehiculo>;
  updateConductorVehiculo(id: string, data: Partial<ConductorVehiculo>): Promise<ConductorVehiculo>;
  deleteConductorVehiculo(id: string): Promise<void>;
  
  // Document Validation (Verifik)
  updateDocumentoVerifikValidation(documentoId: string, data: {
    verifikScanId?: string;
    verifikScore?: string;
    verifikValidado?: boolean;
    verifikTipoValidacion?: string;
    verifikRespuesta?: string;
    verifikFechaValidacion?: Date;
    estado?: string;
  }): Promise<Documento>;

  // Servicios
  createServicio(servicio: InsertServicio): Promise<Servicio>;
  getServicioById(id: string): Promise<ServicioWithDetails | undefined>;
  getServicioByPaymentToken(token: string): Promise<Servicio | undefined>;
  getServiciosByClientId(clientId: string): Promise<ServicioWithDetails[]>;
  getServiciosByConductorId(conductorId: string): Promise<ServicioWithDetails[]>;
  getActiveServiceByConductorId(conductorId: string): Promise<ServicioWithDetails | null>;
  getPendingServicios(): Promise<Servicio[]>;
  getExpiredPendingServicios(timeoutMinutes: number): Promise<Servicio[]>;
  cancelExpiredServicios(timeoutMinutes: number): Promise<Servicio[]>;
  getRecentlyCancelledServices(withinMinutes: number): Promise<Servicio[]>;
  getAllServicios(): Promise<ServicioWithDetails[]>;
  updateServicio(id: string, data: Partial<Servicio>): Promise<Servicio>;
  acceptServicio(id: string, conductorId: string, vehiculoId?: string): Promise<Servicio>;

  // Dismissed Services (services rejected by drivers)
  dismissService(conductorId: string, servicioId: string): Promise<void>;
  getDismissedServiceIds(conductorId: string): Promise<string[]>;

  // Tarifas
  createTarifa(tarifa: InsertTarifa): Promise<Tarifa>;
  getActiveTarifa(): Promise<Tarifa | undefined>;
  getTarifaByCategoriaySubtipo(categoria: string | null, subtipo: string | null): Promise<Tarifa | undefined>;
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
  getAllClientInsuranceDocuments(userId: string): Promise<DocumentoWithDetails[]>;
  hasApprovedClientInsurance(userId: string): Promise<boolean>;

  // Servicios con Aseguradora
  getServiciosPendientesAseguradora(): Promise<ServicioWithDetails[]>;
  aprobarAseguradora(id: string, adminId: string): Promise<Servicio>;
  rechazarAseguradora(id: string, adminId: string, motivo: string): Promise<Servicio>;

  // Comisiones
  createComision(comision: InsertComision): Promise<Comision>;
  getComisionById(id: string): Promise<ComisionWithDetails | undefined>;
  getComisionByServicioId(servicioId: string): Promise<ComisionWithDetails | undefined>;
  getComisionesByEstado(estado: string, tipo: 'operador' | 'empresa'): Promise<ComisionWithDetails[]>;
  getComisionesByConductor(conductorId: string): Promise<ComisionWithDetails[]>;
  getAllComisiones(): Promise<ComisionWithDetails[]>;
  updateComision(id: string, data: Partial<Comision>): Promise<Comision>;
  updateComisionNotas(id: string, notas: string): Promise<Comision>;
  marcarComisionPagada(id: string, tipo: 'operador' | 'empresa', referenciaPago?: string): Promise<Comision>;

  // Payment Gateway Methods - Client payment methods use clientPaymentMethods table
  // Driver bank accounts are stored in the conductores table
  deletePaymentMethodById(id: string): Promise<void>;
  setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void>;

  // Service Receipts
  createServiceReceipt(data: { servicioId: string; receiptNumber: string; receiptUrl: string; pdfSize?: number }): Promise<any>;
  getServiceReceiptByServiceId(servicioId: string): Promise<any | undefined>;

  // Documentos
  createDocumento(documento: InsertDocumento): Promise<Documento>;
  getDocumentoById(id: string): Promise<Documento | undefined>;
  getDocumentosByConductor(conductorId: string): Promise<Documento[]>;
  getDocumentoByConductorAndTipo(conductorId: string, tipo: string): Promise<Documento | undefined>;
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

  // System Errors
  createSystemError(data: InsertSystemError): Promise<SystemError>;
  getSystemErrorById(id: string): Promise<SystemError | undefined>;
  getSystemErrorByFingerprint(fingerprint: string): Promise<SystemError | undefined>;
  updateSystemError(id: string, data: Partial<SystemError>): Promise<SystemError>;
  getUnresolvedSystemErrors(limit?: number): Promise<SystemError[]>;
  getAllSystemErrors(limit?: number): Promise<SystemError[]>;
  getSystemErrorsByTicketId(ticketId: string): Promise<SystemError[]>;

  // Socios (Partners/Investors) - Module 2.5
  createSocio(socio: InsertSocio): Promise<Socio>;
  getSocioById(id: string): Promise<SocioWithDetails | undefined>;
  getSocioByUserId(userId: string): Promise<SocioWithDetails | undefined>;
  getAllSocios(): Promise<SocioWithDetails[]>;
  getActiveSocios(): Promise<SocioWithDetails[]>;
  updateSocio(id: string, data: Partial<Socio>): Promise<Socio>;
  toggleSocioActivo(id: string): Promise<Socio>;
  deleteSocio(id: string): Promise<void>;

  // Distribuciones de Socios
  createDistribucionSocio(distribucion: InsertDistribucionSocio): Promise<DistribucionSocio>;
  getDistribucionById(id: string): Promise<DistribucionSocioWithDetails | undefined>;
  getDistribucionesBySocioId(socioId: string): Promise<DistribucionSocioWithDetails[]>;
  getDistribucionesByPeriodo(periodo: string): Promise<DistribucionSocioWithDetails[]>;
  getAllDistribuciones(): Promise<DistribucionSocioWithDetails[]>;
  updateDistribucion(id: string, data: Partial<DistribucionSocio>): Promise<DistribucionSocio>;
  aprobarDistribucion(id: string, adminId: string): Promise<DistribucionSocio>;
  marcarDistribucionPagada(id: string, metodoPago: string, referencia: string): Promise<DistribucionSocio>;

  // Cálculos de distribución
  calcularDistribucionPeriodo(periodo: string): Promise<{
    ingresosTotales: number;
    comisionEmpresa: number;
    distribucionesPorSocio: Array<{
      socioId: string;
      porcentajeParticipacion: number;
      montoSocio: number;
    }>;
  }>;

  // Resumen para dashboard de socio
  getResumenSocio(socioId: string): Promise<{
    porcentajeParticipacion: number;
    montoInversion: number;
    fechaInversion: Date;
    totalDistribuciones: number;
    totalRecibido: number;
    pendientePago: number;
    roi: number;
    ultimaDistribucion: DistribucionSocio | null;
  }>;

  // Estadísticas de socios para admin
  getSociosStats(): Promise<{
    totalSocios: number;
    sociosActivos: number;
    totalInversion: number;
    totalDistribuido: number;
    pendientePago: number;
  }>;

  // Client Payment Methods (Azul)
  createClientPaymentMethod(paymentMethod: InsertClientPaymentMethod): Promise<ClientPaymentMethod>;
  getClientPaymentMethodById(id: string): Promise<ClientPaymentMethod | undefined>;
  getClientPaymentMethodsByUserId(userId: string): Promise<ClientPaymentMethod[]>;
  getDefaultClientPaymentMethod(userId: string): Promise<ClientPaymentMethod | undefined>;
  updateClientPaymentMethod(id: string, data: Partial<ClientPaymentMethod>): Promise<ClientPaymentMethod>;
  setDefaultClientPaymentMethod(id: string, userId: string): Promise<ClientPaymentMethod>;
  deleteClientPaymentMethod(id: string): Promise<void>;

  // Operator Payment Methods (for debt payment)
  createOperatorPaymentMethod(paymentMethod: InsertOperatorPaymentMethod): Promise<OperatorPaymentMethod>;
  getOperatorPaymentMethodById(id: string): Promise<OperatorPaymentMethod | undefined>;
  getOperatorPaymentMethodsByConductorId(conductorId: string): Promise<OperatorPaymentMethod[]>;
  getDefaultOperatorPaymentMethod(conductorId: string): Promise<OperatorPaymentMethod | undefined>;
  updateOperatorPaymentMethod(id: string, data: Partial<OperatorPaymentMethod>): Promise<OperatorPaymentMethod>;
  setDefaultOperatorPaymentMethod(id: string, conductorId: string): Promise<OperatorPaymentMethod>;
  deleteOperatorPaymentMethod(id: string): Promise<void>;

  // Operator Bank Accounts (Payment Gateway Payouts)
  createOperatorBankAccount(data: InsertOperatorBankAccount): Promise<OperatorBankAccount>;
  getOperatorBankAccount(conductorId: string): Promise<OperatorBankAccount | undefined>;
  updateOperatorBankAccount(id: string, data: Partial<OperatorBankAccount>): Promise<OperatorBankAccount>;
  deleteOperatorBankAccount(id: string): Promise<void>;

  // Operator Withdrawals (Payouts)
  createOperatorWithdrawal(data: InsertOperatorWithdrawal): Promise<OperatorWithdrawal>;
  getOperatorWithdrawal(id: string): Promise<OperatorWithdrawal | undefined>;
  getOperatorWithdrawals(conductorId: string): Promise<OperatorWithdrawal[]>;
  getAllWithdrawals(): Promise<OperatorWithdrawal[]>;
  updateOperatorWithdrawal(id: string, data: Partial<OperatorWithdrawal>): Promise<OperatorWithdrawal>;
  getPendingWithdrawals(): Promise<OperatorWithdrawal[]>;

  // Operator Balance Management
  updateOperatorBalance(conductorId: string, balanceDisponible: string, balancePendiente: string): Promise<Conductor>;
  addToOperatorBalance(conductorId: string, amount: string): Promise<Conductor>;
  deductFromOperatorBalance(conductorId: string, amount: string): Promise<Conductor>;

  // Scheduled Payouts (Payment Gateway Payroll)
  getConductoresWithPositiveBalance(): Promise<Conductor[]>;
  getOperatorBankAccountByCondutorId(conductorId: string): Promise<OperatorBankAccount | undefined>;
  createScheduledPayout(data: InsertScheduledPayout): Promise<ScheduledPayout>;
  updateScheduledPayout(id: string, data: Partial<ScheduledPayout>): Promise<ScheduledPayout>;
  getScheduledPayouts(): Promise<ScheduledPayout[]>;
  getScheduledPayoutById(id: string): Promise<ScheduledPayout | undefined>;
  createScheduledPayoutItem(data: InsertScheduledPayoutItem): Promise<ScheduledPayoutItem>;
  updateScheduledPayoutItem(conductorId: string, scheduledPayoutId: string, data: Partial<ScheduledPayoutItem>): Promise<ScheduledPayoutItem>;
  getScheduledPayoutItems(scheduledPayoutId: string): Promise<ScheduledPayoutItem[]>;
  updateConductorBalance(conductorId: string, balanceChange: number, pendingChange: number, setToZero?: boolean): Promise<Conductor>;

  // ==================== EMPRESAS / CONTRATOS EMPRESARIALES (Module 6) ====================

  // Empresas CRUD
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  getEmpresaById(id: string): Promise<EmpresaWithDetails | undefined>;
  getEmpresaByUserId(userId: string): Promise<EmpresaWithDetails | undefined>;
  getAllEmpresas(): Promise<EmpresaWithDetails[]>;
  updateEmpresa(id: string, data: Partial<Empresa>): Promise<Empresa>;
  getEmpresasByTipo(tipo: string): Promise<EmpresaWithDetails[]>;

  // Empleados CRUD
  addEmpresaEmpleado(empleado: InsertEmpresaEmpleado): Promise<EmpresaEmpleado>;
  getEmpresaEmpleados(empresaId: string): Promise<EmpresaEmpleadoWithUser[]>;
  updateEmpresaEmpleado(id: string, data: Partial<EmpresaEmpleado>): Promise<EmpresaEmpleado>;
  removeEmpresaEmpleado(id: string): Promise<void>;

  // Contratos CRUD
  createEmpresaContrato(contrato: InsertEmpresaContrato): Promise<EmpresaContrato>;
  getEmpresaContratos(empresaId: string): Promise<EmpresaContratoWithDetails[]>;
  updateEmpresaContrato(id: string, data: Partial<EmpresaContrato>): Promise<EmpresaContrato>;
  getEmpresaContratoActivo(empresaId: string): Promise<EmpresaContratoWithDetails | undefined>;

  // Tarifas CRUD
  createEmpresaTarifa(tarifa: InsertEmpresaTarifa): Promise<EmpresaTarifa>;
  getEmpresaTarifas(empresaId: string): Promise<EmpresaTarifa[]>;
  updateEmpresaTarifa(id: string, data: Partial<EmpresaTarifa>): Promise<EmpresaTarifa>;

  // Proyectos CRUD
  createEmpresaProyecto(proyecto: InsertEmpresaProyecto): Promise<EmpresaProyecto>;
  getEmpresaProyectos(empresaId: string): Promise<EmpresaProyectoWithDetails[]>;
  updateEmpresaProyecto(id: string, data: Partial<EmpresaProyecto>): Promise<EmpresaProyecto>;
  getEmpresaProyectoById(id: string): Promise<EmpresaProyectoWithDetails | undefined>;

  // Conductores Asignados
  asignarConductorEmpresa(asignacion: InsertEmpresaConductorAsignado): Promise<EmpresaConductorAsignado>;
  getConductoresAsignadosEmpresa(empresaId: string): Promise<EmpresaConductorAsignadoWithDetails[]>;
  removeAsignacionConductor(id: string): Promise<void>;

  // Servicios Programados
  createServicioProgramado(servicio: InsertServicioProgramado): Promise<ServicioProgramado>;
  getServiciosProgramadosEmpresa(empresaId: string): Promise<ServicioProgramadoWithDetails[]>;
  updateServicioProgramado(id: string, data: Partial<ServicioProgramado>): Promise<ServicioProgramado>;
  getServiciosProgramadosPendientes(): Promise<ServicioProgramadoWithDetails[]>;

  // Facturas
  createEmpresaFactura(factura: InsertEmpresaFactura): Promise<EmpresaFactura>;
  getEmpresaFacturas(empresaId: string): Promise<EmpresaFacturaWithItems[]>;
  updateEmpresaFactura(id: string, data: Partial<EmpresaFactura>): Promise<EmpresaFactura>;
  getEmpresaFacturaById(id: string): Promise<EmpresaFacturaWithItems | undefined>;
  createEmpresaFacturaItem(item: InsertEmpresaFacturaItem): Promise<EmpresaFacturaItem>;

  // Dashboard Stats
  getEmpresaDashboardStats(empresaId: string): Promise<{
    serviciosTotales: number;
    serviciosCompletados: number;
    serviciosPendientes: number;
    serviciosProgramados: number;
    gastoTotalMes: number;
    proyectosActivos: number;
    empleadosActivos: number;
    conductoresAsignados: number;
  }>;
  getEmpresaServiciosHistory(empresaId: string, limit?: number): Promise<ServicioProgramadoWithDetails[]>;

  // Negotiation Chat System
  getAvailableServicesForDrivers(): Promise<Servicio[]>;
  proposeNegotiationAmount(servicioId: string, conductorId: string, monto: number, notas?: string): Promise<Servicio>;
  confirmNegotiationAmount(servicioId: string, conductorId: string): Promise<Servicio>;
  acceptNegotiationAmount(servicioId: string, clienteId: string): Promise<Servicio>;
  rejectNegotiationAmount(servicioId: string, clienteId: string): Promise<Servicio>;
  createMensajeChatWithMedia(mensaje: InsertMensajeChat & { tipoMensaje?: string; montoAsociado?: string; urlArchivo?: string; nombreArchivo?: string }): Promise<MensajeChat>;
  getServiciosByNegociacionEstado(estado: string): Promise<Servicio[]>;

  // ==================== OPERATOR WALLET SYSTEM (Phase 2) ====================
  
  // Operator Wallets
  createOperatorWallet(conductorId: string): Promise<OperatorWallet>;
  getWalletByConductorId(conductorId: string): Promise<WalletWithDetails | undefined>;
  getWalletSummaryByConductorId(conductorId: string): Promise<{ id: string; balance: string; totalDebt: string; cashServicesBlocked: boolean } | null>;
  getWalletById(walletId: string): Promise<OperatorWallet | undefined>;
  updateWallet(walletId: string, data: Partial<OperatorWallet>): Promise<OperatorWallet>;

  // Wallet Transactions
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  getWalletTransactions(walletId: string, limit?: number): Promise<WalletTransactionWithService[]>;
  getTransactionByPaymentIntentId(paymentIntentId: string): Promise<WalletTransaction | undefined>;

  // Operator Debts
  createOperatorDebt(debt: InsertOperatorDebt): Promise<OperatorDebt>;
  getOperatorDebts(walletId: string): Promise<OperatorDebtWithDaysRemaining[]>;
  getOperatorDebtById(debtId: string): Promise<OperatorDebt | undefined>;
  updateOperatorDebt(debtId: string, data: Partial<OperatorDebt>): Promise<OperatorDebt>;
  getOverdueDebts(): Promise<OperatorDebt[]>;
  getDebtsNearDue(days: number): Promise<OperatorDebt[]>;

  // Mark service commission as processed
  markServiceCommissionProcessed(servicioId: string): Promise<void>;

  // Operator Statement for Manual Payouts
  getOperatorStatement(conductorId: string, periodStart?: Date, periodEnd?: Date): Promise<OperatorStatementSummary | null>;
  recordManualPayout(walletId: string, amount: string, adminId: string, notes?: string, evidenceUrl?: string): Promise<WalletTransaction>;

  // ==================== SYSTEM FOR CANCELLATIONS (Phase 3) ====================
  
  // Cancelaciones Servicios
  createCancelacionServicio(cancelacion: InsertCancelacionServicio): Promise<CancelacionServicio>;
  getCancelacionesByUsuarioId(usuarioId: string, tipo: 'cliente' | 'conductor'): Promise<CancelacionServicioWithDetails[]>;
  getCancelacionesByServicioId(servicioId: string): Promise<CancelacionServicioWithDetails | undefined>;
  getAllCancelaciones(limit?: number): Promise<CancelacionServicioWithDetails[]>;
  updateCancelacion(id: string, data: Partial<CancelacionServicio>): Promise<CancelacionServicio>;
  
  // Razones Cancelacion
  getAllRazonesCancelacion(): Promise<RazonCancelacion[]>;
  getRazonCancelacionByCodigo(codigo: string): Promise<RazonCancelacion | undefined>;
  
  // Zonas Demanda
  getZonaDemandaByCoords(lat: number, lng: number): Promise<ZonaDemanda | undefined>;
  updateZonaDemanda(id: string, data: Partial<ZonaDemanda>): Promise<ZonaDemanda>;

  // ==================== ADMINISTRADORES (ADMIN USERS WITH PERMISSIONS) ====================
  
  // Administradores CRUD
  getAdministradores(): Promise<AdministradorWithDetails[]>;
  getAdministradorById(id: string): Promise<AdministradorWithDetails | undefined>;
  getAdministradorByUserId(userId: string): Promise<AdministradorWithDetails | undefined>;
  createAdministrador(data: InsertAdministrador): Promise<Administrador>;
  updateAdministrador(id: string, data: Partial<InsertAdministrador>): Promise<Administrador | undefined>;
  toggleAdministradorActivo(id: string): Promise<Administrador | undefined>;
  updateAdminPrimerInicioSesion(id: string): Promise<void>;
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

  async getUserByEmailAndType(email: string, userType: string): Promise<UserWithConductor | undefined> {
    const result = await db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.userType, userType as any)),
      with: {
        conductor: true,
      },
    });
    return result;
  }

  async getUsersByEmail(email: string): Promise<UserWithConductor[]> {
    const results = await db.query.users.findMany({
      where: eq(users.email, email),
      with: {
        conductor: true,
      },
    });
    return results;
  }

  async getBasicUsersByEmail(email: string): Promise<User[]> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    // Delete user account and handle all foreign key references
    // Some tables have ON DELETE CASCADE, but others don't, so we need to handle them manually
    
    // 1. Get conductor ID if user is a driver (needed for some cleanup)
    const conductor = await db.select().from(conductores).where(eq(conductores.userId, id)).limit(1);
    const conductorId = conductor[0]?.id;

    // 2. Clean up audit/reference fields that don't have ON DELETE CASCADE
    // Update documentos.revisadoPor to NULL
    await db.update(documentos)
      .set({ revisadoPor: null })
      .where(eq(documentos.revisadoPor, id));

    // Update serviciosAseguradora.aprobadoPor and rechazadoPor to NULL  
    await db.update(serviciosAseguradora)
      .set({ aprobadoPor: null })
      .where(eq(serviciosAseguradora.aprobadoPor, id));
    await db.update(serviciosAseguradora)
      .set({ rechazadoPor: null })
      .where(eq(serviciosAseguradora.rechazadoPor, id));

    // Update distribucionesSocios.calculadoPor and aprobadoPor to NULL
    await db.update(distribucionesSocios)
      .set({ calculadoPor: null })
      .where(eq(distribucionesSocios.calculadoPor, id));
    await db.update(distribucionesSocios)
      .set({ aprobadoPor: null })
      .where(eq(distribucionesSocios.aprobadoPor, id));

    // Update empresas.verificadoPor to NULL
    await db.update(empresas)
      .set({ verificadoPor: null })
      .where(eq(empresas.verificadoPor, id));

    // Update administradores.creadoPor to NULL
    await db.update(administradores)
      .set({ creadoPor: null })
      .where(eq(administradores.creadoPor, id));

    // 3. Handle mensajesChat - delete messages where user is the sender
    // (servicioId has CASCADE but remitenteId doesn't)
    await db.delete(mensajesChat).where(eq(mensajesChat.remitenteId, id));

    // 4. Handle ubicacionesTracking - if user is a driver, clean up tracking records
    // (conductorId references conductores, which will be deleted via CASCADE from users)
    // But conductorId in ubicacionesTracking doesn't have CASCADE
    if (conductorId) {
      await db.delete(ubicacionesTracking).where(eq(ubicacionesTracking.conductorId, conductorId));
    }

    // 5. Handle servicios - conductorId can be set to NULL, but clienteId is NOT NULL
    // Update conductorId to NULL where this user is the driver
    await db.update(servicios)
      .set({ conductorId: null })
      .where(eq(servicios.conductorId, id));

    // For clienteId (NOT NULL), we need to delete completed/cancelled services
    // or the user deletion will fail
    // First, get services where user is client and delete related records
    const userServices = await db.select({ id: servicios.id })
      .from(servicios)
      .where(eq(servicios.clienteId, id));
    
    if (userServices.length > 0) {
      // Delete the services - CASCADE will handle:
      // - calificaciones, comisiones, serviciosAseguradora, dismissedServices
      // - mensajesChat (already deleted above), ubicacionesTracking
      // - serviceReceipts, empresaFacturaItems (via set null)
      await db.delete(servicios).where(eq(servicios.clienteId, id));
    }

    // 6. Handle serviciosProgramados.solicitadoPor (NOT NULL) - delete these records
    await db.delete(serviciosProgramados).where(eq(serviciosProgramados.solicitadoPor, id));

    // 7. Finally delete the user - CASCADE will handle:
    // - conductores (and via conductores cascade: conductorServicios, conductorServicioSubtipos, conductorVehiculos, dismissedServices, empresaConductoresAsignados)
    // - pushSubscriptions
    // - documentos (usuarioId)
    // - tickets, mensajesTicket
    // - aseguradoras
    // - empresas, empresaEmpleados
    // - socios
    // - administradores
    // - operatorWallets, clientPaymentMethods, operatorPaymentMethods, operatorBankAccounts
    await db.delete(users).where(eq(users.id, id));
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

  async getAvailableDriversForCategory(categoria: string): Promise<Array<Conductor & { user: User; vehiculo: ConductorVehiculo }>> {
    const driversWithVehicles = await db
      .select({
        conductor: conductores,
        user: users,
        vehiculo: conductorVehiculos,
      })
      .from(conductores)
      .innerJoin(users, eq(conductores.userId, users.id))
      .innerJoin(conductorVehiculos, and(
        eq(conductorVehiculos.conductorId, conductores.id),
        eq(conductorVehiculos.categoria, categoria as any),
        eq(conductorVehiculos.activo, true)
      ))
      .innerJoin(conductorServicios, and(
        eq(conductorServicios.conductorId, conductores.id),
        eq(conductorServicios.categoriaServicio, categoria as any)
      ))
      .where(eq(conductores.disponible, true));

    return driversWithVehicles.map(({ conductor, user, vehiculo }) => ({
      ...conductor,
      user,
      vehiculo,
    }));
  }

  async getAllDrivers(): Promise<Array<Conductor & { user: User; vehiculos: ConductorVehiculo[] }>> {
    const results = await db.query.conductores.findMany({
      with: {
        user: true,
        vehiculos: true,
      },
    });
    return results as any;
  }

  // Conductor Services
  async getConductorServicios(conductorId: string): Promise<Array<ConductorServicio & { subtipos: ConductorServicioSubtipo[] }>> {
    const results = await db.query.conductorServicios.findMany({
      where: eq(conductorServicios.conductorId, conductorId),
      with: {
        subtipos: true,
      },
    });
    return results as any;
  }

  async setConductorServicios(conductorId: string, categorias: Array<{ categoria: string; subtipos: string[] }>): Promise<void> {
    await db.delete(conductorServicios).where(eq(conductorServicios.conductorId, conductorId));
    
    for (const cat of categorias) {
      const [servicio] = await db.insert(conductorServicios).values({
        conductorId,
        categoriaServicio: cat.categoria as any,
      }).returning();
      
      if (cat.subtipos && cat.subtipos.length > 0) {
        for (const subtipo of cat.subtipos) {
          await db.insert(conductorServicioSubtipos).values({
            conductorServicioId: servicio.id,
            subtipoServicio: subtipo as any,
          });
        }
      }
    }
  }

  async addConductorServicio(conductorId: string, categoriaServicio: string): Promise<ConductorServicio> {
    const [servicio] = await db.insert(conductorServicios).values({
      conductorId,
      categoriaServicio: categoriaServicio as any,
    }).returning();
    return servicio;
  }

  async removeConductorServicio(conductorId: string, categoriaServicio: string): Promise<void> {
    await db.delete(conductorServicios).where(
      and(
        eq(conductorServicios.conductorId, conductorId),
        eq(conductorServicios.categoriaServicio, categoriaServicio as any)
      )
    );
  }

  async addConductorServicioSubtipo(conductorServicioId: string, subtipoServicio: string): Promise<ConductorServicioSubtipo> {
    const [subtipo] = await db.insert(conductorServicioSubtipos).values({
      conductorServicioId,
      subtipoServicio: subtipoServicio as any,
    }).returning();
    return subtipo;
  }

  async removeConductorServicioSubtipo(conductorServicioId: string, subtipoServicio: string): Promise<void> {
    await db.delete(conductorServicioSubtipos).where(
      and(
        eq(conductorServicioSubtipos.conductorServicioId, conductorServicioId),
        eq(conductorServicioSubtipos.subtipoServicio, subtipoServicio as any)
      )
    );
  }

  // Conductor Vehicles (one vehicle per category per driver)
  async getConductorVehiculos(conductorId: string): Promise<ConductorVehiculo[]> {
    return await db.select().from(conductorVehiculos).where(
      and(
        eq(conductorVehiculos.conductorId, conductorId),
        eq(conductorVehiculos.activo, true)
      )
    );
  }

  async getConductorVehiculoByCategoria(conductorId: string, categoria: string): Promise<ConductorVehiculo | undefined> {
    const [vehiculo] = await db.select().from(conductorVehiculos).where(
      and(
        eq(conductorVehiculos.conductorId, conductorId),
        eq(conductorVehiculos.categoria, categoria as any),
        eq(conductorVehiculos.activo, true)
      )
    );
    return vehiculo;
  }

  async createConductorVehiculo(vehiculo: InsertConductorVehiculo): Promise<ConductorVehiculo> {
    const existingVehiculo = await this.getConductorVehiculoByCategoria(vehiculo.conductorId, vehiculo.categoria);
    if (existingVehiculo) {
      return await this.updateConductorVehiculo(existingVehiculo.id, vehiculo);
    }
    const [newVehiculo] = await db.insert(conductorVehiculos).values(vehiculo).returning();
    return newVehiculo;
  }

  async updateConductorVehiculo(id: string, data: Partial<ConductorVehiculo>): Promise<ConductorVehiculo> {
    const [updatedVehiculo] = await db.update(conductorVehiculos)
      .set(data)
      .where(eq(conductorVehiculos.id, id))
      .returning();
    return updatedVehiculo;
  }

  async deleteConductorVehiculo(id: string): Promise<void> {
    await db.update(conductorVehiculos)
      .set({ activo: false })
      .where(eq(conductorVehiculos.id, id));
  }

  // Document Validation (Verifik)
  async updateDocumentoVerifikValidation(documentoId: string, data: {
    verifikScanId?: string;
    verifikScore?: string;
    verifikValidado?: boolean;
    verifikTipoValidacion?: string;
    verifikRespuesta?: string;
    verifikFechaValidacion?: Date;
    estado?: string;
  }): Promise<Documento> {
    const [documento] = await db.update(documentos).set({
      ...data,
      updatedAt: new Date(),
    } as any).where(eq(documentos.id, documentoId)).returning();
    return documento;
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
        vehiculo: true,
      },
    });
    return result as any;
  }

  async getServicioByPaymentToken(token: string): Promise<Servicio | undefined> {
    const result = await db.query.servicios.findFirst({
      where: eq(servicios.azulDataVaultToken, token),
    });
    return result;
  }

  async getServiciosByClientId(clientId: string): Promise<ServicioWithDetails[]> {
    const results = await db.query.servicios.findMany({
      where: eq(servicios.clienteId, clientId),
      with: {
        cliente: true,
        conductor: true,
        calificacion: true,
        vehiculo: true,
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
        vehiculo: true,
      },
      orderBy: desc(servicios.createdAt),
    });
    return results as any;
  }

  async getActiveServiceByConductorId(conductorId: string): Promise<ServicioWithDetails | null> {
    // Query for active service states only - much faster than fetching all services
    const result = await db.query.servicios.findFirst({
      where: and(
        eq(servicios.conductorId, conductorId),
        or(
          eq(servicios.estado, 'aceptado'),
          eq(servicios.estado, 'conductor_en_sitio'),
          eq(servicios.estado, 'cargando'),
          eq(servicios.estado, 'en_progreso')
        )
      ),
      with: {
        cliente: true,
        conductor: true,
        calificacion: true,
        vehiculo: true,
      },
      orderBy: desc(servicios.createdAt),
    });
    return result as ServicioWithDetails | null;
  }

  async getPendingServicios(): Promise<Servicio[]> {
    return db
      .select()
      .from(servicios)
      .where(eq(servicios.estado, 'pendiente'))
      .orderBy(desc(servicios.createdAt));
  }

  async getExpiredPendingServicios(timeoutMinutes: number): Promise<Servicio[]> {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    return db
      .select()
      .from(servicios)
      .where(
        and(
          eq(servicios.estado, 'pendiente'),
          lt(servicios.createdAt, cutoffTime)
        )
      )
      .orderBy(desc(servicios.createdAt));
  }

  async cancelExpiredServicios(timeoutMinutes: number): Promise<Servicio[]> {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const result = await db
      .update(servicios)
      .set({ 
        estado: 'cancelado',
        canceladoAt: new Date()
      })
      .where(
        and(
          eq(servicios.estado, 'pendiente'),
          lt(servicios.createdAt, cutoffTime)
        )
      )
      .returning();
    return result;
  }

  async getRecentlyCancelledServices(withinMinutes: number): Promise<Servicio[]> {
    const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);
    return db
      .select()
      .from(servicios)
      .where(
        and(
          eq(servicios.estado, 'cancelado'),
          gte(servicios.createdAt, cutoffTime)
        )
      )
      .orderBy(desc(servicios.createdAt));
  }

  async getAllServicios(): Promise<ServicioWithDetails[]> {
    const results = await db.query.servicios.findMany({
      with: {
        cliente: true,
        conductor: true,
        calificacion: true,
        vehiculo: true,
      },
      orderBy: desc(servicios.createdAt),
    });
    return results as any;
  }

  async updateServicio(id: string, data: Partial<Servicio>): Promise<Servicio> {
    const [servicio] = await db.update(servicios).set(data).where(eq(servicios.id, id)).returning();
    return servicio;
  }

  async acceptServicio(id: string, conductorId: string, vehiculoId?: string): Promise<Servicio> {
    const updateData: any = {
      conductorId,
      estado: 'aceptado',
      aceptadoAt: new Date(),
    };
    
    if (vehiculoId) {
      updateData.vehiculoId = vehiculoId;
    }
    
    const [servicio] = await db
      .update(servicios)
      .set(updateData)
      .where(eq(servicios.id, id))
      .returning();
    return servicio;
  }

  // Dismissed Services
  async dismissService(conductorId: string, servicioId: string): Promise<void> {
    const existing = await db
      .select()
      .from(dismissedServices)
      .where(and(
        eq(dismissedServices.conductorId, conductorId),
        eq(dismissedServices.servicioId, servicioId)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(dismissedServices).values({
        conductorId,
        servicioId,
      });
    }
  }

  async getDismissedServiceIds(conductorId: string): Promise<string[]> {
    const dismissed = await db
      .select({ servicioId: dismissedServices.servicioId })
      .from(dismissedServices)
      .where(eq(dismissedServices.conductorId, conductorId));
    
    return dismissed.map(d => d.servicioId);
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

  async getTarifaByCategoriaySubtipo(categoria: string | null, subtipo: string | null): Promise<Tarifa | undefined> {
    // Priority order for finding tariff:
    // 1. Exact match: category + subtype
    // 2. Category only (no subtype)
    // 3. General tariff (no category, no subtype)
    
    // Try exact match first (category + subtype)
    if (categoria && subtipo) {
      const [exactMatch] = await db
        .select()
        .from(tarifas)
        .where(and(
          eq(tarifas.activo, true),
          eq(tarifas.servicioCategoria, categoria as any),
          eq(tarifas.servicioSubtipo, subtipo as any)
        ))
        .orderBy(desc(tarifas.createdAt))
        .limit(1);
      
      if (exactMatch) return exactMatch;
    }
    
    // Try category only match
    if (categoria) {
      const [categoryMatch] = await db
        .select()
        .from(tarifas)
        .where(and(
          eq(tarifas.activo, true),
          eq(tarifas.servicioCategoria, categoria as any),
          sql`${tarifas.servicioSubtipo} IS NULL`
        ))
        .orderBy(desc(tarifas.createdAt))
        .limit(1);
      
      if (categoryMatch) return categoryMatch;
    }
    
    // Fallback to general tariff (no category, no subtype)
    const [generalTariff] = await db
      .select()
      .from(tarifas)
      .where(and(
        eq(tarifas.activo, true),
        sql`${tarifas.servicioCategoria} IS NULL`,
        sql`${tarifas.servicioSubtipo} IS NULL`
      ))
      .orderBy(desc(tarifas.createdAt))
      .limit(1);
    
    return generalTariff;
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

  // Negotiation Chat System
  async getAvailableServicesForDrivers(): Promise<Servicio[]> {
    return db
      .select()
      .from(servicios)
      .where(
        and(
          eq(servicios.estado, 'pendiente'),
          isNull(servicios.conductorId)
        )
      )
      .orderBy(desc(servicios.createdAt));
  }

  async proposeNegotiationAmount(servicioId: string, conductorId: string, monto: number, notas?: string): Promise<Servicio> {
    const [servicio] = await db
      .update(servicios)
      .set({
        estadoNegociacion: 'propuesto',
        montoNegociado: monto.toString(),
        notasExtraccion: notas || null,
        conductorId: conductorId,
      })
      .where(eq(servicios.id, servicioId))
      .returning();
    return servicio;
  }

  async confirmNegotiationAmount(servicioId: string, conductorId: string): Promise<Servicio> {
    const servicio = await this.getServicioById(servicioId);
    if (!servicio || servicio.conductorId !== conductorId) {
      throw new Error('Servicio no encontrado o no autorizado');
    }

    const [updated] = await db
      .update(servicios)
      .set({
        estadoNegociacion: 'confirmado',
      })
      .where(eq(servicios.id, servicioId))
      .returning();
    return updated;
  }

  async acceptNegotiationAmount(servicioId: string, clienteId: string): Promise<Servicio> {
    const servicio = await this.getServicioById(servicioId);
    if (!servicio || servicio.clienteId !== clienteId) {
      throw new Error('Servicio no encontrado o no autorizado');
    }

    const [updated] = await db
      .update(servicios)
      .set({
        estadoNegociacion: 'aceptado',
        estado: 'aceptado',
        costoTotal: servicio.montoNegociado || servicio.costoTotal,
        aceptadoAt: new Date(),
      })
      .where(eq(servicios.id, servicioId))
      .returning();
    return updated;
  }

  async rejectNegotiationAmount(servicioId: string, clienteId: string): Promise<Servicio> {
    const servicio = await this.getServicioById(servicioId);
    if (!servicio || servicio.clienteId !== clienteId) {
      throw new Error('Servicio no encontrado o no autorizado');
    }

    const [updated] = await db
      .update(servicios)
      .set({
        estadoNegociacion: 'rechazado',
        conductorId: null,
        montoNegociado: null,
      })
      .where(eq(servicios.id, servicioId))
      .returning();
    return updated;
  }

  async createMensajeChatWithMedia(insertMensaje: InsertMensajeChat & { tipoMensaje?: string; montoAsociado?: string; urlArchivo?: string; nombreArchivo?: string }): Promise<MensajeChat> {
    const [mensaje] = await db.insert(mensajesChat).values(insertMensaje as any).returning();
    return mensaje;
  }

  async getServiciosByNegociacionEstado(estado: string): Promise<Servicio[]> {
    return db
      .select()
      .from(servicios)
      .where(eq(servicios.estadoNegociacion, estado as any))
      .orderBy(desc(servicios.createdAt));
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
    // Use raw SQL to avoid Drizzle's expression issues with GROUP BY
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `AND created_at >= '${startDate}'::timestamp AND created_at <= '${endDate}'::timestamp`;
    }

    const results = await db.execute(sql`
      SELECT 
        ROUND(CAST(origen_lat AS NUMERIC), ${precision}) as lat,
        ROUND(CAST(origen_lng AS NUMERIC), ${precision}) as lng,
        COUNT(*)::int as count
      FROM servicios
      WHERE origen_lat IS NOT NULL AND origen_lng IS NOT NULL ${sql.raw(dateFilter)}
      GROUP BY 
        ROUND(CAST(origen_lat AS NUMERIC), ${precision}),
        ROUND(CAST(origen_lng AS NUMERIC), ${precision})
      ORDER BY count DESC
    `);

    const rows = results.rows as Array<{ lat: string; lng: string; count: number }>;
    const maxCount = Math.max(...rows.map(r => r.count), 1);
    
    return rows.map(r => ({
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
        tipoVehiculo: sql<string>`COALESCE(${servicios.tipoVehiculo}::text, 'no_especificado')`.as('tipo_vehiculo'),
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
      .groupBy(sql`COALESCE(${servicios.tipoVehiculo}::text, 'no_especificado')`)
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
    return result as DocumentoWithDetails | undefined;
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
    return results as DocumentoWithDetails[];
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
    return results as DocumentoWithDetails[];
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
    return results as DocumentoWithDetails[];
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
    const documento = await this.getDocumentoById(id);
    if (documento) {
      // Delete from object storage
      const { deleteDocument } = await import('./services/object-storage');
      await deleteDocument(documento.url);
      
      // Delete from database
      await db.delete(documentos).where(eq(documentos.id, id));
    }
  }

  async getDocumentosByConductor(conductorId: string): Promise<Documento[]> {
    return db
      .select()
      .from(documentos)
      .where(eq(documentos.conductorId, conductorId))
      .orderBy(desc(documentos.createdAt));
  }

  async getDocumentoByConductorAndTipo(conductorId: string, tipo: string): Promise<Documento | undefined> {
    const result = await db
      .select()
      .from(documentos)
      .where(and(
        eq(documentos.conductorId, conductorId),
        eq(documentos.tipo, tipo as any)
      ))
      .orderBy(desc(documentos.createdAt))
      .limit(1);
    return result[0];
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
    return result as DocumentoWithDetails | undefined;
  }

  async getAllClientInsuranceDocuments(userId: string): Promise<DocumentoWithDetails[]> {
    const results = await db.query.documentos.findMany({
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
    return results as DocumentoWithDetails[];
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

  async getComisionesByEstado(estado: 'pendiente' | 'procesando' | 'pagado' | 'fallido', tipo: 'operador' | 'empresa'): Promise<ComisionWithDetails[]> {
    if (tipo === 'operador') {
      const results = await db.query.comisiones.findMany({
        where: eq(comisiones.estadoPagoOperador, estado),
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
    } else {
      const results = await db.query.comisiones.findMany({
        where: eq(comisiones.estadoPagoEmpresa, estado),
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

  async marcarComisionPagada(id: string, tipo: 'operador' | 'empresa', azulPayoutReference?: string): Promise<Comision> {
    const updateData: Partial<Comision> = tipo === 'operador' 
      ? {
          estadoPagoOperador: 'pagado',
          fechaPagoOperador: new Date(),
          azulPayoutReference,
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

  async getComisionById(id: string): Promise<ComisionWithDetails | undefined> {
    const result = await db.query.comisiones.findFirst({
      where: eq(comisiones.id, id),
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

  async getComisionesByConductor(conductorId: string): Promise<ComisionWithDetails[]> {
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
    
    const filtered = results.filter(c => c.servicio?.conductorId === conductorId);
    return filtered as ComisionWithDetails[];
  }

  async updateComisionNotas(id: string, notas: string): Promise<Comision> {
    const [updated] = await db
      .update(comisiones)
      .set({ notas })
      .where(eq(comisiones.id, id))
      .returning();
    return updated;
  }

  // Payment Gateway Methods - Using clientPaymentMethods table from shared schema
  // Driver bank accounts are stored in the conductores table
  // Client payment methods use the clientPaymentMethods table

  async deletePaymentMethodById(id: string): Promise<void> {
    await db.delete(clientPaymentMethods).where(eq(clientPaymentMethods.id, id));
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    await db
      .update(clientPaymentMethods)
      .set({ isDefault: false })
      .where(eq(clientPaymentMethods.userId, userId));

    await db
      .update(clientPaymentMethods)
      .set({ isDefault: true })
      .where(eq(clientPaymentMethods.id, paymentMethodId));
  }

  // Service Receipts
  async createServiceReceipt(data: { servicioId: string; receiptNumber: string; receiptUrl: string; pdfSize?: number }): Promise<any> {
    const [receipt] = await db
      .insert(serviceReceipts)
      .values({
        servicioId: data.servicioId,
        receiptNumber: data.receiptNumber,
        receiptUrl: data.receiptUrl,
        pdfSize: data.pdfSize,
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
    return results as DocumentoWithDetails[];
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
    return results as DocumentoWithDetails[];
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
    return results as DocumentoWithDetails[];
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
        vehiculo: true,
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
    })) as Array<Documento & { conductor?: Conductor; user?: User }>;
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
    })) as Array<Documento & { conductor?: Conductor; user?: User }>;
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
    
    const requiredTypes = ['licencia', 'matricula', 'foto_vehiculo', 'cedula_frontal', 'cedula_trasera'];
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

  // ==================== SYSTEM ERRORS ====================

  async createSystemError(data: InsertSystemError): Promise<SystemError> {
    const [error] = await db
      .insert(systemErrors)
      .values(data)
      .returning();
    return error;
  }

  async getSystemErrorById(id: string): Promise<SystemError | undefined> {
    const [error] = await db
      .select()
      .from(systemErrors)
      .where(eq(systemErrors.id, id))
      .limit(1);
    return error;
  }

  async getSystemErrorByFingerprint(fingerprint: string): Promise<SystemError | undefined> {
    const [error] = await db
      .select()
      .from(systemErrors)
      .where(and(
        eq(systemErrors.fingerprint, fingerprint),
        eq(systemErrors.resolved, false)
      ))
      .limit(1);
    return error;
  }

  async updateSystemError(id: string, data: Partial<SystemError>): Promise<SystemError> {
    const [updated] = await db
      .update(systemErrors)
      .set(data)
      .where(eq(systemErrors.id, id))
      .returning();
    return updated;
  }

  async getUnresolvedSystemErrors(limit: number = 50): Promise<SystemError[]> {
    return await db
      .select()
      .from(systemErrors)
      .where(eq(systemErrors.resolved, false))
      .orderBy(desc(systemErrors.lastOccurrence))
      .limit(limit);
  }

  async getAllSystemErrors(limit: number = 100): Promise<SystemError[]> {
    return await db
      .select()
      .from(systemErrors)
      .orderBy(desc(systemErrors.lastOccurrence))
      .limit(limit);
  }

  async getSystemErrorsByTicketId(ticketId: string): Promise<SystemError[]> {
    return await db
      .select()
      .from(systemErrors)
      .where(eq(systemErrors.ticketId, ticketId));
  }

  // ==================== SOCIOS (PARTNERS/INVESTORS) - Module 2.5 ====================

  async createSocio(insertSocio: InsertSocio): Promise<Socio> {
    const [socio] = await db.insert(socios).values(insertSocio).returning();
    return socio;
  }

  async getSocioById(id: string): Promise<SocioWithDetails | undefined> {
    const result = await db.query.socios.findFirst({
      where: eq(socios.id, id),
      with: {
        user: true,
        distribuciones: {
          orderBy: (distribucionesSocios, { desc }) => [desc(distribucionesSocios.createdAt)],
        },
      },
    });
    return result as SocioWithDetails | undefined;
  }

  async getSocioByUserId(userId: string): Promise<SocioWithDetails | undefined> {
    const result = await db.query.socios.findFirst({
      where: eq(socios.userId, userId),
      with: {
        user: true,
        distribuciones: {
          orderBy: (distribucionesSocios, { desc }) => [desc(distribucionesSocios.createdAt)],
        },
      },
    });
    return result as SocioWithDetails | undefined;
  }

  async getAllSocios(): Promise<SocioWithDetails[]> {
    const results = await db.query.socios.findMany({
      with: {
        user: true,
        distribuciones: {
          orderBy: (distribucionesSocios, { desc }) => [desc(distribucionesSocios.createdAt)],
        },
      },
      orderBy: desc(socios.createdAt),
    });
    return results as SocioWithDetails[];
  }

  async getActiveSocios(): Promise<SocioWithDetails[]> {
    const results = await db.query.socios.findMany({
      where: eq(socios.activo, true),
      with: {
        user: true,
        distribuciones: {
          orderBy: (distribucionesSocios, { desc }) => [desc(distribucionesSocios.createdAt)],
        },
      },
      orderBy: desc(socios.createdAt),
    });
    return results as SocioWithDetails[];
  }

  async updateSocio(id: string, data: Partial<Socio>): Promise<Socio> {
    const [socio] = await db
      .update(socios)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(socios.id, id))
      .returning();
    return socio;
  }

  async toggleSocioActivo(id: string): Promise<Socio> {
    const socio = await this.getSocioById(id);
    if (!socio) throw new Error('Socio no encontrado');
    
    const [updated] = await db
      .update(socios)
      .set({ activo: !socio.activo, updatedAt: new Date() })
      .where(eq(socios.id, id))
      .returning();
    return updated;
  }

  async deleteSocio(id: string): Promise<void> {
    await db.delete(socios).where(eq(socios.id, id));
  }

  // Distribuciones de Socios
  async createDistribucionSocio(insertDistribucion: InsertDistribucionSocio): Promise<DistribucionSocio> {
    const [distribucion] = await db.insert(distribucionesSocios).values(insertDistribucion).returning();
    return distribucion;
  }

  async getDistribucionById(id: string): Promise<DistribucionSocioWithDetails | undefined> {
    const result = await db.query.distribucionesSocios.findFirst({
      where: eq(distribucionesSocios.id, id),
      with: {
        socio: {
          with: {
            user: true,
          },
        },
        calculadoPorUsuario: true,
        aprobadoPorUsuario: true,
      },
    });
    return result as DistribucionSocioWithDetails | undefined;
  }

  async getDistribucionesBySocioId(socioId: string): Promise<DistribucionSocioWithDetails[]> {
    const results = await db.query.distribucionesSocios.findMany({
      where: eq(distribucionesSocios.socioId, socioId),
      with: {
        socio: {
          with: {
            user: true,
          },
        },
        calculadoPorUsuario: true,
        aprobadoPorUsuario: true,
      },
      orderBy: desc(distribucionesSocios.createdAt),
    });
    return results as DistribucionSocioWithDetails[];
  }

  async getDistribucionesByPeriodo(periodo: string): Promise<DistribucionSocioWithDetails[]> {
    const results = await db.query.distribucionesSocios.findMany({
      where: eq(distribucionesSocios.periodo, periodo),
      with: {
        socio: {
          with: {
            user: true,
          },
        },
        calculadoPorUsuario: true,
        aprobadoPorUsuario: true,
      },
      orderBy: desc(distribucionesSocios.createdAt),
    });
    return results as DistribucionSocioWithDetails[];
  }

  async getAllDistribuciones(): Promise<DistribucionSocioWithDetails[]> {
    const results = await db.query.distribucionesSocios.findMany({
      with: {
        socio: {
          with: {
            user: true,
          },
        },
        calculadoPorUsuario: true,
        aprobadoPorUsuario: true,
      },
      orderBy: desc(distribucionesSocios.createdAt),
    });
    return results as DistribucionSocioWithDetails[];
  }

  async updateDistribucion(id: string, data: Partial<DistribucionSocio>): Promise<DistribucionSocio> {
    const [distribucion] = await db
      .update(distribucionesSocios)
      .set(data)
      .where(eq(distribucionesSocios.id, id))
      .returning();
    return distribucion;
  }

  async aprobarDistribucion(id: string, adminId: string): Promise<DistribucionSocio> {
    const [distribucion] = await db
      .update(distribucionesSocios)
      .set({
        estado: 'aprobado',
        aprobadoPor: adminId,
        fechaAprobacion: new Date(),
      })
      .where(eq(distribucionesSocios.id, id))
      .returning();
    return distribucion;
  }

  async marcarDistribucionPagada(id: string, metodoPago: string, referencia: string): Promise<DistribucionSocio> {
    const [distribucion] = await db
      .update(distribucionesSocios)
      .set({
        estado: 'pagado',
        metodoPago,
        referenciaTransaccion: referencia,
        fechaPago: new Date(),
      })
      .where(eq(distribucionesSocios.id, id))
      .returning();
    return distribucion;
  }

  async calcularDistribucionPeriodo(periodo: string): Promise<{
    ingresosTotales: number;
    comisionEmpresa: number;
    distribucionesPorSocio: Array<{
      socioId: string;
      porcentajeParticipacion: number;
      montoSocio: number;
    }>;
  }> {
    const [year, month] = periodo.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [ingresos] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${comisiones.montoEmpresa}::numeric), 0)::float`,
      })
      .from(comisiones)
      .where(
        and(
          gte(comisiones.createdAt, startDate),
          lte(comisiones.createdAt, endDate),
          eq(comisiones.estadoPagoEmpresa, 'pagado')
        )
      );

    const ingresosTotales = ingresos?.total || 0;
    const comisionEmpresa = ingresosTotales;

    const sociosActivos = await this.getActiveSocios();
    const distribucionesPorSocio = sociosActivos.map(socio => ({
      socioId: socio.id,
      porcentajeParticipacion: parseFloat(socio.porcentajeParticipacion),
      montoSocio: (parseFloat(socio.porcentajeParticipacion) / 100) * comisionEmpresa,
    }));

    return {
      ingresosTotales,
      comisionEmpresa,
      distribucionesPorSocio,
    };
  }

  async getResumenSocio(socioId: string): Promise<{
    porcentajeParticipacion: number;
    montoInversion: number;
    fechaInversion: Date;
    totalDistribuciones: number;
    totalRecibido: number;
    pendientePago: number;
    roi: number;
    ultimaDistribucion: DistribucionSocio | null;
  }> {
    const socio = await this.getSocioById(socioId);
    if (!socio) throw new Error('Socio no encontrado');

    const distribuciones = await this.getDistribucionesBySocioId(socioId);
    
    const totalRecibido = distribuciones
      .filter(d => d.estado === 'pagado')
      .reduce((sum, d) => sum + parseFloat(d.montoSocio), 0);

    const pendientePago = distribuciones
      .filter(d => d.estado !== 'pagado')
      .reduce((sum, d) => sum + parseFloat(d.montoSocio), 0);

    const montoInversion = parseFloat(socio.montoInversion);
    const roi = montoInversion > 0 ? ((totalRecibido - montoInversion) / montoInversion) * 100 : 0;

    return {
      porcentajeParticipacion: parseFloat(socio.porcentajeParticipacion),
      montoInversion,
      fechaInversion: new Date(socio.fechaInversion),
      totalDistribuciones: distribuciones.length,
      totalRecibido,
      pendientePago,
      roi,
      ultimaDistribucion: distribuciones.length > 0 ? distribuciones[0] : null,
    };
  }

  async getSociosStats(): Promise<{
    totalSocios: number;
    sociosActivos: number;
    totalInversion: number;
    totalDistribuido: number;
    pendientePago: number;
  }> {
    const [sociosStats] = await db
      .select({
        totalSocios: sql<number>`count(*)::int`,
        sociosActivos: sql<number>`count(*) filter (where ${socios.activo} = true)::int`,
        totalInversion: sql<number>`COALESCE(SUM(${socios.montoInversion}::numeric), 0)::float`,
      })
      .from(socios);

    const [distribucionesStats] = await db
      .select({
        totalDistribuido: sql<number>`COALESCE(SUM(${distribucionesSocios.montoSocio}::numeric) filter (where ${distribucionesSocios.estado} = 'pagado'), 0)::float`,
        pendientePago: sql<number>`COALESCE(SUM(${distribucionesSocios.montoSocio}::numeric) filter (where ${distribucionesSocios.estado} != 'pagado'), 0)::float`,
      })
      .from(distribucionesSocios);

    return {
      totalSocios: sociosStats.totalSocios,
      sociosActivos: sociosStats.sociosActivos,
      totalInversion: sociosStats.totalInversion,
      totalDistribuido: distribucionesStats?.totalDistribuido || 0,
      pendientePago: distribucionesStats?.pendientePago || 0,
    };
  }

  // Client Payment Methods (Azul)
  async createClientPaymentMethod(paymentMethod: InsertClientPaymentMethod): Promise<ClientPaymentMethod> {
    const existingMethods = await this.getClientPaymentMethodsByUserId(paymentMethod.userId);
    const isFirst = existingMethods.length === 0;
    
    const [method] = await db.insert(clientPaymentMethods).values({
      ...paymentMethod,
      isDefault: isFirst,
    }).returning();
    return method;
  }

  async getClientPaymentMethodById(id: string): Promise<ClientPaymentMethod | undefined> {
    const [method] = await db.select().from(clientPaymentMethods).where(eq(clientPaymentMethods.id, id));
    return method;
  }

  async getClientPaymentMethodsByUserId(userId: string): Promise<ClientPaymentMethod[]> {
    return db.select()
      .from(clientPaymentMethods)
      .where(eq(clientPaymentMethods.userId, userId))
      .orderBy(desc(clientPaymentMethods.isDefault), desc(clientPaymentMethods.createdAt));
  }

  async getDefaultClientPaymentMethod(userId: string): Promise<ClientPaymentMethod | undefined> {
    const [method] = await db.select()
      .from(clientPaymentMethods)
      .where(and(
        eq(clientPaymentMethods.userId, userId),
        eq(clientPaymentMethods.isDefault, true)
      ));
    return method;
  }

  async updateClientPaymentMethod(id: string, data: Partial<ClientPaymentMethod>): Promise<ClientPaymentMethod> {
    const [method] = await db.update(clientPaymentMethods)
      .set(data)
      .where(eq(clientPaymentMethods.id, id))
      .returning();
    return method;
  }

  async setDefaultClientPaymentMethod(id: string, userId: string): Promise<ClientPaymentMethod> {
    await db.update(clientPaymentMethods)
      .set({ isDefault: false })
      .where(and(
        eq(clientPaymentMethods.userId, userId),
        eq(clientPaymentMethods.isDefault, true)
      ));
    
    const [method] = await db.update(clientPaymentMethods)
      .set({ isDefault: true })
      .where(and(
        eq(clientPaymentMethods.id, id),
        eq(clientPaymentMethods.userId, userId)
      ))
      .returning();
    
    if (!method) {
      throw new Error('Payment method not found or not owned by user');
    }
    return method;
  }

  async deleteClientPaymentMethod(id: string): Promise<void> {
    await db.delete(clientPaymentMethods).where(eq(clientPaymentMethods.id, id));
  }

  // ==================== OPERATOR PAYMENT METHODS (for debt payment) ====================

  async createOperatorPaymentMethod(paymentMethod: InsertOperatorPaymentMethod): Promise<OperatorPaymentMethod> {
    const existingMethods = await this.getOperatorPaymentMethodsByConductorId(paymentMethod.conductorId);
    const isFirst = existingMethods.length === 0;
    
    const [method] = await db.insert(operatorPaymentMethods).values({
      ...paymentMethod,
      isDefault: isFirst,
    }).returning();
    return method;
  }

  async getOperatorPaymentMethodById(id: string): Promise<OperatorPaymentMethod | undefined> {
    const [method] = await db.select().from(operatorPaymentMethods).where(eq(operatorPaymentMethods.id, id));
    return method;
  }

  async getOperatorPaymentMethodsByConductorId(conductorId: string): Promise<OperatorPaymentMethod[]> {
    return db.select()
      .from(operatorPaymentMethods)
      .where(eq(operatorPaymentMethods.conductorId, conductorId))
      .orderBy(desc(operatorPaymentMethods.isDefault), desc(operatorPaymentMethods.createdAt));
  }

  async getDefaultOperatorPaymentMethod(conductorId: string): Promise<OperatorPaymentMethod | undefined> {
    const [method] = await db.select()
      .from(operatorPaymentMethods)
      .where(and(
        eq(operatorPaymentMethods.conductorId, conductorId),
        eq(operatorPaymentMethods.isDefault, true)
      ));
    return method;
  }

  async updateOperatorPaymentMethod(id: string, data: Partial<OperatorPaymentMethod>): Promise<OperatorPaymentMethod> {
    const [method] = await db.update(operatorPaymentMethods)
      .set(data)
      .where(eq(operatorPaymentMethods.id, id))
      .returning();
    return method;
  }

  async setDefaultOperatorPaymentMethod(id: string, conductorId: string): Promise<OperatorPaymentMethod> {
    await db.update(operatorPaymentMethods)
      .set({ isDefault: false })
      .where(and(
        eq(operatorPaymentMethods.conductorId, conductorId),
        eq(operatorPaymentMethods.isDefault, true)
      ));
    
    const [method] = await db.update(operatorPaymentMethods)
      .set({ isDefault: true })
      .where(and(
        eq(operatorPaymentMethods.id, id),
        eq(operatorPaymentMethods.conductorId, conductorId)
      ))
      .returning();
    
    if (!method) {
      throw new Error('Payment method not found or not owned by operator');
    }
    return method;
  }

  async deleteOperatorPaymentMethod(id: string): Promise<void> {
    await db.delete(operatorPaymentMethods).where(eq(operatorPaymentMethods.id, id));
  }

  // ==================== OPERATOR BANK ACCOUNTS (Payment Gateway Payouts) ====================

  async createOperatorBankAccount(data: InsertOperatorBankAccount): Promise<OperatorBankAccount> {
    const [account] = await db.insert(operatorBankAccounts).values({
      ...data,
      updatedAt: new Date(),
    }).returning();
    return account;
  }

  async getOperatorBankAccount(conductorId: string): Promise<OperatorBankAccount | undefined> {
    const [account] = await db
      .select()
      .from(operatorBankAccounts)
      .where(eq(operatorBankAccounts.conductorId, conductorId))
      .limit(1);
    return account;
  }

  async updateOperatorBankAccount(id: string, data: Partial<OperatorBankAccount>): Promise<OperatorBankAccount> {
    const [account] = await db
      .update(operatorBankAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(operatorBankAccounts.id, id))
      .returning();
    return account;
  }

  async deleteOperatorBankAccount(id: string): Promise<void> {
    await db.delete(operatorBankAccounts).where(eq(operatorBankAccounts.id, id));
  }

  // ==================== OPERATOR WITHDRAWALS (Payment Gateway Payouts) ====================

  async createOperatorWithdrawal(data: InsertOperatorWithdrawal): Promise<OperatorWithdrawal> {
    const [withdrawal] = await db.insert(operatorWithdrawals).values(data).returning();
    return withdrawal;
  }

  async getOperatorWithdrawal(id: string): Promise<OperatorWithdrawal | undefined> {
    const [withdrawal] = await db
      .select()
      .from(operatorWithdrawals)
      .where(eq(operatorWithdrawals.id, id))
      .limit(1);
    return withdrawal;
  }

  async getOperatorWithdrawals(conductorId: string): Promise<OperatorWithdrawal[]> {
    return db
      .select()
      .from(operatorWithdrawals)
      .where(eq(operatorWithdrawals.conductorId, conductorId))
      .orderBy(desc(operatorWithdrawals.createdAt));
  }

  async getAllWithdrawals(): Promise<OperatorWithdrawal[]> {
    return db
      .select()
      .from(operatorWithdrawals)
      .orderBy(desc(operatorWithdrawals.createdAt));
  }

  async updateOperatorWithdrawal(id: string, data: Partial<OperatorWithdrawal>): Promise<OperatorWithdrawal> {
    const [withdrawal] = await db
      .update(operatorWithdrawals)
      .set(data)
      .where(eq(operatorWithdrawals.id, id))
      .returning();
    return withdrawal;
  }

  async getPendingWithdrawals(): Promise<OperatorWithdrawal[]> {
    return db
      .select()
      .from(operatorWithdrawals)
      .where(eq(operatorWithdrawals.estado, 'pendiente'))
      .orderBy(desc(operatorWithdrawals.createdAt));
  }

  // ==================== OPERATOR BALANCE MANAGEMENT ====================

  async updateOperatorBalance(conductorId: string, balanceDisponible: string, balancePendiente: string): Promise<Conductor> {
    const [conductor] = await db
      .update(conductores)
      .set({ balanceDisponible, balancePendiente })
      .where(eq(conductores.id, conductorId))
      .returning();
    return conductor;
  }

  async addToOperatorBalance(conductorId: string, amount: string): Promise<Conductor> {
    const [conductor] = await db
      .update(conductores)
      .set({
        balanceDisponible: sql`CAST(${conductores.balanceDisponible} AS NUMERIC) + ${amount}::numeric`,
      })
      .where(eq(conductores.id, conductorId))
      .returning();
    return conductor;
  }

  async deductFromOperatorBalance(conductorId: string, amount: string): Promise<Conductor> {
    const [conductor] = await db
      .update(conductores)
      .set({
        balanceDisponible: sql`CAST(${conductores.balanceDisponible} AS NUMERIC) - ${amount}::numeric`,
      })
      .where(eq(conductores.id, conductorId))
      .returning();
    return conductor;
  }

  // ==================== SCHEDULED PAYOUTS (Payment Gateway Payroll) ====================

  async getConductoresWithPositiveBalance(): Promise<Conductor[]> {
    return db
      .select()
      .from(conductores)
      .where(sql`CAST(${conductores.balanceDisponible} AS NUMERIC) > 0`);
  }

  async getOperatorBankAccountByCondutorId(conductorId: string): Promise<OperatorBankAccount | undefined> {
    const [account] = await db
      .select()
      .from(operatorBankAccounts)
      .where(eq(operatorBankAccounts.conductorId, conductorId))
      .limit(1);
    return account;
  }

  async createScheduledPayout(data: InsertScheduledPayout): Promise<ScheduledPayout> {
    const [payout] = await db.insert(scheduledPayouts).values(data).returning();
    return payout;
  }

  async updateScheduledPayout(id: string, data: Partial<ScheduledPayout>): Promise<ScheduledPayout> {
    const [payout] = await db
      .update(scheduledPayouts)
      .set(data)
      .where(eq(scheduledPayouts.id, id))
      .returning();
    return payout;
  }

  async getScheduledPayouts(): Promise<ScheduledPayout[]> {
    return db
      .select()
      .from(scheduledPayouts)
      .orderBy(desc(scheduledPayouts.createdAt));
  }

  async getScheduledPayoutById(id: string): Promise<ScheduledPayout | undefined> {
    const [payout] = await db
      .select()
      .from(scheduledPayouts)
      .where(eq(scheduledPayouts.id, id))
      .limit(1);
    return payout;
  }

  async createScheduledPayoutItem(data: InsertScheduledPayoutItem): Promise<ScheduledPayoutItem> {
    const [item] = await db.insert(scheduledPayoutItems).values(data).returning();
    return item;
  }

  async updateScheduledPayoutItem(conductorId: string, scheduledPayoutId: string, data: Partial<ScheduledPayoutItem>): Promise<ScheduledPayoutItem> {
    const [item] = await db
      .update(scheduledPayoutItems)
      .set(data)
      .where(
        and(
          eq(scheduledPayoutItems.conductorId, conductorId),
          eq(scheduledPayoutItems.scheduledPayoutId, scheduledPayoutId)
        )
      )
      .returning();
    return item;
  }

  async getScheduledPayoutItems(scheduledPayoutId: string): Promise<ScheduledPayoutItem[]> {
    return db
      .select()
      .from(scheduledPayoutItems)
      .where(eq(scheduledPayoutItems.scheduledPayoutId, scheduledPayoutId))
      .orderBy(desc(scheduledPayoutItems.createdAt));
  }

  async updateConductorBalance(conductorId: string, balanceChange: number, pendingChange: number, setToZero?: boolean): Promise<Conductor> {
    if (setToZero) {
      const [conductor] = await db
        .update(conductores)
        .set({
          balanceDisponible: "0.00",
          balancePendiente: "0.00",
        })
        .where(eq(conductores.id, conductorId))
        .returning();
      return conductor;
    }

    const balanceChangeStr = balanceChange.toFixed(2);
    const pendingChangeStr = pendingChange.toFixed(2);

    const [conductor] = await db
      .update(conductores)
      .set({
        balanceDisponible: sql`(COALESCE(CAST(${conductores.balanceDisponible} AS NUMERIC), 0) + ${sql.raw(balanceChangeStr)}::numeric)::text`,
        balancePendiente: sql`(COALESCE(CAST(${conductores.balancePendiente} AS NUMERIC), 0) + ${sql.raw(pendingChangeStr)}::numeric)::text`,
      })
      .where(eq(conductores.id, conductorId))
      .returning();
    return conductor;
  }

  // ==================== EMPRESAS / CONTRATOS EMPRESARIALES (Module 6) ====================

  // Empresas CRUD
  async createEmpresa(insertEmpresa: InsertEmpresa): Promise<Empresa> {
    const [empresa] = await db.insert(empresas).values(insertEmpresa).returning();
    return empresa;
  }

  async getEmpresaById(id: string): Promise<EmpresaWithDetails | undefined> {
    const result = await db.query.empresas.findFirst({
      where: eq(empresas.id, id),
      with: {
        user: true,
        verificadoPorUsuario: true,
        empleados: {
          with: {
            user: true,
          },
          where: eq(empresaEmpleados.activo, true),
        },
        contratos: {
          orderBy: desc(empresaContratos.createdAt),
        },
        tarifas: {
          where: eq(empresaTarifas.activo, true),
        },
        proyectos: {
          where: eq(empresaProyectos.activo, true),
          orderBy: desc(empresaProyectos.createdAt),
        },
        conductoresAsignados: {
          where: eq(empresaConductoresAsignados.activo, true),
          with: {
            conductor: {
              with: {
                user: true,
              },
            },
          },
        },
        facturas: {
          orderBy: desc(empresaFacturas.createdAt),
          limit: 10,
        },
      },
    });
    return result as EmpresaWithDetails | undefined;
  }

  async getEmpresaByUserId(userId: string): Promise<EmpresaWithDetails | undefined> {
    const result = await db.query.empresas.findFirst({
      where: eq(empresas.userId, userId),
      with: {
        user: true,
        verificadoPorUsuario: true,
        empleados: {
          with: {
            user: true,
          },
          where: eq(empresaEmpleados.activo, true),
        },
        contratos: {
          orderBy: desc(empresaContratos.createdAt),
        },
        tarifas: {
          where: eq(empresaTarifas.activo, true),
        },
        proyectos: {
          where: eq(empresaProyectos.activo, true),
          orderBy: desc(empresaProyectos.createdAt),
        },
        conductoresAsignados: {
          where: eq(empresaConductoresAsignados.activo, true),
          with: {
            conductor: {
              with: {
                user: true,
              },
            },
          },
        },
        facturas: {
          orderBy: desc(empresaFacturas.createdAt),
          limit: 10,
        },
      },
    });
    return result as EmpresaWithDetails | undefined;
  }

  async getAllEmpresas(): Promise<EmpresaWithDetails[]> {
    const results = await db.query.empresas.findMany({
      with: {
        user: true,
        verificadoPorUsuario: true,
        empleados: {
          with: {
            user: true,
          },
          where: eq(empresaEmpleados.activo, true),
        },
        contratos: {
          orderBy: desc(empresaContratos.createdAt),
        },
        tarifas: {
          where: eq(empresaTarifas.activo, true),
        },
        proyectos: {
          where: eq(empresaProyectos.activo, true),
        },
        conductoresAsignados: {
          where: eq(empresaConductoresAsignados.activo, true),
          with: {
            conductor: {
              with: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: desc(empresas.createdAt),
    });
    return results as EmpresaWithDetails[];
  }

  async updateEmpresa(id: string, data: Partial<Empresa>): Promise<Empresa> {
    const [empresa] = await db
      .update(empresas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(empresas.id, id))
      .returning();
    return empresa;
  }

  async getEmpresasByTipo(tipo: string): Promise<EmpresaWithDetails[]> {
    const results = await db.query.empresas.findMany({
      where: eq(empresas.tipoEmpresa, tipo as any),
      with: {
        user: true,
        verificadoPorUsuario: true,
        empleados: {
          with: {
            user: true,
          },
          where: eq(empresaEmpleados.activo, true),
        },
        contratos: {
          where: eq(empresaContratos.activo, true),
        },
      },
      orderBy: desc(empresas.createdAt),
    });
    return results as EmpresaWithDetails[];
  }

  // Empleados CRUD
  async addEmpresaEmpleado(insertEmpleado: InsertEmpresaEmpleado): Promise<EmpresaEmpleado> {
    const [empleado] = await db.insert(empresaEmpleados).values(insertEmpleado).returning();
    return empleado;
  }

  async getEmpresaEmpleados(empresaId: string): Promise<EmpresaEmpleadoWithUser[]> {
    const results = await db.query.empresaEmpleados.findMany({
      where: and(
        eq(empresaEmpleados.empresaId, empresaId),
        eq(empresaEmpleados.activo, true)
      ),
      with: {
        user: true,
        empresa: true,
      },
      orderBy: desc(empresaEmpleados.createdAt),
    });
    return results as EmpresaEmpleadoWithUser[];
  }

  async updateEmpresaEmpleado(id: string, data: Partial<EmpresaEmpleado>): Promise<EmpresaEmpleado> {
    const [empleado] = await db
      .update(empresaEmpleados)
      .set(data)
      .where(eq(empresaEmpleados.id, id))
      .returning();
    return empleado;
  }

  async removeEmpresaEmpleado(id: string): Promise<void> {
    await db
      .update(empresaEmpleados)
      .set({ activo: false })
      .where(eq(empresaEmpleados.id, id));
  }

  // Contratos CRUD
  async createEmpresaContrato(insertContrato: InsertEmpresaContrato): Promise<EmpresaContrato> {
    const [contrato] = await db.insert(empresaContratos).values(insertContrato).returning();
    return contrato;
  }

  async getEmpresaContratos(empresaId: string): Promise<EmpresaContratoWithDetails[]> {
    const results = await db.query.empresaContratos.findMany({
      where: eq(empresaContratos.empresaId, empresaId),
      with: {
        empresa: true,
      },
      orderBy: desc(empresaContratos.createdAt),
    });
    
    return results.map(contrato => {
      let porcentajeUtilizado = 0;
      if (contrato.tipoContrato === 'por_hora' && contrato.horasContratadas && contrato.horasUtilizadas) {
        porcentajeUtilizado = (parseFloat(String(contrato.horasUtilizadas)) / parseFloat(String(contrato.horasContratadas))) * 100;
      } else if (contrato.tipoContrato === 'por_servicio' && contrato.serviciosContratados && contrato.serviciosUtilizados) {
        porcentajeUtilizado = (contrato.serviciosUtilizados / contrato.serviciosContratados) * 100;
      }
      return {
        ...contrato,
        porcentajeUtilizado,
      };
    }) as EmpresaContratoWithDetails[];
  }

  async updateEmpresaContrato(id: string, data: Partial<EmpresaContrato>): Promise<EmpresaContrato> {
    const [contrato] = await db
      .update(empresaContratos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(empresaContratos.id, id))
      .returning();
    return contrato;
  }

  async getEmpresaContratoActivo(empresaId: string): Promise<EmpresaContratoWithDetails | undefined> {
    const now = new Date();
    const result = await db.query.empresaContratos.findFirst({
      where: and(
        eq(empresaContratos.empresaId, empresaId),
        eq(empresaContratos.activo, true),
        lte(empresaContratos.fechaInicio, now),
        gte(empresaContratos.fechaFin, now)
      ),
      with: {
        empresa: true,
      },
      orderBy: desc(empresaContratos.createdAt),
    });
    
    if (!result) return undefined;
    
    let porcentajeUtilizado = 0;
    if (result.tipoContrato === 'por_hora' && result.horasContratadas && result.horasUtilizadas) {
      porcentajeUtilizado = (parseFloat(String(result.horasUtilizadas)) / parseFloat(String(result.horasContratadas))) * 100;
    } else if (result.tipoContrato === 'por_servicio' && result.serviciosContratados && result.serviciosUtilizados) {
      porcentajeUtilizado = (result.serviciosUtilizados / result.serviciosContratados) * 100;
    }
    
    return {
      ...result,
      porcentajeUtilizado,
    } as EmpresaContratoWithDetails;
  }

  // Tarifas CRUD
  async createEmpresaTarifa(insertTarifa: InsertEmpresaTarifa): Promise<EmpresaTarifa> {
    const [tarifa] = await db.insert(empresaTarifas).values(insertTarifa).returning();
    return tarifa;
  }

  async getEmpresaTarifas(empresaId: string): Promise<EmpresaTarifa[]> {
    return db
      .select()
      .from(empresaTarifas)
      .where(and(
        eq(empresaTarifas.empresaId, empresaId),
        eq(empresaTarifas.activo, true)
      ))
      .orderBy(desc(empresaTarifas.createdAt));
  }

  async updateEmpresaTarifa(id: string, data: Partial<EmpresaTarifa>): Promise<EmpresaTarifa> {
    const [tarifa] = await db
      .update(empresaTarifas)
      .set(data)
      .where(eq(empresaTarifas.id, id))
      .returning();
    return tarifa;
  }

  // Proyectos CRUD
  async createEmpresaProyecto(insertProyecto: InsertEmpresaProyecto): Promise<EmpresaProyecto> {
    const [proyecto] = await db.insert(empresaProyectos).values(insertProyecto).returning();
    return proyecto;
  }

  async getEmpresaProyectos(empresaId: string): Promise<EmpresaProyectoWithDetails[]> {
    const results = await db.query.empresaProyectos.findMany({
      where: and(
        eq(empresaProyectos.empresaId, empresaId),
        eq(empresaProyectos.activo, true)
      ),
      with: {
        empresa: true,
        serviciosProgramados: true,
      },
      orderBy: desc(empresaProyectos.createdAt),
    });
    
    return results.map(proyecto => {
      const serviciosCompletados = proyecto.serviciosProgramados?.filter(
        s => s.estado === 'ejecutado'
      ).length || 0;
      
      return {
        ...proyecto,
        serviciosCompletados,
        gastoTotal: parseFloat(proyecto.gastoActual || '0'),
      };
    }) as EmpresaProyectoWithDetails[];
  }

  async updateEmpresaProyecto(id: string, data: Partial<EmpresaProyecto>): Promise<EmpresaProyecto> {
    const [proyecto] = await db
      .update(empresaProyectos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(empresaProyectos.id, id))
      .returning();
    return proyecto;
  }

  async getEmpresaProyectoById(id: string): Promise<EmpresaProyectoWithDetails | undefined> {
    const result = await db.query.empresaProyectos.findFirst({
      where: eq(empresaProyectos.id, id),
      with: {
        empresa: true,
        serviciosProgramados: true,
      },
    });
    
    if (!result) return undefined;
    
    const serviciosCompletados = result.serviciosProgramados?.filter(
      s => s.estado === 'ejecutado'
    ).length || 0;
    
    return {
      ...result,
      serviciosCompletados,
      gastoTotal: parseFloat(result.gastoActual || '0'),
    } as EmpresaProyectoWithDetails;
  }

  // Conductores Asignados
  async asignarConductorEmpresa(insertAsignacion: InsertEmpresaConductorAsignado): Promise<EmpresaConductorAsignado> {
    const [asignacion] = await db.insert(empresaConductoresAsignados).values(insertAsignacion).returning();
    return asignacion;
  }

  async getConductoresAsignadosEmpresa(empresaId: string): Promise<EmpresaConductorAsignadoWithDetails[]> {
    const results = await db.query.empresaConductoresAsignados.findMany({
      where: and(
        eq(empresaConductoresAsignados.empresaId, empresaId),
        eq(empresaConductoresAsignados.activo, true)
      ),
      with: {
        conductor: {
          with: {
            user: true,
          },
        },
        empresa: true,
      },
      orderBy: desc(empresaConductoresAsignados.createdAt),
    });
    return results as EmpresaConductorAsignadoWithDetails[];
  }

  async removeAsignacionConductor(id: string): Promise<void> {
    await db
      .update(empresaConductoresAsignados)
      .set({ activo: false })
      .where(eq(empresaConductoresAsignados.id, id));
  }

  // Servicios Programados
  async createServicioProgramado(insertServicio: InsertServicioProgramado): Promise<ServicioProgramado> {
    const [servicio] = await db.insert(serviciosProgramados).values(insertServicio).returning();
    return servicio;
  }

  async getServiciosProgramadosEmpresa(empresaId: string): Promise<ServicioProgramadoWithDetails[]> {
    const results = await db.query.serviciosProgramados.findMany({
      where: eq(serviciosProgramados.empresaId, empresaId),
      with: {
        empresa: true,
        proyecto: true,
        contrato: true,
        solicitadoPorUsuario: true,
        conductorAsignado: {
          with: {
            user: true,
          },
        },
        servicio: true,
      },
      orderBy: desc(serviciosProgramados.fechaProgramada),
    });
    return results as ServicioProgramadoWithDetails[];
  }

  async updateServicioProgramado(id: string, data: Partial<ServicioProgramado>): Promise<ServicioProgramado> {
    const [servicio] = await db
      .update(serviciosProgramados)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviciosProgramados.id, id))
      .returning();
    return servicio;
  }

  async getServiciosProgramadosPendientes(): Promise<ServicioProgramadoWithDetails[]> {
    const now = new Date();
    const results = await db.query.serviciosProgramados.findMany({
      where: and(
        eq(serviciosProgramados.estado, 'programado'),
        gte(serviciosProgramados.fechaProgramada, now)
      ),
      with: {
        empresa: true,
        proyecto: true,
        contrato: true,
        solicitadoPorUsuario: true,
        conductorAsignado: {
          with: {
            user: true,
          },
        },
      },
      orderBy: serviciosProgramados.fechaProgramada,
    });
    return results as ServicioProgramadoWithDetails[];
  }

  // Facturas
  async createEmpresaFactura(insertFactura: InsertEmpresaFactura): Promise<EmpresaFactura> {
    const [factura] = await db.insert(empresaFacturas).values(insertFactura).returning();
    return factura;
  }

  async getEmpresaFacturas(empresaId: string): Promise<EmpresaFacturaWithItems[]> {
    const results = await db.query.empresaFacturas.findMany({
      where: eq(empresaFacturas.empresaId, empresaId),
      with: {
        empresa: true,
        items: {
          with: {
            servicio: true,
            proyecto: true,
          },
        },
      },
      orderBy: desc(empresaFacturas.createdAt),
    });
    return results as EmpresaFacturaWithItems[];
  }

  async updateEmpresaFactura(id: string, data: Partial<EmpresaFactura>): Promise<EmpresaFactura> {
    const [factura] = await db
      .update(empresaFacturas)
      .set(data)
      .where(eq(empresaFacturas.id, id))
      .returning();
    return factura;
  }

  async getEmpresaFacturaById(id: string): Promise<EmpresaFacturaWithItems | undefined> {
    const result = await db.query.empresaFacturas.findFirst({
      where: eq(empresaFacturas.id, id),
      with: {
        empresa: true,
        items: {
          with: {
            servicio: true,
            proyecto: true,
          },
        },
      },
    });
    return result as EmpresaFacturaWithItems | undefined;
  }

  async createEmpresaFacturaItem(insertItem: InsertEmpresaFacturaItem): Promise<EmpresaFacturaItem> {
    const [item] = await db.insert(empresaFacturaItems).values(insertItem).returning();
    return item;
  }

  // Dashboard Stats
  async getEmpresaDashboardStats(empresaId: string): Promise<{
    serviciosTotales: number;
    serviciosCompletados: number;
    serviciosPendientes: number;
    serviciosProgramados: number;
    gastoTotalMes: number;
    proyectosActivos: number;
    empleadosActivos: number;
    conductoresAsignados: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [servicioStats] = await db
      .select({
        serviciosTotales: sql<number>`count(*)::int`,
        serviciosCompletados: sql<number>`count(*) filter (where ${serviciosProgramados.estado} = 'completado')::int`,
        serviciosPendientes: sql<number>`count(*) filter (where ${serviciosProgramados.estado} = 'pendiente')::int`,
        serviciosProgramados: sql<number>`count(*) filter (where ${serviciosProgramados.estado} = 'programado')::int`,
      })
      .from(serviciosProgramados)
      .where(eq(serviciosProgramados.empresaId, empresaId));

    const [gastoMes] = await db
      .select({
        gastoTotalMes: sql<number>`COALESCE(SUM(${empresaFacturaItems.subtotal}::numeric), 0)::float`,
      })
      .from(empresaFacturas)
      .innerJoin(empresaFacturaItems, eq(empresaFacturas.id, empresaFacturaItems.facturaId))
      .where(and(
        eq(empresaFacturas.empresaId, empresaId),
        gte(empresaFacturas.fechaEmision, startOfMonth),
        lte(empresaFacturas.fechaEmision, endOfMonth)
      ));

    const [proyectosActivos] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(empresaProyectos)
      .where(and(
        eq(empresaProyectos.empresaId, empresaId),
        eq(empresaProyectos.activo, true)
      ));

    const [empleadosActivos] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(empresaEmpleados)
      .where(and(
        eq(empresaEmpleados.empresaId, empresaId),
        eq(empresaEmpleados.activo, true)
      ));

    const [conductoresAsignados] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(empresaConductoresAsignados)
      .where(and(
        eq(empresaConductoresAsignados.empresaId, empresaId),
        eq(empresaConductoresAsignados.activo, true)
      ));

    return {
      serviciosTotales: servicioStats?.serviciosTotales || 0,
      serviciosCompletados: servicioStats?.serviciosCompletados || 0,
      serviciosPendientes: servicioStats?.serviciosPendientes || 0,
      serviciosProgramados: servicioStats?.serviciosProgramados || 0,
      gastoTotalMes: gastoMes?.gastoTotalMes || 0,
      proyectosActivos: proyectosActivos?.count || 0,
      empleadosActivos: empleadosActivos?.count || 0,
      conductoresAsignados: conductoresAsignados?.count || 0,
    };
  }

  async getEmpresaServiciosHistory(empresaId: string, limit: number = 50): Promise<ServicioProgramadoWithDetails[]> {
    const results = await db.query.serviciosProgramados.findMany({
      where: eq(serviciosProgramados.empresaId, empresaId),
      with: {
        empresa: true,
        proyecto: true,
        contrato: true,
        solicitadoPorUsuario: true,
        conductorAsignado: {
          with: {
            user: true,
          },
        },
        servicio: true,
      },
      orderBy: desc(serviciosProgramados.fechaProgramada),
      limit,
    });
    return results as ServicioProgramadoWithDetails[];
  }

  // ==================== OPERATOR WALLET SYSTEM (Phase 2) ====================

  // Create a new operator wallet
  async createOperatorWallet(conductorId: string): Promise<OperatorWallet> {
    const [wallet] = await db.insert(operatorWallets).values({
      conductorId,
      balance: "0.00",
      totalDebt: "0.00",
      cashServicesBlocked: false,
    }).returning();
    return wallet;
  }

  // Get wallet by conductor ID with full details (conductor info, pending debts, recent transactions)
  async getWalletByConductorId(conductorId: string): Promise<WalletWithDetails | undefined> {
    const wallet = await db.query.operatorWallets.findFirst({
      where: eq(operatorWallets.conductorId, conductorId),
      with: {
        conductor: true,
      },
    });

    if (!wallet) {
      return undefined;
    }

    // Get pending debts with days remaining
    const now = new Date();
    const debtsResult = await db.select().from(operatorDebts)
      .where(and(
        eq(operatorDebts.walletId, wallet.id),
        ne(operatorDebts.status, 'paid')
      ))
      .orderBy(operatorDebts.dueDate);

    const pendingDebts: OperatorDebtWithDaysRemaining[] = debtsResult.map(debt => ({
      ...debt,
      daysRemaining: Math.ceil((new Date(debt.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Get recent transactions (last 10)
    const recentTransactions = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(10);

    return {
      ...wallet,
      pendingDebts,
      recentTransactions,
    } as WalletWithDetails;
  }

  // Optimized wallet summary for init - only essential fields, no joins
  async getWalletSummaryByConductorId(conductorId: string): Promise<{ id: string; balance: string; totalDebt: string; cashServicesBlocked: boolean } | null> {
    const wallet = await db.select({
      id: operatorWallets.id,
      balance: operatorWallets.balance,
      totalDebt: operatorWallets.totalDebt,
      cashServicesBlocked: operatorWallets.cashServicesBlocked,
    })
      .from(operatorWallets)
      .where(eq(operatorWallets.conductorId, conductorId))
      .limit(1);

    return wallet[0] || null;
  }

  // Get wallet by ID
  async getWalletById(walletId: string): Promise<OperatorWallet | undefined> {
    const [wallet] = await db.select().from(operatorWallets)
      .where(eq(operatorWallets.id, walletId));
    return wallet;
  }

  // Update wallet
  async updateWallet(walletId: string, data: Partial<OperatorWallet>): Promise<OperatorWallet> {
    const [wallet] = await db.update(operatorWallets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(operatorWallets.id, walletId))
      .returning();
    return wallet;
  }

  // Create a wallet transaction
  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [newTransaction] = await db.insert(walletTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  // Get wallet transactions with service details
  async getWalletTransactions(walletId: string, limit: number = 50): Promise<WalletTransactionWithService[]> {
    const transactions = await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.walletId, walletId),
      with: {
        servicio: true,
      },
      orderBy: desc(walletTransactions.createdAt),
      limit,
    });
    return transactions as WalletTransactionWithService[];
  }

  // Get transaction by payment intent ID (for idempotency checks)
  async getTransactionByPaymentIntentId(paymentIntentId: string): Promise<WalletTransaction | undefined> {
    const [transaction] = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.paymentIntentId, paymentIntentId));
    return transaction;
  }

  // Create an operator debt
  async createOperatorDebt(debt: InsertOperatorDebt): Promise<OperatorDebt> {
    const [newDebt] = await db.insert(operatorDebts)
      .values(debt)
      .returning();
    return newDebt;
  }

  // Get operator debts with days remaining calculation
  async getOperatorDebts(walletId: string): Promise<OperatorDebtWithDaysRemaining[]> {
    const now = new Date();
    const debts = await db.query.operatorDebts.findMany({
      where: eq(operatorDebts.walletId, walletId),
      with: {
        servicio: true,
      },
      orderBy: operatorDebts.dueDate,
    });

    return debts.map(debt => ({
      ...debt,
      daysRemaining: Math.ceil((new Date(debt.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    })) as OperatorDebtWithDaysRemaining[];
  }

  // Get operator debt by ID
  async getOperatorDebtById(debtId: string): Promise<OperatorDebt | undefined> {
    const [debt] = await db.select().from(operatorDebts)
      .where(eq(operatorDebts.id, debtId));
    return debt;
  }

  // Update operator debt
  async updateOperatorDebt(debtId: string, data: Partial<OperatorDebt>): Promise<OperatorDebt> {
    const [debt] = await db.update(operatorDebts)
      .set(data)
      .where(eq(operatorDebts.id, debtId))
      .returning();
    return debt;
  }

  // Get all overdue debts (dueDate < now AND status != 'paid')
  async getOverdueDebts(): Promise<OperatorDebt[]> {
    const now = new Date();
    return db.select().from(operatorDebts)
      .where(and(
        lt(operatorDebts.dueDate, now),
        ne(operatorDebts.status, 'paid')
      ))
      .orderBy(operatorDebts.dueDate);
  }

  // Get debts near due (dueDate <= now + days AND status in ('pending', 'partial'))
  async getDebtsNearDue(days: number): Promise<OperatorDebt[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return db.select().from(operatorDebts)
      .where(and(
        lte(operatorDebts.dueDate, futureDate),
        gte(operatorDebts.dueDate, now),
        sql`${operatorDebts.status} IN ('pending', 'partial')`
      ))
      .orderBy(operatorDebts.dueDate);
  }

  // Mark service commission as processed
  async markServiceCommissionProcessed(servicioId: string): Promise<void> {
    await db.update(servicios)
      .set({ commissionProcessed: true })
      .where(eq(servicios.id, servicioId));
  }

  // Get operator statement for a period
  async getOperatorStatement(conductorId: string, periodStart?: Date, periodEnd?: Date): Promise<OperatorStatementSummary | null> {
    // 1. Get conductor user info
    const conductor = await db.query.conductores.findFirst({
      where: eq(conductores.id, conductorId),
      with: {
        user: true,
      },
    });

    if (!conductor || !conductor.user) {
      return null;
    }

    // 2. Get operator's wallet
    const wallet = await db.query.operatorWallets.findFirst({
      where: eq(operatorWallets.conductorId, conductorId),
    });

    // 3. If no wallet exists, return null
    if (!wallet) {
      return null;
    }

    // 4. Set default period (last 30 days if not provided)
    const now = new Date();
    const defaultPeriodStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const effectivePeriodStart = periodStart || defaultPeriodStart;
    const effectivePeriodEnd = periodEnd || now;

    // 5. Get all wallet transactions within the period with relations
    const transactions = await db.query.walletTransactions.findMany({
      where: and(
        eq(walletTransactions.walletId, wallet.id),
        gte(walletTransactions.createdAt, effectivePeriodStart),
        lte(walletTransactions.createdAt, effectivePeriodEnd)
      ),
      with: {
        servicio: true,
        recordedByAdmin: true,
      },
      orderBy: desc(walletTransactions.createdAt),
    }) as WalletTransactionWithDetails[];

    // 6. Get pending debts (status != 'paid')
    const debts = await db.select().from(operatorDebts)
      .where(and(
        eq(operatorDebts.walletId, wallet.id),
        ne(operatorDebts.status, 'paid')
      ))
      .orderBy(operatorDebts.dueDate);

    const pendingDebts: OperatorDebtWithDaysRemaining[] = debts.map(debt => ({
      ...debt,
      daysRemaining: Math.ceil((new Date(debt.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // 7. Calculate totals
    const currentBalance = wallet.balance;
    const totalDebt = wallet.totalDebt;

    // Calculate total credits (positive amounts: card_payment, manual_payout, adjustment with positive amount)
    let totalCredits = 0;
    let totalDebits = 0;
    let periodTransactionSum = 0;

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);
      periodTransactionSum += amount;

      if (tx.type === 'card_payment' || tx.type === 'manual_payout') {
        totalCredits += Math.abs(amount);
      } else if (tx.type === 'adjustment' && amount > 0) {
        totalCredits += amount;
      } else if (tx.type === 'cash_commission' || tx.type === 'debt_payment' || tx.type === 'direct_payment' || tx.type === 'withdrawal') {
        totalDebits += Math.abs(amount);
      } else if (tx.type === 'adjustment' && amount < 0) {
        totalDebits += Math.abs(amount);
      }
    }

    // Opening balance = current balance minus all period changes
    const openingBalance = (parseFloat(currentBalance) - periodTransactionSum).toFixed(2);

    // 8. Count completed services in period
    const completedServicesResult = await db.select({ count: sql<number>`count(*)` })
      .from(servicios)
      .where(and(
        eq(servicios.conductorId, conductor.userId),
        eq(servicios.estado, 'completado'),
        gte(servicios.completadoAt, effectivePeriodStart),
        lte(servicios.completadoAt, effectivePeriodEnd)
      ));
    
    const completedServices = Number(completedServicesResult[0]?.count || 0);

    // 9. Filter manual payouts from transactions
    const manualPayouts = transactions.filter(tx => tx.type === 'manual_payout');

    // 10. Get operator's bank account
    const bankAccount = await this.getOperatorBankAccount(conductorId);
    const bankAccountData = bankAccount ? {
      id: bankAccount.id,
      banco: bankAccount.banco,
      tipoCuenta: bankAccount.tipoCuenta,
      numeroCuenta: bankAccount.numeroCuenta,
      nombreTitular: bankAccount.nombreTitular,
      cedula: bankAccount.cedula,
      estado: bankAccount.estado,
      last4: bankAccount.numeroCuenta.slice(-4),
    } : null;

    // 11. Return OperatorStatementSummary
    return {
      operatorId: conductorId,
      operatorName: `${conductor.user.nombre} ${conductor.user.apellido}`,
      operatorEmail: conductor.user.email,
      walletId: wallet.id,
      periodStart: effectivePeriodStart,
      periodEnd: effectivePeriodEnd,
      openingBalance,
      currentBalance,
      totalDebt,
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2),
      transactions,
      pendingDebts,
      completedServices,
      manualPayouts,
      bankAccount: bankAccountData,
    };
  }

  // Record a manual payout to operator - this pays off debts
  async recordManualPayout(walletId: string, amount: string, adminId: string, notes?: string, evidenceUrl?: string): Promise<WalletTransaction> {
    // Get the wallet to update its balance
    const [wallet] = await db.select().from(operatorWallets)
      .where(eq(operatorWallets.id, walletId));

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const paymentAmount = Math.abs(parseFloat(amount));
    const currentDebt = parseFloat(wallet.totalDebt) || 0;

    // Use a database transaction to ensure all operations succeed or fail together
    return await db.transaction(async (tx) => {
      // 1. Get pending debts sorted by due date (oldest first)
      const debts = await tx.select().from(operatorDebts)
        .where(and(
          eq(operatorDebts.walletId, walletId),
          ne(operatorDebts.status, 'paid')
        ))
        .orderBy(operatorDebts.dueDate);

      // 2. Apply payment to debts (oldest first)
      let remainingPayment = paymentAmount;
      let totalDebtPaid = 0;

      for (const debt of debts) {
        if (remainingPayment <= 0) break;

        const debtRemaining = parseFloat(debt.remainingAmount);
        if (debtRemaining <= 0) continue;

        const paymentForThisDebt = Math.min(remainingPayment, debtRemaining);
        const newRemaining = Math.max(0, debtRemaining - paymentForThisDebt);
        const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

        await tx.update(operatorDebts)
          .set({
            remainingAmount: newRemaining.toFixed(2),
            status: newStatus,
            paidAt: newStatus === 'paid' ? new Date() : null
          })
          .where(eq(operatorDebts.id, debt.id));

        remainingPayment -= paymentForThisDebt;
        totalDebtPaid += paymentForThisDebt;
      }

      // 3. Create wallet transaction (amount is positive since this is a payment received)
      const [transaction] = await tx.insert(walletTransactions).values({
        walletId,
        type: 'manual_payout',
        amount: paymentAmount.toFixed(2),
        recordedByAdminId: adminId,
        evidenceUrl: evidenceUrl || null,
        notes: notes || null,
        description: `Pago manual registrado - Deuda pagada: RD$${totalDebtPaid.toFixed(2)}`,
      }).returning();

      // 4. Update wallet totalDebt and potentially unblock cash services
      const newDebt = Math.max(0, currentDebt - totalDebtPaid);
      const updateData: Partial<OperatorWallet> = {
        totalDebt: newDebt.toFixed(2)
      };

      // Unblock cash services if debt is fully paid
      if (newDebt <= 0.01 && wallet.cashServicesBlocked) {
        updateData.cashServicesBlocked = false;
      }

      await tx.update(operatorWallets)
        .set(updateData)
        .where(eq(operatorWallets.id, walletId));

      return transaction;
    });
  }

  // ==================== SYSTEM FOR CANCELLATIONS (Phase 3) ====================

  async createCancelacionServicio(cancelacion: InsertCancelacionServicio): Promise<CancelacionServicio> {
    const [result] = await db.insert(cancelacionesServicios).values(cancelacion).returning();
    return result;
  }

  async getCancelacionesByUsuarioId(usuarioId: string, tipo: 'cliente' | 'conductor'): Promise<CancelacionServicioWithDetails[]> {
    return await db.query.cancelacionesServicios.findMany({
      where: and(
        eq(cancelacionesServicios.canceladoPorId, usuarioId),
        eq(cancelacionesServicios.tipoCancelador, tipo)
      ),
      with: {
        servicio: true,
        canceladoPor: true,
        razonCancelacion: true,
      },
      orderBy: desc(cancelacionesServicios.createdAt),
    }) as Promise<CancelacionServicioWithDetails[]>;
  }

  async getCancelacionesByServicioId(servicioId: string): Promise<CancelacionServicioWithDetails | undefined> {
    return await db.query.cancelacionesServicios.findFirst({
      where: eq(cancelacionesServicios.servicioId, servicioId),
      with: {
        servicio: true,
        canceladoPor: true,
        razonCancelacion: true,
      },
    }) as Promise<CancelacionServicioWithDetails | undefined>;
  }

  async getAllCancelaciones(limit: number = 100): Promise<CancelacionServicioWithDetails[]> {
    return await db.query.cancelacionesServicios.findMany({
      with: {
        servicio: true,
        canceladoPor: true,
        razonCancelacion: true,
      },
      orderBy: desc(cancelacionesServicios.createdAt),
      limit,
    }) as Promise<CancelacionServicioWithDetails[]>;
  }

  async updateCancelacion(id: string, data: Partial<CancelacionServicio>): Promise<CancelacionServicio> {
    const [result] = await db.update(cancelacionesServicios)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cancelacionesServicios.id, id))
      .returning();
    return result;
  }

  async getAllRazonesCancelacion(): Promise<RazonCancelacion[]> {
    return await db.query.razonesCancelacion.findMany({
      where: eq(razonesCancelacion.activa, true),
      orderBy: asc(razonesCancelacion.codigo),
    }) as Promise<RazonCancelacion[]>;
  }

  async getRazonCancelacionByCodigo(codigo: string): Promise<RazonCancelacion | undefined> {
    return await db.query.razonesCancelacion.findFirst({
      where: eq(razonesCancelacion.codigo, codigo),
    }) as Promise<RazonCancelacion | undefined>;
  }

  async getZonaDemandaByCoords(lat: number, lng: number): Promise<ZonaDemanda | undefined> {
    return await db.query.zonasDemanada.findFirst() as Promise<ZonaDemanda | undefined>;
  }

  async updateZonaDemanda(id: string, data: Partial<ZonaDemanda>): Promise<ZonaDemanda> {
    const [result] = await db.update(zonasDemanada)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(zonasDemanada.id, id))
      .returning();
    return result;
  }

  // ==================== ADMINISTRADORES (ADMIN USERS WITH PERMISSIONS) ====================

  async getAdministradores(): Promise<AdministradorWithDetails[]> {
    const results = await db.query.administradores.findMany({
      with: {
        user: true,
        creadoPorUsuario: true,
      },
      orderBy: desc(administradores.createdAt),
    });
    return results as AdministradorWithDetails[];
  }

  async getAdministradorById(id: string): Promise<AdministradorWithDetails | undefined> {
    const result = await db.query.administradores.findFirst({
      where: eq(administradores.id, id),
      with: {
        user: true,
        creadoPorUsuario: true,
      },
    });
    return result as AdministradorWithDetails | undefined;
  }

  async getAdministradorByUserId(userId: string): Promise<AdministradorWithDetails | undefined> {
    const result = await db.query.administradores.findFirst({
      where: eq(administradores.userId, userId),
      with: {
        user: true,
        creadoPorUsuario: true,
      },
    });
    return result as AdministradorWithDetails | undefined;
  }

  async createAdministrador(data: InsertAdministrador): Promise<Administrador> {
    const [admin] = await db.insert(administradores).values(data).returning();
    return admin;
  }

  async updateAdministrador(id: string, data: Partial<InsertAdministrador>): Promise<Administrador | undefined> {
    const [admin] = await db
      .update(administradores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(administradores.id, id))
      .returning();
    return admin;
  }

  async toggleAdministradorActivo(id: string): Promise<Administrador | undefined> {
    const admin = await this.getAdministradorById(id);
    if (!admin) return undefined;
    
    const [updated] = await db
      .update(administradores)
      .set({ activo: !admin.activo, updatedAt: new Date() })
      .where(eq(administradores.id, id))
      .returning();
    return updated;
  }

  async updateAdminPrimerInicioSesion(id: string): Promise<void> {
    await db
      .update(administradores)
      .set({ primerInicioSesion: false, updatedAt: new Date() })
      .where(eq(administradores.id, id));
  }
}

export const storage = new DatabaseStorage();
