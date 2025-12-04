-- Performance optimization: Add indexes on frequently queried columns
-- This will significantly speed up driver dashboard, profile, and history loading

-- Index on conductores.userId for faster driver lookups
CREATE INDEX IF NOT EXISTS idx_conductores_user_id ON conductores(user_id);

-- Index on documentos.usuarioId for faster document queries
CREATE INDEX IF NOT EXISTS idx_documentos_usuario_id ON documentos(usuario_id);

-- Index on servicios.conductorId for faster service queries by driver
CREATE INDEX IF NOT EXISTS idx_servicios_conductor_id ON servicios(conductor_id);

-- Index on servicios.clienteId for faster service queries by client
CREATE INDEX IF NOT EXISTS idx_servicios_cliente_id ON servicios(cliente_id);

-- Index on servicios.estado for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios(estado);

-- Composite index for driver active services (estado + conductorId)
CREATE INDEX IF NOT EXISTS idx_servicios_conductor_estado ON servicios(conductor_id, estado);

-- Index on operator_wallets.conductorId for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_operator_wallets_conductor_id ON operator_wallets(conductor_id);

-- Index on calificaciones.servicioId for faster rating lookups
CREATE INDEX IF NOT EXISTS idx_calificaciones_servicio_id ON calificaciones(servicio_id);

-- Index on conductor_servicios.conductorId for service categories
CREATE INDEX IF NOT EXISTS idx_conductor_servicios_conductor_id ON conductor_servicios(conductor_id);

-- Index on conductor_vehiculos.conductorId for vehicle lookups
CREATE INDEX IF NOT EXISTS idx_conductor_vehiculos_conductor_id ON conductor_vehiculos(conductor_id);
