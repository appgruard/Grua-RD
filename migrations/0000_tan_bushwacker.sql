CREATE TYPE "public"."documento_estado" AS ENUM('pendiente', 'aprobado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."documento_tipo" AS ENUM('licencia', 'matricula', 'poliza', 'seguro_grua', 'foto_vehiculo', 'foto_perfil', 'cedula_frontal', 'cedula_trasera');--> statement-breakpoint
CREATE TYPE "public"."estado_cuenta" AS ENUM('pendiente_verificacion', 'activo', 'suspendido', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."estado_pago" AS ENUM('pendiente', 'procesando', 'pagado', 'fallido');--> statement-breakpoint
CREATE TYPE "public"."estado_servicio" AS ENUM('pendiente', 'aceptado', 'en_progreso', 'completado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('efectivo', 'tarjeta');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('cliente', 'conductor', 'admin');--> statement-breakpoint
CREATE TABLE "calificaciones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" varchar NOT NULL,
	"puntuacion" integer NOT NULL,
	"comentario" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comisiones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" varchar NOT NULL,
	"monto_total" numeric(10, 2) NOT NULL,
	"monto_operador" numeric(10, 2) NOT NULL,
	"monto_empresa" numeric(10, 2) NOT NULL,
	"porcentaje_operador" numeric(5, 2) DEFAULT '70.00' NOT NULL,
	"porcentaje_empresa" numeric(5, 2) DEFAULT '30.00' NOT NULL,
	"estado_pago_operador" "estado_pago" DEFAULT 'pendiente' NOT NULL,
	"estado_pago_empresa" "estado_pago" DEFAULT 'pendiente' NOT NULL,
	"stripe_transfer_id" text,
	"fecha_pago_operador" timestamp,
	"fecha_pago_empresa" timestamp,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conductores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"licencia" text NOT NULL,
	"placa_grua" text NOT NULL,
	"marca_grua" text NOT NULL,
	"modelo_grua" text NOT NULL,
	"disponible" boolean DEFAULT false NOT NULL,
	"ubicacion_lat" numeric(10, 7),
	"ubicacion_lng" numeric(10, 7),
	"ultima_ubicacion_update" timestamp
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "documento_tipo" NOT NULL,
	"usuario_id" varchar,
	"conductor_id" varchar,
	"servicio_id" varchar,
	"url" text NOT NULL,
	"nombre_archivo" text NOT NULL,
	"estado" "documento_estado" DEFAULT 'pendiente' NOT NULL,
	"valido_hasta" timestamp,
	"revisado_por" varchar,
	"motivo_rechazo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensajes_chat" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" varchar NOT NULL,
	"remitente_id" varchar NOT NULL,
	"contenido" text NOT NULL,
	"leido" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "servicios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" varchar NOT NULL,
	"conductor_id" varchar,
	"origen_lat" numeric(10, 7) NOT NULL,
	"origen_lng" numeric(10, 7) NOT NULL,
	"origen_direccion" text NOT NULL,
	"destino_lat" numeric(10, 7) NOT NULL,
	"destino_lng" numeric(10, 7) NOT NULL,
	"destino_direccion" text NOT NULL,
	"distancia_km" numeric(6, 2) NOT NULL,
	"costo_total" numeric(10, 2) NOT NULL,
	"estado" "estado_servicio" DEFAULT 'pendiente' NOT NULL,
	"metodo_pago" "metodo_pago" DEFAULT 'efectivo' NOT NULL,
	"stripe_payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"aceptado_at" timestamp,
	"iniciado_at" timestamp,
	"completado_at" timestamp,
	"cancelado_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tarifas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"precio_base" numeric(10, 2) NOT NULL,
	"tarifa_por_km" numeric(10, 2) NOT NULL,
	"tarifa_nocturna_multiplicador" numeric(3, 2) DEFAULT '1.5',
	"hora_inicio_nocturna" text DEFAULT '20:00',
	"hora_fin_nocturna" text DEFAULT '06:00',
	"zona" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ubicaciones_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" varchar NOT NULL,
	"conductor_id" varchar NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"cedula" text,
	"cedula_verificada" boolean DEFAULT false NOT NULL,
	"password_hash" text NOT NULL,
	"user_type" "user_type" DEFAULT 'cliente' NOT NULL,
	"estado_cuenta" "estado_cuenta" DEFAULT 'pendiente_verificacion' NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"foto_url" text,
	"calificacion_promedio" numeric(3, 2),
	"telefono_verificado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telefono" text NOT NULL,
	"codigo" text NOT NULL,
	"expira_en" timestamp NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"verificado" boolean DEFAULT false NOT NULL,
	"tipo_operacion" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conductores" ADD CONSTRAINT "conductores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_conductor_id_conductores_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."conductores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_revisado_por_users_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_remitente_id_users_id_fk" FOREIGN KEY ("remitente_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_cliente_id_users_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_conductor_id_users_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ubicaciones_tracking" ADD CONSTRAINT "ubicaciones_tracking_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ubicaciones_tracking" ADD CONSTRAINT "ubicaciones_tracking_conductor_id_conductores_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."conductores"("id") ON DELETE no action ON UPDATE no action;