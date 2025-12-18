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

### 3.1 Factores de Penalización

Las penalizaciones se calculan considerando múltiples factores:

#### **Factores Primarios:**
1. **Estado del servicio** - Cuándo se cancela
2. **Distancia recorrida** - Cuántos km viajó el conductor hacia la ubicación
3. **Tiempo transcurrido** - Desde aceptación o desde llegada
4. **Demanda actual** - Cantidad de servicios disponibles en la zona
5. **Hora del día** - Picos horarios (6-10 AM, 12-2 PM, 5-8 PM)
6. **Zona geográfica** - Urbana, suburbana, rural

#### **Factores Secundarios:**
7. **Historial de cancelaciones** - Reincidencia aumenta penalizaciones
8. **Tipo de servicio** - Servicios especializados tienen penalizaciones mayores
9. **Razón de cancelación** - Emergencias tienen penalizaciones reducidas
10. **Razonabilidad del viaje** - Si el servicio requería viajar >15 km

---

### 3.2 Matriz de Penalizaciones para Clientes

#### **Estado: PENDIENTE (Ningún conductor aceptó)**
- Penalización: **$0**
- Reembolso: **100%**
- Rating: Sin cambio
- Notas: Sin restricciones

#### **Estado: ACEPTADO (Conductor viajando hacia cliente)**

Cálculo base: `penalizacion_base = distancia_recorrida_km × 0.50`

| Tiempo | Distancia | Penalización | Reembolso | Rating | Notas |
|--------|-----------|--------------|-----------|--------|-------|
| ≤ 3 min | < 1 km | $0 | 100% | Sin cambio | Gracia total |
| 3-5 min | 1-3 km | $2 + base | 95% | -0.1 | Gracia parcial |
| 5-10 min | 3-8 km | $5 + base | 85% | -0.25 | Moderada |
| 10+ min | 8+ km | $10 + base | 70% | -0.5 | Grave |

**Multiplicadores aplicables:**
- **Hora pico** (6-10 AM, 12-2 PM, 5-8 PM): ×1.5
- **Zona rural/lejana** (>15 km): ×1.3
- **Reincidencia** (>3 cancelaciones/mes): ×1.5
- **Demanda alta** (>80% servicios en zona): ×1.3
- **Emergencia** (razón válida): ×0.3

#### **Estado: CONDUCTOR EN SITIO (Conductor llegó)**

Cálculo base: `penalizacion_base = distancia_total_km × 1.00 + costo_total × 0.30`

- Penalización: **50% costo + $10 + base**
- Reembolso: **40%**
- Rating: **-0.75 estrellas**
- Bloqueo: **2 horas antes de nuevo servicio**

**Multiplicadores aplicables:**
- **Hora pico**: ×1.5
- **Servicio especializado**: ×1.4
- **Reincidencia**: ×2.0

#### **Estado: CARGANDO o EN PROGRESO (Servicio iniciado)**

Cálculo base: `penalizacion_base = costo_total + (distancia_recorrida_km × 1.50)`

- Penalización: **100% costo + base + $15**
- Reembolso: **0%**
- Rating: **-1 estrella**
- Bloqueo: **48 horas**
- Admin Review: **REQUERIDA**

**Multiplicadores aplicables:**
- **Hora pico**: ×2.0
- **Reincidencia**: ×3.0

---

### 3.3 Matriz de Penalizaciones para Conductores

#### **Estado: PENDIENTE (Antes de aceptar)**
- Penalización: **$0**
- Sistema: Usa tabla `dismissed_services`
- Efecto: Ninguno en rating

#### **Estado: ACEPTADO (Conductor viajando)**

Cálculo base: `penalizacion_base = distancia_km × 0.75`

| Tiempo | Distancia | Penalización | Pérdida Comisión | Rating | Bloqueo |
|--------|-----------|--------------|------------------|--------|---------|
| ≤ 2 min | < 0.5 km | $2 + base | 10% | -0.1 | Ninguno |
| 2-5 min | 0.5-2 km | $5 + base | 25% | -0.25 | 5 min |
| 5-10 min | 2-5 km | $8 + base | 50% | -0.5 | 15 min |
| 10+ min | 5+ km | $15 + base | 100% | -0.75 | 30 min |

**Multiplicadores aplicables:**
- **Hora pico**: ×1.4
- **Reincidencia** (>2 cancelaciones/semana): ×2.0
- **Zona de alta demanda**: ×1.3
- **Emergencia del conductor** (razón válida): ×0.2

