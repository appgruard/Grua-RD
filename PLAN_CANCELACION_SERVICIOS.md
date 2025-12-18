# Plan de Cancelación de Servicios con Penalizaciones

## 1. Introducción

Este documento describe la estrategia para implementar un sistema de cancelación de servicios con penalizaciones en la plataforma GruArd. El objetivo es permitir que clientes y conductores cancelen servicios cuando sea necesario, mientras se aplican penalizaciones en ciertos escenarios para mantener la integridad del sistema.

---

## 2. Definición de Cancellations (Cancelaciones)

### 2.1 Estados Actuales en el Sistema

La tabla `servicios` tiene el siguiente ciclo de estados:
- **pendiente** → El servicio acaba de ser creado y busca conductor
- **aceptado** → Un conductor ha aceptado el servicio
- **conductor_en_sitio** → El conductor está en la ubicación del cliente
- **cargando** → Se está cargando el vehículo
- **en_progreso** → El servicio está en ruta
- **completado** → El servicio ha finalizado
- **cancelado** → El servicio fue cancelado

### 2.2 Puntos de Cancelación Permitidos

Se puede cancelar un servicio en los siguientes estados:

| Estado | Quien Puede Cancelar | Penalización | Notas |
|--------|---------------------|--------------|-------|
| **pendiente** | Cliente | No | Nadie ha aceptado aún |
| **pendiente** | Conductor | N/A | Un conductor puede rechazar (dismiss) antes de aceptar |
| **aceptado** | Cliente | Sí (si cumple condiciones) | Después de X minutos de aceptación |
| **aceptado** | Conductor | Sí (si cumple condiciones) | Penalización para conductor |
| **conductor_en_sitio** | Cliente | Sí (penalización alta) | Cliente cancela cuando conductor llegó |
| **conductor_en_sitio** | Conductor | Sí (penalización alta) | Conductor se va sin servicio |
| **cargando** | Cliente | Sí (penalización muy alta) | Cliente cancela ya en proceso |
| **cargando** | Conductor | Sí (penalización muy alta) | Conductor abandona |
| **en_progreso** | Cliente | Sí (penalización máxima) | Cliente cancela en ruta |
| **en_progreso** | Conductor | Sí (penalización máxima) | Conductor abandona el servicio |
| **completado** | Ninguno | No Aplica | Ya está completado |
| **cancelado** | Ninguno | No Aplica | Ya está cancelado |

---

## 3. Sistema de Penalizaciones

### 3.1 Tipos de Penalizaciones

#### **Para Clientes:**

1. **Cancelación sin penalización (Pendiente, sin conductor aceptado)**
   - Reembolso: 100%
   - Penalización: $0
   - Efecto en rating: Ninguno

2. **Cancelación leve (Aceptado, primeros 5 minutos)**
   - Reembolso: 100%
   - Penalización: $0
   - Efecto en rating: Ninguno
   - Condición: Cancelar dentro de 5 minutos de aceptación

3. **Cancelación moderada (Aceptado, después de 5 minutos)**
   - Reembolso: 80%
   - Penalización: 20% del costo total + $2 (tarifa administrativa)
   - Efecto en rating: -0.25 estrellas
   - Condición: Cancelar después de 5 minutos pero antes de que llegue

4. **Cancelación grave (Conductor en sitio)**
   - Reembolso: 50%
   - Penalización: 50% del costo total + $5 (tarifa administrativa)
   - Efecto en rating: -0.5 estrellas
   - Condición: Cancelar después de que conductor llegó

5. **Cancelación crítica (En progreso)**
   - Reembolso: 0%
   - Penalización: 100% del costo total
   - Efecto en rating: -1 estrella
   - Condición: Cancelar una vez iniciado el servicio

#### **Para Conductores:**

1. **Rechazo sin penalización (Pendiente)**
   - Penalización: Ninguna
   - Sistema: Uso de tabla `dismissed_services`

2. **Cancelación moderada (Aceptado, primeros 5 minutos)**
   - Penalización: $3 (tarifa administrativa)
   - Efecto en rating: -0.25 estrellas
   - Pérdida de comisión: Sí
   - Condición: Cancelar dentro de 5 minutos de aceptación

