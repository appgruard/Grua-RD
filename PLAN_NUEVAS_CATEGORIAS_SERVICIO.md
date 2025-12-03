# Plan de Implementación: Nuevas Categorías de Servicio

## Resumen Ejecutivo

Este documento detalla el plan para agregar dos nuevas categorías de servicio a la plataforma Grúa RD:

1. **Remolque Plataforma / Flatbed** - Servicio premium para vehículos especiales
2. **Remolque de Motocicletas** - Servicio especializado para motocicletas y scooters

**Fecha de creación:** 3 de Diciembre de 2025  
**Estado:** Pendiente de implementación  
**Prioridad:** Alta

---

## Justificación del Negocio

### Por qué Motocicletas debe ser categoría separada

| Razón | Impacto |
|-------|---------|
| Operadores estándar NO siempre remolcan motos | Evita rechazos y cancelaciones |
| Requieren equipos diferentes (rampas pequeñas, cintas delicadas, soportes laterales) | Mejor calidad de servicio |
| Operadores de moto no tienen grúas estándar | Amplía base de operadores |
| Aseguradoras diferencian "auxilio moto" de "auxilio vehículo" | Facilita integración con seguros |
| Atrae operadores especializados | Más operadores = más servicios = más comisiones |

### Por qué Plataforma/Flatbed debe ser categoría separada

| Razón | Impacto |
|-------|---------|
| Operador estándar NO puede remolcar vehículos deportivos ni muy bajos | Evita daños y reclamos |
| Costo y tarifa diferentes (más alta) | Mayor rentabilidad |
| Operadores premium trabajan diferente (Audi, BMW, Porsche, Tesla) | Servicio especializado |
| Es la categoría que más paga y más dinero deja | Maximiza ingresos |

---

## Estado Actual del Sistema

### Categorías Existentes (VALID_SERVICE_CATEGORIES)

```typescript
// shared/schema.ts - Línea 36
export const VALID_SERVICE_CATEGORIES = [
  "remolque_estandar",      // Remolque básico
  "auxilio_vial",           // Asistencia sin grúa
  "remolque_especializado", // Vehículos especiales (actualmente incluye lujo)
  "camiones_pesados",       // Legacy - para compatibilidad
  "vehiculos_pesados",      // Vehículos de carga
  "maquinarias",            // Greda, rodillo, etc.
  "izaje_construccion",     // Materiales y equipos
  "remolque_recreativo"     // Botes, jetski, cuatrimoto
] as const;
```

### Problema con el Estado Actual

- `vehiculo_lujo` está como SUBTIPO de `remolque_especializado`
- No existe categoría para motocicletas
- Mezclar motos con estándar confunde clientes y operadores
- Tarifas no diferenciadas para servicios premium

---

## Nuevas Categorías a Implementar

### 1. Remolque Plataforma / Flatbed

**ID interno:** `remolque_plataforma`  
**Nombre display:** "Plataforma / Flatbed"  
**Descripción:** "Vehículos de lujo y bajos"  
**Icono sugerido:** Custom SVG de plataforma con vehículo deportivo

**Subtipos:**

| ID | Etiqueta | Descripción |
|----|----------|-------------|
| `vehiculo_lujo` | Vehículo de Lujo | BMW, Mercedes, Audi, Lexus |
| `vehiculo_deportivo` | Vehículo Deportivo | Porsche, Ferrari, Corvette |
| `vehiculo_bajo` | Vehículo Muy Bajo | Vehículos lowered, stance |
| `vehiculo_modificado` | Vehículo Modificado | Modificaciones aftermarket |
| `traslado_especial` | Traslado Especial | Eventos, exhibiciones |
| `servicio_premium` | Servicio Premium | Atención VIP, guantes blancos |

**Tarifas sugeridas:**
- Precio base: RD$ 3,500 - 5,000
- Tarifa/km: RD$ 120 - 180
- Multiplicador nocturno: 1.5x

### 2. Remolque de Motocicletas