#### **Estado: CONDUCTOR EN SITIO (Conductor llegó)**

Cálculo base: `penalizacion_base = costo_total × 0.40 + distancia_total_km × 1.25`

- Penalización: **$20 + 30% costo + base**
- Pérdida Comisión: **100% (sin ganar nada)**
- Rating: **-1 estrella**
- Bloqueo: **30 minutos**
- Admin Review: **RECOMENDADA**

**Multiplicadores aplicables:**
- **Hora pico**: ×2.0
- **Reincidencia**: ×3.0

#### **Estado: CARGANDO o EN PROGRESO (Servicio iniciado)**

Cálculo base: `penalizacion_base = costo_total × 0.50 + distancia_recorrida_km × 1.50`

- Penalización: **$25 + 40% costo + base**
- Pérdida Comisión: **100%**
- Rating: **-1.5 estrellas**
- Bloqueo: **2 horas**
- Admin Review: **REQUERIDA**
- Evaluación: Posible suspensión temporal o permanente

**Multiplicadores aplicables:**
- **Hora pico**: ×2.5
- **Reincidencia**: ×4.0

---

### 3.4 Fórmula Completa de Cálculo

```
penalizacion_final = penalizacion_base × (multiplicador_demanda × multiplicador_hora × multiplicador_reincidencia)

Donde:
  multiplicador_demanda = 0.8 (baja) | 1.0 (media) | 1.3 (alta) | 1.5 (crítica)
  multiplicador_hora = 1.0 (normal) | 1.5 (pico) | 2.0 (pico máximo)
  multiplicador_reincidencia = 1.0 (primera) | 1.5 (2-3 veces) | 2.0 (4-5 veces) | 3.0+ (>5 veces)

reembolso_final = costo_total - penalizacion_final (mínimo 0)
```

---

### 3.5 Factores de Demanda

La demanda se calcula como porcentaje de servicios disponibles sin conductor en la zona:

```
demanda_zona = (servicios_sin_conductor / servicios_totales_zona) × 100

Nivel Bajo: < 20% (muchos conductores disponibles)
Nivel Medio: 20-50% (equilibrado)
Nivel Alto: 50-80% (mucha demanda)
Nivel Crítico: > 80% (emergencia de demanda)
```

---

### 3.6 Factores de Hora Pico

Horas pico definidas por demanda local:

```
Pico Matinal: 6:00-10:00 AM (multiplicador: 1.5-2.0)
Pico Medio Día: 12:00-2:00 PM (multiplicador: 1.3-1.5)
Pico Vespertino: 5:00-8:00 PM (multiplicador: 1.5-2.0)
Pico Nocturno: 9:00-11:00 PM (multiplicador: 1.3-1.5)
Normal: Resto del día (multiplicador: 1.0)
```

---

### 3.7 Factores de Zona Geográfica

