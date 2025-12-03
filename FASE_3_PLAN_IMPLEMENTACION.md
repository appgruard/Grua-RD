# Plan de Implementación - Fase 3 Opción B

## Modelo Obligatorio + Validación de Formato de Placa Dominicana

**Fecha:** 3 de Diciembre de 2025  
**Esfuerzo estimado:** 30-45 minutos

---

## 1. Resumen de Cambios

| # | Cambio | Archivo | Prioridad |
|---|--------|---------|-----------|
| 1 | Agregar asterisco (*) al label de Modelo | VehicleCategoryForm.tsx | Alta |
| 2 | Actualizar `isVehicleComplete()` para incluir modelo | VehicleCategoryForm.tsx | Alta |
| 3 | Actualizar `validateStep7()` para incluir modelo | onboarding-wizard.tsx | Alta |
| 4 | Agregar validación de modelo al endpoint | server/routes.ts | Alta |
| 5 | Agregar validación de formato de placa | VehicleCategoryForm.tsx | Media |
| 6 | Agregar validación de formato de placa al backend | server/routes.ts | Media |
| 7 | Actualizar mensajes de error | Ambos | Media |
| 8 | Actualizar documentación | PLAN_CORRECCIONES_OPERADORES.md | Baja |

---

## 2. Formatos de Placa Dominicana

### 2.1 Formatos Válidos

| Tipo | Formato | Ejemplo | Regex |
|------|---------|---------|-------|
| Vehículos privados | Letra + 6 dígitos | A123456 | `^[A-Z]\d{6}$` |
| Vehículos públicos | P + 6 dígitos | P123456 | `^P\d{6}$` |
| Gubernamentales | G/E + 5-6 dígitos | G12345 | `^[GE]\d{5,6}$` |
| Motocicletas | K/M + 5-6 dígitos | K12345 | `^[KM]\d{5,6}$` |
| Diplomáticos | CD/CC + números | CD1234 | `^C[CD]\d{4}$` |
| Remolques/Trailers | R + 5-6 dígitos | R12345 | `^R\d{5,6}$` |

### 2.2 Regex Unificada Propuesta

```typescript
const PLACA_DOMINICANA_REGEX = /^[A-Z]{1,2}\d{4,6}$/;
```

Esta regex permite:
- 1-2 letras mayúsculas al inicio
- 4-6 dígitos al final
- Cubre todos los formatos comunes sin ser demasiado restrictiva

---

## 3. Tareas Detalladas

### Tarea 1: Actualizar VehicleCategoryForm.tsx

**Ubicación:** `client/src/components/VehicleCategoryForm.tsx`

**Cambio 1.1 - Label de Modelo:**
```tsx
// ANTES (línea ~190)
<Label htmlFor={`modelo-${categoria}`}>Modelo</Label>

// DESPUÉS
<Label htmlFor={`modelo-${categoria}`}>Modelo *</Label>
```

**Cambio 1.2 - Función isVehicleComplete:**
```typescript
// ANTES (líneas 78-80)
const isVehicleComplete = (vehicle: VehicleData): boolean => {
  return Boolean(vehicle.placa && vehicle.color);
};

// DESPUÉS
const isVehicleComplete = (vehicle: VehicleData): boolean => {
  return Boolean(vehicle.placa && vehicle.color && vehicle.modelo);
};
```

**Cambio 1.3 - Agregar validación de placa (nuevo):**
```typescript
// Agregar después de las interfaces (~línea 30)
const PLACA_DOMINICANA_REGEX = /^[A-Z]{1,2}\d{4,6}$/;

const isValidPlaca = (placa: string): boolean => {
  return PLACA_DOMINICANA_REGEX.test(placa.toUpperCase().trim());
};
```

**Cambio 1.4 - Actualizar isVehicleComplete para validar formato:**
```typescript
const isVehicleComplete = (vehicle: VehicleData): boolean => {
  return Boolean(
    vehicle.placa && 
    vehicle.color && 
    vehicle.modelo && 
    isValidPlaca(vehicle.placa)
  );
};
```

**Cambio 1.5 - Agregar mensaje de error en UI para placa inválida:**
```tsx
// En el input de placa, agregar validación visual
<Input
  id={`placa-${categoria}`}
  placeholder="A123456"
  value={vehicle.placa}
  onChange={(e) => updateVehicle(categoria, 'placa', e.target.value.toUpperCase())}
  disabled={disabled}
  className={vehicle.placa && !isValidPlaca(vehicle.placa) ? 'border-destructive' : ''}
  data-testid={`input-placa-${categoria}`}
/>
{vehicle.placa && !isValidPlaca(vehicle.placa) && (
  <p className="text-xs text-destructive">Formato inválido. Ej: A123456</p>
)}
```

---

### Tarea 2: Actualizar onboarding-wizard.tsx

**Ubicación:** `client/src/pages/auth/onboarding-wizard.tsx`