**ID interno:** `remolque_motocicletas`  
**Nombre display:** "Remolque de Motocicletas"  
**Descripción:** "Motos, scooters y pasolas"  
**Icono sugerido:** Lucide `Bike` o custom SVG de moto en remolque

**Subtipos:**

| ID | Etiqueta | Descripción |
|----|----------|-------------|
| `moto_accidentada` | Moto Accidentada | Daños por accidente |
| `moto_no_prende` | Moto que No Prende | Problemas mecánicos |
| `scooter_pasola` | Scooter / Pasola | Scooters y pasolas |
| `delivery_accidentado` | Delivery Accidentado | Motos de delivery |
| `moto_alto_cilindraje` | Moto Alto Cilindraje | Harley, BMW, Honda Gold Wing |
| `traslado_local` | Traslado Local | Dentro de la ciudad |
| `reubicacion` | Reubicación | Cambio de ubicación |

**Tarifas sugeridas:**
- Precio base: RD$ 1,200 - 1,800
- Tarifa/km: RD$ 50 - 80
- Multiplicador nocturno: 1.3x

---

## Cambios Técnicos Requeridos

### Fase 1: Esquema de Base de Datos

**Archivo:** `shared/schema.ts`

#### 1.1 Actualizar VALID_SERVICE_CATEGORIES

```typescript
export const VALID_SERVICE_CATEGORIES = [
  "remolque_estandar",
  "auxilio_vial",
  "remolque_especializado",
  "remolque_plataforma",      // ← NUEVA
  "remolque_motocicletas",    // ← NUEVA
  "camiones_pesados",
  "vehiculos_pesados",
  "maquinarias",
  "izaje_construccion",
  "remolque_recreativo"
] as const;
```

#### 1.2 Actualizar servicioSubtipoEnum

```typescript
export const servicioSubtipoEnum = pgEnum("servicio_subtipo", [
  // Auxilio Vial (existentes)
  "cambio_goma", "inflado_neumatico", "paso_corriente",
  "cerrajero_automotriz", "suministro_combustible",
  "envio_bateria", "diagnostico_obd", "extraccion_vehiculo",
  
  // Remolque Especializado (existentes)
  "vehiculo_sin_llanta", "vehiculo_sin_direccion", "vehiculo_chocado",
  "vehiculo_electrico",
  
  // Remolque Plataforma (NUEVOS)
  "vehiculo_lujo",           // Mover de remolque_especializado
  "vehiculo_deportivo",      // NUEVO
  "vehiculo_bajo",           // NUEVO
  "vehiculo_modificado",     // NUEVO
  "traslado_especial",       // NUEVO
  "servicio_premium",        // NUEVO
  
  // Remolque Motocicletas (NUEVOS)
  "moto_accidentada",        // NUEVO
  "moto_no_prende",          // NUEVO
  "scooter_pasola",          // NUEVO
  "delivery_accidentado",    // NUEVO
  "moto_alto_cilindraje",    // NUEVO
  "traslado_local_moto",     // NUEVO
  "reubicacion_moto",        // NUEVO
  
  // ... resto de subtipos existentes
]);
```

#### 1.3 Migración de Base de Datos