```
Urbana (< 5 km desde centro): multiplicador 1.0
Suburbana (5-20 km): multiplicador 1.1
Periférica (20-50 km): multiplicador 1.2
Rural (> 50 km): multiplicador 1.3
Acceso difícil (caminos secundarios): multiplicador 1.4
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
  estado_anterior ENUM('pendiente', 'aceptado', 'conductor_en_sitio', 'cargando', 'en_progreso') NOT NULL,
  
  -- Información de cancelación
  motivo_cancelacion TEXT,
  razon_codigo VARCHAR(50),  -- e.g., "cambio_planes", "emergencia", "problema_vehiculo"
  notas_usuario TEXT,
  
  -- Datos de cálculo de penalización
  distancia_recorrida_km DECIMAL(6, 2),        -- Km que viajó el conductor
  distancia_total_servicio_km DECIMAL(6, 2),   -- Km totales del servicio
  tiempo_desde_aceptacion_segundos INTEGER,
  tiempo_desde_llegada_segundos INTEGER,
  
  -- Factores de contexto
  nivel_demanda ENUM('bajo', 'medio', 'alto', 'critico'),  -- Demanda en la zona
  es_hora_pico BOOLEAN DEFAULT FALSE,
  zona_tipo ENUM('urbana', 'suburbana', 'periferica', 'rural'),
  total_cancelaciones_usuario INT,  -- Historial de cancelaciones
  tipo_servicio_especializado BOOLEAN DEFAULT FALSE,
  
  -- Multiplicadores aplicados
  multiplicador_demanda DECIMAL(3, 2) DEFAULT 1.0,
  multiplicador_hora DECIMAL(3, 2) DEFAULT 1.0,
  multiplicador_reincidencia DECIMAL(3, 2) DEFAULT 1.0,
  
  -- Penalización y reembolso
  penalizacion_base DECIMAL(10, 2),
  penalizacion_aplicada DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reembolso_monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cambio_rating DECIMAL(3, 2),  -- Cambio en rating (ej: -0.5)
  
  -- Estados de procesamiento
  reembolso_procesado BOOLEAN DEFAULT FALSE,
  penalizacion_procesada BOOLEAN DEFAULT FALSE,
  bloqueado_hasta TIMESTAMP,
  
  -- Evaluación y ajustes
  evaluacion_penalizacion ENUM('ninguna', 'leve', 'moderada', 'grave', 'critica'),
  notas_admin TEXT,
  revisado_por UUID REFERENCES users(id),
  fecha_revision TIMESTAMP,
  penalizacion_ajustada_por_admin DECIMAL(10, 2),
  razon_ajuste TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Extensión de Tabla `usuarios` / `conductores` / `servicios`

```sql
-- Agregar a tabla conductores:
ALTER TABLE conductores ADD COLUMN (
  cancelaciones_totales INT DEFAULT 0,
  cancelaciones_ultimos_7_dias INT DEFAULT 0,
  cancelaciones_ultimo_mes INT DEFAULT 0,
  penalizaciones_totales DECIMAL(12, 2) DEFAULT 0.00,
  penalizaciones_ultimas_24h DECIMAL(12, 2) DEFAULT 0.00,
  ultima_cancelacion_timestamp TIMESTAMP,
  bloqueado_hasta TIMESTAMP,
  ultima_zona_tipo VARCHAR(50),
  ultima_demanda_zona VARCHAR(50)
);

-- Agregar a tabla users (clientes/socios):
ALTER TABLE users ADD COLUMN (
  cancelaciones_totales INT DEFAULT 0,
  cancelaciones_ultimos_7_dias INT DEFAULT 0,
  cancelaciones_ultimo_mes INT DEFAULT 0,
  penalizaciones_totales DECIMAL(12, 2) DEFAULT 0.00,
  ultima_cancelacion_timestamp TIMESTAMP,
  bloqueado_hasta TIMESTAMP
);

-- Agregar a tabla servicios (para rastrear datos en el momento):
ALTER TABLE servicios ADD COLUMN (
  zona_tipo VARCHAR(50),          -- Tipo de zona al momento de crear
  nivel_demanda_en_creacion VARCHAR(50),  -- Nivel de demanda cuando se creó
  hora_creacion_es_pico BOOLEAN DEFAULT FALSE
);

-- Nueva tabla: zonas_demanda (para cálculos de demanda en tiempo real)
CREATE TABLE zonas_demanda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_zona VARCHAR(50) NOT NULL UNIQUE,
  nombre_zona VARCHAR(100),
  tipo_zona ENUM('urbana', 'suburbana', 'periferica', 'rural'),
  lat_centro DECIMAL(10, 7),
  lng_centro DECIMAL(10, 7),
  radio_km DECIMAL(6, 2),
  
  servicios_activos_sin_conductor INT DEFAULT 0,
  servicios_activos_totales INT DEFAULT 0,
  conductores_disponibles INT DEFAULT 0,
  nivel_demanda_actual ENUM('bajo', 'medio', 'alto', 'critico'),
  porcentaje_demanda DECIMAL(5, 2),
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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
  razon_codigo: "string" (requerido),
  notas_usuario: "string" (opcional),
  
  -- Backend calcula automáticamente:
  -- - distancia_recorrida_km (desde tracking)
  -- - tiempo_desde_aceptacion_segundos
  -- - nivel_demanda (de tabla zonas_demanda)
  -- - es_hora_pico (por timestamp)
  -- - rating_usuario (de tabla users)
  -- - total_cancelaciones_usuario
}