**Cambio 2.1 - Agregar regex (al inicio del archivo):**
```typescript
const PLACA_DOMINICANA_REGEX = /^[A-Z]{1,2}\d{4,6}$/;
```

**Cambio 2.2 - Actualizar validateStep7:**
```typescript
// ANTES
const validateStep7 = (): boolean => {
  const newErrors: StepErrors = {};
  const selectedCategories = selectedServices.map(s => s.categoria);
  
  for (const categoria of selectedCategories) {
    const vehicle = vehicleData.find(v => v.categoria === categoria);
    if (!vehicle || !vehicle.placa || !vehicle.color) {
      newErrors[`vehicle_${categoria}`] = 'Placa y color son requeridos';
    }
  }
  
  if (!formData.licencia.trim()) newErrors.licencia = 'Número de licencia requerido';
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// DESPUÉS
const validateStep7 = (): boolean => {
  const newErrors: StepErrors = {};
  const selectedCategories = selectedServices.map(s => s.categoria);
  
  for (const categoria of selectedCategories) {
    const vehicle = vehicleData.find(v => v.categoria === categoria);
    if (!vehicle || !vehicle.placa || !vehicle.color || !vehicle.modelo) {
      newErrors[`vehicle_${categoria}`] = 'Placa, color y modelo son requeridos';
    } else if (!PLACA_DOMINICANA_REGEX.test(vehicle.placa.toUpperCase().trim())) {
      newErrors[`vehicle_${categoria}`] = 'Formato de placa inválido. Ej: A123456';
    }
  }
  
  if (!formData.licencia.trim()) newErrors.licencia = 'Número de licencia requerido';
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

### Tarea 3: Actualizar server/routes.ts

**Ubicación:** `server/routes.ts` - Endpoint POST /api/drivers/me/vehiculos

**Cambio 3.1 - Agregar regex y validación:**
```typescript
// Agregar al inicio del archivo o cerca del endpoint
const PLACA_DOMINICANA_REGEX = /^[A-Z]{1,2}\d{4,6}$/;

// En el endpoint POST /api/drivers/me/vehiculos
// ANTES
if (!categoria || !placa || !color) {
  return res.status(400).json({ message: "Categoria, placa y color son requeridos" });
}

// DESPUÉS
if (!categoria || !placa || !color || !modelo) {
  return res.status(400).json({ message: "Categoría, placa, color y modelo son requeridos" });
}

const placaNormalizada = placa.toUpperCase().trim();
if (!PLACA_DOMINICANA_REGEX.test(placaNormalizada)) {
  return res.status(400).json({ 
    message: "Formato de placa inválido. Use formato dominicano (ej: A123456)" 
  });
}
```

---

### Tarea 4: Actualizar Documentación

**Ubicación:** `PLAN_CORRECCIONES_OPERADORES.md`

- Marcar Fase 3 como ✅ COMPLETADA
- Documentar los cambios realizados
- Actualizar criterios de éxito

---

## 4. Orden de Implementación

```
1. VehicleCategoryForm.tsx
   ├── Agregar regex
   ├── Actualizar isVehicleComplete
   ├── Agregar asterisco a Modelo
   └── Agregar validación visual de placa

2. onboarding-wizard.tsx
   ├── Agregar regex
   └── Actualizar validateStep7

3. server/routes.ts
   ├── Agregar regex
   └── Actualizar validación del endpoint

4. Probar flujo completo

5. PLAN_CORRECCIONES_OPERADORES.md
   └── Marcar Fase 3 como completada
```

---

## 5. Pruebas a Realizar

| # | Escenario | Resultado Esperado |
|---|-----------|-------------------|
| 1 | Registrar vehículo sin modelo | Error: "Placa, color y modelo son requeridos" |
| 2 | Registrar vehículo con placa "ABC" | Error: "Formato de placa inválido" |
| 3 | Registrar vehículo con placa "A123456" | ✅ Válido |
| 4 | Registrar vehículo con placa "P123456" | ✅ Válido |
| 5 | Registrar vehículo con placa "CD1234" | ✅ Válido |
| 6 | Badge muestra "Pendiente" sin modelo | ✅ Correcto |
| 7 | Badge muestra "Configurado" con todos los campos | ✅ Correcto |

---

## 6. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Placas existentes inválidas | Media | Regex es flexible, acepta mayoría de formatos |
| Operadores confundidos por nuevo requisito | Baja | Mensaje de error claro con ejemplo |
| Formato de placa muy restrictivo | Baja | Regex acepta 1-2 letras + 4-6 dígitos |

---

## 7. Decisión Requerida

¿Proceder con la implementación?

- [ ] **Sí, implementar según este plan**
- [ ] **Modificar el plan** (especificar cambios)
- [ ] **Cancelar y usar otra opción**

---

*Plan listo para implementación - Esperando aprobación*
