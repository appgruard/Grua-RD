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
export const userTypeEnum = pgEnum("user_type", ["cliente", "conductor", "admin"]);
export const estadoCuentaEnum = pgEnum("estado_cuenta", [
  "pendiente_verificacion",
  "activo",
  "suspendido",
  "rechazado"
]);
export const estadoServicioEnum = pgEnum("estado_servicio", [
  "pendiente",
  "aceptado", 
  "en_progreso",
  "completado",
  "cancelado"
]);
export const metodoPagoEnum = pgEnum("metodo_pago", ["efectivo", "tarjeta"]);
export const documentoTipoEnum = pgEnum("documento_tipo", [
  "licencia",
  "matricula",
  "poliza",
  "seguro_grua",
  "foto_vehiculo",
  "foto_perfil",
  "cedula_frontal",
  "cedula_trasera"
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
  estado: documentoEstadoEnum("estado").default("pendiente").notNull(),
  validoHasta: timestamp("valido_hasta"),
  revisadoPor: varchar("revisado_por").references(() => users.id),
  motivoRechazo: text("motivo_rechazo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  fechaPagoOperador: timestamp("fecha_pago_operador"),
  fechaPagoEmpresa: timestamp("fecha_pago_empresa"),
  notas: text("notas"),
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
