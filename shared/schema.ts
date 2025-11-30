import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  decimal, 
  boolean, 
  timestamp,
  integer,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userTypeEnum = pgEnum("user_type", ["cliente", "conductor", "admin", "aseguradora", "socio"]);
export const estadoCuentaEnum = pgEnum("estado_cuenta", [
  "pendiente_verificacion",
  "activo",
  "suspendido",
  "rechazado"
]);
export const estadoServicioEnum = pgEnum("estado_servicio", [
  "pendiente",
  "aceptado",
  "conductor_en_sitio",
  "cargando",
  "en_progreso",
  "completado",
  "cancelado"
]);
export const metodoPagoEnum = pgEnum("metodo_pago", ["efectivo", "tarjeta", "aseguradora"]);
export const tipoVehiculoEnum = pgEnum("tipo_vehiculo", ["carro", "motor", "jeep", "camion"]);

export const servicioCategoriaEnum = pgEnum("servicio_categoria", [
  "remolque_estandar",
  "auxilio_vial",
  "remolque_especializado",
  "camiones_pesados",
  "izaje_construccion",
  "remolque_recreativo"
]);

export const servicioSubtipoEnum = pgEnum("servicio_subtipo", [
  "cambio_goma",
  "inflado_neumatico",
  "paso_corriente",
  "cerrajero_automotriz",
  "suministro_combustible",
  "envio_bateria",
  "diagnostico_obd",
  "extraccion_vehiculo",
  "vehiculo_sin_llanta",
  "vehiculo_sin_direccion",
  "vehiculo_chocado",
  "vehiculo_lujo",
  "vehiculo_electrico",
  "camion_liviano",
  "camion_mediano",
  "patana_cabezote",
  "volteo",
  "transporte_maquinarias",
  "montacargas",
  "retroexcavadora",
  "tractor",
  "izaje_materiales",
  "subida_muebles",
  "transporte_equipos",
  "remolque_botes",
  "remolque_jetski",
  "remolque_cuatrimoto"
]);

export const aseguradoraEstadoEnum = pgEnum("aseguradora_estado", ["pendiente", "aprobado", "rechazado"]);
export const documentoTipoEnum = pgEnum("documento_tipo", [
  "licencia",
  "matricula",
  "poliza",
  "seguro_grua",
  "foto_vehiculo",
  "foto_perfil",
  "cedula_frontal",
  "cedula_trasera",
  "seguro_cliente"
]);
export const documentoEstadoEnum = pgEnum("documento_estado", [
  "pendiente",
  "aprobado",
  "rechazado"
]);
export const estadoPagoEnum = pgEnum("estado_pago", [
  "pendiente",
  "procesando",
  "pagado",
  "fallido"
]);

export const estadoPagoAseguradoraEnum = pgEnum("estado_pago_aseguradora", [
  "pendiente_facturar",
  "facturado",
  "pagado"
]);

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  cedula: text("cedula"),
  cedulaVerificada: boolean("cedula_verificada").default(false).notNull(),
  passwordHash: text("password_hash").notNull(),
  userType: userTypeEnum("user_type").notNull().default("cliente"),
  estadoCuenta: estadoCuentaEnum("estado_cuenta").notNull().default("pendiente_verificacion"),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  fotoUrl: text("foto_url"),
  calificacionPromedio: decimal("calificacion_promedio", { precision: 3, scale: 2 }),
  telefonoVerificado: boolean("telefono_verificado").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conductores (Drivers) Table
export const conductores = pgTable("conductores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  licencia: text("licencia").notNull(),
  placaGrua: text("placa_grua").notNull(),
  marcaGrua: text("marca_grua").notNull(),
  modeloGrua: text("modelo_grua").notNull(),
  disponible: boolean("disponible").default(false).notNull(),
  ubicacionLat: decimal("ubicacion_lat", { precision: 10, scale: 7 }),
  ubicacionLng: decimal("ubicacion_lng", { precision: 10, scale: 7 }),
  ultimaUbicacionUpdate: timestamp("ultima_ubicacion_update"),
  azulMerchantId: text("azul_merchant_id"),
  azulCardToken: text("azul_card_token"),
});

