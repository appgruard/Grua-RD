# Plan de Implementación - Servicios de Conductores y Validación Verifik

## Resumen del Proyecto
Actualizar la plataforma Grúa RD para soportar especialización de servicios de conductores y validación de documentos mediante API Verifik con puntuación mínima de 0.6.

## Estado Actual ✅

### Tareas Completadas
1. **Esquema de Base de Datos Actualizado**
   - ✅ Tablas `conductor_servicios` y `conductor_servicio_subtipos` creadas
   - ✅ Campos de validación Verifik agregados a tabla `documentos`
   - ✅ Relaciones y esquemas Zod definidos
   - ✅ Migraciones de BD ejecutadas

2. **Servicio Verifik Extendido**
   - ✅ Función `validateFacePhoto()` para reconocimiento facial (score ≥ 0.6)
   - ✅ Función `validateDriverLicense()` para validación de licencia de conducir
   - ✅ Función `validateDocument()` unificada para ambos tipos
   - ✅ Manejo de puntuaciones y normalizaciones

3. **Backend - Storage y Rutas**
   - ✅ Métodos en `IStorage` para gestionar servicios de conductores
   - ✅ Implementación en `DatabaseStorage` para CRUD de servicios
   - ✅ Rutas de API en `/api/drivers/me/servicios` (GET/PUT)
   - ✅ Rutas admin en `/api/admin/drivers/:id/servicios` (GET/PUT)
   - ✅ Ruta de validación de documentos en `/api/documents/:id/validate` (POST)

4. **Componente ServiceCategoryMultiSelect**
   - ✅ Componente creado en `client/src/components/ServiceCategoryMultiSelect.tsx`
   - ✅ Soporte para 6 categorías de servicio con iconos personalizados
   - ✅ Subtipos específicos para cada categoría
   - ✅ Selección múltiple de categorías y subtipos
   - ✅ Exportación de tipos y constantes (SERVICE_CATEGORIES, ServiceSelection)

5. **Wizard de Onboarding - Paso de Servicios (Tarea 4)**
   - ✅ Paso 5 agregado al wizard para conductores: "Servicios Ofrecidos"
   - ✅ TOTAL_STEPS aumentado de 6 a 7
   - ✅ Estado y persistencia de servicios seleccionados en sessionStorage
   - ✅ Mutación `saveServicesMutation` para guardar servicios vía PUT /api/drivers/me/servicios
   - ✅ Validación: mínimo 1 categoría requerida
   - ✅ Flujo: Documentos (paso 4) → Servicios (paso 5) → Datos Vehículo (paso 6) → Confirmación (paso 7)

6. **Perfil del Conductor - Gestión de Servicios (Tarea 5)**
   - ✅ Sección "Servicios Ofrecidos" en perfil del conductor
   - ✅ Vista de servicios actuales con badges de categorías y subtipos
   - ✅ Modo edición con ServiceCategoryMultiSelect
   - ✅ Botones Editar/Cancelar/Guardar con estados de carga
   - ✅ Sección "Verificación de Identidad" con estado Verifik
   - ✅ Barra de progreso visual para puntuación de validación
   - ✅ Detalles de validación: coincidencia facial, validez de documento, prueba de vida

7. **Panel Admin - Servicios y Validación (Tarea 6)**
   - ✅ Columna "Servicios" con badges expandibles por conductor
   - ✅ Columna "Verificación" con badge de estado Verifik y score
   - ✅ Tooltips con detalles de subtipos y puntuaciones
   - ✅ Badge expandir/colapsar para conductores con múltiples servicios
   - ✅ Colores de score: verde (≥60%), amarillo (40-60%), rojo (<40%)

---

## Tareas Pendientes 📋

### ~~Tarea 4: Wizard de Onboarding - Selección de Servicios~~ ✅ COMPLETADA
**Archivo Principal:** `client/src/pages/auth/onboarding-wizard.tsx`

#### Descripción
Agregar un nuevo paso en el wizard de onboarding donde los conductores seleccionen **MÚLTIPLES categorías de servicios** que pueden ofrecer y sus subtipos específicos. 

**Requisito Clave:** Los conductores DEBEN poder seleccionar más de una categoría de servicio durante el registro (ej: Remolque Estándar + Auxilio Vial + Remolque Especializado).

#### Cambios Necesarios

##### 4.1 Agregar Paso de Servicios al Wizard
- Insertar nuevo paso entre "Documentos" y "Verificación"
- Orden sugerido de pasos:
  1. Información Personal
  2. Información del Vehículo
  3. Documentos
  4. **[NUEVO] Servicios Ofrecidos** ← Aquí
  5. Foto de Perfil
  6. Verificación