3. **Cancelación grave (Aceptado, después de 5 minutos)**
   - Penalización: $5 + 10% del costo del servicio
   - Efecto en rating: -0.5 estrellas
   - Pérdida de comisión: Sí
   - Condición: Cancelar después de 5 minutos pero antes de llegar

4. **Cancelación crítica (Conductor en sitio o después)**
   - Penalización: $10 + 25% del costo del servicio
   - Efecto en rating: -1 estrella
   - Pérdida de comisión: Sí
   - Bloqueo temporal: 30 minutos
   - Condición: Cancelar después de llegar o estar en progreso

### 3.2 Lógica de Penalización

```
SI estado_previo == "aceptado" Y tiempo_desde_aceptacion <= 5 minutos:
    penalizacion = NINGUNA (para clientes)
    penalizacion = $3 (para conductores)

SI estado_previo == "aceptado" Y tiempo_desde_aceptacion > 5 minutos:
    penalizacion = 20% costo + $2 (para clientes)
    penalizacion = $5 + 10% costo (para conductores)

SI estado_previo == "conductor_en_sitio":
    penalizacion = 50% costo + $5 (para clientes)
    penalizacion = $10 + 25% costo (para conductores)

SI estado_previo == "cargando" O "en_progreso":
    penalizacion = 100% costo (para clientes)
    penalizacion = $10 + 25% costo (para conductores)
```

---

## 4. Estructura de Datos Necesaria

### 4.1 Nueva Tabla: `cancelaciones_servicios`

```sql
CREATE TABLE cancelaciones_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  cancelado_por_id UUID NOT NULL REFERENCES users(id),
  tipo_cancelador ENUM('cliente', 'conductor') NOT NULL,
  estado_anterior ENUM(...) NOT NULL,
  motivo_cancelacion TEXT,
  razon_codigo VARCHAR(50),  -- e.g., "cambio_planes", "no_respondio", "evento_urgente"
  penalizacion_aplicada DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reembolso_monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reembolso_procesado BOOLEAN DEFAULT FALSE,
  penalizacion_procesada BOOLEAN DEFAULT FALSE,
  tiempo_desde_aceptacion_segundos INTEGER,
  bloqueado_hasta TIMESTAMP,
  evaluacion_penalizacion ENUM('ninguna', 'leve', 'moderada', 'grave', 'critica'),
  notas_admin TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Extensión de Tabla `usuarios` / `conductores`

```sql
-- Agregar a tabla conductores:
- cancelaciones_totales INT DEFAULT 0
- penalizaciones_totales DECIMAL(12, 2) DEFAULT 0
- ultima_cancelacion_timestamp TIMESTAMP
- bloqueado_hasta TIMESTAMP

-- Agregar a tabla users (o crear tabla cliente):
- cancelaciones_totales INT DEFAULT 0
- penalizaciones_totales DECIMAL(12, 2) DEFAULT 0
- ultima_cancelacion_timestamp TIMESTAMP
```

### 4.3 Nueva Tabla: `razones_cancelacion`

```sql
CREATE TABLE razones_cancelacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  aplica_a ENUM('cliente', 'conductor', 'ambos') DEFAULT 'ambos',
  penalizacion_predeterminada BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales:
INSERT INTO razones_cancelacion VALUES
('cliente_cambio_planes', 'Cliente cambió de planes', 'cliente', TRUE),
('cliente_no_necesita', 'Cliente ya no necesita el servicio', 'cliente', TRUE),
('cliente_encontro_otro', 'Cliente encontró otro servicio', 'cliente', TRUE),
('cliente_evento_urgente', 'Evento urgente del cliente', 'cliente', TRUE),
('conductor_emergencia', 'Emergencia del conductor', 'conductor', FALSE),
('conductor_problema_vehiculo', 'Problema con el vehículo', 'conductor', TRUE),
('conductor_no_encontro', 'No encontró la ubicación', 'conductor', TRUE),
('conductor_trafico_excesivo', 'Tráfico excesivo', 'conductor', FALSE);
```

---

## 5. API Endpoints Necesarios

### 5.1 Cancelar Servicio

```
POST /api/servicios/{servicioId}/cancelar

Body:
{
  motivo: "string" (opcional),
  razon_codigo: "string" (opcional),
  notas_adicionales: "string" (solo admin)
}

