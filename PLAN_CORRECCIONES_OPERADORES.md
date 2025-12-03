# Plan de Correcciones y Mejoras - Sistema de Operadores

## Resumen Ejecutivo

Este documento describe el plan por fases para resolver los problemas identificados y agregar las mejoras solicitadas al sistema de operadores de GruaRD.

---

## Fase 1: Corrección de Errores de Conexión ✅ COMPLETADA

**Fecha de completación:** 3 de Diciembre de 2025

### 1.1 Error en Módulo de Analytics (Admin) ✅

**Problema identificado:**
- Al entrar al módulo de Analytics, se produce un error de conexión
- Las rutas de Analytics hacen múltiples llamadas a funciones de storage que consultan la base de datos

**Archivos modificados:**
- `client/src/pages/admin/analytics.tsx` - Componente frontend de Analytics

**Acciones completadas:**
1. ✅ Agregado retry logic (2 reintentos con 1 segundo de delay) en todas las queries
2. ✅ Agregado estado de error (`isError`) para cada query individual
3. ✅ Agregado funciones de refetch para cada query
4. ✅ Implementado componente `ErrorCard` con botón de reintentar
5. ✅ Agregado banner de error global cuando hay errores de conexión
6. ✅ Agregado botón "Reintentar Todo" para recargar todas las queries
7. ✅ Deshabilitados botones de exportación cuando hay errores

**Endpoints con manejo de errores mejorado:**
- `/api/admin/analytics/revenue`
- `/api/admin/analytics/services`
- `/api/admin/analytics/drivers`
- `/api/admin/analytics/peak-hours`
- `/api/admin/analytics/status-breakdown`
- `/api/admin/analytics/heatmap`
- `/api/admin/analytics/kpis`
- `/api/admin/analytics/vehicles`

### 1.2 Error en Historial de Operadores ✅

**Problema identificado:**
- Al abrir el historial en la app de operadores, se produce el mismo error de conexión

**Archivos modificados:**
- `client/src/pages/driver/history.tsx` - Componente frontend de Historial

**Acciones completadas:**
1. ✅ Agregado retry logic (2 reintentos con 1 segundo de delay)
2. ✅ Agregado estado de error (`isError`) con refetch
3. ✅ Implementada pantalla de error completa con:
   - Icono de error
   - Mensaje descriptivo en español
   - Botón "Reintentar" para recargar

---

## Fase 2: Validación de Selección de Categorías en Registro

### Estado Actual
El sistema ya tiene implementado:
- Componente `ServiceCategoryMultiSelect` para selección de categorías
- Paso en el wizard de onboarding para categorías (paso 6)

**Archivos relevantes:**
- `client/src/pages/auth/onboarding-wizard.tsx`
- `client/src/components/ServiceCategoryMultiSelect.tsx`

### Mejoras Requeridas

**2.1 Validación obligatoria de categorías:**
- Asegurar que los operadores seleccionen al menos una categoría
- Mostrar mensaje de error si intentan continuar sin seleccionar
- Validar que las categorías seleccionadas sean válidas

**2.2 Flujo de registro:**
```
Paso 1: Cuenta (email, password, tipo usuario)
Paso 2: Verificación de cédula (OCR)
Paso 3: Verificación de teléfono (OTP)
Paso 4: Documentos (licencia, seguro)
Paso 5: Foto de perfil verificada
Paso 6: Selección de categorías de servicio  <-- Validar aquí
Paso 7: Datos de vehículos por categoría      <-- Agregar vehículos
Paso 8: Confirmación final
```

---

## Fase 3: Sistema de Vehículos Múltiples por Categoría

### Estado Actual
El sistema ya tiene:
- Tabla `conductor_vehiculos` en la base de datos
- Componente `VehicleCategoryForm` para formulario de vehículos
- Endpoints en `server/routes.ts`:
  - `GET /api/drivers/me/vehiculos` - Obtener vehículos
  - `POST /api/drivers/me/vehiculos` - Crear vehículo
  - `PATCH /api/drivers/me/vehiculos/:id` - Actualizar vehículo
  - `DELETE /api/drivers/me/vehiculos/:id` - Eliminar vehículo