##### 4.2 Crear Componente `ServiceCategorySelector`
- **Ubicación:** `client/src/components/ServiceCategorySelector.tsx`
- **Funcionalidad:**
  - Mostrar 6 categorías principales con checkbox
  - Para cada categoría seleccionada, mostrar subtipos como chips/tags
  - Permitir seleccionar múltiples subtipos por categoría
  - Validación: Mínimo 1 categoría requerida

**Categorías:**
```
1. remolque_estandar → cambio_goma, inflado_neumatico, paso_corriente, etc.
2. auxilio_vial → suministro_combustible, envio_bateria, diagnostico_obd
3. remolque_especializado → vehiculo_lujo, vehiculo_electrico
4. camiones_pesados → camion_liviano, camion_mediano, patana_cabezote
5. izaje_construccion → izaje_materiales, montacargas, retroexcavadora
6. remolque_recreativo → remolque_botes, remolque_jetski, remolque_cuatrimoto
```

##### 4.3 Integración en Wizard
```typescript
- Agregar estado: const [servicios, setServicios] = useState([])
- En onComplete(): llamar a POST /api/drivers/me/servicios
- Mostrar spinner durante envío
- Manejar errores de validación
```

---

### ~~Tarea 5: Perfil del Conductor - Gestión de Servicios~~ ✅ COMPLETADA
**Archivo Principal:** `client/src/pages/driver/profile.tsx`

#### Estado: COMPLETADO
- Sección "Servicios Ofrecidos" implementada con vista/edición
- Sección "Verificación de Identidad" con estado Verifik y puntuación visual
- Botones de editar/cancelar/guardar con estados de carga correctos

#### Cambios Necesarios

##### 5.1 Nueva Sección "Servicios Ofrecidos"
- Card que muestre categorías actuales
- Botón "Editar Servicios" → modal con `ServiceCategorySelector`
- Guardar cambios llamando a PUT `/api/drivers/me/servicios`
- Mostrar confirmación después de guardar

##### 5.2 Integración con Validación Verifik
**En sección de Documentos:**
- Para cada documento, mostrar:
  - Estado: Pendiente / Validando / Aprobado / Rechazado
  - Si validado: Mostrar score (ej: "Score: 0.85/1.0")
  - Botón "Validar Ahora" para documentos pendientes
  - Si rechazado: Mostrar razón del rechazo

##### 5.3 Flujo de Validación de Documento
- Clic en "Validar Ahora":
  - Mostrar spinner
  - Llamar a POST `/api/documents/:id/validate`
  - Esperar respuesta
  - Mostrar resultado: "✓ Aprobado (Score: 0.87)" o "✗ Rechazado: Calidad muy baja"
  - Auto-actualizar estado en lista

##### 5.4 Cambios en UI del Perfil
```typescript
// Agregar tabs o secciones:
- Tab 1: "Mi Información" (datos personales, vehículo)
- Tab 2: "Servicios" (categorías y subtipos)
- Tab 3: "Documentos" (con validación Verifik)
```

---

### ~~Tarea 6: Panel Admin - Servicios y Validación de Conductores~~ ✅ COMPLETADA
**Archivo Principal:** `client/src/pages/admin/drivers.tsx`

#### Estado: COMPLETADO
- Columna "Servicios" con badges expandibles
- Columna "Verificación" con score Verifik
- Tooltips informativos en badges
- Indicadores de color según puntuación

#### Cambios Necesarios

##### 6.1 Estructura de Tabla de Conductores
Agregar columnas:
- **Servicios:** Mostrar badges con categorías (ej: "Remolque Est. • Auxilio Vial")
- **Validación:** Status visual (iconos + scores)
  - 🟢 Aprobado: Score ≥ 0.6
  - 🟡 Pendiente: Sin validar
  - 🔴 Rechazado: Score < 0.6

##### 6.2 Expandable Row (o Modal)
Al hacer clic en conductor:
- Mostrar detalles completos de servicios
- Panel de documentos con scores Verifik:
  ```
  Documento          | Tipo      | Score  | Estado
  ─────────────────────────────────────────────
  Foto Perfil        | Face      | 0.92   | ✓ Aprobado
  Licencia           | License   | 0.68   | ✓ Aprobado
  Cédula Frente      | Cedula    | 0.85   | ✓ Aprobado
  Seguro Grúa        | -         | -      | ⏳ Pendiente
  ```

##### 6.3 Acciones de Admin
- Botón "Editar Servicios" para modificar categorías de conductor
- Botón "Re-validar Documento" para forzar nueva validación
- Ver historial de validaciones (fecha, score anterior, score nuevo)

##### 6.4 Filtros y Búsqueda
- Filtrar por: Categoría de servicio, Estado de validación, Disponibilidad
- Buscar por: Nombre, Cédula, Placa

---

## Especificaciones Técnicas 🔧

### Frontend - Componentes a Crear/Modificar