```sql
-- Agregar nuevas categorías al enum
ALTER TYPE servicio_categoria ADD VALUE 'remolque_plataforma';
ALTER TYPE servicio_categoria ADD VALUE 'remolque_motocicletas';

-- Agregar nuevos subtipos al enum
ALTER TYPE servicio_subtipo ADD VALUE 'vehiculo_deportivo';
ALTER TYPE servicio_subtipo ADD VALUE 'vehiculo_bajo';
ALTER TYPE servicio_subtipo ADD VALUE 'vehiculo_modificado';
ALTER TYPE servicio_subtipo ADD VALUE 'traslado_especial';
ALTER TYPE servicio_subtipo ADD VALUE 'servicio_premium';
ALTER TYPE servicio_subtipo ADD VALUE 'moto_accidentada';
ALTER TYPE servicio_subtipo ADD VALUE 'moto_no_prende';
ALTER TYPE servicio_subtipo ADD VALUE 'scooter_pasola';
ALTER TYPE servicio_subtipo ADD VALUE 'delivery_accidentado';
ALTER TYPE servicio_subtipo ADD VALUE 'moto_alto_cilindraje';
ALTER TYPE servicio_subtipo ADD VALUE 'traslado_local_moto';
ALTER TYPE servicio_subtipo ADD VALUE 'reubicacion_moto';

-- Crear tarifas default para nuevas categorías
INSERT INTO tarifas (nombre, precio_base, tarifa_por_km, zona) VALUES
('Remolque Plataforma - Santo Domingo', 4000.00, 150.00, 'santo_domingo'),
('Remolque Plataforma - Nacional', 4500.00, 180.00, 'nacional'),
('Remolque Motocicletas - Santo Domingo', 1500.00, 60.00, 'santo_domingo'),
('Remolque Motocicletas - Nacional', 1800.00, 80.00, 'nacional');
```

### Fase 2: Componentes Frontend

#### 2.1 ServiceSubtypeSelector.tsx

Agregar arrays de subtipos:

```typescript
// Nuevos subtipos para Plataforma
const remolquePlataformaSubtypes: SubtypeOption[] = [
  { id: 'vehiculo_lujo', label: 'Vehículo de Lujo', description: 'BMW, Mercedes, Audi', Icon: Gem },
  { id: 'vehiculo_deportivo', label: 'Vehículo Deportivo', description: 'Porsche, Ferrari, Corvette', Icon: Zap },
  { id: 'vehiculo_bajo', label: 'Vehículo Muy Bajo', description: 'Lowered, stance', Icon: ArrowDown },
  { id: 'vehiculo_modificado', label: 'Vehículo Modificado', description: 'Aftermarket', Icon: Wrench },
  { id: 'traslado_especial', label: 'Traslado Especial', description: 'Eventos, exhibiciones', Icon: Star },
  { id: 'servicio_premium', label: 'Servicio Premium', description: 'Atención VIP', Icon: Crown },
];

// Nuevos subtipos para Motocicletas
const remolqueMotocicletasSubtypes: SubtypeOption[] = [
  { id: 'moto_accidentada', label: 'Moto Accidentada', description: 'Daños por accidente', Icon: AlertTriangle },
  { id: 'moto_no_prende', label: 'Moto que No Prende', description: 'Problemas mecánicos', Icon: XCircle },
  { id: 'scooter_pasola', label: 'Scooter / Pasola', description: 'Scooters y pasolas', Icon: Bike },
  { id: 'delivery_accidentado', label: 'Delivery Accidentado', description: 'Motos de delivery', Icon: Package },
  { id: 'moto_alto_cilindraje', label: 'Moto Alto Cilindraje', description: 'Harley, BMW', Icon: Flame },
  { id: 'traslado_local_moto', label: 'Traslado Local', description: 'Dentro de la ciudad', Icon: MapPin },
  { id: 'reubicacion_moto', label: 'Reubicación', description: 'Cambio de ubicación', Icon: Move },
];

// Actualizar subtypesByCategory
const subtypesByCategory: Record<string, SubtypeOption[]> = {
  'auxilio_vial': auxilioVialSubtypes,
  'remolque_especializado': remolqueEspecializadoSubtypes,
  'remolque_plataforma': remolquePlataformaSubtypes,        // ← NUEVO
  'remolque_motocicletas': remolqueMotocicletasSubtypes,    // ← NUEVO
  'vehiculos_pesados': vehiculosPesadosSubtypes,
  'maquinarias': maquinariasSubtypes,
  'izaje_construccion': izajeConstruccionSubtypes,
  'remolque_recreativo': remolqueRecreativoSubtypes,
};
```

#### 2.2 ServiceCategoryMultiSelect.tsx

Agregar nuevas categorías:

```typescript
// Iconos custom necesarios
function FlatbedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      {/* SVG de plataforma flatbed */}
    </svg>
  );
}

function MotorcycleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      {/* SVG de motocicleta */}
    </svg>
  );
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  // ... categorías existentes
  { 
    id: 'remolque_plataforma', 
    label: 'Plataforma / Flatbed', 
    description: 'Vehículos de lujo y bajos',
    Icon: FlatbedIcon,
    subtipos: subtypesByCategory['remolque_plataforma'] || []
  },
  { 
    id: 'remolque_motocicletas', 
    label: 'Remolque de Motocicletas', 
    description: 'Motos, scooters y pasolas',
    Icon: MotorcycleIcon, // o Bike de lucide-react
    subtipos: subtypesByCategory['remolque_motocicletas'] || []
  },
];
```

#### 2.3 ServiceCategorySelector.tsx (Cliente)

Agregar categorías para selección del cliente:

```typescript
const categories: Category[] = [
  // ... existentes
  { 
    id: 'remolque_plataforma', 
    label: 'Plataforma / Flatbed', 
    description: 'Vehículos de lujo, deportivos y muy bajos',
    Icon: FlatbedIcon 
  },
  { 
    id: 'remolque_motocicletas', 
    label: 'Remolque de Motocicletas', 
    description: 'Motos, scooters, pasolas',
    Icon: Bike 
  },
];
```

### Fase 3: Labels y Traducciones

#### 3.1 driver/dashboard.tsx

Actualizar serviceCategoryLabels:

```typescript
const serviceCategoryLabels: Record<string, string> = {
  remolque_estandar: "Remolque Estándar",
  auxilio_vial: "Auxilio Vial",
  remolque_especializado: "Remolque Especializado",
  remolque_plataforma: "Plataforma / Flatbed",        // ← NUEVO
  remolque_motocicletas: "Remolque de Motocicletas",  // ← NUEVO
  vehiculos_pesados: "Vehículos Pesados",
  maquinarias: "Maquinarias",
  izaje_construccion: "Izaje y Construcción",
  remolque_recreativo: "Remolque Recreativo",
  camiones_pesados: "Camiones Pesados",
};
```

#### 3.2 empresa/solicitudes.tsx y empresa/historial.tsx

Agregar opciones de filtro:

```typescript
const categoryOptions = [
  // ... existentes
  { value: 'remolque_plataforma', label: 'Plataforma / Flatbed' },
  { value: 'remolque_motocicletas', label: 'Remolque Motocicletas' },
];
```

### Fase 4: Backend y Storage

#### 4.1 server/routes.ts

- Actualizar validaciones para aceptar nuevas categorías
- Las rutas existentes ya usan VALID_SERVICE_CATEGORIES, solo necesitan actualización del schema

#### 4.2 Cálculo de Tarifas

Verificar que el sistema de tarifas soporte las nuevas categorías:

```typescript
// Asegurar que getTarifaByCategoria maneje las nuevas categorías
async function getTarifaByCategoria(categoria: string): Promise<Tarifa | null> {
  // Buscar tarifa específica para la categoría
  const tarifa = await storage.getTarifaByCategoria(categoria);
  if (tarifa) return tarifa;
  
  // Fallback a tarifa default si no existe específica
  return storage.getTarifaDefault();
}
```

### Fase 5: Admin Panel

#### 5.1 Gestión de Tarifas

- Asegurar que el panel admin pueda crear/editar tarifas para las nuevas categorías
- Agregar opciones en selectores de categoría

#### 5.2 Filtros en Monitoreo

- Agregar filtros por las nuevas categorías en la vista de monitoreo

---

## Consideraciones Adicionales

### Migración de Datos

- `vehiculo_lujo` actualmente es subtipo de `remolque_especializado`
- Decisión: ¿Mover a `remolque_plataforma` o mantener en ambos?
- Recomendación: Mover a `remolque_plataforma` y remover de `remolque_especializado`

### Compatibilidad con Operadores Existentes

