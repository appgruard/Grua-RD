-- Migration: Add new service categories (remolque_plataforma, remolque_motocicletas)
-- Date: 2025-12-03
-- This migration adds two new service categories and their associated subtypes

-- Add new values to servicio_categoria enum
ALTER TYPE "servicio_categoria" ADD VALUE IF NOT EXISTS 'remolque_plataforma';
ALTER TYPE "servicio_categoria" ADD VALUE IF NOT EXISTS 'remolque_motocicletas';

-- Add new values to servicio_subtipo enum
-- Remolque Plataforma / Flatbed subtypes
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'vehiculo_deportivo';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'vehiculo_bajo';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'vehiculo_modificado';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'traslado_especial';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'servicio_premium';

-- Remolque Motocicletas subtypes
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'moto_accidentada';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'moto_no_prende';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'scooter_pasola';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'delivery_accidentado';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'moto_alto_cilindraje';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'traslado_local_moto';
ALTER TYPE "servicio_subtipo" ADD VALUE IF NOT EXISTS 'reubicacion_moto';
