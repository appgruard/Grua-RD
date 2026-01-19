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
  pgEnum,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userTypeEnum = pgEnum("user_type", ["cliente", "conductor", "admin", "aseguradora", "socio", "empresa"]);
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
export const metodoPagoEnum = pgEnum("metodo_pago", ["efectivo", "tarjeta", "aseguradora", "empresa"]);
export const tipoVehiculoEnum = pgEnum("tipo_vehiculo", ["carro", "motor", "jeep", "camion"]);

export const VALID_SERVICE_CATEGORIES = [
  "remolque_estandar",
  "remolque_motocicletas",
  "remolque_plataforma",
  "auxilio_vial",
  "remolque_especializado",
  "camiones_pesados",
  "vehiculos_pesados",
  "maquinarias",
  "izaje_construccion",
  "remolque_recreativo",
  "extraccion"
] as const;

export const servicioCategoriaEnum = pgEnum("servicio_categoria", [...VALID_SERVICE_CATEGORIES]);

export const servicioSubtipoEnum = pgEnum("servicio_subtipo", [
  // Auxilio Vial
  "cambio_goma",
  "inflado_neumatico",
  "paso_corriente",
  "cerrajero_automotriz",
  "suministro_combustible",
  "envio_bateria",
  "diagnostico_obd",
  "extraccion_vehiculo",
  // Remolque Especializado
  "vehiculo_sin_llanta",
  "vehiculo_sin_direccion",
  "vehiculo_chocado",
  "vehiculo_electrico",
  // Remolque Plataforma / Flatbed
  "vehiculo_lujo",
  "vehiculo_deportivo",
  "vehiculo_bajo",
  "vehiculo_modificado",
  "traslado_especial",
  "servicio_premium",
  // Remolque Motocicletas
  "moto_accidentada",
  "moto_no_prende",
  "scooter_pasola",
  "delivery_accidentado",
  "moto_alto_cilindraje",
  "traslado_local_moto",
  "reubicacion_moto",
  // Vehículos Pesados
  "camion_liviano",
  "camion_mediano",
  "camiones_cisternas",
  "de_carga",
  "patana_cabezote",
  "volteo",
  "transporte_maquinarias",
  "montacargas",
  // Maquinarias
  "retroexcavadora",
  "rodillo",
  "greda",
  "excavadora",
  "pala_mecanica",
  "tractor",
  // Izaje y Construcción
  "izaje_materiales",
  "subida_muebles",
  "transporte_equipos",
  // Remolque Recreativo
  "remolque_botes",
  "remolque_jetski",
  "remolque_cuatrimoto",
  // Extracción (servicios que requieren negociación)
  "extraccion_zanja",
  "extraccion_lodo",
  "extraccion_volcado",
  "extraccion_accidente",
  "extraccion_dificil"
]);

export const aseguradoraEstadoEnum = pgEnum("aseguradora_estado", ["pendiente", "aprobado", "rechazado"]);
export const documentoTipoEnum = pgEnum("documento_tipo", [
  "licencia",
  "licencia_trasera",
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

export const estadoNegociacionEnum = pgEnum("estado_negociacion", [
  "no_aplica",
  "pendiente_evaluacion",
  "propuesto",
  "confirmado",
  "aceptado",
  "rechazado",
  "cancelado"
]);

export const tipoMensajeChatEnum = pgEnum("tipo_mensaje_chat", [
  "texto",
  "imagen",
  "video",
  "monto_propuesto",
  "monto_confirmado",
  "monto_aceptado",
  "monto_rechazado",
  "sistema"
]);

// Cancelaciones Enums
export const nivelDemandaEnum = pgEnum("nivel_demanda", [
  "bajo",
  "medio",
  "alto",
  "critico"
]);

export const zonaTipoEnum = pgEnum("zona_tipo", [
  "urbana",
  "suburbana",
  "periferica",
  "rural"
]);

export const tipoCanceladorEnum = pgEnum("tipo_cancelador", [
  "cliente",
  "conductor"
]);

export const evaluacionPenalizacionEnum = pgEnum("evaluacion_penalizacion", [
  "ninguna",
  "leve",
  "moderada",
  "grave",
  "critica"
]);

// Users Table
// Note: email is not globally unique - users can have multiple accounts with different userTypes
// A composite unique constraint on (email, userType) prevents duplicate accounts of the same type
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  phone: text("phone"),
  cedula: text("cedula"),
  cedulaImageUrl: text("cedula_image_url"),
  cedulaVerificada: boolean("cedula_verificada").default(false).notNull(),
  passwordHash: text("password_hash").notNull(),
  userType: userTypeEnum("user_type").notNull().default("cliente"),
  estadoCuenta: estadoCuentaEnum("estado_cuenta").notNull().default("pendiente_verificacion"),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  fotoUrl: text("foto_url"),
  calificacionPromedio: decimal("calificacion_promedio", { precision: 3, scale: 2 }),
  telefonoVerificado: boolean("telefono_verificado").default(false).notNull(),
  emailVerificado: boolean("email_verificado").default(false).notNull(),
  fotoVerificada: boolean("foto_verificada").default(false).notNull(),
  fotoVerificadaScore: decimal("foto_verificada_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Cancelaciones fields (for clientes only)
  cancelacionesTotales: integer("cancelaciones_totales").default(0),
  cancelacionesUltimos7dias: integer("cancelaciones_ultimos_7_dias").default(0),
  cancelacionesUltimoMes: integer("cancelaciones_ultimo_mes").default(0),
  penalizacionesTotales: decimal("penalizaciones_totales", { precision: 12, scale: 2 }).default("0.00"),
  ultimaCancelacionTimestamp: timestamp("ultima_cancelacion_timestamp"),
}, (table) => ({
  emailUserTypeUnique: uniqueIndex("users_email_user_type_unique").on(table.email, table.userType),
}));

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
  balanceDisponible: decimal("balance_disponible", { precision: 12, scale: 2 }).default("0.00").notNull(),
  balancePendiente: decimal("balance_pendiente", { precision: 12, scale: 2 }).default("0.00").notNull(),
  licenciaCategoria: text("licencia_categoria"),
  licenciaRestricciones: text("licencia_restricciones"),
  licenciaCategoriaVerificada: boolean("licencia_categoria_verificada").default(false),
  licenciaFechaVencimiento: timestamp("licencia_fecha_vencimiento"),
  licenciaFrontalUrl: text("licencia_frontal_url"),
  licenciaTraseraUrl: text("licencia_trasera_url"),
  licenciaVerificada: boolean("licencia_verificada").default(false),
  categoriasConfiguradas: boolean("categorias_configuradas").default(false),
  vehiculosRegistrados: boolean("vehiculos_registrados").default(false),
  // Cancelaciones fields
  cancelacionesTotales: integer("cancelaciones_totales").default(0),
  cancelacionesUltimos7dias: integer("cancelaciones_ultimos_7_dias").default(0),
  cancelacionesUltimoMes: integer("cancelaciones_ultimo_mes").default(0),
  penalizacionesTotales: decimal("penalizaciones_totales", { precision: 12, scale: 2 }).default("0.00"),
  penalizacionesUltimas24h: decimal("penalizaciones_ultimas_24h", { precision: 12, scale: 2 }).default("0.00"),
  ultimaCancelacionTimestamp: timestamp("ultima_cancelacion_timestamp"),
});