- Operadores que ya ofrecen `remolque_especializado` con `vehiculo_lujo` deberán:
  1. Agregar `remolque_plataforma` a sus servicios
  2. Configurar vehículo para la nueva categoría

### Impacto en Matching

- El sistema de matching ya filtra por `servicioCategoria`
- Solo se mostrarán solicitudes de las nuevas categorías a operadores que las ofrezcan

### Testing Requerido

1. **Onboarding de conductor:**
   - Seleccionar nuevas categorías
   - Agregar vehículo para cada categoría
   
2. **Solicitud de cliente:**
   - Seleccionar Plataforma o Motocicletas
   - Verificar cálculo de tarifa
   
3. **Dashboard de operador:**
   - Ver solicitudes de nuevas categorías
   - Aceptar y completar servicio

4. **Admin:**
   - Crear/editar tarifas para nuevas categorías
   - Filtrar en monitoreo

---

## Archivos a Modificar

| Archivo | Cambios | Prioridad |
|---------|---------|-----------|
| `shared/schema.ts` | Agregar categorías y subtipos a enums | Alta |
| `client/src/components/ServiceSubtypeSelector.tsx` | Agregar arrays de subtipos | Alta |
| `client/src/components/ServiceCategoryMultiSelect.tsx` | Agregar categorías para operadores | Alta |
| `client/src/components/ServiceCategorySelector.tsx` | Agregar categorías para clientes | Alta |
| `client/src/pages/driver/dashboard.tsx` | Actualizar labels | Media |
| `client/src/pages/empresa/solicitudes.tsx` | Agregar opciones de filtro | Media |
| `client/src/pages/empresa/historial.tsx` | Agregar opciones de filtro | Media |
| `client/src/pages/client/home.tsx` | Manejar nuevas categorías | Alta |
| `server/routes.ts` | Validaciones (si es necesario) | Baja |
| Base de datos | Migración de enums | Alta |

---

## Orden de Implementación Sugerido

1. **Fase 1** - Schema y migración de BD (2-3 horas)
2. **Fase 2** - Componentes frontend (3-4 horas)
3. **Fase 3** - Labels y traducciones (1 hora)
4. **Fase 4** - Backend ajustes (1 hora)
5. **Fase 5** - Admin panel (1-2 horas)
6. **Testing** - Pruebas end-to-end (2-3 horas)

**Tiempo total estimado:** 10-14 horas

---

## Criterios de Éxito

- [ ] Clientes pueden solicitar servicio de Plataforma/Flatbed
- [ ] Clientes pueden solicitar servicio de Motocicletas
- [ ] Operadores pueden registrarse ofreciendo las nuevas categorías
- [ ] Operadores pueden agregar vehículos para las nuevas categorías
- [ ] Sistema de matching funciona correctamente con las nuevas categorías
- [ ] Tarifas diferenciadas para cada nueva categoría
- [ ] Admin puede gestionar tarifas de las nuevas categorías
- [ ] Filtros funcionan en panel de empresa
- [ ] Labels correctos en todos los lugares de la app

---

## Notas Técnicas

### PostgreSQL Enum Updates

PostgreSQL permite agregar valores a enums existentes pero no eliminarlos. Por eso:

```sql
-- Esto funciona:
ALTER TYPE servicio_categoria ADD VALUE 'remolque_plataforma';

-- Esto NO funciona directamente:
ALTER TYPE servicio_categoria DROP VALUE 'valor_existente';
```

### Orden de Categorías en UI

Considerar el orden de presentación de categorías al cliente:

1. Remolque Estándar (más común)
2. Remolque de Motocicletas (nuevo - alta demanda)
3. Plataforma / Flatbed (nuevo - premium)
4. Auxilio Vial
5. Remolque Especializado
6. ... resto

---

## Aprobación

| Rol | Nombre | Fecha | Estado |
|-----|--------|-------|--------|
| Product Owner | | | Pendiente |
| Tech Lead | | | Pendiente |
| QA | | | Pendiente |

---

*Documento creado automáticamente - Grúa RD*