// Servicios (Services) Table
export const servicios = pgTable("servicios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clienteId: varchar("cliente_id").notNull().references(() => users.id),
  conductorId: varchar("conductor_id").references(() => users.id),
  origenLat: decimal("origen_lat", { precision: 10, scale: 7 }).notNull(),
  origenLng: decimal("origen_lng", { precision: 10, scale: 7 }).notNull(),
  origenDireccion: text("origen_direccion").notNull(),
  destinoLat: decimal("destino_lat", { precision: 10, scale: 7 }).notNull(),
  destinoLng: decimal("destino_lng", { precision: 10, scale: 7 }).notNull(),
  destinoDireccion: text("destino_direccion").notNull(),
  distanciaKm: decimal("distancia_km", { precision: 6, scale: 2 }).notNull(),
  costoTotal: decimal("costo_total", { precision: 10, scale: 2 }).notNull(),
  estado: estadoServicioEnum("estado").default("pendiente").notNull(),
  metodoPago: metodoPagoEnum("metodo_pago").default("efectivo").notNull(),
  stripePaymentId: text("stripe_payment_id"),
  azulTransactionId: text("azul_transaction_id"),
  tipoVehiculo: tipoVehiculoEnum("tipo_vehiculo"),
  servicioCategoria: servicioCategoriaEnum("servicio_categoria").default("remolque_estandar"),
  servicioSubtipo: servicioSubtipoEnum("servicio_subtipo"),
  aseguradoraNombre: text("aseguradora_nombre"),
  aseguradoraPoliza: text("aseguradora_poliza"),
  aseguradoraEstado: aseguradoraEstadoEnum("aseguradora_estado"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  aceptadoAt: timestamp("aceptado_at"),
  iniciadoAt: timestamp("iniciado_at"),
  completadoAt: timestamp("completado_at"),
  canceladoAt: timestamp("cancelado_at"),
});

