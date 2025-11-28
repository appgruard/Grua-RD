-- Migration: 0003_ticket_support_system.sql
-- Description: Add ticket support system tables and enums
-- Date: 2025-11-28

-- Create enums for ticket system
CREATE TYPE "ticket_categoria" AS ENUM (
  'problema_tecnico',
  'consulta_servicio',
  'queja',
  'sugerencia',
  'problema_pago',
  'otro'
);

CREATE TYPE "ticket_prioridad" AS ENUM (
  'baja',
  'media',
  'alta',
  'urgente'
);

CREATE TYPE "ticket_estado" AS ENUM (
  'abierto',
  'en_proceso',
  'resuelto',
  'cerrado'
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS "tickets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "categoria" ticket_categoria NOT NULL,
  "prioridad" ticket_prioridad NOT NULL DEFAULT 'media',
  "estado" ticket_estado NOT NULL DEFAULT 'abierto',
  "titulo" text NOT NULL,
  "descripcion" text NOT NULL,
  "servicio_relacionado_id" varchar REFERENCES "servicios"("id") ON DELETE SET NULL,
  "asignado_a" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "resuelto_at" timestamp,
  "cerrado_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create mensajes_ticket table
CREATE TABLE IF NOT EXISTS "mensajes_ticket" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" varchar NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "usuario_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "mensaje" text NOT NULL,
  "es_staff" boolean DEFAULT false NOT NULL,
  "leido" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "tickets_usuario_id_idx" ON "tickets"("usuario_id");
CREATE INDEX IF NOT EXISTS "tickets_estado_idx" ON "tickets"("estado");
CREATE INDEX IF NOT EXISTS "tickets_prioridad_idx" ON "tickets"("prioridad");
CREATE INDEX IF NOT EXISTS "tickets_categoria_idx" ON "tickets"("categoria");
CREATE INDEX IF NOT EXISTS "tickets_asignado_a_idx" ON "tickets"("asignado_a");
CREATE INDEX IF NOT EXISTS "tickets_created_at_idx" ON "tickets"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "mensajes_ticket_ticket_id_idx" ON "mensajes_ticket"("ticket_id");
CREATE INDEX IF NOT EXISTS "mensajes_ticket_usuario_id_idx" ON "mensajes_ticket"("usuario_id");
CREATE INDEX IF NOT EXISTS "mensajes_ticket_created_at_idx" ON "mensajes_ticket"("created_at" DESC);