#### Nuevos Componentes:
1. **ServiceCategorySelector.tsx**
   - Props: selectedServices, onChange, isLoading
   - Muestra categorías con checkbox
   - Subtipos como MultiSelect o Chips
   - Validación cliente-side

2. **VerifikValidationBadge.tsx**
   - Componente reutilizable para mostrar estado Verifik
   - Props: score, estado, tipo, detalles
   - Muestra color, icono, score

#### Modificaciones:
- `onboarding-wizard.tsx`: Agregar paso de servicios
- `profile.tsx`: Agregar sección de servicios y estados de validación
- `drivers.tsx` (admin): Agregar columnas y expandable rows

### Backend - API Endpoints Existentes

```
GET    /api/drivers/me/servicios
PUT    /api/drivers/me/servicios
POST   /api/documents/:id/validate

GET    /api/admin/drivers/:driverId/servicios
PUT    /api/admin/drivers/:driverId/servicios
```

### Estados de Validación Verifik

| Estado | Significado | Acción |
|--------|-------------|--------|
| `pendiente` | No validado | Mostrar botón "Validar" |
| `validando` | En progreso | Mostrar spinner |
| `aprobado` | Score ≥ 0.6 | Mostrar ✓ verde + score |
| `rechazado` | Score < 0.6 | Mostrar ✗ rojo + razón |

---

## Flujos de Usuario 👥

### Flujo 1: Nuevo Conductor en Onboarding
1. Completa pasos 1-3 (datos personales, vehículo, documentos)
2. **Llega a paso "Servicios Ofrecidos"**
3. Selecciona categorías (ej: Remolque Estándar, Auxilio Vial)
4. Para cada categoría, selecciona subtipos (ej: Cambio Goma, Paso Corriente)
5. Click "Siguiente" → POST `/api/drivers/me/servicios`
6. Continúa con foto de perfil y verificación

### Flujo 2: Añadir/Editar Servicios Post-Registro (Perfil del Conductor)
1. Conductor ya completó el onboarding y está registrado
2. Accede a su perfil → Tab "Servicios"
3. Ve sus servicios actuales (ej: "Remolque Estándar" con subtipos)
4. Hace clic en botón "Editar Servicios" o "Agregar Servicios"
5. Se abre modal con `ServiceCategorySelector`
6. Puede:
   - Agregar nuevas categorías (ej: ahora quiere ofrecer "Auxilio Vial")
   - Editar subtipos de categorías existentes
   - Remover categorías que ya no ofrece
7. Click "Guardar" → PUT `/api/drivers/me/servicios`
8. Confirmación: "✓ Servicios actualizados"

### Flujo 3: Validación de Documentos (Perfil del Conductor)
1. Conductor accede a su perfil → Tab "Documentos"
2. Ve estado de validación de cada documento
3. Para documento sin validar, hace clic "Validar Ahora"
4. Sistema inicia validación Verifik (face/license)
5. Resultado: "✓ Aprobado (Score: 0.87)" o "✗ Rechazado: Imagen borrosa"
6. Se actualiza automáticamente

### Flujo 4: Revisión de Admin
1. Admin accede a panel de conductores
2. Filtra por estado de validación (ej: "Pendientes de Validación")
3. Expande fila de conductor para ver detalles
4. Ve matriz de documentos con scores Verifik
5. Puede re-validar o editar servicios según sea necesario

---

## Prioridad de Implementación 🎯

1. **Alta (MVP):** Tarea 4 (Wizard de servicios)
2. **Alta (MVP):** Tarea 5 (Perfil del conductor + validación)
3. **Media:** Tarea 6 (Panel admin - servicios básicos)
4. **Baja:** Panel admin - validaciones detalladas

---

## Consideraciones de Diseño 🎨

- Usar componentes Shadcn/UI existentes
- Seguir paleta de colores del sistema
- Mantener consistencia con diseño actual
- Validaciones en cliente antes de enviar
- Mensajes de error claros y amigables
- Spinners/skeletons durante carga
- Estados visuales claros (aprobado/rechazado/pendiente)

---

## Checklist de Validación ✓

Antes de marcar completa cada tarea:
- [ ] Datos se guardan correctamente en BD
- [ ] Estados se actualizan en tiempo real
- [ ] Mensajes de error son claros
- [ ] Funciona en mobile
- [ ] No hay console errors
- [ ] Validaciones funcionan (mínimo 1 servicio, score ≥ 0.6)
- [ ] Test manual de flujos de usuario

---

## Próximos Pasos Después de Implementación

1. Testing E2E con Playwright
2. Integración con Verifik API real (si no está configurada)
3. Implementar webhook de notificaciones para validaciones
4. Dashboard de analytics de servicios
5. Reporte de conductores más valorados por categoría
