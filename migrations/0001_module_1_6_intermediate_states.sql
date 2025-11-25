-- Module 1.6: Intermediate Service States
-- Adds 'conductor_en_sitio' and 'cargando' states to the service flow

ALTER TYPE "public"."estado_servicio" ADD VALUE IF NOT EXISTS 'conductor_en_sitio' BEFORE 'en_progreso';
ALTER TYPE "public"."estado_servicio" ADD VALUE IF NOT EXISTS 'cargando' BEFORE 'en_progreso';
