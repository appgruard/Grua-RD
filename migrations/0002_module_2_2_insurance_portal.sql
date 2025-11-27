-- Module 2.2: Insurance Company Portal Migration
-- This migration adds the 'aseguradora' user role and creates tables for insurance companies

-- Add 'aseguradora' to user_type enum
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'aseguradora';

-- Create estado_pago_aseguradora enum
DO $$ BEGIN
  CREATE TYPE estado_pago_aseguradora AS ENUM ('pendiente_facturar', 'facturado', 'pagado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create aseguradoras table (Insurance Companies)
CREATE TABLE IF NOT EXISTS aseguradoras (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre_empresa TEXT NOT NULL,
  rnc TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email_contacto TEXT,
  persona_contacto TEXT,
  logo_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create servicios_aseguradora table (Insurance service tracking)
CREATE TABLE IF NOT EXISTS servicios_aseguradora (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id VARCHAR NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  aseguradora_id VARCHAR NOT NULL REFERENCES aseguradoras(id),
  numero_poliza TEXT NOT NULL,
  tipo_cobertura TEXT,
  monto_aprobado DECIMAL(10, 2),
  estado_pago estado_pago_aseguradora NOT NULL DEFAULT 'pendiente_facturar',
  numero_factura TEXT,
  fecha_factura TIMESTAMP,
  fecha_pago TIMESTAMP,
  notas TEXT,
  aprobado_por VARCHAR REFERENCES users(id),
  fecha_aprobacion TIMESTAMP,
  rechazado_por VARCHAR REFERENCES users(id),
  fecha_rechazo TIMESTAMP,
  motivo_rechazo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aseguradoras_user_id ON aseguradoras(user_id);
CREATE INDEX IF NOT EXISTS idx_aseguradoras_rnc ON aseguradoras(rnc);
CREATE INDEX IF NOT EXISTS idx_aseguradoras_activo ON aseguradoras(activo);

CREATE INDEX IF NOT EXISTS idx_servicios_aseguradora_servicio_id ON servicios_aseguradora(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicios_aseguradora_aseguradora_id ON servicios_aseguradora(aseguradora_id);
CREATE INDEX IF NOT EXISTS idx_servicios_aseguradora_estado_pago ON servicios_aseguradora(estado_pago);
CREATE INDEX IF NOT EXISTS idx_servicios_aseguradora_numero_poliza ON servicios_aseguradora(numero_poliza);
