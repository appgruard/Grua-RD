-- Migration: Add servicio_subtipo column to tarifas table
-- This allows configuring independent tariffs for each service subcategory

ALTER TABLE tarifas 
ADD COLUMN IF NOT EXISTS servicio_subtipo servicio_subtipo;

-- Create index for efficient lookups by category and subtype
CREATE INDEX IF NOT EXISTS idx_tarifas_categoria_subtipo 
ON tarifas(servicio_categoria, servicio_subtipo) 
WHERE activo = true;
