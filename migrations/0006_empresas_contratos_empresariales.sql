-- Migration: Module 6 - Empresas / Contratos Empresariales
-- Adds support for corporate clients, contracts, projects, scheduled services, and billing

-- Add 'empresa' to user_type enum
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'empresa';

-- Add 'empresa' to metodo_pago enum
ALTER TYPE metodo_pago ADD VALUE IF NOT EXISTS 'empresa';

-- Create empresa_tipo enum
DO $$ BEGIN
  CREATE TYPE empresa_tipo AS ENUM (
    'constructora',
    'ferreteria',
    'logistica',
    'turistica',
    'ayuntamiento',
    'zona_franca',
    'industria',
    'rent_car',
    'maquinaria_pesada',
    'otro'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create empresa_contrato_tipo enum
DO $$ BEGIN
  CREATE TYPE empresa_contrato_tipo AS ENUM (
    'por_hora',
    'por_dia',
    'por_mes',
    'por_servicio',
    'volumen'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create empresa_facturacion_estado enum
DO $$ BEGIN
  CREATE TYPE empresa_facturacion_estado AS ENUM (
    'pendiente',
    'facturado',
    'pagado',
    'vencido'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create empresa_rol_empleado enum
DO $$ BEGIN
  CREATE TYPE empresa_rol_empleado AS ENUM (
    'admin_empresa',
    'supervisor',
    'empleado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create servicio_programado_estado enum
DO $$ BEGIN
  CREATE TYPE servicio_programado_estado AS ENUM (
    'programado',
    'confirmado',
    'ejecutado',
    'cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create empresas table
CREATE TABLE IF NOT EXISTS empresas (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre_empresa TEXT NOT NULL,
  rnc TEXT NOT NULL UNIQUE,
  tipo_empresa empresa_tipo NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email_contacto TEXT,
  persona_contacto TEXT,
  logo_url TEXT,
  limite_credito DECIMAL(12, 2) DEFAULT 0.00,
  dias_credito INTEGER DEFAULT 30,
  descuento_volumen DECIMAL(5, 2) DEFAULT 0.00,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  verificado_por VARCHAR REFERENCES users(id),
  fecha_verificacion TIMESTAMP,
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create empresa_empleados table
CREATE TABLE IF NOT EXISTS empresa_empleados (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rol empresa_rol_empleado NOT NULL DEFAULT 'empleado',
  departamento TEXT,
  puede_crear_servicios BOOLEAN NOT NULL DEFAULT TRUE,
  puede_programar_servicios BOOLEAN NOT NULL DEFAULT TRUE,
  puede_ver_facturas BOOLEAN NOT NULL DEFAULT FALSE,
  puede_gestionar_empleados BOOLEAN NOT NULL DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create empresa_contratos table
CREATE TABLE IF NOT EXISTS empresa_contratos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_contrato TEXT NOT NULL UNIQUE,
  tipo_contrato empresa_contrato_tipo NOT NULL,
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP,
  horas_contratadas INTEGER,
  horas_utilizadas INTEGER DEFAULT 0,
  servicios_contratados INTEGER,
  servicios_utilizados INTEGER DEFAULT 0,
  tarifa_hora DECIMAL(10, 2),
  tarifa_dia DECIMAL(10, 2),
  tarifa_servicio DECIMAL(10, 2),
  descuento_porcentaje DECIMAL(5, 2) DEFAULT 0.00,
  monto_mensual_minimo DECIMAL(12, 2),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create empresa_tarifas table
CREATE TABLE IF NOT EXISTS empresa_tarifas (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  servicio_categoria servicio_categoria,
  precio_base DECIMAL(10, 2) NOT NULL,
  tarifa_por_km DECIMAL(10, 2) NOT NULL,
  descuento_porcentaje DECIMAL(5, 2) DEFAULT 0.00,
  minimo_servicios INTEGER DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create empresa_proyectos table
CREATE TABLE IF NOT EXISTS empresa_proyectos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre_proyecto TEXT NOT NULL,
  codigo TEXT,
  descripcion TEXT,
  ubicacion_lat DECIMAL(10, 7),
  ubicacion_lng DECIMAL(10, 7),
  direccion TEXT,
  responsable TEXT,
  telefono_responsable TEXT,
  fecha_inicio TIMESTAMP,
  fecha_fin TIMESTAMP,
  presupuesto_servicios DECIMAL(12, 2),
  gasto_actual DECIMAL(12, 2) DEFAULT 0.00,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create empresa_conductores_asignados table
CREATE TABLE IF NOT EXISTS empresa_conductores_asignados (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  conductor_id VARCHAR NOT NULL REFERENCES conductores(id) ON DELETE CASCADE,
  es_prioridad BOOLEAN NOT NULL DEFAULT FALSE,
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create servicios_programados table
CREATE TABLE IF NOT EXISTS servicios_programados (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  proyecto_id VARCHAR REFERENCES empresa_proyectos(id) ON DELETE SET NULL,
  contrato_id VARCHAR REFERENCES empresa_contratos(id) ON DELETE SET NULL,
  solicitado_por VARCHAR NOT NULL REFERENCES users(id),
  conductor_asignado_id VARCHAR REFERENCES conductores(id) ON DELETE SET NULL,
  fecha_programada TIMESTAMP NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT,
  origen_lat DECIMAL(10, 7) NOT NULL,
  origen_lng DECIMAL(10, 7) NOT NULL,
  origen_direccion TEXT NOT NULL,
  destino_lat DECIMAL(10, 7),
  destino_lng DECIMAL(10, 7),
  destino_direccion TEXT,
  servicio_categoria servicio_categoria DEFAULT 'remolque_estandar',
  servicio_subtipo servicio_subtipo,
  descripcion TEXT,
  estado servicio_programado_estado NOT NULL DEFAULT 'programado',
  servicio_creado VARCHAR REFERENCES servicios(id) ON DELETE SET NULL,
  recurrente BOOLEAN NOT NULL DEFAULT FALSE,
  frecuencia_recurrencia TEXT,
  notas_internas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create empresa_facturas table
CREATE TABLE IF NOT EXISTS empresa_facturas (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_factura TEXT NOT NULL UNIQUE,
  periodo TEXT NOT NULL,
  fecha_emision TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_vencimiento TIMESTAMP NOT NULL,
  total_servicios INTEGER NOT NULL DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL,
  descuento DECIMAL(12, 2) DEFAULT 0.00,
  itbis DECIMAL(12, 2) DEFAULT 0.00,
  total DECIMAL(12, 2) NOT NULL,
  estado empresa_facturacion_estado NOT NULL DEFAULT 'pendiente',
  fecha_pago TIMESTAMP,
  metodo_pago TEXT,
  referencia_transaccion TEXT,
  notas TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create empresa_factura_items table
CREATE TABLE IF NOT EXISTS empresa_factura_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id VARCHAR NOT NULL REFERENCES empresa_facturas(id) ON DELETE CASCADE,
  servicio_id VARCHAR REFERENCES servicios(id) ON DELETE SET NULL,
  proyecto_id VARCHAR REFERENCES empresa_proyectos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  descuento DECIMAL(10, 2) DEFAULT 0.00,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_empresas_rnc ON empresas(rnc);
CREATE INDEX IF NOT EXISTS idx_empresas_tipo ON empresas(tipo_empresa);
CREATE INDEX IF NOT EXISTS idx_empresas_activo ON empresas(activo);

CREATE INDEX IF NOT EXISTS idx_empresa_empleados_empresa_id ON empresa_empleados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_empleados_user_id ON empresa_empleados(user_id);

CREATE INDEX IF NOT EXISTS idx_empresa_contratos_empresa_id ON empresa_contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_contratos_activo ON empresa_contratos(activo);

CREATE INDEX IF NOT EXISTS idx_empresa_tarifas_empresa_id ON empresa_tarifas(empresa_id);

CREATE INDEX IF NOT EXISTS idx_empresa_proyectos_empresa_id ON empresa_proyectos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_proyectos_activo ON empresa_proyectos(activo);

CREATE INDEX IF NOT EXISTS idx_empresa_conductores_empresa_id ON empresa_conductores_asignados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_conductores_conductor_id ON empresa_conductores_asignados(conductor_id);

CREATE INDEX IF NOT EXISTS idx_servicios_programados_empresa_id ON servicios_programados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicios_programados_proyecto_id ON servicios_programados(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_servicios_programados_fecha ON servicios_programados(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_servicios_programados_estado ON servicios_programados(estado);

CREATE INDEX IF NOT EXISTS idx_empresa_facturas_empresa_id ON empresa_facturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_facturas_periodo ON empresa_facturas(periodo);
CREATE INDEX IF NOT EXISTS idx_empresa_facturas_estado ON empresa_facturas(estado);

CREATE INDEX IF NOT EXISTS idx_empresa_factura_items_factura_id ON empresa_factura_items(factura_id);