Response:
{
  success: boolean,
  mensaje: string,
  penalizacion: {
    monto: decimal,
    tipo: string,
    razon: string
  },
  reembolso: {
    monto: decimal,
    estado: string
  },
  servicio_actualizado: {
    id: string,
    estado: "cancelado",
    cancelado_at: timestamp
  }
}
```

### 5.2 Obtener Historial de Cancelaciones

```
GET /api/usuarios/{usuarioId}/cancelaciones

Response:
{
  total_cancelaciones: int,
  penalizaciones_totales: decimal,
  ultimas_cancelaciones: [
    {
      servicio_id: string,
      fecha: timestamp,
      penalizacion: decimal,
      razon: string,
      estado: string
    }
  ]
}
```

### 5.3 Admin - Revisar Penalización

```
POST /api/admin/cancelaciones/{cancelacionId}/revisar

Body:
{
  accion: "confirmar" | "reducir" | "eliminar",
  nueva_penalizacion: decimal (opcional),
  notas: string
}
```

---

## 6. Workflow de Cancelación

```
1. Usuario inicia cancelación
   ↓
2. Sistema valida si puede cancelar (estado, rol)
   ↓
3. Sistema calcula:
   - Tiempo desde evento clave (aceptación, llegada)
   - Penalización aplicable
   - Reembolso a procesar
   - Cambio en rating
   ↓
4. Sistema crea registro en cancelaciones_servicios
   ↓
5. Sistema actualiza estado del servicio a "cancelado"
   ↓
6. Sistema actualiza balance del usuario
   ↓
7. Sistema procesa reembolso (si aplica) en siguiente ciclo de pagos
   ↓
8. Sistema aplica penalización a wallet/saldo
   ↓
9. Sistema actualiza rating del usuario
   ↓