// Tarifas (Pricing) Table
export const tarifas = pgTable("tarifas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  precioBase: decimal("precio_base", { precision: 10, scale: 2 }).notNull(),
  tarifaPorKm: decimal("tarifa_por_km", { precision: 10, scale: 2 }).notNull(),
  tarifaNocturnaMultiplicador: decimal("tarifa_nocturna_multiplicador", { precision: 3, scale: 2 }).default("1.5"),
  horaInicioNocturna: text("hora_inicio_nocturna").default("20:00"),
  horaFinNocturna: text("hora_fin_nocturna").default("06:00"),
  zona: text("zona"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Calificaciones (Ratings) Table
export const calificaciones = pgTable("calificaciones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicioId: varchar("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  puntuacion: integer("puntuacion").notNull(),
  comentario: text("comentario"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ubicaciones Tracking Table (for real-time GPS tracking)
export const ubicacionesTracking = pgTable("ubicaciones_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicioId: varchar("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  conductorId: varchar("conductor_id").notNull().references(() => conductores.id),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Mensajes Chat Table (for real-time chat between client and driver)
export const mensajesChat = pgTable("mensajes_chat", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicioId: varchar("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  remitenteId: varchar("remitente_id").notNull().references(() => users.id),
  contenido: text("contenido").notNull(),
  leido: boolean("leido").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Push Subscriptions Table (for web push notifications)
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Verification Codes Table (for OTP verification)
export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telefono: text("telefono").notNull(),
  codigo: text("codigo").notNull(),
  expiraEn: timestamp("expira_en").notNull(),
  intentos: integer("intentos").default(0).notNull(),
  verificado: boolean("verificado").default(false).notNull(),
  tipoOperacion: text("tipo_operacion").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documentos Table (for file management)
export const documentos = pgTable("documentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tipo: documentoTipoEnum("tipo").notNull(),
  usuarioId: varchar("usuario_id").references(() => users.id, { onDelete: "cascade" }),
  conductorId: varchar("conductor_id").references(() => conductores.id, { onDelete: "cascade" }),
  servicioId: varchar("servicio_id").references(() => servicios.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  nombreArchivo: text("nombre_archivo").notNull(),
  tamanoArchivo: integer("tamano_archivo"),
  mimeType: text("mime_type"),
  estado: documentoEstadoEnum("estado").default("pendiente").notNull(),
  validoHasta: timestamp("valido_hasta"),
  revisadoPor: varchar("revisado_por").references(() => users.id),
  fechaRevision: timestamp("fecha_revision"),
  motivoRechazo: text("motivo_rechazo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comisiones Table (for payment commissions 70/30)
export const comisiones = pgTable("comisiones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicioId: varchar("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  montoTotal: decimal("monto_total", { precision: 10, scale: 2 }).notNull(),
  montoOperador: decimal("monto_operador", { precision: 10, scale: 2 }).notNull(),
  montoEmpresa: decimal("monto_empresa", { precision: 10, scale: 2 }).notNull(),
  porcentajeOperador: decimal("porcentaje_operador", { precision: 5, scale: 2 }).default("70.00").notNull(),
  porcentajeEmpresa: decimal("porcentaje_empresa", { precision: 5, scale: 2 }).default("30.00").notNull(),
  estadoPagoOperador: estadoPagoEnum("estado_pago_operador").default("pendiente").notNull(),
  estadoPagoEmpresa: estadoPagoEnum("estado_pago_empresa").default("pendiente").notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  azulTransactionId: text("azul_transaction_id"),
  fechaPagoOperador: timestamp("fecha_pago_operador"),
  fechaPagoEmpresa: timestamp("fecha_pago_empresa"),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Aseguradoras Table (Insurance Companies)
export const aseguradoras = pgTable("aseguradoras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nombreEmpresa: text("nombre_empresa").notNull(),
  rnc: text("rnc").notNull(),
  direccion: text("direccion"),
  telefono: text("telefono"),
  emailContacto: text("email_contacto"),
  personaContacto: text("persona_contacto"),
  logoUrl: text("logo_url"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Servicios Aseguradora Table (Insurance service tracking for billing)
export const serviciosAseguradora = pgTable("servicios_aseguradora", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicioId: varchar("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  aseguradoraId: varchar("aseguradora_id").notNull().references(() => aseguradoras.id),
  numeroPoliza: text("numero_poliza").notNull(),
  tipoCobertura: text("tipo_cobertura"),
  montoAprobado: decimal("monto_aprobado", { precision: 10, scale: 2 }),
  estadoPago: estadoPagoAseguradoraEnum("estado_pago").default("pendiente_facturar").notNull(),
  numeroFactura: text("numero_factura"),
  fechaFactura: timestamp("fecha_factura"),
  fechaPago: timestamp("fecha_pago"),
  notas: text("notas"),
  aprobadoPor: varchar("aprobado_por").references(() => users.id),
  fechaAprobacion: timestamp("fecha_aprobacion"),
  rechazadoPor: varchar("rechazado_por").references(() => users.id),
  fechaRechazo: timestamp("fecha_rechazo"),
  motivoRechazo: text("motivo_rechazo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  conductor: one(conductores, {
    fields: [users.id],
    references: [conductores.userId],
  }),
  serviciosComoCliente: many(servicios, { relationName: "cliente" }),
  serviciosComoConductor: many(servicios, { relationName: "conductor" }),
}));

export const conductoresRelations = relations(conductores, ({ one, many }) => ({
  user: one(users, {
    fields: [conductores.userId],
    references: [users.id],
  }),
  servicios: many(servicios),
  ubicacionesTracking: many(ubicacionesTracking),
}));

export const serviciosRelations = relations(servicios, ({ one, many }) => ({
  cliente: one(users, {
    fields: [servicios.clienteId],
    references: [users.id],
    relationName: "cliente",
  }),
  conductor: one(users, {
    fields: [servicios.conductorId],
    references: [users.id],
    relationName: "conductor",
  }),
  calificacion: one(calificaciones),
  ubicacionesTracking: many(ubicacionesTracking),
  mensajesChat: many(mensajesChat),
}));

export const calificacionesRelations = relations(calificaciones, ({ one }) => ({
  servicio: one(servicios, {
    fields: [calificaciones.servicioId],
    references: [servicios.id],
  }),
}));

export const ubicacionesTrackingRelations = relations(ubicacionesTracking, ({ one }) => ({
  servicio: one(servicios, {
    fields: [ubicacionesTracking.servicioId],
    references: [servicios.id],
  }),
  conductor: one(conductores, {
    fields: [ubicacionesTracking.conductorId],
    references: [conductores.id],
  }),
}));

export const mensajesChatRelations = relations(mensajesChat, ({ one }) => ({
  servicio: one(servicios, {
    fields: [mensajesChat.servicioId],
    references: [servicios.id],
  }),
  remitente: one(users, {
    fields: [mensajesChat.remitenteId],
    references: [users.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const documentosRelations = relations(documentos, ({ one }) => ({
  usuario: one(users, {
    fields: [documentos.usuarioId],
    references: [users.id],
  }),
  conductor: one(conductores, {
    fields: [documentos.conductorId],
    references: [conductores.id],
  }),
  servicio: one(servicios, {
    fields: [documentos.servicioId],
    references: [servicios.id],
  }),
  revisadoPorUsuario: one(users, {
    fields: [documentos.revisadoPor],
    references: [users.id],
  }),
}));

export const comisionesRelations = relations(comisiones, ({ one }) => ({
  servicio: one(servicios, {
    fields: [comisiones.servicioId],
    references: [servicios.id],
  }),
}));

export const aseguradorasRelations = relations(aseguradoras, ({ one, many }) => ({
  user: one(users, {
    fields: [aseguradoras.userId],
    references: [users.id],
  }),
  servicios: many(serviciosAseguradora),
}));

export const serviciosAseguradoraRelations = relations(serviciosAseguradora, ({ one }) => ({
  servicio: one(servicios, {
    fields: [serviciosAseguradora.servicioId],
    references: [servicios.id],
  }),
  aseguradora: one(aseguradoras, {
    fields: [serviciosAseguradora.aseguradoraId],
    references: [aseguradoras.id],
  }),
  aprobadoPorUsuario: one(users, {
    fields: [serviciosAseguradora.aprobadoPor],
    references: [users.id],
  }),
  rechazadoPorUsuario: one(users, {
    fields: [serviciosAseguradora.rechazadoPor],
    references: [users.id],
  }),
}));

// ==================== SOCIOS (PARTNERS/INVESTORS) SYSTEM ====================

// Enum for distribution status
export const estadoDistribucionEnum = pgEnum("estado_distribucion", [
  "calculado",
  "aprobado",
  "pagado"
]);

// Socios (Partners/Investors) Table
export const socios = pgTable("socios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  porcentajeParticipacion: decimal("porcentaje_participacion", { precision: 5, scale: 2 }).notNull(),
  montoInversion: decimal("monto_inversion", { precision: 12, scale: 2 }).notNull(),
  fechaInversion: timestamp("fecha_inversion").notNull(),
  activo: boolean("activo").default(true).notNull(),
  cuentaBancaria: text("cuenta_bancaria"),
  bancoNombre: text("banco_nombre"),
  tipoCuenta: text("tipo_cuenta"),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Distribuciones Socios Table (Partner profit distributions)
export const distribucionesSocios = pgTable("distribuciones_socios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  socioId: varchar("socio_id").notNull().references(() => socios.id, { onDelete: "cascade" }),
  periodo: text("periodo").notNull(),
  ingresosTotales: decimal("ingresos_totales", { precision: 12, scale: 2 }).notNull(),
  comisionEmpresa: decimal("comision_empresa", { precision: 12, scale: 2 }).notNull(),
  montoSocio: decimal("monto_socio", { precision: 12, scale: 2 }).notNull(),
  estado: estadoDistribucionEnum("estado").default("calculado").notNull(),
  fechaPago: timestamp("fecha_pago"),
  metodoPago: text("metodo_pago"),
  referenciaTransaccion: text("referencia_transaccion"),
  notas: text("notas"),
  calculadoPor: varchar("calculado_por").references(() => users.id),
  aprobadoPor: varchar("aprobado_por").references(() => users.id),
  fechaAprobacion: timestamp("fecha_aprobacion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Socios Relations
export const sociosRelations = relations(socios, ({ one, many }) => ({
  user: one(users, {
    fields: [socios.userId],
    references: [users.id],
  }),
  distribuciones: many(distribucionesSocios),
}));

export const distribucionesSociosRelations = relations(distribucionesSocios, ({ one }) => ({
  socio: one(socios, {
    fields: [distribucionesSocios.socioId],
    references: [socios.id],
  }),
  calculadoPorUsuario: one(users, {
    fields: [distribucionesSocios.calculadoPor],
    references: [users.id],
  }),
  aprobadoPorUsuario: one(users, {
    fields: [distribucionesSocios.aprobadoPor],
    references: [users.id],
  }),
}));

// ==================== END SOCIOS SYSTEM ====================

// Enum for document reminder types
export const tipoRecordatorioEnum = pgEnum("tipo_recordatorio", [
  "30_dias",
  "15_dias",
  "7_dias",
  "vencido"
]);

// Document Reminders Table (tracks sent reminders to avoid duplicates)
export const documentoRecordatorios = pgTable("documento_recordatorios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentoId: varchar("documento_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),
  tipoRecordatorio: tipoRecordatorioEnum("tipo_recordatorio").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

// System Jobs Table (tracks background job execution)
export const systemJobs = pgTable("system_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobName: text("job_name").notNull().unique(),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  isRunning: boolean("is_running").default(false).notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Document reminder relations
export const documentoRecordatoriosRelations = relations(documentoRecordatorios, ({ one }) => ({
  documento: one(documentos, {
    fields: [documentoRecordatorios.documentoId],
    references: [documentos.id],
  }),
}));

// ==================== CLIENT PAYMENT METHODS (AZUL) ====================

// Client Payment Methods Table (Azul DataVault tokens for clients)
export const clientPaymentMethods = pgTable("client_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  azulToken: text("azul_token").notNull(),
  cardBrand: text("card_brand").notNull(),
  last4: text("last4").notNull(),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  cardholderName: text("cardholder_name"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client Payment Methods Relations
export const clientPaymentMethodsRelations = relations(clientPaymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [clientPaymentMethods.userId],
    references: [users.id],
  }),
}));

// ==================== END CLIENT PAYMENT METHODS ====================

// Validation functions
const validarCedulaRD = (cedula: string): boolean => {
  if (!/^\d{11}$/.test(cedula)) return false;
  
  const digits = cedula.split('').map(Number);
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let product = digits[i] * weights[i];
    if (product >= 10) {
      product = Math.floor(product / 10) + (product % 10);
    }
    sum += product;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[10];
};

// Insert Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Teléfono debe tener al menos 10 dígitos").optional(),
  cedula: z.string()
    .regex(/^\d{11}$/, "Cédula debe tener 11 dígitos")
    .refine(validarCedulaRD, "Cédula inválida")
    .optional(),
  nombre: z.string().min(1, "Nombre es requerido"),
  apellido: z.string().min(1, "Apellido es requerido"),
}).omit({
  id: true,
  createdAt: true,
  calificacionPromedio: true,
  telefonoVerificado: true,
  estadoCuenta: true,
});

export const insertConductorSchema = createInsertSchema(conductores, {
  licencia: z.string().min(1),
  placaGrua: z.string().min(1),
  marcaGrua: z.string().min(1),
  modeloGrua: z.string().min(1),
}).omit({
  id: true,
  disponible: true,
  ultimaUbicacionUpdate: true,
});

export const insertServicioSchema = createInsertSchema(servicios, {
  origenDireccion: z.string().min(1),
  destinoDireccion: z.string().min(1),
  tipoVehiculo: z.enum(["carro", "motor", "jeep", "camion"]).optional(),
  servicioCategoria: z.enum([
    "remolque_estandar",
    "auxilio_vial",
    "remolque_especializado",
    "camiones_pesados",
    "izaje_construccion",
    "remolque_recreativo"
  ]).optional(),
  servicioSubtipo: z.enum([
    "cambio_goma",
    "inflado_neumatico",
    "paso_corriente",
    "cerrajero_automotriz",
    "suministro_combustible",
    "envio_bateria",
    "diagnostico_obd",
    "extraccion_vehiculo",
    "vehiculo_sin_llanta",
    "vehiculo_sin_direccion",
    "vehiculo_chocado",
    "vehiculo_lujo",
    "vehiculo_electrico",
    "camion_liviano",
    "camion_mediano",
    "patana_cabezote",
    "volteo",
    "transporte_maquinarias",
    "montacargas",
    "retroexcavadora",
    "tractor",
    "izaje_materiales",
    "subida_muebles",
    "transporte_equipos",
    "remolque_botes",
    "remolque_jetski",
    "remolque_cuatrimoto"
  ]).optional(),
  aseguradoraNombre: z.string().optional(),
  aseguradoraPoliza: z.string().optional(),
  aseguradoraEstado: z.enum(["pendiente", "aprobado", "rechazado"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  aceptadoAt: true,
  iniciadoAt: true,
  completadoAt: true,
  canceladoAt: true,
  conductorId: true,
});

export const insertTarifaSchema = createInsertSchema(tarifas, {
  nombre: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCalificacionSchema = createInsertSchema(calificaciones, {
  puntuacion: z.number().min(1).max(5),
  comentario: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertUbicacionTrackingSchema = createInsertSchema(ubicacionesTracking).omit({
  id: true,
  timestamp: true,
});

export const insertMensajeChatSchema = createInsertSchema(mensajesChat, {
  contenido: z.string().min(1).max(1000),
}).omit({
  id: true,
  createdAt: true,
  leido: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions, {
  endpoint: z.string().url(),
  p256dhKey: z.string().min(1),
  authKey: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes, {
  telefono: z.string().min(10),
  codigo: z.string().length(6),
  tipoOperacion: z.enum(["registro", "recuperacion_password"]),
}).omit({
  id: true,
  createdAt: true,
  intentos: true,
  verificado: true,
});

export const insertDocumentoSchema = createInsertSchema(documentos, {
  nombreArchivo: z.string().min(1),
  url: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  estado: true,
  revisadoPor: true,
});

export const insertComisionSchema = createInsertSchema(comisiones, {
  montoTotal: z.string().min(1),
  montoOperador: z.string().min(1),
  montoEmpresa: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  estadoPagoOperador: true,
  estadoPagoEmpresa: true,
  fechaPagoOperador: true,
  fechaPagoEmpresa: true,
});

export const insertAseguradoraSchema = createInsertSchema(aseguradoras, {
  nombreEmpresa: z.string().min(1, "Nombre de empresa es requerido"),
  rnc: z.string().min(1, "RNC es requerido"),
}).omit({
  id: true,
  createdAt: true,
  activo: true,
});

export const insertServicioAseguradoraSchema = createInsertSchema(serviciosAseguradora, {
  numeroPoliza: z.string().min(1, "Número de póliza es requerido"),
}).omit({
  id: true,
  createdAt: true,
  estadoPago: true,
  aprobadoPor: true,
  fechaAprobacion: true,
  rechazadoPor: true,
  fechaRechazo: true,
  motivoRechazo: true,
});

export const insertSocioSchema = createInsertSchema(socios, {
  porcentajeParticipacion: z.string().min(1, "Porcentaje de participación es requerido"),
  montoInversion: z.string().min(1, "Monto de inversión es requerido"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  activo: true,
});

export const insertDistribucionSocioSchema = createInsertSchema(distribucionesSocios, {
  periodo: z.string().regex(/^\d{4}-\d{2}$/, "Formato de período inválido (YYYY-MM)"),
  ingresosTotales: z.string().min(1, "Ingresos totales es requerido"),
  comisionEmpresa: z.string().min(1, "Comisión empresa es requerido"),
  montoSocio: z.string().min(1, "Monto socio es requerido"),
}).omit({
  id: true,
  createdAt: true,
  estado: true,
  fechaPago: true,
  aprobadoPor: true,
  fechaAprobacion: true,
});

export const insertClientPaymentMethodSchema = createInsertSchema(clientPaymentMethods, {
  azulToken: z.string().min(1, "Token de Azul es requerido"),
  cardBrand: z.string().min(1, "Marca de tarjeta es requerida"),
  last4: z.string().length(4, "Los últimos 4 dígitos son requeridos"),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(2024),
  cardholderName: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  isDefault: true,
});

// Select Schemas
export const selectUserSchema = createSelectSchema(users);
export const selectConductorSchema = createSelectSchema(conductores);
export const selectServicioSchema = createSelectSchema(servicios);
export const selectTarifaSchema = createSelectSchema(tarifas);
export const selectCalificacionSchema = createSelectSchema(calificaciones);
export const selectUbicacionTrackingSchema = createSelectSchema(ubicacionesTracking);
export const selectMensajeChatSchema = createSelectSchema(mensajesChat);
export const selectPushSubscriptionSchema = createSelectSchema(pushSubscriptions);
export const selectVerificationCodeSchema = createSelectSchema(verificationCodes);
export const selectDocumentoSchema = createSelectSchema(documentos);
export const selectComisionSchema = createSelectSchema(comisiones);
export const selectAseguradoraSchema = createSelectSchema(aseguradoras);
export const selectServicioAseguradoraSchema = createSelectSchema(serviciosAseguradora);
export const selectSocioSchema = createSelectSchema(socios);
export const selectDistribucionSocioSchema = createSelectSchema(distribucionesSocios);
export const selectClientPaymentMethodSchema = createSelectSchema(clientPaymentMethods);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConductor = z.infer<typeof insertConductorSchema>;
export type Conductor = typeof conductores.$inferSelect;

export type InsertServicio = z.infer<typeof insertServicioSchema>;
export type Servicio = typeof servicios.$inferSelect;

export type InsertTarifa = z.infer<typeof insertTarifaSchema>;
export type Tarifa = typeof tarifas.$inferSelect;

export type InsertCalificacion = z.infer<typeof insertCalificacionSchema>;
export type Calificacion = typeof calificaciones.$inferSelect;

export type InsertUbicacionTracking = z.infer<typeof insertUbicacionTrackingSchema>;
export type UbicacionTracking = typeof ubicacionesTracking.$inferSelect;

export type InsertMensajeChat = z.infer<typeof insertMensajeChatSchema>;
export type MensajeChat = typeof mensajesChat.$inferSelect;

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;

export type InsertDocumento = z.infer<typeof insertDocumentoSchema>;
export type Documento = typeof documentos.$inferSelect;

export type InsertComision = z.infer<typeof insertComisionSchema>;
export type Comision = typeof comisiones.$inferSelect;

export type InsertAseguradora = z.infer<typeof insertAseguradoraSchema>;
export type Aseguradora = typeof aseguradoras.$inferSelect;

export type InsertServicioAseguradora = z.infer<typeof insertServicioAseguradoraSchema>;
export type ServicioAseguradora = typeof serviciosAseguradora.$inferSelect;

export type InsertSocio = z.infer<typeof insertSocioSchema>;
export type Socio = typeof socios.$inferSelect;

export type InsertDistribucionSocio = z.infer<typeof insertDistribucionSocioSchema>;
export type DistribucionSocio = typeof distribucionesSocios.$inferSelect;

export type InsertClientPaymentMethod = z.infer<typeof insertClientPaymentMethodSchema>;
export type ClientPaymentMethod = typeof clientPaymentMethods.$inferSelect;

// Helper types for API responses
export type UserWithConductor = User & {
  conductor?: Conductor;
};

export type ServicioWithDetails = Servicio & {
  cliente?: User;
  conductor?: User;
  calificacion?: Calificacion;
};

export type MensajeChatWithRemitente = MensajeChat & {
  remitente?: User;
};

export type DocumentoWithDetails = Documento & {
  usuario?: User;
  conductor?: Conductor;
  servicio?: Servicio;
  revisadoPorUsuario?: User;
};

export type ComisionWithDetails = Comision & {
  servicio?: ServicioWithDetails;
};

export type AseguradoraWithDetails = Aseguradora & {
  user?: User;
};

export type ServicioAseguradoraWithDetails = ServicioAseguradora & {
  servicio?: ServicioWithDetails;
  aseguradora?: Aseguradora;
  aprobadoPorUsuario?: User;
  rechazadoPorUsuario?: User;
};

export type SocioWithDetails = Socio & {
  user?: User;
  distribuciones?: DistribucionSocio[];
};

export type DistribucionSocioWithDetails = DistribucionSocio & {
  socio?: SocioWithDetails;
  calculadoPorUsuario?: User;
  aprobadoPorUsuario?: User;
};

// ==================== TICKET SYSTEM ====================

// Ticket Enums
export const ticketCategoriaEnum = pgEnum("ticket_categoria", [
  "problema_tecnico",
  "consulta_servicio",
  "queja",
  "sugerencia",
  "problema_pago",
  "otro"
]);

export const ticketPrioridadEnum = pgEnum("ticket_prioridad", [
  "baja",
  "media",
  "alta",
  "urgente"
]);

export const ticketEstadoEnum = pgEnum("ticket_estado", [
  "abierto",
  "en_proceso",
  "resuelto",
  "cerrado"
]);

// Tickets Table
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoria: ticketCategoriaEnum("categoria").notNull(),
  prioridad: ticketPrioridadEnum("prioridad").default("media").notNull(),
  estado: ticketEstadoEnum("estado").default("abierto").notNull(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion").notNull(),
  servicioRelacionadoId: varchar("servicio_relacionado_id").references(() => servicios.id, { onDelete: "set null" }),
  asignadoA: varchar("asignado_a").references(() => users.id, { onDelete: "set null" }),
  resueltoAt: timestamp("resuelto_at"),
  cerradoAt: timestamp("cerrado_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Ticket Messages Table
export const mensajesTicket = pgTable("mensajes_ticket", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  usuarioId: varchar("usuario_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mensaje: text("mensaje").notNull(),
  esStaff: boolean("es_staff").default(false).notNull(),
  leido: boolean("leido").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ticket Relations
export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  usuario: one(users, {
    fields: [tickets.usuarioId],
    references: [users.id],
  }),
  servicioRelacionado: one(servicios, {
    fields: [tickets.servicioRelacionadoId],
    references: [servicios.id],
  }),
  asignadoAUsuario: one(users, {
    fields: [tickets.asignadoA],
    references: [users.id],
  }),
  mensajes: many(mensajesTicket),
}));

export const mensajesTicketRelations = relations(mensajesTicket, ({ one }) => ({
  ticket: one(tickets, {
    fields: [mensajesTicket.ticketId],
    references: [tickets.id],
  }),
  usuario: one(users, {
    fields: [mensajesTicket.usuarioId],
    references: [users.id],
  }),
}));

// Ticket Insert Schemas
export const insertTicketSchema = createInsertSchema(tickets, {
  titulo: z.string().min(5, "El título debe tener al menos 5 caracteres").max(200, "El título no puede exceder 200 caracteres"),
  descripcion: z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(2000, "La descripción no puede exceder 2000 caracteres"),
  categoria: z.enum(["problema_tecnico", "consulta_servicio", "queja", "sugerencia", "problema_pago", "otro"]),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).optional(),
}).omit({
  id: true,
  estado: true,
  asignadoA: true,
  resueltoAt: true,
  cerradoAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMensajeTicketSchema = createInsertSchema(mensajesTicket, {
  mensaje: z.string().min(1, "El mensaje no puede estar vacío").max(2000, "El mensaje no puede exceder 2000 caracteres"),
}).omit({
  id: true,
  createdAt: true,
  leido: true,
});

// Ticket Select Schemas
export const selectTicketSchema = createSelectSchema(tickets);
export const selectMensajeTicketSchema = createSelectSchema(mensajesTicket);

// Ticket Types
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type InsertMensajeTicket = z.infer<typeof insertMensajeTicketSchema>;
export type MensajeTicket = typeof mensajesTicket.$inferSelect;

// Ticket Helper Types
export type TicketWithDetails = Ticket & {
  usuario?: User;
  servicioRelacionado?: Servicio;
  asignadoAUsuario?: User;
  mensajes?: MensajeTicketWithUsuario[];
  mensajeCount?: number;
  ultimoMensaje?: MensajeTicket;
};

export type MensajeTicketWithUsuario = MensajeTicket & {
  usuario?: User;
};

// ==================== END TICKET SYSTEM ====================

// Document Reminder Types
export const insertDocumentoRecordatorioSchema = createInsertSchema(documentoRecordatorios).omit({
  id: true,
  sentAt: true,
});

export const selectDocumentoRecordatorioSchema = createSelectSchema(documentoRecordatorios);

export type InsertDocumentoRecordatorio = z.infer<typeof insertDocumentoRecordatorioSchema>;
export type DocumentoRecordatorio = typeof documentoRecordatorios.$inferSelect;

// System Jobs Types
export const insertSystemJobSchema = createInsertSchema(systemJobs).omit({
  id: true,
  createdAt: true,
});

export const selectSystemJobSchema = createSelectSchema(systemJobs);

export type InsertSystemJob = z.infer<typeof insertSystemJobSchema>;
export type SystemJob = typeof systemJobs.$inferSelect;

// Helper types for document validation
export type DocumentoWithReminderStatus = Documento & {
  diasRestantes?: number;
  recordatoriosEnviados?: DocumentoRecordatorio[];
  conductor?: Conductor;
};