Response:
{
  success: boolean,
  mensaje: string,
  cancelacion_id: string,
  
  penalizacion: {
    monto: decimal,
    monto_base: decimal,
    multiplicadores_aplicados: {
      demanda: decimal,
      hora: decimal,
      rating: decimal,
      reincidencia: decimal
    },
    evaluacion: "ninguna|leve|moderada|grave|critica",
    razon: string
  },
  
  reembolso: {
    monto: decimal,
    porcentaje: decimal,
    estado: "pendiente_procesamiento"
  },
  
  cambios_usuario: {
    nuevo_rating: decimal,
    cambio_rating: decimal,
    bloqueado_hasta: timestamp | null
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

## 11. Casos de Uso Específicos con Múltiples Factores

### Caso 1: Cliente cancela a los 3 minutos de aceptación (BAJA DISTANCIA)
```
Contexto:
- Estado: aceptado
- Tiempo: 3 minutos
- Distancia recorrida: 0.8 km
- Hora: 3:00 PM (sin pico)
- Rating cliente: 4.2 estrellas
- Demanda zona: Baja (20%)
- Costo servicio: $25

Cálculo:
- penalizacion_base = 0.8 km × $0.50 = $0.40
- Multiplicadores: demanda 0.8 × hora 1.0 × reincidencia 1.0 = 0.8
- penalizacion_final = $0.40 × 0.8 = $0.32 ≈ $0
- Reembolso: 100%
```

### Caso 2: Cliente cancela cuando conductor está en sitio (DISTANCIA MEDIA)
```
Contexto:
- Estado: conductor_en_sitio
- Tiempo desde llegada: 2 minutos
- Distancia total: 8 km
- Distancia recorrida: 7.8 km
- Hora: 6:30 PM (PICO VESPERTINO)
- Rating cliente: 3.2 estrellas
- Demanda zona: Alta (70%)
- Total cancelaciones cliente: 1
- Costo servicio: $50
- Zona: Urbana

Cálculo:
- penalizacion_base = (7.8 km × $1.00) + ($50 × 0.30) = $7.80 + $15 = $22.80
- penalizacion_base_final = $22.80 + 50% × $50 + $10 = $22.80 + $25 + $10 = $57.80
- Multiplicadores: demanda 1.3 × hora 1.5 × reincidencia 1.0 = 1.95
- penalizacion_final = $57.80 × 1.95 = $112.71
- Reembolso: $50 - $112.71 = $0 (sin reembolso, excede el costo)
- Bloqueo: 2 horas

NOTA: Se aplica cap de penalización en 100% del costo = $50
```

### Caso 3: Conductor cancela 20 minutos después de aceptar (DISTANCIA SIGNIFICATIVA)
```
Contexto:
- Estado: aceptado
- Tiempo desde aceptación: 20 minutos
- Distancia recorrida: 6.5 km (de 12 km totales)
- Hora: 8:15 AM (PICO MATINAL)
- Total cancelaciones conductor: 2 en última semana
- Costo servicio: $60
- Zona: Suburbana
- Razón: "Problema con vehículo"

Cálculo:
- penalizacion_base = 6.5 km × $0.75 = $4.88
- penalizacion_base_final = $15 + $4.88 = $19.88
- Multiplicadores: demanda 1.0 × hora 1.4 × reincidencia 2.0 = 2.8
- penalizacion_final = $19.88 × 2.8 = $55.66
- Pérdida comisión: 100%
- Reembolso al cliente: 100%
- Rating conductor: -0.5 estrellas
- Bloqueo: 30 minutos

NOTA: Penalización moderada por reincidencia
```

### Caso 4: Conductor cancela cuando en progreso (DISTANCIA RECORRIDA COMPLETA)
```
Contexto:
- Estado: en_progreso
- Tiempo: 15 minutos en ruta (de 40 km totales a 40 km/h = 10 min estimado)
- Distancia recorrida: 10 km
- Distancia faltante: 30 km
- Hora: 7:45 PM (PICO VESPERTINO)
- Total cancelaciones conductor: 4 en último mes
- Costo servicio: $150
- Zona: Periférica
- Demanda: Crítica (85%)

Cálculo:
- penalizacion_base = ($150 × 0.50) + (10 km × $1.50) = $75 + $15 = $90
- penalizacion_base_final = $25 + $90 = $115
- Multiplicadores: demanda 1.5 × hora 2.5 × reincidencia 3.0 = 11.25
- penalizacion_final = $115 × 11.25 = $1,293.75 (excede límite)
- penalizacion_capped = $150 (100% costo)
- Reembolso al cliente: $0
- Rating conductor: -1.5 estrellas
- Bloqueo: 2 horas
- Admin Review: REQUERIDA + Posible suspensión
- Notas: Reincidencia grave, múltiples factores críticos
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