// Conductor Service Categories Table (driver can offer multiple service categories)
export const conductorServicios = pgTable("conductor_servicios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorId: varchar("conductor_id").notNull().references(() => conductores.id, { onDelete: "cascade" }),
  categoriaServicio: servicioCategoriaEnum("categoria_servicio").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conductor Service Subtypes Table (driver can specify subtypes for each category)
export const conductorServicioSubtipos = pgTable("conductor_servicio_subtipos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorServicioId: varchar("conductor_servicio_id").notNull().references(() => conductorServicios.id, { onDelete: "cascade" }),
  subtipoServicio: servicioSubtipoEnum("subtipo_servicio").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conductor Vehicles Table (one vehicle per category per driver)
export const conductorVehiculos = pgTable("conductor_vehiculos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorId: varchar("conductor_id").notNull().references(() => conductores.id, { onDelete: "cascade" }),
  categoria: servicioCategoriaEnum("categoria").notNull(),
  fotoUrl: text("foto_url"),
  placa: text("placa").notNull(),
  color: text("color").notNull(),
  capacidad: text("capacidad"),
  marca: text("marca"),
  modelo: text("modelo"),
  anio: text("anio"),
  detalles: text("detalles"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  azulOrderId: text("azul_order_id"),
  azulPaymentStatus: text("azul_payment_status"),
  azulAuthorizationCode: text("azul_authorization_code"),
  azulDataVaultToken: text("azul_data_vault_token"),
  azulReferenceNumber: text("azul_reference_number"),
  tipoVehiculo: tipoVehiculoEnum("tipo_vehiculo"),
  servicioCategoria: servicioCategoriaEnum("servicio_categoria").default("remolque_estandar"),
  servicioSubtipo: servicioSubtipoEnum("servicio_subtipo"),
  aseguradoraNombre: text("aseguradora_nombre"),
  aseguradoraPoliza: text("aseguradora_poliza"),
  aseguradoraEstado: aseguradoraEstadoEnum("aseguradora_estado"),
  vehiculoId: varchar("vehiculo_id").references(() => conductorVehiculos.id),
  vehiculoPlaca: text("vehiculo_placa"),
  vehiculoColor: text("vehiculo_color"),
  vehiculoFotoUrl: text("vehiculo_foto_url"),
  vehiculoCapacidad: text("vehiculo_capacidad"),
  requiereNegociacion: boolean("requiere_negociacion").default(false).notNull(),
  estadoNegociacion: estadoNegociacionEnum("estado_negociacion").default("no_aplica"),
  montoNegociado: decimal("monto_negociado", { precision: 10, scale: 2 }),
  notasExtraccion: text("notas_extraccion"),
  descripcionSituacion: text("descripcion_situacion"),
  commissionProcessed: boolean("commission_processed").default(false).notNull(),
  destinoExtendidoLat: decimal("destino_extendido_lat", { precision: 10, scale: 7 }),
  destinoExtendidoLng: decimal("destino_extendido_lng", { precision: 10, scale: 7 }),
  destinoExtendidoDireccion: text("destino_extendido_direccion"),
  distanciaExtensionKm: decimal("distancia_extension_km", { precision: 5, scale: 2 }),
  extensionAprobada: boolean("extension_aprobada").default(false),
  fotoContexto1Url: text("foto_contexto_1_url"),
  fotoContexto2Url: text("foto_contexto_2_url"),
  fotoContexto3Url: text("foto_contexto_3_url"),
  notaCliente: text("nota_cliente"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  aceptadoAt: timestamp("aceptado_at"),
  conductorEnSitioAt: timestamp("conductor_en_sitio_at"),
  cargandoAt: timestamp("cargando_at"),
  iniciadoAt: timestamp("iniciado_at"),
  completadoAt: timestamp("completado_at"),
  canceladoAt: timestamp("cancelado_at"),
  // Cancelaciones fields
  zonaTipo: varchar("zona_tipo"),
  nivelDemandaEnCreacion: varchar("nivel_demanda_en_creacion"),
  horaCreacionEsPico: boolean("hora_creacion_es_pico").default(false),
});

// Dismissed Services Table (services rejected by drivers)
export const dismissedServices = pgTable("dismissed_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorId: varchar("conductor_id").notNull().references(() => conductores.id, { onDelete: "cascade" }),
  servicioId: varchar("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueConductorServicio: sql`CONSTRAINT unique_conductor_servicio UNIQUE (conductor_id, servicio_id)`,
}));

// Tarifas (Pricing) Table
export const tarifas = pgTable("tarifas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  servicioCategoria: servicioCategoriaEnum("servicio_categoria"),
  servicioSubtipo: servicioSubtipoEnum("servicio_subtipo"),
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
  tipoMensaje: tipoMensajeChatEnum("tipo_mensaje").default("texto").notNull(),
  montoAsociado: decimal("monto_asociado", { precision: 10, scale: 2 }),
  urlArchivo: text("url_archivo"),
  nombreArchivo: text("nombre_archivo"),
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
  verifikScanId: text("verifik_scan_id"),
  verifikScore: decimal("verifik_score", { precision: 4, scale: 3 }),
  verifikValidado: boolean("verifik_validado").default(false),
  verifikTipoValidacion: text("verifik_tipo_validacion"),
  verifikRespuesta: text("verifik_respuesta"),
  verifikFechaValidacion: timestamp("verifik_fecha_validacion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comisiones Table (for payment commissions 80/20)
export const comisiones = pgTable("comisiones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicioId: varchar("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  montoTotal: decimal("monto_total", { precision: 10, scale: 2 }).notNull(),
  montoOperador: decimal("monto_operador", { precision: 10, scale: 2 }).notNull(),
  montoEmpresa: decimal("monto_empresa", { precision: 10, scale: 2 }).notNull(),
  porcentajeOperador: decimal("porcentaje_operador", { precision: 5, scale: 2 }).default("80.00").notNull(),
  porcentajeEmpresa: decimal("porcentaje_empresa", { precision: 5, scale: 2 }).default("20.00").notNull(),
  estadoPagoOperador: estadoPagoEnum("estado_pago_operador").default("pendiente").notNull(),
  estadoPagoEmpresa: estadoPagoEnum("estado_pago_empresa").default("pendiente").notNull(),
  azulPayoutReference: text("azul_payout_reference"),
  azulPayoutStatus: text("azul_payout_status"),
  azulFeeAmount: decimal("azul_fee_amount", { precision: 12, scale: 2 }),
  azulFeeCurrency: varchar("azul_fee_currency", { length: 3 }).default("DOP"),
  azulNetAmount: decimal("azul_net_amount", { precision: 12, scale: 2 }),
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
  serviciosOfrecidos: many(conductorServicios),
  vehiculos: many(conductorVehiculos),
}));

export const conductorVehiculosRelations = relations(conductorVehiculos, ({ one }) => ({
  conductor: one(conductores, {
    fields: [conductorVehiculos.conductorId],
    references: [conductores.id],
  }),
}));

export const conductorServiciosRelations = relations(conductorServicios, ({ one, many }) => ({
  conductor: one(conductores, {
    fields: [conductorServicios.conductorId],
    references: [conductores.id],
  }),
  subtipos: many(conductorServicioSubtipos),
}));

export const conductorServicioSubtiposRelations = relations(conductorServicioSubtipos, ({ one }) => ({
  conductorServicio: one(conductorServicios, {
    fields: [conductorServicioSubtipos.conductorServicioId],
    references: [conductorServicios.id],
  }),
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
  vehiculo: one(conductorVehiculos, {
    fields: [servicios.vehiculoId],
    references: [conductorVehiculos.id],
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
  primerInicioSesion: boolean("primer_inicio_sesion").default(true).notNull(),
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

// ==================== EMPRESAS / CONTRATOS EMPRESARIALES (MODULE 6) ====================

// Empresa Type Enum
export const empresaTipoEnum = pgEnum("empresa_tipo", [
  "constructora",
  "ferreteria",
  "logistica",
  "turistica",
  "ayuntamiento",
  "zona_franca",
  "industria",
  "rent_car",
  "maquinaria_pesada",
  "otro"
]);

// Empresa Contract Type Enum
export const empresaContratoTipoEnum = pgEnum("empresa_contrato_tipo", [
  "por_hora",
  "por_dia",
  "por_mes",
  "por_servicio",
  "volumen"
]);

// Empresa Billing Status Enum
export const empresaFacturacionEstadoEnum = pgEnum("empresa_facturacion_estado", [
  "pendiente",
  "facturado",
  "pagado",
  "vencido"
]);

// Empresa Employee Role Enum
export const empresaRolEmpleadoEnum = pgEnum("empresa_rol_empleado", [
  "admin_empresa",
  "supervisor",
  "empleado"
]);

// Scheduled Service Status Enum
export const servicioProgramadoEstadoEnum = pgEnum("servicio_programado_estado", [
  "programado",
  "confirmado",
  "ejecutado",
  "cancelado"
]);

// Empresas (Companies) Table
export const empresas = pgTable("empresas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nombreEmpresa: text("nombre_empresa").notNull(),
  rnc: text("rnc").notNull().unique(),
  tipoEmpresa: empresaTipoEnum("tipo_empresa").notNull(),
  direccion: text("direccion"),
  telefono: text("telefono"),
  emailContacto: text("email_contacto"),
  personaContacto: text("persona_contacto"),
  logoUrl: text("logo_url"),
  limiteCredito: decimal("limite_credito", { precision: 12, scale: 2 }).default("0.00"),
  diasCredito: integer("dias_credito").default(30),
  descuentoVolumen: decimal("descuento_volumen", { precision: 5, scale: 2 }).default("0.00"),
  activo: boolean("activo").default(true).notNull(),
  verificado: boolean("verificado").default(false).notNull(),
  verificadoPor: varchar("verificado_por").references(() => users.id),
  fechaVerificacion: timestamp("fecha_verificacion"),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Empresa Empleados (Company Employees) Table
export const empresaEmpleados = pgTable("empresa_empleados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rol: empresaRolEmpleadoEnum("rol").default("empleado").notNull(),
  departamento: text("departamento"),
  puedeCrearServicios: boolean("puede_crear_servicios").default(true).notNull(),
  puedeProgramarServicios: boolean("puede_programar_servicios").default(true).notNull(),
  puedeVerFacturas: boolean("puede_ver_facturas").default(false).notNull(),
  puedeGestionarEmpleados: boolean("puede_gestionar_empleados").default(false).notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Empresa Contratos (Company Contracts) Table
export const empresaContratos = pgTable("empresa_contratos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  numeroContrato: text("numero_contrato").notNull().unique(),
  tipoContrato: empresaContratoTipoEnum("tipo_contrato").notNull(),
  fechaInicio: timestamp("fecha_inicio").notNull(),
  fechaFin: timestamp("fecha_fin"),
  horasContratadas: integer("horas_contratadas"),
  horasUtilizadas: integer("horas_utilizadas").default(0),
  serviciosContratados: integer("servicios_contratados"),
  serviciosUtilizados: integer("servicios_utilizados").default(0),
  tarifaHora: decimal("tarifa_hora", { precision: 10, scale: 2 }),
  tarifaDia: decimal("tarifa_dia", { precision: 10, scale: 2 }),
  tarifaServicio: decimal("tarifa_servicio", { precision: 10, scale: 2 }),
  descuentoPorcentaje: decimal("descuento_porcentaje", { precision: 5, scale: 2 }).default("0.00"),
  montoMensualMinimo: decimal("monto_mensual_minimo", { precision: 12, scale: 2 }),
  activo: boolean("activo").default(true).notNull(),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Empresa Tarifas Especiales (Special Pricing) Table
export const empresaTarifas = pgTable("empresa_tarifas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  servicioCategoria: servicioCategoriaEnum("servicio_categoria"),
  precioBase: decimal("precio_base", { precision: 10, scale: 2 }).notNull(),
  tarifaPorKm: decimal("tarifa_por_km", { precision: 10, scale: 2 }).notNull(),
  descuentoPorcentaje: decimal("descuento_porcentaje", { precision: 5, scale: 2 }).default("0.00"),
  minimoServicios: integer("minimo_servicios").default(1),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Empresa Proyectos (Company Projects/Works) Table
export const empresaProyectos = pgTable("empresa_proyectos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  nombreProyecto: text("nombre_proyecto").notNull(),
  codigo: text("codigo"),
  descripcion: text("descripcion"),
  ubicacionLat: decimal("ubicacion_lat", { precision: 10, scale: 7 }),
  ubicacionLng: decimal("ubicacion_lng", { precision: 10, scale: 7 }),
  direccion: text("direccion"),
  responsable: text("responsable"),
  telefonoResponsable: text("telefono_responsable"),
  fechaInicio: timestamp("fecha_inicio"),
  fechaFin: timestamp("fecha_fin"),
  presupuestoServicios: decimal("presupuesto_servicios", { precision: 12, scale: 2 }),
  gastoActual: decimal("gasto_actual", { precision: 12, scale: 2 }).default("0.00"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Empresa Conductores Asignados (Assigned Drivers) Table
export const empresaConductoresAsignados = pgTable("empresa_conductores_asignados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  conductorId: varchar("conductor_id").notNull().references(() => conductores.id, { onDelete: "cascade" }),
  esPrioridad: boolean("es_prioridad").default(false).notNull(),
  notas: text("notas"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Servicios Programados (Scheduled Services) Table
export const serviciosProgramados = pgTable("servicios_programados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  proyectoId: varchar("proyecto_id").references(() => empresaProyectos.id, { onDelete: "set null" }),
  contratoId: varchar("contrato_id").references(() => empresaContratos.id, { onDelete: "set null" }),
  solicitadoPor: varchar("solicitado_por").notNull().references(() => users.id),
  conductorAsignadoId: varchar("conductor_asignado_id").references(() => conductores.id, { onDelete: "set null" }),
  fechaProgramada: timestamp("fecha_programada").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFin: text("hora_fin"),
  origenLat: decimal("origen_lat", { precision: 10, scale: 7 }).notNull(),
  origenLng: decimal("origen_lng", { precision: 10, scale: 7 }).notNull(),
  origenDireccion: text("origen_direccion").notNull(),
  destinoLat: decimal("destino_lat", { precision: 10, scale: 7 }),
  destinoLng: decimal("destino_lng", { precision: 10, scale: 7 }),
  destinoDireccion: text("destino_direccion"),
  servicioCategoria: servicioCategoriaEnum("servicio_categoria").default("remolque_estandar"),
  servicioSubtipo: servicioSubtipoEnum("servicio_subtipo"),
  descripcion: text("descripcion"),
  estado: servicioProgramadoEstadoEnum("estado").default("programado").notNull(),
  servicioCreado: varchar("servicio_creado").references(() => servicios.id, { onDelete: "set null" }),
  recurrente: boolean("recurrente").default(false).notNull(),
  frecuenciaRecurrencia: text("frecuencia_recurrencia"),
  notasInternas: text("notas_internas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Empresa Facturas Mensuales (Monthly Invoices) Table
export const empresaFacturas = pgTable("empresa_facturas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  numeroFactura: text("numero_factura").notNull().unique(),
  periodo: text("periodo").notNull(),
  fechaEmision: timestamp("fecha_emision").defaultNow().notNull(),
  fechaVencimiento: timestamp("fecha_vencimiento").notNull(),
  totalServicios: integer("total_servicios").default(0).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  descuento: decimal("descuento", { precision: 12, scale: 2 }).default("0.00"),
  itbis: decimal("itbis", { precision: 12, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  estado: empresaFacturacionEstadoEnum("estado").default("pendiente").notNull(),
  fechaPago: timestamp("fecha_pago"),
  metodoPago: text("metodo_pago"),
  referenciaTransaccion: text("referencia_transaccion"),
  notas: text("notas"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Empresa Factura Items (Invoice Line Items) Table
export const empresaFacturaItems = pgTable("empresa_factura_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facturaId: varchar("factura_id").notNull().references(() => empresaFacturas.id, { onDelete: "cascade" }),
  servicioId: varchar("servicio_id").references(() => servicios.id, { onDelete: "set null" }),
  proyectoId: varchar("proyecto_id").references(() => empresaProyectos.id, { onDelete: "set null" }),
  descripcion: text("descripcion").notNull(),
  cantidad: integer("cantidad").default(1).notNull(),
  precioUnitario: decimal("precio_unitario", { precision: 10, scale: 2 }).notNull(),
  descuento: decimal("descuento", { precision: 10, scale: 2 }).default("0.00"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Empresas Relations
export const empresasRelations = relations(empresas, ({ one, many }) => ({
  user: one(users, {
    fields: [empresas.userId],
    references: [users.id],
  }),
  verificadoPorUsuario: one(users, {
    fields: [empresas.verificadoPor],
    references: [users.id],
  }),
  empleados: many(empresaEmpleados),
  contratos: many(empresaContratos),
  tarifas: many(empresaTarifas),
  proyectos: many(empresaProyectos),
  conductoresAsignados: many(empresaConductoresAsignados),
  serviciosProgramados: many(serviciosProgramados),
  facturas: many(empresaFacturas),
}));

export const empresaEmpleadosRelations = relations(empresaEmpleados, ({ one }) => ({
  empresa: one(empresas, {
    fields: [empresaEmpleados.empresaId],
    references: [empresas.id],
  }),
  user: one(users, {
    fields: [empresaEmpleados.userId],
    references: [users.id],
  }),
}));

export const empresaContratosRelations = relations(empresaContratos, ({ one, many }) => ({
  empresa: one(empresas, {
    fields: [empresaContratos.empresaId],
    references: [empresas.id],
  }),
  serviciosProgramados: many(serviciosProgramados),
}));

export const empresaTarifasRelations = relations(empresaTarifas, ({ one }) => ({
  empresa: one(empresas, {
    fields: [empresaTarifas.empresaId],
    references: [empresas.id],
  }),
}));

export const empresaProyectosRelations = relations(empresaProyectos, ({ one, many }) => ({
  empresa: one(empresas, {
    fields: [empresaProyectos.empresaId],
    references: [empresas.id],
  }),
  serviciosProgramados: many(serviciosProgramados),
  facturaItems: many(empresaFacturaItems),
}));

export const empresaConductoresAsignadosRelations = relations(empresaConductoresAsignados, ({ one }) => ({
  empresa: one(empresas, {
    fields: [empresaConductoresAsignados.empresaId],
    references: [empresas.id],
  }),
  conductor: one(conductores, {
    fields: [empresaConductoresAsignados.conductorId],
    references: [conductores.id],
  }),
}));

export const serviciosProgramadosRelations = relations(serviciosProgramados, ({ one }) => ({
  empresa: one(empresas, {
    fields: [serviciosProgramados.empresaId],
    references: [empresas.id],
  }),
  proyecto: one(empresaProyectos, {
    fields: [serviciosProgramados.proyectoId],
    references: [empresaProyectos.id],
  }),
  contrato: one(empresaContratos, {
    fields: [serviciosProgramados.contratoId],
    references: [empresaContratos.id],
  }),
  solicitadoPorUsuario: one(users, {
    fields: [serviciosProgramados.solicitadoPor],
    references: [users.id],
  }),
  conductorAsignado: one(conductores, {
    fields: [serviciosProgramados.conductorAsignadoId],
    references: [conductores.id],
  }),
  servicio: one(servicios, {
    fields: [serviciosProgramados.servicioCreado],
    references: [servicios.id],
  }),
}));

export const empresaFacturasRelations = relations(empresaFacturas, ({ one, many }) => ({
  empresa: one(empresas, {
    fields: [empresaFacturas.empresaId],
    references: [empresas.id],
  }),
  items: many(empresaFacturaItems),
}));

export const empresaFacturaItemsRelations = relations(empresaFacturaItems, ({ one }) => ({
  factura: one(empresaFacturas, {
    fields: [empresaFacturaItems.facturaId],
    references: [empresaFacturas.id],
  }),
  servicio: one(servicios, {
    fields: [empresaFacturaItems.servicioId],
    references: [servicios.id],
  }),
  proyecto: one(empresaProyectos, {
    fields: [empresaFacturaItems.proyectoId],
    references: [empresaProyectos.id],
  }),
}));

// ==================== END EMPRESAS / CONTRATOS EMPRESARIALES ====================

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

// ==================== CLIENT PAYMENT METHODS (Payment Gateway - Azul) ====================

// Client Payment Methods Table (card tokens for clients using Azul DataVault)
export const clientPaymentMethods = pgTable("client_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  azulDataVaultToken: text("azul_data_vault_token").notNull(),
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

// ==================== OPERATOR PAYMENT METHODS (Payment Gateway - Azul) ====================

// Operator Payment Methods Table (card tokens for operators using Azul DataVault)
export const operatorPaymentMethods = pgTable("operator_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorId: varchar("conductor_id").notNull().references(() => conductores.id, { onDelete: "cascade" }),
  azulDataVaultToken: text("azul_data_vault_token").notNull(),
  cardBrand: text("card_brand").notNull(),
  last4: text("last4").notNull(),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  cardholderName: text("cardholder_name"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Operator Payment Methods Relations
export const operatorPaymentMethodsRelations = relations(operatorPaymentMethods, ({ one }) => ({
  conductor: one(conductores, {
    fields: [operatorPaymentMethods.conductorId],
    references: [conductores.id],
  }),
}));

// ==================== END OPERATOR PAYMENT METHODS ====================

// ==================== OPERATOR BANK ACCOUNTS (Payment Gateway Payouts) ====================

// Estado de cuenta bancaria del operador
export const estadoCuentaBancariaEnum = pgEnum("estado_cuenta_bancaria", [
  "pendiente_verificacion",
  "verificada",
  "rechazada"
]);

// Operator Bank Accounts Table (for payouts)
export const operatorBankAccounts = pgTable("operator_bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorId: varchar("conductor_id").notNull().unique().references(() => conductores.id, { onDelete: "cascade" }),
  nombreTitular: text("nombre_titular").notNull(),
  cedula: text("cedula").notNull(),
  banco: text("banco").notNull(),
  tipoCuenta: text("tipo_cuenta").notNull(),
  numeroCuenta: text("numero_cuenta").notNull(),
  estado: estadoCuentaBancariaEnum("estado").default("pendiente_verificacion").notNull(),
  verificadoAt: timestamp("verificado_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tipo de retiro enum
export const tipoRetiroEnum = pgEnum("tipo_retiro", [
  "programado",
  "inmediato"
]);

// Operator Withdrawals Table (payout requests via Azul)
export const operatorWithdrawals = pgTable("operator_withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorId: varchar("conductor_id").notNull().references(() => conductores.id, { onDelete: "cascade" }),
  monto: decimal("monto", { precision: 12, scale: 2 }).notNull(),
  montoNeto: decimal("monto_neto", { precision: 12, scale: 2 }).notNull(),
  comision: decimal("comision", { precision: 12, scale: 2 }).default("0.00").notNull(),
  tipoRetiro: tipoRetiroEnum("tipo_retiro").default("programado").notNull(),
  estado: estadoPagoEnum("estado").default("pendiente").notNull(),
  azulPayoutReference: text("azul_payout_reference"),
  azulPayoutStatus: text("azul_payout_status"),
  errorMessage: text("error_message"),
  procesadoAt: timestamp("procesado_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Scheduled Payouts Table (for Monday/Friday automatic payouts)
export const scheduledPayouts = pgTable("scheduled_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fechaProgramada: timestamp("fecha_programada").notNull(),
  fechaProcesado: timestamp("fecha_procesado"),
  estado: estadoPagoEnum("estado").default("pendiente").notNull(),
  totalPagos: integer("total_pagos").default(0).notNull(),
  montoTotal: decimal("monto_total", { precision: 12, scale: 2 }).default("0.00").notNull(),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Scheduled Payout Items (individual payouts within a scheduled batch via Azul)
export const scheduledPayoutItems = pgTable("scheduled_payout_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduledPayoutId: varchar("scheduled_payout_id").notNull().references(() => scheduledPayouts.id, { onDelete: "cascade" }),
  conductorId: varchar("conductor_id").notNull().references(() => conductores.id, { onDelete: "cascade" }),
  monto: decimal("monto", { precision: 12, scale: 2 }).notNull(),
  estado: estadoPagoEnum("estado").default("pendiente").notNull(),
  azulPayoutReference: text("azul_payout_reference"),
  azulPayoutStatus: text("azul_payout_status"),
  errorMessage: text("error_message"),
  procesadoAt: timestamp("procesado_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Operator Bank Accounts Relations
export const operatorBankAccountsRelations = relations(operatorBankAccounts, ({ one }) => ({
  conductor: one(conductores, {
    fields: [operatorBankAccounts.conductorId],
    references: [conductores.id],
  }),
}));

// Operator Withdrawals Relations
export const operatorWithdrawalsRelations = relations(operatorWithdrawals, ({ one }) => ({
  conductor: one(conductores, {
    fields: [operatorWithdrawals.conductorId],
    references: [conductores.id],
  }),
}));

// Scheduled Payouts Relations
export const scheduledPayoutsRelations = relations(scheduledPayouts, ({ many }) => ({
  items: many(scheduledPayoutItems),
}));

// Scheduled Payout Items Relations
export const scheduledPayoutItemsRelations = relations(scheduledPayoutItems, ({ one }) => ({
  scheduledPayout: one(scheduledPayouts, {
    fields: [scheduledPayoutItems.scheduledPayoutId],
    references: [scheduledPayouts.id],
  }),
  conductor: one(conductores, {
    fields: [scheduledPayoutItems.conductorId],
    references: [conductores.id],
  }),
}));

// ==================== END OPERATOR BANK ACCOUNTS ====================

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
  fotoVerificada: true,
  fotoVerificadaScore: true,
  estadoCuenta: true,
});

export const insertConductorSchema = createInsertSchema(conductores, {
  licencia: z.string().optional().default(''),
  placaGrua: z.string().optional().default(''),
  marcaGrua: z.string().optional().default(''),
  modeloGrua: z.string().optional().default(''),
}).omit({
  id: true,
  disponible: true,
  ultimaUbicacionUpdate: true,
});

export const insertConductorServicioSchema = createInsertSchema(conductorServicios, {
  categoriaServicio: z.enum([
    "remolque_estandar",
    "remolque_motocicletas",
    "remolque_plataforma",
    "auxilio_vial",
    "remolque_especializado",
    "camiones_pesados",
    "vehiculos_pesados",
    "maquinarias",
    "izaje_construccion",
    "remolque_recreativo",
    "extraccion"
  ]),
}).omit({
  id: true,
  createdAt: true,
});

export const insertConductorServicioSubtipoSchema = createInsertSchema(conductorServicioSubtipos, {
  subtipoServicio: z.enum([
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
    "vehiculo_deportivo",
    "vehiculo_bajo",
    "vehiculo_modificado",
    "traslado_especial",
    "servicio_premium",
    "moto_accidentada",
    "moto_no_prende",
    "scooter_pasola",
    "delivery_accidentado",
    "moto_alto_cilindraje",
    "traslado_local_moto",
    "reubicacion_moto",
    "camion_liviano",
    "camion_mediano",
    "camiones_cisternas",
    "de_carga",
    "patana_cabezote",
    "volteo",
    "transporte_maquinarias",
    "montacargas",
    "retroexcavadora",
    "rodillo",
    "greda",
    "excavadora",
    "pala_mecanica",
    "tractor",
    "izaje_materiales",
    "subida_muebles",
    "transporte_equipos",
    "remolque_botes",
    "remolque_jetski",
    "remolque_cuatrimoto",
    "extraccion_zanja",
    "extraccion_lodo",
    "extraccion_volcado",
    "extraccion_accidente",
    "extraccion_dificil"
  ]),
}).omit({
  id: true,
  createdAt: true,
});

export const insertConductorVehiculoSchema = createInsertSchema(conductorVehiculos, {
  categoria: z.enum([
    "remolque_estandar",
    "remolque_motocicletas",
    "remolque_plataforma",
    "auxilio_vial",
    "remolque_especializado",
    "camiones_pesados",
    "vehiculos_pesados",
    "maquinarias",
    "izaje_construccion",
    "remolque_recreativo",
    "extraccion"
  ]),
  placa: z.string().min(1, "Placa es requerida"),
  color: z.string().min(1, "Color es requerido"),
  capacidad: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anio: z.string().optional(),
  detalles: z.string().optional(),
  fotoUrl: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  activo: true,
});

export const insertServicioSchema = createInsertSchema(servicios, {
  origenDireccion: z.string().min(1),
  destinoDireccion: z.string().min(1),
  tipoVehiculo: z.enum(["carro", "motor", "jeep", "camion"]).optional(),
  servicioCategoria: z.enum([
    "remolque_estandar",
    "remolque_motocicletas",
    "remolque_plataforma",
    "auxilio_vial",
    "remolque_especializado",
    "camiones_pesados",
    "vehiculos_pesados",
    "maquinarias",
    "izaje_construccion",
    "remolque_recreativo",
    "extraccion"
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
    "vehiculo_deportivo",
    "vehiculo_bajo",
    "vehiculo_modificado",
    "traslado_especial",
    "servicio_premium",
    "moto_accidentada",
    "moto_no_prende",
    "scooter_pasola",
    "delivery_accidentado",
    "moto_alto_cilindraje",
    "traslado_local_moto",
    "reubicacion_moto",
    "camion_liviano",
    "camion_mediano",
    "camiones_cisternas",
    "de_carga",
    "patana_cabezote",
    "volteo",
    "transporte_maquinarias",
    "montacargas",
    "retroexcavadora",
    "rodillo",
    "greda",
    "excavadora",
    "pala_mecanica",
    "tractor",
    "izaje_materiales",
    "subida_muebles",
    "transporte_equipos",
    "remolque_botes",
    "remolque_jetski",
    "remolque_cuatrimoto",
    "extraccion_zanja",
    "extraccion_lodo",
    "extraccion_volcado",
    "extraccion_accidente",
    "extraccion_dificil"
  ]).optional(),
  aseguradoraNombre: z.string().optional(),
  aseguradoraPoliza: z.string().optional(),
  aseguradoraEstado: z.enum(["pendiente", "aprobado", "rechazado"]).optional(),
  requiereNegociacion: z.boolean().optional(),
  estadoNegociacion: z.enum([
    "no_aplica",
    "pendiente_evaluacion",
    "propuesto",
    "confirmado",
    "aceptado",
    "rechazado",
    "cancelado"
  ]).optional(),
  montoNegociado: z.string().optional(),
  notasExtraccion: z.string().optional(),
  descripcionSituacion: z.string().optional(),
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
  servicioCategoria: z.enum([
    "remolque_estandar",
    "remolque_motocicletas",
    "remolque_plataforma",
    "auxilio_vial",
    "remolque_especializado",
    "camiones_pesados",
    "vehiculos_pesados",
    "maquinarias",
    "izaje_construccion",
    "remolque_recreativo",
    "extraccion"
  ]).optional().nullable(),
  servicioSubtipo: z.enum([
    "cambio_goma", "inflado_neumatico", "paso_corriente", "cerrajero_automotriz",
    "suministro_combustible", "envio_bateria", "diagnostico_obd", "extraccion_vehiculo",
    "vehiculo_sin_llanta", "vehiculo_sin_direccion", "vehiculo_chocado", "vehiculo_electrico",
    "vehiculo_lujo", "vehiculo_deportivo", "vehiculo_bajo", "vehiculo_modificado",
    "traslado_especial", "servicio_premium",
    "moto_accidentada", "moto_no_prende", "scooter_pasola", "delivery_accidentado",
    "moto_alto_cilindraje", "traslado_local_moto", "reubicacion_moto",
    "camion_liviano", "camion_mediano", "camiones_cisternas", "de_carga",
    "patana_cabezote", "volteo", "transporte_maquinarias", "montacargas",
    "retroexcavadora", "rodillo", "greda", "excavadora", "pala_mecanica", "tractor",
    "izaje_materiales", "subida_muebles", "transporte_equipos",
    "remolque_botes", "remolque_jetski", "remolque_cuatrimoto",
    "extraccion_zanja", "extraccion_lodo", "extraccion_volcado", "extraccion_accidente", "extraccion_dificil"
  ]).optional().nullable(),
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
  tipoMensaje: z.enum([
    "texto",
    "imagen",
    "video",
    "monto_propuesto",
    "monto_confirmado",
    "monto_aceptado",
    "monto_rechazado",
    "sistema"
  ]).optional(),
  montoAsociado: z.string().optional(),
  urlArchivo: z.string().optional(),
  nombreArchivo: z.string().optional(),
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
  azulDataVaultToken: z.string().min(1, "Token de Azul DataVault es requerido"),
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

export const insertOperatorPaymentMethodSchema = createInsertSchema(operatorPaymentMethods, {
  azulDataVaultToken: z.string().min(1, "Token de Azul DataVault es requerido"),
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

export const insertOperatorBankAccountSchema = createInsertSchema(operatorBankAccounts, {
  nombreTitular: z.string().min(1, "Nombre del titular es requerido"),
  cedula: z.string().regex(/^\d{11}$/, "Cédula debe tener 11 dígitos"),
  banco: z.string().min(1, "Banco es requerido"),
  tipoCuenta: z.enum(["ahorro", "corriente"], { errorMap: () => ({ message: "Tipo de cuenta debe ser ahorro o corriente" }) }),
  numeroCuenta: z.string().min(5, "Número de cuenta inválido"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  estado: true,
  verificadoAt: true,
});

export const insertOperatorWithdrawalSchema = createInsertSchema(operatorWithdrawals, {
  monto: z.string().refine((val) => parseFloat(val) >= 500, { message: "El monto mínimo de retiro es RD$500" }),
  montoNeto: z.string().min(1, "Monto neto es requerido"),
  comision: z.string().optional(),
  tipoRetiro: z.enum(["programado", "inmediato"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  estado: true,
  azulPayoutReference: true,
  azulPayoutStatus: true,
  errorMessage: true,
  procesadoAt: true,
});

export const insertScheduledPayoutSchema = createInsertSchema(scheduledPayouts, {
  fechaProgramada: z.date(),
}).omit({
  id: true,
  createdAt: true,
  fechaProcesado: true,
  estado: true,
  totalPagos: true,
  montoTotal: true,
});

export const insertScheduledPayoutItemSchema = createInsertSchema(scheduledPayoutItems, {
  monto: z.string().min(1, "Monto es requerido"),
}).omit({
  id: true,
  createdAt: true,
  estado: true,
  azulPayoutReference: true,
  azulPayoutStatus: true,
  errorMessage: true,
  procesadoAt: true,
});

// ==================== INSERT SCHEMAS: EMPRESAS / CONTRATOS EMPRESARIALES ====================

export const insertEmpresaSchema = createInsertSchema(empresas, {
  nombreEmpresa: z.string().min(1, "Nombre de empresa es requerido"),
  rnc: z.string().min(1, "RNC es requerido"),
  tipoEmpresa: z.enum([
    "constructora", "ferreteria", "logistica", "turistica",
    "ayuntamiento", "zona_franca", "industria", "rent_car",
    "maquinaria_pesada", "otro"
  ]),
  emailContacto: z.string().email("Email de contacto inválido").optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  activo: true,
  verificado: true,
  verificadoPor: true,
  fechaVerificacion: true,
});

export const insertEmpresaEmpleadoSchema = createInsertSchema(empresaEmpleados, {
  rol: z.enum(["admin_empresa", "supervisor", "empleado"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  activo: true,
});

export const insertEmpresaContratoSchema = createInsertSchema(empresaContratos, {
  numeroContrato: z.string().min(1, "Número de contrato es requerido"),
  tipoContrato: z.enum(["por_hora", "por_dia", "por_mes", "por_servicio", "volumen"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  activo: true,
  horasUtilizadas: true,
  serviciosUtilizados: true,
});

export const insertEmpresaTarifaSchema = createInsertSchema(empresaTarifas, {
  precioBase: z.string().min(1, "Precio base es requerido"),
  tarifaPorKm: z.string().min(1, "Tarifa por km es requerida"),
  servicioCategoria: z.enum([
    "remolque_estandar", "auxilio_vial", "remolque_especializado",
    "vehiculos_pesados", "maquinarias", "izaje_construccion", "remolque_recreativo"
  ]).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  activo: true,
});

export const insertEmpresaProyectoSchema = createInsertSchema(empresaProyectos, {
  nombreProyecto: z.string().min(1, "Nombre del proyecto es requerido"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  activo: true,
  gastoActual: true,
});

export const insertEmpresaConductorAsignadoSchema = createInsertSchema(empresaConductoresAsignados).omit({
  id: true,
  createdAt: true,
  activo: true,
});

export const insertServicioProgramadoSchema = createInsertSchema(serviciosProgramados, {
  origenDireccion: z.string().min(1, "Dirección de origen es requerida"),
  horaInicio: z.string().min(1, "Hora de inicio es requerida"),
  servicioCategoria: z.enum([
    "remolque_estandar", "auxilio_vial", "remolque_especializado",
    "vehiculos_pesados", "maquinarias", "izaje_construccion", "remolque_recreativo"
  ]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  estado: true,
  servicioCreado: true,
});

export const insertEmpresaFacturaSchema = createInsertSchema(empresaFacturas, {
  numeroFactura: z.string().min(1, "Número de factura es requerido"),
  periodo: z.string().regex(/^\d{4}-\d{2}$/, "Formato de período inválido (YYYY-MM)"),
  subtotal: z.string().min(1, "Subtotal es requerido"),
  total: z.string().min(1, "Total es requerido"),
}).omit({
  id: true,
  createdAt: true,
  estado: true,
  fechaEmision: true,
  fechaPago: true,
});

export const insertEmpresaFacturaItemSchema = createInsertSchema(empresaFacturaItems, {
  descripcion: z.string().min(1, "Descripción es requerida"),
  precioUnitario: z.string().min(1, "Precio unitario es requerido"),
  subtotal: z.string().min(1, "Subtotal es requerido"),
}).omit({
  id: true,
  createdAt: true,
});

// ==================== END INSERT SCHEMAS: EMPRESAS / CONTRATOS EMPRESARIALES ====================

// Select Schemas
export const selectUserSchema = createSelectSchema(users);
export const selectConductorSchema = createSelectSchema(conductores);
export const selectConductorServicioSchema = createSelectSchema(conductorServicios);
export const selectConductorServicioSubtipoSchema = createSelectSchema(conductorServicioSubtipos);
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
export const selectOperatorPaymentMethodSchema = createSelectSchema(operatorPaymentMethods);
export const selectOperatorBankAccountSchema = createSelectSchema(operatorBankAccounts);
export const selectOperatorWithdrawalSchema = createSelectSchema(operatorWithdrawals);
export const selectScheduledPayoutSchema = createSelectSchema(scheduledPayouts);
export const selectScheduledPayoutItemSchema = createSelectSchema(scheduledPayoutItems);

// Select Schemas: Empresas / Contratos Empresariales
export const selectEmpresaSchema = createSelectSchema(empresas);
export const selectEmpresaEmpleadoSchema = createSelectSchema(empresaEmpleados);
export const selectEmpresaContratoSchema = createSelectSchema(empresaContratos);
export const selectEmpresaTarifaSchema = createSelectSchema(empresaTarifas);
export const selectEmpresaProyectoSchema = createSelectSchema(empresaProyectos);
export const selectEmpresaConductorAsignadoSchema = createSelectSchema(empresaConductoresAsignados);
export const selectServicioProgramadoSchema = createSelectSchema(serviciosProgramados);
export const selectEmpresaFacturaSchema = createSelectSchema(empresaFacturas);
export const selectEmpresaFacturaItemSchema = createSelectSchema(empresaFacturaItems);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConductor = z.infer<typeof insertConductorSchema>;
export type Conductor = typeof conductores.$inferSelect;

export type InsertConductorServicio = z.infer<typeof insertConductorServicioSchema>;
export type ConductorServicio = typeof conductorServicios.$inferSelect;

export type InsertConductorServicioSubtipo = z.infer<typeof insertConductorServicioSubtipoSchema>;
export type ConductorServicioSubtipo = typeof conductorServicioSubtipos.$inferSelect;

export type InsertConductorVehiculo = z.infer<typeof insertConductorVehiculoSchema>;
export type ConductorVehiculo = typeof conductorVehiculos.$inferSelect;

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

export type InsertOperatorPaymentMethod = z.infer<typeof insertOperatorPaymentMethodSchema>;
export type OperatorPaymentMethod = typeof operatorPaymentMethods.$inferSelect;

export type InsertOperatorBankAccount = z.infer<typeof insertOperatorBankAccountSchema>;
export type OperatorBankAccount = typeof operatorBankAccounts.$inferSelect;

export type InsertOperatorWithdrawal = z.infer<typeof insertOperatorWithdrawalSchema>;
export type OperatorWithdrawal = typeof operatorWithdrawals.$inferSelect;

export type InsertScheduledPayout = z.infer<typeof insertScheduledPayoutSchema>;
export type ScheduledPayout = typeof scheduledPayouts.$inferSelect;

export type InsertScheduledPayoutItem = z.infer<typeof insertScheduledPayoutItemSchema>;
export type ScheduledPayoutItem = typeof scheduledPayoutItems.$inferSelect;

// Helper types for API responses
export type UserWithConductor = User & {
  conductor?: Conductor;
};

export type ServicioWithDetails = Servicio & {
  cliente?: User;
  conductor?: User;
  calificacion?: Calificacion;
  vehiculo?: ConductorVehiculo;
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

// ==================== TYPES: EMPRESAS / CONTRATOS EMPRESARIALES ====================

export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresas.$inferSelect;

export type InsertEmpresaEmpleado = z.infer<typeof insertEmpresaEmpleadoSchema>;
export type EmpresaEmpleado = typeof empresaEmpleados.$inferSelect;

export type InsertEmpresaContrato = z.infer<typeof insertEmpresaContratoSchema>;
export type EmpresaContrato = typeof empresaContratos.$inferSelect;

export type InsertEmpresaTarifa = z.infer<typeof insertEmpresaTarifaSchema>;
export type EmpresaTarifa = typeof empresaTarifas.$inferSelect;

export type InsertEmpresaProyecto = z.infer<typeof insertEmpresaProyectoSchema>;
export type EmpresaProyecto = typeof empresaProyectos.$inferSelect;

export type InsertEmpresaConductorAsignado = z.infer<typeof insertEmpresaConductorAsignadoSchema>;
export type EmpresaConductorAsignado = typeof empresaConductoresAsignados.$inferSelect;

export type InsertServicioProgramado = z.infer<typeof insertServicioProgramadoSchema>;
export type ServicioProgramado = typeof serviciosProgramados.$inferSelect;

export type InsertEmpresaFactura = z.infer<typeof insertEmpresaFacturaSchema>;
export type EmpresaFactura = typeof empresaFacturas.$inferSelect;

export type InsertEmpresaFacturaItem = z.infer<typeof insertEmpresaFacturaItemSchema>;
export type EmpresaFacturaItem = typeof empresaFacturaItems.$inferSelect;

// Helper types for Empresas API responses
export type EmpresaWithDetails = Empresa & {
  user?: User;
  verificadoPorUsuario?: User;
  empleados?: EmpresaEmpleadoWithUser[];
  contratos?: EmpresaContrato[];
  tarifas?: EmpresaTarifa[];
  proyectos?: EmpresaProyecto[];
  conductoresAsignados?: EmpresaConductorAsignadoWithDetails[];
  facturas?: EmpresaFactura[];
};

export type EmpresaEmpleadoWithUser = EmpresaEmpleado & {
  user?: User;
  empresa?: Empresa;
};

export type EmpresaConductorAsignadoWithDetails = EmpresaConductorAsignado & {
  conductor?: Conductor & { user?: User };
  empresa?: Empresa;
};

export type ServicioProgramadoWithDetails = ServicioProgramado & {
  empresa?: Empresa;
  proyecto?: EmpresaProyecto;
  contrato?: EmpresaContrato;
  solicitadoPorUsuario?: User;
  conductorAsignado?: Conductor & { user?: User };
  servicio?: Servicio;
};

export type EmpresaFacturaWithItems = EmpresaFactura & {
  empresa?: Empresa;
  items?: EmpresaFacturaItemWithDetails[];
};

export type EmpresaFacturaItemWithDetails = EmpresaFacturaItem & {
  servicio?: Servicio;
  proyecto?: EmpresaProyecto;
};

export type EmpresaProyectoWithDetails = EmpresaProyecto & {
  empresa?: Empresa;
  serviciosProgramados?: ServicioProgramado[];
  serviciosCompletados?: number;
  gastoTotal?: number;
};

export type EmpresaContratoWithDetails = EmpresaContrato & {
  empresa?: Empresa;
  serviciosProgramados?: ServicioProgramado[];
  porcentajeUtilizado?: number;
};

// ==================== END TYPES: EMPRESAS / CONTRATOS EMPRESARIALES ====================

// ==================== OPERATOR WALLET SYSTEM ====================

// Enum for wallet transaction types
export const tipoTransaccionBilleteraEnum = pgEnum("tipo_transaccion_billetera", [
  "cash_commission",      // Comisión generada por pago en efectivo (deuda)
  "card_payment",         // Pago del cliente con tarjeta (ganancia)
  "debt_payment",         // Pago automático de deuda desde servicio con tarjeta
  "direct_payment",       // Pago directo de deuda con tarjeta del operador
  "withdrawal",           // Retiro de fondos
  "adjustment",           // Ajuste manual por admin
  "manual_payout"         // Pago manual a operador (transferencia bancaria, etc.)
]);

// Enum for debt status
export const estadoDeudaEnum = pgEnum("estado_deuda", [
  "pending",              // Deuda pendiente de pago
  "partial",              // Parcialmente pagada
  "paid",                 // Completamente pagada
  "overdue"               // Vencida (pasaron 15 días)
]);

// Operator Wallets Table
export const operatorWallets = pgTable("operator_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorId: varchar("conductor_id").notNull().unique().references(() => conductores.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalDebt: decimal("total_debt", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalCashEarnings: decimal("total_cash_earnings", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalCardEarnings: decimal("total_card_earnings", { precision: 12, scale: 2 }).default("0.00").notNull(),
  cashServicesBlocked: boolean("cash_services_blocked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet Transactions Table (using Azul payment gateway)
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => operatorWallets.id, { onDelete: "cascade" }),
  servicioId: varchar("servicio_id").references(() => servicios.id, { onDelete: "set null" }),
  type: tipoTransaccionBilleteraEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }),
  paymentIntentId: text("payment_intent_id"),
  azulTransactionId: text("azul_transaction_id"),
  azulOrderId: text("azul_order_id"),
  azulAuthorizationCode: text("azul_authorization_code"),
  azulReferenceNumber: text("azul_reference_number"),
  azulFeeAmount: decimal("azul_fee_amount", { precision: 12, scale: 2 }),
  description: text("description"),
  recordedByAdminId: varchar("recorded_by_admin_id").references(() => users.id, { onDelete: "set null" }),
  evidenceUrl: text("evidence_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Operator Debts Table
export const operatorDebts = pgTable("operator_debts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => operatorWallets.id, { onDelete: "cascade" }),
  servicioId: varchar("servicio_id").references(() => servicios.id, { onDelete: "set null" }),
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }).notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: estadoDeudaEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

// Operator Wallet Relations
export const operatorWalletsRelations = relations(operatorWallets, ({ one, many }) => ({
  conductor: one(conductores, {
    fields: [operatorWallets.conductorId],
    references: [conductores.id],
  }),
  transactions: many(walletTransactions),
  debts: many(operatorDebts),
}));

// Wallet Transactions Relations
export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(operatorWallets, {
    fields: [walletTransactions.walletId],
    references: [operatorWallets.id],
  }),
  servicio: one(servicios, {
    fields: [walletTransactions.servicioId],
    references: [servicios.id],
  }),
  recordedByAdmin: one(users, {
    fields: [walletTransactions.recordedByAdminId],
    references: [users.id],
  }),
}));

// Operator Debts Relations
export const operatorDebtsRelations = relations(operatorDebts, ({ one }) => ({
  wallet: one(operatorWallets, {
    fields: [operatorDebts.walletId],
    references: [operatorWallets.id],
  }),
  servicio: one(servicios, {
    fields: [operatorDebts.servicioId],
    references: [servicios.id],
  }),
}));

// ==================== END OPERATOR WALLET SYSTEM ====================

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
  autoCreated: boolean("auto_created").default(false).notNull(),
  errorFingerprint: text("error_fingerprint"),
  sourceComponent: text("source_component"),
  jiraIssueId: text("jira_issue_id"),
  jiraIssueKey: text("jira_issue_key"),
  jiraSyncedAt: timestamp("jira_synced_at"),
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

// ==================== SYSTEM ERROR TRACKING ====================

// Error severity enum
export const errorSeverityEnum = pgEnum("error_severity", [
  "low",
  "medium", 
  "high",
  "critical"
]);

// Error source enum - where the error originated
export const errorSourceEnum = pgEnum("error_source", [
  "database",
  "external_api",
  "internal_service",
  "authentication",
  "payment",
  "file_storage",
  "websocket",
  "email",
  "sms",
  "unknown"
]);

// Error type enum - classification of error
export const errorTypeEnum = pgEnum("error_type", [
  "connection_error",
  "timeout_error",
  "validation_error",
  "permission_error",
  "not_found_error",
  "rate_limit_error",
  "configuration_error",
  "integration_error",
  "system_error",
  "unknown_error"
]);

// System Errors Table (for tracking and deduplication)
export const systemErrors = pgTable("system_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fingerprint: text("fingerprint").notNull(),
  errorType: errorTypeEnum("error_type").notNull(),
  errorSource: errorSourceEnum("error_source").notNull(),
  severity: errorSeverityEnum("severity").notNull(),
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  route: text("route"),
  method: text("method"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  metadata: text("metadata"),
  occurrenceCount: integer("occurrence_count").default(1).notNull(),
  firstOccurrence: timestamp("first_occurrence").defaultNow().notNull(),
  lastOccurrence: timestamp("last_occurrence").defaultNow().notNull(),
  ticketId: varchar("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: "set null" }),
  calculatedPriority: text("calculated_priority"),
  priorityScore: integer("priority_score"),
  groupKey: text("group_key"),
  isTransient: boolean("is_transient").default(false),
});

// System Errors Relations
export const systemErrorsRelations = relations(systemErrors, ({ one }) => ({
  user: one(users, {
    fields: [systemErrors.userId],
    references: [users.id],
  }),
  ticket: one(tickets, {
    fields: [systemErrors.ticketId],
    references: [tickets.id],
  }),
  resolvedByUser: one(users, {
    fields: [systemErrors.resolvedBy],
    references: [users.id],
  }),
}));

// System Error Insert Schema
export const insertSystemErrorSchema = createInsertSchema(systemErrors, {
  fingerprint: z.string().min(1),
  message: z.string().min(1),
  errorType: z.enum(["connection_error", "timeout_error", "validation_error", "permission_error", "not_found_error", "rate_limit_error", "configuration_error", "integration_error", "system_error", "unknown_error"]),
  errorSource: z.enum(["database", "external_api", "internal_service", "authentication", "payment", "file_storage", "websocket", "email", "sms", "unknown"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  calculatedPriority: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  priorityScore: z.number().optional(),
  groupKey: z.string().optional(),
  isTransient: z.boolean().optional(),
}).omit({
  id: true,
  occurrenceCount: true,
  firstOccurrence: true,
  lastOccurrence: true,
  resolved: true,
  resolvedAt: true,
  resolvedBy: true,
});

// System Error Select Schema
export const selectSystemErrorSchema = createSelectSchema(systemErrors);

// System Error Types
export type InsertSystemError = z.infer<typeof insertSystemErrorSchema>;
export type SystemError = typeof systemErrors.$inferSelect;

// System Error Helper Types
export type SystemErrorWithDetails = SystemError & {
  user?: User;
  ticket?: Ticket;
  resolvedByUser?: User;
};

// ==================== END SYSTEM ERROR TRACKING ====================

// ==================== OPERATOR WALLET INSERT SCHEMAS & TYPES ====================

// Insert Schemas for Wallet System
export const insertOperatorWalletSchema = createInsertSchema(operatorWallets, {
  balance: z.string().optional(),
  totalDebt: z.string().optional(),
  totalCashEarnings: z.string().optional(),
  totalCardEarnings: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  cashServicesBlocked: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions, {
  type: z.enum([
    "cash_commission",
    "card_payment",
    "debt_payment",
    "direct_payment",
    "withdrawal",
    "adjustment",
    "manual_payout"
  ]),
  amount: z.string().min(1, "Monto es requerido"),
  commissionAmount: z.string().optional(),
  description: z.string().optional(),
  paymentIntentId: z.string().optional(),
  azulTransactionId: z.string().optional(),
  azulOrderId: z.string().optional(),
  azulAuthorizationCode: z.string().optional(),
  azulReferenceNumber: z.string().optional(),
  azulFeeAmount: z.string().optional(),
  recordedByAdminId: z.string().optional(),
  evidenceUrl: z.string().optional(),
  notes: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertOperatorDebtSchema = createInsertSchema(operatorDebts, {
  originalAmount: z.string().min(1, "Monto original es requerido"),
  remainingAmount: z.string().min(1, "Monto restante es requerido"),
  status: z.enum(["pending", "partial", "paid", "overdue"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

// Select Schemas
export const selectOperatorWalletSchema = createSelectSchema(operatorWallets);
export const selectWalletTransactionSchema = createSelectSchema(walletTransactions);
export const selectOperatorDebtSchema = createSelectSchema(operatorDebts);

// Types
export type InsertOperatorWallet = z.infer<typeof insertOperatorWalletSchema>;
export type OperatorWallet = typeof operatorWallets.$inferSelect;

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export type InsertOperatorDebt = z.infer<typeof insertOperatorDebtSchema>;
export type OperatorDebt = typeof operatorDebts.$inferSelect;

// Helper Types for Wallet System
export type WalletWithDetails = OperatorWallet & {
  conductor?: Conductor;
  pendingDebts?: OperatorDebtWithDaysRemaining[];
  recentTransactions?: WalletTransaction[];
};

export type OperatorDebtWithDaysRemaining = OperatorDebt & {
  daysRemaining: number;
  servicio?: Servicio;
};

export type WalletTransactionWithService = WalletTransaction & {
  servicio?: Servicio;
};

export type WalletTransactionWithDetails = WalletTransaction & {
  servicio?: Servicio;
  recordedByAdmin?: User;
};

export type OperatorStatementSummary = {
  operatorId: string;
  operatorName: string;
  operatorEmail?: string;
  walletId: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: string;
  currentBalance: string;
  totalDebt: string;
  totalCredits: string;
  totalDebits: string;
  transactions: WalletTransactionWithDetails[];
  pendingDebts: OperatorDebtWithDaysRemaining[];
  completedServices: number;
  manualPayouts: WalletTransactionWithDetails[];
  bankAccount?: {
    id: string;
    banco: string;
    tipoCuenta: string;
    numeroCuenta: string;
    nombreTitular: string;
    cedula: string;
    estado: string;
    last4: string;
  } | null;
};

// ==================== END OPERATOR WALLET TYPES ====================

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

// ==================== CANCELACIONES (SERVICE CANCELLATION SYSTEM) ====================

// Razones de Cancelación Table
export const razonesCancelacion = pgTable("razones_cancelacion", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codigo: varchar("codigo").notNull().unique(),
  descripcion: text("descripcion").notNull(),
  aplicaA: text("aplica_a").$type<"cliente" | "conductor" | "ambos">().default("ambos"),
  penalizacionPredeterminada: boolean("penalizacion_predeterminada").default(true),
  activa: boolean("activa").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zonas de Demanda Table (for real-time demand calculation)
export const zonasDemanada = pgTable("zonas_demanda", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codigoZona: varchar("codigo_zona").notNull().unique(),
  nombreZona: varchar("nombre_zona"),
  tipoZona: zonaTipoEnum("tipo_zona"),
  latCentro: decimal("lat_centro", { precision: 10, scale: 7 }),
  lngCentro: decimal("lng_centro", { precision: 10, scale: 7 }),
  radioKm: decimal("radio_km", { precision: 6, scale: 2 }),
  // Real-time demand metrics
  serviciosActivosSinConductor: integer("servicios_activos_sin_conductor").default(0),
  serviciosActivosTotales: integer("servicios_activos_totales").default(0),
  conductoresDisponibles: integer("conductores_disponibles").default(0),
  nivelDemandaActual: nivelDemandaEnum("nivel_demanda_actual").default("bajo"),
  porcentajeDemanda: decimal("porcentaje_demanda", { precision: 5, scale: 2 }).default("0.00"),
  ultimoUpdateAt: timestamp("ultimo_update_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cancelaciones Servicios Table (main cancellation record)
export const cancelacionesServicios = pgTable("cancelaciones_servicios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicioId: varchar("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  canceladoPorId: varchar("cancelado_por_id").notNull().references(() => users.id),
  tipoCancelador: tipoCanceladorEnum("tipo_cancelador").notNull(),
  estadoAnterior: varchar("estado_anterior").notNull(),
  
  // Cancelation info
  motivoCancelacion: text("motivo_cancelacion"),
  razonCodigo: varchar("razon_codigo").references(() => razonesCancelacion.codigo),
  notasUsuario: text("notas_usuario"),
  justificacionTexto: text("justificacion_texto"),
  
  // Calculation data
  distanciaRecorridaKm: decimal("distancia_recorrida_km", { precision: 6, scale: 2 }),
  distanciaTotalServicioKm: decimal("distancia_total_servicio_km", { precision: 6, scale: 2 }),
  tiempoDesdeAceptacionSegundos: integer("tiempo_desde_aceptacion_segundos"),
  tiempoDesdellegadaSegundos: integer("tiempo_desde_llegada_segundos"),
  tiempoEsperaReal: integer("tiempo_espera_real"),
  etaOriginal: integer("eta_original"),
  
  // Context factors
  nivelDemanda: nivelDemandaEnum("nivel_demanda"),
  esHoraPico: boolean("es_hora_pico").default(false),
  zonaTipo: zonaTipoEnum("zona_tipo"),
  totalCancelacionesUsuario: integer("total_cancelaciones_usuario").default(0),
  tipoServicioEspecializado: boolean("tipo_servicio_especializado").default(false),
  
  // Multipliers applied
  multiplicadorDemanda: decimal("multiplicador_demanda", { precision: 3, scale: 2 }).default("1.00"),
  multiplicadorHora: decimal("multiplicador_hora", { precision: 3, scale: 2 }).default("1.00"),
  multiplicadorReincidencia: decimal("multiplicador_reincidencia", { precision: 3, scale: 2 }).default("1.00"),
  
  // Penalty and refund
  penalizacionBase: decimal("penalizacion_base", { precision: 10, scale: 2 }),
  penalizacionAplicada: decimal("penalizacion_aplicada", { precision: 10, scale: 2 }).default("0.00"),
  montoTotalServicio: decimal("monto_total_servicio", { precision: 10, scale: 2 }),
  reembolsoMonto: decimal("reembolso_monto", { precision: 10, scale: 2 }).default("0.00"),
  cambioRating: decimal("cambio_rating", { precision: 3, scale: 2 }),
  
  // Processing status
  reembolsoProcesado: boolean("reembolso_procesado").default(false),
  penalizacionProcesada: boolean("penalizacion_procesada").default(false),
  
  // Admin review
  evaluacionPenalizacion: evaluacionPenalizacionEnum("evaluacion_penalizacion"),
  notasAdmin: text("notas_admin"),
  revisadoPor: varchar("revisado_por").references(() => users.id),
  fechaRevision: timestamp("fecha_revision"),
  penalizacionAjustadaPorAdmin: decimal("penalizacion_ajustada_por_admin", { precision: 10, scale: 2 }),
  razonAjuste: text("razon_ajuste"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Razones Cancelación Relations
export const razonesCancelacionRelations = relations(razonesCancelacion, ({ many }) => ({
  cancelaciones: many(cancelacionesServicios),
}));

// Zonas Demanda Relations
export const zonasDemanadaRelations = relations(zonasDemanada, ({ many }) => ({
  cancelaciones: many(cancelacionesServicios),
}));

// Cancelaciones Servicios Relations
export const cancelacionesServiciosRelations = relations(cancelacionesServicios, ({ one }) => ({
  servicio: one(servicios, {
    fields: [cancelacionesServicios.servicioId],
    references: [servicios.id],
  }),
  canceladoPor: one(users, {
    fields: [cancelacionesServicios.canceladoPorId],
    references: [users.id],
  }),
  razonCancelacion: one(razonesCancelacion, {
    fields: [cancelacionesServicios.razonCodigo],
    references: [razonesCancelacion.codigo],
  }),
  revisadoPorUsuario: one(users, {
    fields: [cancelacionesServicios.revisadoPor],
    references: [users.id],
  }),
}));

// Schemas for Razones Cancelación
export const insertRazonCancelacionSchema = createInsertSchema(razonesCancelacion).omit({
  id: true,
  createdAt: true,
});
export const selectRazonCancelacionSchema = createSelectSchema(razonesCancelacion);
export type InsertRazonCancelacion = z.infer<typeof insertRazonCancelacionSchema>;
export type RazonCancelacion = typeof razonesCancelacion.$inferSelect;

// Schemas for Zonas Demanda
export const insertZonaDemandaSchema = createInsertSchema(zonasDemanada).omit({
  id: true,
  ultimoUpdateAt: true,
  updatedAt: true,
});
export const selectZonaDemandaSchema = createSelectSchema(zonasDemanada);
export type InsertZonaDemanda = z.infer<typeof insertZonaDemandaSchema>;
export type ZonaDemanda = typeof zonasDemanada.$inferSelect;

// Schemas for Cancelaciones Servicios
export const insertCancelacionServicioSchema = createInsertSchema(cancelacionesServicios, {
  penalizacionBase: z.number().positive().optional(),
  penalizacionAplicada: z.number().nonnegative().default(0),
  reembolsoMonto: z.number().nonnegative().default(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCancelacionServicioSchema = createSelectSchema(cancelacionesServicios);
export type InsertCancelacionServicio = z.infer<typeof insertCancelacionServicioSchema>;
export type CancelacionServicio = typeof cancelacionesServicios.$inferSelect;

// Helper types
export type CancelacionServicioWithDetails = CancelacionServicio & {
  servicio?: Servicio;
  canceladoPor?: User;
  razonCancelacion?: RazonCancelacion;
  revisadoPorUsuario?: User;
};

// ==================== ADMINISTRADORES (ADMIN USERS WITH PERMISSIONS) ====================

// Admin modules/permissions enum
export const ADMIN_PERMISOS = [
  "dashboard",
  "analytics",
  "usuarios",
  "operadores",
  "billeteras",
  "comisiones_pago",
  "servicios",
  "tarifas",
  "monitoreo",
  "verificaciones",
  "documentos",
  "tickets",
  "socios",
  "aseguradoras",
  "empresas",
  "configuracion",
  "admin_usuarios"
] as const;

export type AdminPermiso = typeof ADMIN_PERMISOS[number];

// Administradores Table
export const administradores = pgTable("administradores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permisos: text("permisos").array().notNull(),
  activo: boolean("activo").default(true).notNull(),
  primerInicioSesion: boolean("primer_inicio_sesion").default(true).notNull(),
  creadoPor: varchar("creado_por").references(() => users.id),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Administradores Relations
export const administradoresRelations = relations(administradores, ({ one }) => ({
  user: one(users, {
    fields: [administradores.userId],
    references: [users.id],
  }),
  creadoPorUsuario: one(users, {
    fields: [administradores.creadoPor],
    references: [users.id],
  }),
}));

// Administradores Insert Schema
export const insertAdministradorSchema = createInsertSchema(administradores, {
  permisos: z.array(z.enum(ADMIN_PERMISOS)).min(1, "Debe tener al menos un permiso"),
  notas: z.string().optional().nullable(),
}).omit({
  id: true,
  primerInicioSesion: true,
  createdAt: true,
  updatedAt: true,
});

// Administradores Select Schema
export const selectAdministradorSchema = createSelectSchema(administradores);

// Administradores Types
export type InsertAdministrador = z.infer<typeof insertAdministradorSchema>;
export type Administrador = typeof administradores.$inferSelect;

// Administrador Helper Types
export type AdministradorWithDetails = Administrador & {
  user?: User;
  creadoPorUsuario?: User;
};

// Map of permission to sidebar routes
export const ADMIN_PERMISO_RUTAS: Record<AdminPermiso, string> = {
  dashboard: "/admin",
  analytics: "/admin/analytics",
  usuarios: "/admin/users",
  operadores: "/admin/drivers",
  billeteras: "/admin/wallets",
  comisiones_pago: "/admin/payment-fees",
  servicios: "/admin/services",
  tarifas: "/admin/pricing",
  monitoreo: "/admin/monitoring",
  verificaciones: "/admin/verifications",
  documentos: "/admin/documents",
  tickets: "/admin/tickets",
  socios: "/admin/socios",
  aseguradoras: "/admin/aseguradoras",
  empresas: "/admin/empresas",
  configuracion: "/admin/configuracion",
  admin_usuarios: "/admin/administradores",
};

// Human-readable labels for permissions
export const ADMIN_PERMISO_LABELS: Record<AdminPermiso, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  usuarios: "Usuarios",
  operadores: "Conductores",
  billeteras: "Billeteras",
  comisiones_pago: "Comisiones de Pago",
  servicios: "Servicios",
  tarifas: "Tarifas",
  monitoreo: "Monitoreo",
  verificaciones: "Verificaciones",
  documentos: "Documentos",
  tickets: "Tickets Soporte",
  socios: "Socios e Inversores",
  aseguradoras: "Aseguradoras",
  empresas: "Empresas",
  configuracion: "Configuracion",
  admin_usuarios: "Gestionar Administradores",
};

// ==================== END ADMINISTRADORES ====================
