CREATE TYPE "public"."aseguradora_estado" AS ENUM('pendiente', 'aprobado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."estado_distribucion" AS ENUM('calculado', 'aprobado', 'pagado');--> statement-breakpoint
CREATE TYPE "public"."estado_pago_aseguradora" AS ENUM('pendiente_facturar', 'facturado', 'pagado');--> statement-breakpoint
CREATE TYPE "public"."ticket_categoria" AS ENUM('problema_tecnico', 'consulta_servicio', 'queja', 'sugerencia', 'problema_pago', 'otro');--> statement-breakpoint
CREATE TYPE "public"."ticket_estado" AS ENUM('abierto', 'en_proceso', 'resuelto', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."ticket_prioridad" AS ENUM('baja', 'media', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."tipo_recordatorio" AS ENUM('30_dias', '15_dias', '7_dias', 'vencido');--> statement-breakpoint
CREATE TYPE "public"."tipo_vehiculo" AS ENUM('carro', 'motor', 'jeep', 'camion');--> statement-breakpoint
ALTER TYPE "public"."documento_tipo" ADD VALUE 'seguro_cliente';--> statement-breakpoint
ALTER TYPE "public"."estado_servicio" ADD VALUE 'conductor_en_sitio' BEFORE 'en_progreso';--> statement-breakpoint
ALTER TYPE "public"."estado_servicio" ADD VALUE 'cargando' BEFORE 'en_progreso';--> statement-breakpoint
ALTER TYPE "public"."metodo_pago" ADD VALUE 'aseguradora';--> statement-breakpoint
ALTER TYPE "public"."user_type" ADD VALUE 'aseguradora';--> statement-breakpoint
ALTER TYPE "public"."user_type" ADD VALUE 'socio';--> statement-breakpoint
CREATE TABLE "aseguradoras" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"nombre_empresa" text NOT NULL,
	"rnc" text NOT NULL,
	"direccion" text,
	"telefono" text,
	"email_contacto" text,
	"persona_contacto" text,
	"logo_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_payment_methods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"azul_token" text NOT NULL,
	"card_brand" text NOT NULL,
	"last4" text NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"cardholder_name" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distribuciones_socios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"socio_id" varchar NOT NULL,
	"periodo" text NOT NULL,
	"ingresos_totales" numeric(12, 2) NOT NULL,
	"comision_empresa" numeric(12, 2) NOT NULL,
	"monto_socio" numeric(12, 2) NOT NULL,
	"estado" "estado_distribucion" DEFAULT 'calculado' NOT NULL,
	"fecha_pago" timestamp,
	"metodo_pago" text,
	"referencia_transaccion" text,
	"notas" text,
	"calculado_por" varchar,
	"aprobado_por" varchar,
	"fecha_aprobacion" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documento_recordatorios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documento_id" varchar NOT NULL,
	"tipo_recordatorio" "tipo_recordatorio" NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensajes_ticket" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"usuario_id" varchar NOT NULL,
	"mensaje" text NOT NULL,
	"es_staff" boolean DEFAULT false NOT NULL,
	"leido" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicios_aseguradora" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" varchar NOT NULL,
	"aseguradora_id" varchar NOT NULL,
	"numero_poliza" text NOT NULL,
	"tipo_cobertura" text,
	"monto_aprobado" numeric(10, 2),
	"estado_pago" "estado_pago_aseguradora" DEFAULT 'pendiente_facturar' NOT NULL,
	"numero_factura" text,
	"fecha_factura" timestamp,
	"fecha_pago" timestamp,
	"notas" text,
	"aprobado_por" varchar,
	"fecha_aprobacion" timestamp,
	"rechazado_por" varchar,
	"fecha_rechazo" timestamp,
	"motivo_rechazo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"porcentaje_participacion" numeric(5, 2) NOT NULL,
	"monto_inversion" numeric(12, 2) NOT NULL,
	"fecha_inversion" timestamp NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"cuenta_bancaria" text,
	"banco_nombre" text,
	"tipo_cuenta" text,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" text NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"is_running" boolean DEFAULT false NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_jobs_job_name_unique" UNIQUE("job_name")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" varchar NOT NULL,
	"categoria" "ticket_categoria" NOT NULL,
	"prioridad" "ticket_prioridad" DEFAULT 'media' NOT NULL,
	"estado" "ticket_estado" DEFAULT 'abierto' NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"servicio_relacionado_id" varchar,
	"asignado_a" varchar,
	"resuelto_at" timestamp,
	"cerrado_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comisiones" ADD COLUMN "azul_transaction_id" text;--> statement-breakpoint
ALTER TABLE "conductores" ADD COLUMN "azul_merchant_id" text;--> statement-breakpoint
ALTER TABLE "conductores" ADD COLUMN "azul_card_token" text;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "tamano_archivo" integer;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "fecha_revision" timestamp;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "azul_transaction_id" text;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "tipo_vehiculo" "tipo_vehiculo";--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "aseguradora_nombre" text;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "aseguradora_poliza" text;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "aseguradora_estado" "aseguradora_estado";--> statement-breakpoint
ALTER TABLE "aseguradoras" ADD CONSTRAINT "aseguradoras_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payment_methods" ADD CONSTRAINT "client_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribuciones_socios" ADD CONSTRAINT "distribuciones_socios_socio_id_socios_id_fk" FOREIGN KEY ("socio_id") REFERENCES "public"."socios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribuciones_socios" ADD CONSTRAINT "distribuciones_socios_calculado_por_users_id_fk" FOREIGN KEY ("calculado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribuciones_socios" ADD CONSTRAINT "distribuciones_socios_aprobado_por_users_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_recordatorios" ADD CONSTRAINT "documento_recordatorios_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes_ticket" ADD CONSTRAINT "mensajes_ticket_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes_ticket" ADD CONSTRAINT "mensajes_ticket_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios_aseguradora" ADD CONSTRAINT "servicios_aseguradora_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios_aseguradora" ADD CONSTRAINT "servicios_aseguradora_aseguradora_id_aseguradoras_id_fk" FOREIGN KEY ("aseguradora_id") REFERENCES "public"."aseguradoras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios_aseguradora" ADD CONSTRAINT "servicios_aseguradora_aprobado_por_users_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios_aseguradora" ADD CONSTRAINT "servicios_aseguradora_rechazado_por_users_id_fk" FOREIGN KEY ("rechazado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "socios" ADD CONSTRAINT "socios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_servicio_relacionado_id_servicios_id_fk" FOREIGN KEY ("servicio_relacionado_id") REFERENCES "public"."servicios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_asignado_a_users_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;