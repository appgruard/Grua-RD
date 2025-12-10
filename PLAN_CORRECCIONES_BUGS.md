# Plan de Correcciones - Grúa RD

**Fecha:** 10 de Diciembre, 2025  
**Estado:** Pendiente de aprobación

---

## Bug 1: Error al subir licencia - "Debe completar la verificación de identidad"

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

### Análisis

- Campo `vehiculosRegistrados` está definido como `boolean` en `shared/schema.ts` (línea 215)
- En `server/routes.ts` línea 3490: `await storage.updateConductor(conductor.id, { vehiculosRegistrados: true })`
- El error sugiere que el valor `"true"` (string) está siendo pasado en lugar de `true` (boolean)

### Causa Raíz Identificada

El problema está en cómo Drizzle ORM maneja el tipo boolean en PostgreSQL. El comentario en línea 491-495 de routes.ts indica que ya hay problemas de tipo:

```javascript
// Use truthy checks to handle integer values from database (vehiculosRegistrados is stored as int)
```

Esto sugiere que **la columna en la base de datos puede estar definida como INTEGER en lugar de BOOLEAN**, causando el conflicto.

### Solución Propuesta

1. Verificar el esquema de la tabla `conductores` en PostgreSQL
2. Si la columna es INTEGER, convertir el boolean a integer antes de guardar:
   ```javascript
   vehiculosRegistrados: true ? 1 : 0
   ```
3. O correr una migración para cambiar el tipo de columna a BOOLEAN

### Archivos a Modificar

- `server/routes.ts` - Agregar conversión explícita si la columna es INTEGER
- O `shared/schema.ts` + migración de base de datos

---

## Bug 3: Flujo incorrecto al crear cuenta de conductor desde perfil de cliente

### Análisis

- El botón en `client/src/pages/client/profile.tsx` (línea 336) redirige a `/onboarding?tipo=conductor`
- `isAddingSecondaryAccount` está definido (línea 61) pero **NUNCA SE USA** en el resto del código
- El useEffect en líneas 101-118 **SOBRESCRIBE** el `userType` del formulario con el del usuario autenticado

### Causa Raíz Confirmada

Cuando un cliente autenticado va a `/onboarding?tipo=conductor`:

1. `preselectedType` = 'conductor' (correcto)
2. `formData.userType` se inicializa como 'conductor' (correcto)
3. El useEffect sincroniza `userType` desde el usuario autenticado (cliente) → **SOBRESCRIBE a 'cliente'**
4. El usuario queda atrapado en el flujo de cliente

### Código Problemático

```javascript
// onboarding-wizard.tsx líneas 101-118
useEffect(() => {
  if (user && !authLoading && lastSyncedUserTypeRef.current === null) {
    const userData = user as any;
    const syncedUserType = userData.userType || 'cliente';
    
    // PROBLEMA: Esto sobrescribe el userType preseleccionado
    if (syncedUserType !== formData.userType || userData.email !== formData.email) {
      setFormData(prev => ({ 
        ...prev, 
        userType: syncedUserType,  // Sobrescribe "conductor" con "cliente"
        email: userData.email || prev.email,
        nombre: userData.nombre || prev.nombre,
        apellido: userData.apellido || prev.apellido
      }));
    }
    // ...
  }
}, [user, authLoading]);
```

### Solución Propuesta

1. Modificar el useEffect para NO sobrescribir `userType` cuando `isAddingSecondaryAccount === true`
2. Agregar lógica para crear una nueva cuenta de conductor con el mismo email
3. El servidor ya permite esto (verifica email + tipo, no solo email)

### Archivos a Modificar

- `client/src/pages/auth/onboarding-wizard.tsx` - Líneas 101-118

### Código Corregido Propuesto

```javascript
useEffect(() => {
  if (user && !authLoading && lastSyncedUserTypeRef.current === null) {
    const userData = user as any;
    const syncedUserType = userData.userType || 'cliente';
    
    lastSyncedUserTypeRef.current = syncedUserType;
    
    // NO sobrescribir userType si estamos agregando cuenta secundaria
    if (isAddingSecondaryAccount) {
      // Solo sincronizar email y nombre, mantener el userType preseleccionado
      setFormData(prev => ({ 
        ...prev, 
        email: userData.email || prev.email,
        nombre: userData.nombre || prev.nombre,
        apellido: userData.apellido || prev.apellido
      }));
    } else if (syncedUserType !== formData.userType || userData.email !== formData.email) {
      setFormData(prev => ({ 
        ...prev, 
        userType: syncedUserType,
        email: userData.email || prev.email,
        nombre: userData.nombre || prev.nombre,
        apellido: userData.apellido || prev.apellido
      }));
    }
    // ...
  }
}, [user, authLoading]);
```

---

## Bug 4 (Extra): Múltiples seguros en verificación de cliente

### Análisis

- `verify-pending.tsx` **NO tiene ninguna mención de seguros** (confirmado)
- Para clientes, solo se requiere verificar: cédula y email (líneas 191-207)
- `ClientInsuranceManager.tsx` sí permite múltiples seguros pero está en el perfil del cliente, no en verificación

### Conclusión

Esto **NO es un bug** - el flujo de verificación del cliente solo requiere cédula y email. Los seguros son opcionales y se pueden agregar después en el perfil.

### Acción Recomendada

- No se requiere cambio a menos que el negocio quiera hacer obligatorio subir seguro durante verificación

---

## Resumen de Cambios Requeridos

| Prioridad | Bug | Archivo(s) | Tipo de Cambio |
|-----------|-----|------------|----------------|
| **Alta** | Bug 3: Flujo conductor secundario | `onboarding-wizard.tsx` | Modificar useEffect líneas 101-118 |
| **Alta** | Bug 2: Integer "true" | `server/routes.ts` + verificar DB | Conversión de tipo o migración |
| **Media** | Bug 1: Licencia bloqueada | Revisar logs + `routes.ts` | Depuración necesaria |
| **Baja** | Bug 4: Seguros | N/A | No es bug, clarificar flujo |

---

## Hallazgos Adicionales

1. **Variable sin usar:** `isAddingSecondaryAccount` está definido pero nunca se utiliza
2. **Comentario en código indica problema conocido:** Línea 491-495 menciona "vehiculosRegistrados is stored as int" sugiriendo inconsistencia de tipos ya conocida
3. **El servidor SÍ soporta cuentas múltiples:** `getUserByEmailAndType()` permite el mismo email con diferentes tipos de cuenta

---

## Archivos Clave Involucrados

| Archivo | Propósito |
|---------|-----------|
| `server/routes.ts` | Endpoints API y middleware de verificación |
| `server/storage.ts` | Funciones de acceso a base de datos |
| `client/src/pages/auth/onboarding-wizard.tsx` | Wizard de registro/onboarding |
| `client/src/pages/auth/verify-pending.tsx` | Flujo de verificación pendiente |
| `client/src/pages/client/profile.tsx` | Perfil del cliente (botón "Crear cuenta conductor") |
| `client/src/components/ClientInsuranceManager.tsx` | Gestión de seguros del cliente |
| `shared/schema.ts` | Esquema de base de datos Drizzle |
| `client/src/components/VehicleCategoryForm.tsx` | Formulario de vehículos por categoría |
