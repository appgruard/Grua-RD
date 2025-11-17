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
export const estadoServicioEnum = pgEnum("estado_servicio", [
  "pendiente",
  "aceptado", 
  "en_progreso",
  "completado",
  "cancelado"
]);
export const metodoPagoEnum = pgEnum("metodo_pago", ["efectivo", "tarjeta"]);

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  userType: userTypeEnum("user_type").notNull().default("cliente"),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  fotoUrl: text("foto_url"),
  calificacionPromedio: decimal("calificacion_promedio", { precision: 3, scale: 2 }),
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

// Insert Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  phone: z.string().optional(),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  calificacionPromedio: true,
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

// Select Schemas
export const selectUserSchema = createSelectSchema(users);
export const selectConductorSchema = createSelectSchema(conductores);
export const selectServicioSchema = createSelectSchema(servicios);
export const selectTarifaSchema = createSelectSchema(tarifas);
export const selectCalificacionSchema = createSelectSchema(calificaciones);
export const selectUbicacionTrackingSchema = createSelectSchema(ubicacionesTracking);

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

// Helper types for API responses
export type UserWithConductor = User & {
  conductor?: Conductor;
};

export type ServicioWithDetails = Servicio & {
  cliente?: User;
  conductor?: User;
  calificacion?: Calificacion;
};