### Mejoras Requeridas

**3.1 Campos obligatorios por vehículo:**
- Modelo (campo `modelo`)
- Matrícula/Placa (campo `placa`)
- Categoría (campo `categoria`)
- Color (campo `color`)

**3.2 Validaciones:**
```typescript
interface VehicleData {
  categoria: string;    // Obligatorio - categoría a la que pertenece
  placa: string;        // Obligatorio - matrícula del vehículo
  modelo: string;       // Obligatorio - modelo del vehículo
  color: string;        // Obligatorio - color del vehículo
  marca?: string;       // Opcional - marca
  anio?: string;        // Opcional - año
  capacidad?: string;   // Opcional - capacidad
  detalles?: string;    // Opcional - detalles adicionales
}
```

**3.3 Reglas de negocio:**
- Cada categoría requiere al menos un vehículo
- No se puede avanzar al siguiente paso sin completar vehículos para todas las categorías
- Validar formato de matrícula

**Archivos a modificar:**
- `client/src/components/VehicleCategoryForm.tsx` - Hacer campos obligatorios
- `client/src/pages/auth/onboarding-wizard.tsx` - Validar antes de continuar
- `server/routes.ts` - Validación en backend
- `client/src/pages/driver/profile.tsx` - Gestión de vehículos post-registro

---

## Fase 4: Información del Servicio en Pantalla de Operadores ✅ COMPLETADA

**Fecha de completación:** 3 de Diciembre de 2025

### Estado Anterior
En `client/src/pages/driver/dashboard.tsx`:
- Ya se mostraba el mapa con la ubicación del operador
- Ya se mostraba información básica del servicio activo
- Ya se mostraba el nombre del cliente

### Mejoras Implementadas

**4.1 Labels amigables agregados:**

Se agregaron objetos de mapeo para mostrar nombres legibles de categorías de servicio y tipos de vehículo:

```typescript
const serviceCategoryLabels = {
  remolque_estandar: "Remolque Estándar",
  auxilio_vial: "Auxilio Vial",
  remolque_especializado: "Remolque Especializado",
  camiones_pesados: "Camiones Pesados",
  vehiculos_pesados: "Vehículos Pesados",
  maquinarias: "Maquinarias",
  izaje_construccion: "Izaje y Construcción",
  remolque_recreativo: "Remolque Recreativo"
};

const vehicleTypeLabels = {
  carro: "Carro",
  motor: "Motocicleta",
  jeep: "Jeep/SUV",
  camion: "Camión"
};
```

**4.2 UI del servicio activo mejorada:**

Se agregó una nueva sección en el card del servicio activo que muestra:
- Tipo de Servicio (usando `servicioCategoria`)
- Vehículo del Cliente (usando `tipoVehiculo`)

Información mostrada:
```
┌─────────────────────────────────────┐
│ Cliente: [Nombre Apellido]          │
├───────────────┬─────────────────────┤
│ Tipo Servicio │ Vehículo Cliente    │
│ Remolque Est. │ Carro               │
├───────────────┴─────────────────────┤
│ Origen → Destino                    │
├─────────────────────────────────────┤
│ Distancia: 5.2 km | Ganancia: $1500 │
└─────────────────────────────────────┘
```

**4.3 UI de solicitudes cercanas mejorada:**

Se agregaron badges informativos en cada tarjeta de solicitud:
- Badge de categoría de servicio (variant="secondary")
- Badge de tipo de vehículo (variant="outline")

**Archivo modificado:**
- `client/src/pages/driver/dashboard.tsx`

**Test IDs agregados:**
- `service-details-info` - Contenedor de detalles del servicio
- `text-service-category` - Texto de categoría de servicio
- `text-vehicle-type` - Texto de tipo de vehículo
- `request-details-{id}` - Detalles de cada solicitud
- `badge-service-category-{id}` - Badge de categoría por solicitud
- `badge-vehicle-type-{id}` - Badge de tipo de vehículo por solicitud