10. Sistema notifica al usuario y otros involucrados
```

---

## 7. Reglas y Validaciones

### 7.1 Validaciones Básicas

- [ ] El servicio debe estar en estado cancelable
- [ ] Solo cliente o conductor del servicio pueden cancelar
- [ ] Admins pueden cancelar servicios (sin penalización)
- [ ] No se puede cancelar un servicio ya cancelado
- [ ] La razón de cancelación debe seleccionarse de lista predefinida

### 7.2 Validaciones de Penalización

- [ ] La penalización no puede ser mayor al costo del servicio
- [ ] Las penalizaciones se aplican al wallet del usuario
- [ ] Las penalizaciones se registran en historial
- [ ] Las penalizaciones no permiten pagar servicios (solo acceso)
- [ ] Si penalizaciones > balance disponible, se bloquea al usuario

### 7.3 Bloqueos y Restricciones

- [ ] Conductor bloqueado por 30 min no puede aceptar nuevos servicios
- [ ] Si total de cancelaciones > 10 en 30 días → bloqueo temporal (24h)
- [ ] Si total de penalizaciones > $50 en 30 días → revisión administrativa
- [ ] Cliente con >5 cancelaciones en 7 días puede ser suspendido

---

## 8. Notificaciones

### 8.1 Para Cliente

- "Tu servicio ha sido cancelado exitosamente"
- "Se ha aplicado una penalización de $X por cancelación"
- "Se procesará tu reembolso en el próximo ciclo de pago (2-3 días)"
- "El conductor canceló tu servicio"

### 8.2 Para Conductor

- "Has cancelado exitosamente un servicio"
- "Se ha aplicado una penalización de $X por cancelación"
- "Estás bloqueado por 30 minutos. No puedes aceptar nuevos servicios"
- "El cliente canceló tu servicio"

### 8.3 Para Admin

- Notificación de cancelación en dashboard
- Alertas para penalizaciones > umbral
- Reportes diarios de cancelaciones

---

## 9. Consideraciones de Negocio

### 9.1 Política de Reembolsos

- Los reembolsos se procesan en el siguiente ciclo de pagos (24-48 horas)
- No se devuelven tarjetas administrativas ($2-$10)
- Los reembolsos por tarjeta van a la tarjeta original
- Los reembolsos en efectivo van al wallet de Gruard

### 9.2 Política de Penalizaciones

- Las penalizaciones se aplican inmediatamente al wallet
- Las penalizaciones pueden apelar dentro de 7 días
- Un admin debe revisar apelaciones
- Las penalizaciones prescriben después de 90 días

### 9.3 Excepciones

- Conductores bloqueados por Gruard no tienen penalización al cancelar
- Clientes con errores de pago pueden cancelar sin penalización (confirmación admin)
- Emergencias médicas/seguridad pueden ser exoneradas por admin

---

## 10. Fases de Implementación

### **Fase 1: Base de Datos y API Core** (2-3 días)
- [ ] Crear tabla `cancelaciones_servicios`
- [ ] Crear tabla `razones_cancelacion`
- [ ] Extender schema de usuarios y conductores
- [ ] Implementar endpoint POST cancelar
- [ ] Implementar endpoint GET historial

### **Fase 2: Lógica de Penalización** (2-3 días)
- [ ] Crear servicio de cálculo de penalizaciones
- [ ] Implementar validaciones de cancelación
- [ ] Integrar con sistema de wallet/balance
- [ ] Integrar con sistema de rating

### **Fase 3: Frontend y UX** (2-3 días)
- [ ] Modal de confirmación de cancelación
- [ ] Selector de razón de cancelación
- [ ] Pantalla de confirmación con detalles de penalización
- [ ] Historial de cancelaciones en perfil

### **Fase 4: Admin Tools** (1-2 días)
- [ ] Dashboard de cancelaciones
- [ ] Herramienta de revisión de penalizaciones
- [ ] Reportes de cancelaciones

### **Fase 5: Testing y Refinamiento** (1-2 días)
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Testing en producción (usuarios beta)
- [ ] Ajustes según feedback

---

## 11. Casos de Uso Específicos

### Caso 1: Cliente cancela a los 3 minutos de aceptación
```
- Estado anterior: aceptado
- Tiempo desde aceptación: 3 minutos
- Penalización: NINGUNA
- Reembolso: 100%
- Rating: Sin cambio
```

### Caso 2: Cliente cancela cuando conductor está en sitio
```
- Estado anterior: conductor_en_sitio
- Tiempo desde llegada: 2 minutos
- Penalización: 50% costo + $5
- Reembolso: 50%
- Rating: -0.5 estrellas
```

### Caso 3: Conductor cancela 20 minutos después de aceptar
```
- Estado anterior: aceptado
- Tiempo desde aceptación: 20 minutos
- Penalización: $5 + 10% costo
- Reembolso: 100% al cliente
- Rating: -0.5 estrellas
- Bloqueo: 30 minutos
```

### Caso 4: Conductor cancela cuando en progreso
```
- Estado anterior: en_progreso
- Penalización: $10 + 25% costo
- Reembolso: 0% al cliente
- Rating: -1 estrella
- Bloqueo: 30 minutos
- Admin review: REQUERIDA
```

---

## 12. Métricas y Monitoreo

### Métricas Clave

- Tasa de cancelación por estado
- Cancelaciones por usuario (cliente vs conductor)
- Penalizaciones aplicadas vs revertidas
- Apelaciones de penalizaciones (tasa de aprobación)
- Impacto en rating promedio de usuarios
- Ingresos por penalizaciones (tarifa administrativa)

### Alertas

- Cancelación de servicio en_progreso
- Usuario con >3 cancelaciones en 24h
- Penalización total > $100 en 30 días
- Bloqueo de usuario por cancelaciones

---

## 13. Preguntas Frecuentes (Respuestas Pendientes)

1. ¿Cuál es el porcentaje de penalización exacto para cada escenario?
2. ¿Se pueden cancelar servicios que requieren negociación?
3. ¿Cómo se manejan las cancelaciones por culpa de Gruard (error de app)?
4. ¿Hay límite de cancelaciones antes de suspensión?
5. ¿Las penalizaciones se heredan entre plataformas (web/mobile)?
6. ¿Cómo se integra con terceros pagadores (Azul)?

---

## Siguiente: Esperar Instrucciones

Este plan está listo para revisión. Por favor proporciona:

1. Ajustes a los montos de penalización
2. Cambios a los tiempos de gracia (5 minutos, etc.)
3. Confirmación de estructura de datos
4. Prioridades de implementación
5. Cualquier requisito adicional
