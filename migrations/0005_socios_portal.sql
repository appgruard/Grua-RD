-- Migration: Socios (Partners/Investors) Portal
-- Module 2.5: Portal de Socios/Inversores
-- Created: November 28, 2025

-- Add 'socio' to user_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'socio' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_type')) THEN
        ALTER TYPE user_type ADD VALUE 'socio';
    END IF;
END
$$;

-- Create estado_distribucion enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_distribucion') THEN
        CREATE TYPE estado_distribucion AS ENUM ('calculado', 'aprobado', 'pagado');
    END IF;
END
$$;

-- Create socios table
CREATE TABLE IF NOT EXISTS socios (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    porcentaje_participacion DECIMAL(5,2) NOT NULL,
    monto_inversion DECIMAL(12,2) NOT NULL,
    fecha_inversion TIMESTAMP NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    cuenta_bancaria TEXT,
    banco_nombre TEXT,
    tipo_cuenta TEXT,
    notas TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create distribuciones_socios table
CREATE TABLE IF NOT EXISTS distribuciones_socios (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    socio_id VARCHAR NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
    periodo TEXT NOT NULL,
    ingresos_totales DECIMAL(12,2) NOT NULL,
    comision_empresa DECIMAL(12,2) NOT NULL,
    monto_socio DECIMAL(12,2) NOT NULL,
    estado estado_distribucion NOT NULL DEFAULT 'calculado',
    fecha_pago TIMESTAMP,
    metodo_pago TEXT,
    referencia_transaccion TEXT,
    notas TEXT,
    calculado_por VARCHAR REFERENCES users(id),
    aprobado_por VARCHAR REFERENCES users(id),
    fecha_aprobacion TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_socios_user_id ON socios(user_id);
CREATE INDEX IF NOT EXISTS idx_socios_activo ON socios(activo);
CREATE INDEX IF NOT EXISTS idx_distribuciones_socio_id ON distribuciones_socios(socio_id);
CREATE INDEX IF NOT EXISTS idx_distribuciones_periodo ON distribuciones_socios(periodo);
CREATE INDEX IF NOT EXISTS idx_distribuciones_estado ON distribuciones_socios(estado);

-- Create unique constraint for socio-periodo to prevent duplicate distributions
CREATE UNIQUE INDEX IF NOT EXISTS idx_distribuciones_socio_periodo ON distribuciones_socios(socio_id, periodo);