---

## Fase 5: Integración con Waze para Navegación

### Estado Actual
El sistema YA tiene implementada la integración con Waze:

**Archivo:** `client/src/lib/maps.ts`
```typescript
export function generateWazeNavigationUrl(lat, lng): string | null {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function getNavigationUrl(lat, lng): string | null {
  // Primero intenta Waze, luego Google Maps como fallback
  const wazeUrl = generateWazeNavigationUrl(parsedLat, parsedLng);
  if (wazeUrl) return wazeUrl;
  return generateGoogleMapsNavigationUrl(parsedLat, parsedLng);
}
```

**En dashboard.tsx (líneas 464-488):**
- Ya existen botones "Ir al origen" y "Ir al destino" con icono de Waze
- Los botones abren Waze con las coordenadas del cliente

### Verificaciones Necesarias

**5.1 Verificar funcionamiento actual:**
- Confirmar que el botón de Waze aparece en los estados correctos:
  - `aceptado` o `conductor_en_sitio` → Mostrar "Ir al origen"
  - `cargando` o `en_progreso` → Mostrar "Ir al destino"

**5.2 Mejoras opcionales:**
- Agregar detección de plataforma (iOS/Android)
- Si Waze no está instalado, abrir app store para descargarlo
- Agregar botón alternativo para Google Maps

---

## Resumen de Archivos a Modificar

| Archivo | Fase | Descripción |
|---------|------|-------------|
| `server/storage.ts` | 1 | Agregar manejo de errores en funciones de analytics |
| `server/routes.ts` | 1, 3 | Mejorar endpoints de analytics, validar vehículos |
| `client/src/pages/admin/analytics.tsx` | 1 | Mostrar errores amigables |
| `client/src/pages/driver/history.tsx` | 1 | Manejo de errores de conexión |
| `client/src/pages/auth/onboarding-wizard.tsx` | 2, 3 | Validar categorías y vehículos |
| `client/src/components/VehicleCategoryForm.tsx` | 3 | Campos obligatorios |
| `client/src/pages/driver/dashboard.tsx` | 4 | Mostrar info de servicio |
| `client/src/pages/driver/profile.tsx` | 3 | Gestión de vehículos |

---

## Orden de Implementación Recomendado

1. **Fase 1** (Prioridad Alta): Corregir errores de conexión - Impide uso del sistema
2. **Fase 4** (Prioridad Alta): Info de servicio en mapa - Necesario para operación
3. **Fase 5** (Prioridad Media): Verificar Waze - Ya implementado, solo validar
4. **Fase 2** (Prioridad Media): Validar categorías - Mejora de calidad
5. **Fase 3** (Prioridad Media): Vehículos múltiples - Mejora de funcionalidad

---

## Criterios de Éxito

- [x] Analytics carga sin errores de conexión (Fase 1 ✅)
- [x] Historial de operadores carga correctamente (Fase 1 ✅)
- [ ] Operadores pueden seleccionar categorías al registrarse (Fase 2)
- [ ] Operadores pueden agregar múltiples vehículos por categoría (Fase 3)
- [ ] Se muestran los 4 campos obligatorios: Modelo, Matrícula, Categoría, Color (Fase 3)
- [x] En el mapa se muestra: Nombre cliente, tipo servicio, categoría vehículo (Fase 4 ✅)
- [ ] Botón de Waze abre navegación hacia el cliente (Fase 5 - pendiente verificación)

---

## Notas Técnicas

### Base de Datos
Las tablas relevantes ya existen:
- `conductor_vehiculos` - Vehículos de operadores
- `conductor_servicios` - Categorías de servicio por operador
- `conductor_servicio_subtipos` - Subtipos de servicio
- `servicios` - Servicios con campos `servicioCategoria` y `tipoVehiculo`

### API Endpoints Existentes
- Vehículos: `/api/drivers/me/vehiculos`
- Servicios: `/api/drivers/me/servicios`
- Servicio activo: `/api/drivers/active-service`

---

*Documento creado: 2 de Diciembre de 2025*
*Versión: 1.0*
