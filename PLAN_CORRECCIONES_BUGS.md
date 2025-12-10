# Plan de Correcciones - Grúa RD

**Fecha:** 10 de Diciembre, 2025  
**Estado:** ✅ FASE 1 COMPLETADA

---

## Bug 1: Error al subir licencia - "Debe completar la verificación de identidad"

### Estado: 🟡 Pendiente de depuración (Prioridad Media)

### Análisis

- Los endpoints `POST /api/identity/scan-license` y `POST /api/identity/scan-license-back` están en `VERIFICATION_ALLOWED_PATTERNS` (líneas 513-514 de routes.ts)
- El endpoint `POST /api/documents/upload` también está permitido (línea 518)
- El flujo de `verify-pending.tsx` usa correctamente estos endpoints (líneas 693-695)

### Posible Causa Raíz

El middleware verifica si `req.user.userType === 'conductor'` pero si el usuario está autenticado como `cliente` e intenta acceder a estos endpoints de conductor, podría fallar en otro lugar del código (no en el middleware de verificación).

### Solución Propuesta

1. Verificar que el usuario tenga `userType: 'conductor'` antes de permitir subida de licencia
2. El problema puede estar en que el usuario está autenticado como cliente pero intenta usar endpoints de conductor
3. Revisar logs del servidor para identificar el endpoint exacto que se está bloqueando

### Archivos a Revisar

- `server/routes.ts` (endpoints de licencia)
- Flujo de autenticación

---

## Bug 2: Error "invalid input syntax for type integer: true"

### Estado: ✅ CORREGIDO (10 Diciembre 2025)

### Análisis

- Campo `vehiculosRegistrados` está definido como `boolean` en `shared/schema.ts` (línea 215)
- En `server/routes.ts` línea 3490: `await storage.updateConductor(conductor.id, { vehiculosRegistrados: true })`
- El error sugiere que el valor `"true"` (string) está siendo pasado en lugar de `true` (boolean)

### Causa Raíz Identificada

La columna `vehiculos_registrados` en la base de datos estaba definida como `INTEGER` en lugar de `BOOLEAN`, mientras que el schema de Drizzle la define como `boolean`. Esto causaba un conflicto de tipos al guardar el valor.

```sql
-- Antes (incorrecto):
vehiculos_registrados INTEGER

-- Después (correcto):
vehiculos_registrados BOOLEAN DEFAULT false
```

### Solución Aplicada

Se ejecutó una migración directa en la base de datos para cambiar el tipo de columna:

```sql
ALTER TABLE conductores 
ALTER COLUMN vehiculos_registrados TYPE boolean 
USING CASE WHEN vehiculos_registrados = 1 THEN true 
           WHEN vehiculos_registrados = 0 THEN false 
           ELSE false END;

ALTER TABLE conductores 
ALTER COLUMN vehiculos_registrados SET DEFAULT false;
```

### Archivos Modificados

- Base de datos PostgreSQL: columna `vehiculos_registrados` ahora es `BOOLEAN`

---

## Bug 3: Flujo incorrecto al crear cuenta de conductor desde perfil de cliente

### Estado: ✅ CORREGIDO (10 Diciembre 2025)

### Análisis

- El botón en `client/src/pages/client/profile.tsx` (línea 336) redirige a `/onboarding?tipo=conductor`
- `isAddingSecondaryAccount` estaba definido (línea 61) pero **NUNCA SE USABA** en el resto del código
- El useEffect en líneas 101-118 **SOBRESCRIBÍA** el `userType` del formulario con el del usuario autenticado

### Causa Raíz Confirmada

Cuando un cliente autenticado va a `/onboarding?tipo=conductor`:

1. `preselectedType` = 'conductor' (correcto)
2. `formData.userType` se inicializa como 'conductor' (correcto)
3. El useEffect sincronizaba `userType` desde el usuario autenticado (cliente) → **SOBRESCRIBÍA a 'cliente'**
4. El usuario quedaba atrapado en el flujo de cliente

### Solución Aplicada

Se modificó el useEffect en `onboarding-wizard.tsx` para verificar `isAddingSecondaryAccount` antes de sincronizar el `userType`:

```javascript
// Cuando se está agregando cuenta secundaria, preservar el userType preseleccionado
// Solo sincronizar email y nombre, no el userType
if (isAddingSecondaryAccount) {
  setFormData(prev => ({ 
    ...prev, 
    email: userData.email || prev.email,
    nombre: userData.nombre || prev.nombre,
    apellido: userData.apellido || prev.apellido
  }));
} else if (syncedUserType !== formData.userType || userData.email !== formData.email) {
  // Flujo normal: sincronizar userType y email desde usuario autenticado
  setFormData(prev => ({ 
    ...prev, 
    userType: syncedUserType,
    email: userData.email || prev.email,
    nombre: userData.nombre || prev.nombre,
    apellido: userData.apellido || prev.apellido
  }));
}
```

### Archivos Modificados

- `client/src/pages/auth/onboarding-wizard.tsx` - Líneas 101-130

---

## Bug 4 (Extra): Múltiples seguros en verificación de cliente

### Estado: ⚪ No es un bug

### Análisis

- `verify-pending.tsx` **NO tiene ninguna mención de seguros** (confirmado)
- Para clientes, solo se requiere verificar: cédula y email (líneas 191-207)
- `ClientInsuranceManager.tsx` sí permite múltiples seguros pero está en el perfil del cliente, no en verificación

### Conclusión

Esto **NO es un bug** - el flujo de verificación del cliente solo requiere cédula y email. Los seguros son opcionales y se pueden agregar después en el perfil.

### Acción Recomendada

- No se requiere cambio a menos que el negocio quiera hacer obligatorio subir seguro durante verificación

---

## Resumen de Cambios Fase 1

| Prioridad | Bug | Estado | Acción Realizada |
|-----------|-----|--------|------------------|
| **Alta** | Bug 3: Flujo conductor secundario | ✅ Completado | Modificado useEffect para respetar `isAddingSecondaryAccount` |
| **Alta** | Bug 2: Integer "true" | ✅ Completado | Migración de columna de INTEGER a BOOLEAN |
| **Media** | Bug 1: Licencia bloqueada | 🟡 Pendiente | Requiere depuración con logs del servidor |
| **Baja** | Bug 4: Seguros | ⚪ N/A | No es bug, comportamiento intencional |

---

## Hallazgos Resueltos

1. ~~**Variable sin usar:** `isAddingSecondaryAccount` está definido pero nunca se utiliza~~ ✅ **RESUELTO** - Ahora se usa correctamente
2. ~~**Comentario en código indica problema conocido:** Línea 491-495 menciona "vehiculosRegistrados is stored as int" sugiriendo inconsistencia de tipos ya conocida~~ ✅ **RESUELTO** - Columna convertida a BOOLEAN
3. **El servidor SÍ soporta cuentas múltiples:** `getUserByEmailAndType()` permite el mismo email con diferentes tipos de cuenta

---

## Archivos Clave Involucrados

| Archivo | Propósito | Modificado |
|---------|-----------|------------|
| `server/routes.ts` | Endpoints API y middleware de verificación | No |
| `server/storage.ts` | Funciones de acceso a base de datos | No |
| `client/src/pages/auth/onboarding-wizard.tsx` | Wizard de registro/onboarding | ✅ Sí |
| `client/src/pages/auth/verify-pending.tsx` | Flujo de verificación pendiente | No |
| `client/src/pages/client/profile.tsx` | Perfil del cliente (botón "Crear cuenta conductor") | No |
| `client/src/components/ClientInsuranceManager.tsx` | Gestión de seguros del cliente | No |
| `shared/schema.ts` | Esquema de base de datos Drizzle | No |
| `client/src/components/VehicleCategoryForm.tsx` | Formulario de vehículos por categoría | No |
| Base de datos PostgreSQL | Tabla `conductores` columna `vehiculos_registrados` | ✅ Sí |

---

## Próximos Pasos (Fase 2)

1. **Bug 1**: Depurar con logs del servidor para identificar el endpoint exacto bloqueado
2. Probar el flujo completo de creación de cuenta secundaria de conductor
3. Verificar que el registro de vehículos funciona correctamente con la columna boolean
