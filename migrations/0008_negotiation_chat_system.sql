-- Migration: Add negotiation chat system for extraction services
-- Date: 2025-12-04
-- This migration adds:
-- 1. New 'extraccion' service category
-- 2. New extraction subtypes
-- 3. Estado negociacion enum
-- 4. Tipo mensaje chat enum
-- 5. Negotiation fields to servicios table
-- 6. Message type and file fields to mensajes_chat table

-- Add new value to servicio_categoria enum
ALTER TYPE "servicio_categoria" ADD VALUE IF NOT EXISTS 'extraccion';

-- Add new extraction subtypes to servicio_subtipo enum
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'extraccion_zanja';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'extraccion_lodo';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'extraccion_volcado';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'extraccion_accidente';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'extraccion_dificil';

-- Create estado_negociacion enum
DO $$ BEGIN
  CREATE TYPE "estado_negociacion" AS ENUM (
    'no_aplica',
    'pendiente_evaluacion',
    'propuesto',
    'confirmado',
    'aceptado',
    'rechazado',
    'cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tipo_mensaje_chat enum
DO $$ BEGIN
  CREATE TYPE "tipo_mensaje_chat" AS ENUM (
    'texto',
    'imagen',
    'video',
    'monto_propuesto',
    'monto_confirmado',
    'monto_aceptado',
    'monto_rechazado',
    'sistema'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add negotiation fields to servicios table
ALTER TABLE "servicios" 
ADD COLUMN IF NOT EXISTS "requiere_negociacion" boolean NOT NULL DEFAULT false;

ALTER TABLE "servicios" 
ADD COLUMN IF NOT EXISTS "estado_negociacion" "estado_negociacion" DEFAULT 'no_aplica';

ALTER TABLE "servicios" 
ADD COLUMN IF NOT EXISTS "monto_negociado" decimal(10, 2);

ALTER TABLE "servicios" 
ADD COLUMN IF NOT EXISTS "notas_extraccion" text;

ALTER TABLE "servicios" 
ADD COLUMN IF NOT EXISTS "descripcion_situacion" text;

-- Add message type and file fields to mensajes_chat table
ALTER TABLE "mensajes_chat" 
ADD COLUMN IF NOT EXISTS "tipo_mensaje" "tipo_mensaje_chat" NOT NULL DEFAULT 'texto';

ALTER TABLE "mensajes_chat" 
ADD COLUMN IF NOT EXISTS "monto_asociado" decimal(10, 2);

ALTER TABLE "mensajes_chat" 
ADD COLUMN IF NOT EXISTS "url_archivo" text;

ALTER TABLE "mensajes_chat" 
ADD COLUMN IF NOT EXISTS "nombre_archivo" text;

-- Create index for negotiation status queries
CREATE INDEX IF NOT EXISTS "idx_servicios_estado_negociacion" 
ON "servicios" ("estado_negociacion") 
WHERE "requiere_negociacion" = true;

-- Create index for extraction services
CREATE INDEX IF NOT EXISTS "idx_servicios_extraccion" 
ON "servicios" ("servicio_categoria") 
WHERE "servicio_categoria" = 'extraccion';

-- Create index for chat messages with files
CREATE INDEX IF NOT EXISTS "idx_mensajes_chat_tipo" 
ON "mensajes_chat" ("tipo_mensaje") 
WHERE "tipo_mensaje" != 'texto';
