# Plan de Correcciones - Licencia y Verificación de Conductor

**Fecha:** 10 de Diciembre, 2025  
**Estado:** ✅ COMPLETADO

---

## Resumen del Problema

Durante la verificación del conductor, la licencia se sube pero:
1. ~~El campo `licenciaVerificada` en tabla `conductores` NO se actualiza~~ ✅ Resuelto
2. ~~La fecha de vencimiento extraída por OCR NO se guarda en `documentos`~~ ✅ Resuelto
3. ~~El perfil del conductor muestra opción de re-subir licencia aunque ya esté verificada~~ ✅ Resuelto
4. ~~No hay opción de corregir el correo durante la verificación~~ ✅ Resuelto

---

## Fase 1: Backend - Guardar datos de licencia ✅

### Estado: ✅ COMPLETADO

### Cambios Realizados

#### 1.1 Nuevo endpoint `PUT /api/drivers/me/license-data`
**Archivo:** `server/routes.ts`

Creado endpoint para guardar número de licencia, clase y fecha de vencimiento:
```typescript
app.put('/api/drivers/me/license-data', async (req, res) => {
  // Actualiza numeroLicencia, claseVehiculo, fechaVencimientoLicencia
});
```

#### 1.2 Frontend actualizado para llamar al endpoint correcto
**Archivo:** `client/src/pages/auth/verify-pending.tsx`

Cambiado de:
- ❌ `PUT /api/drivers/me/vehiculos` (no existía)
- ✅ `PUT /api/drivers/me/license-data` (nuevo)

---

## Fase 2: Frontend - Ocultar subida de licencia si ya está verificada ✅

### Estado: ✅ COMPLETADO

### Cambios Realizados

#### 2.1 Perfil del conductor actualizado
**Archivo:** `client/src/pages/driver/profile.tsx`

- ✅ Agregado filtro para ocultar "licencia" en pendingDocTypes cuando `conductor.licenciaVerificada === true`
- ✅ La lógica sigue el mismo patrón que la cédula (ocultar si ya verificada)

---

## Fase 3: Permitir cambio de correo durante verificación ✅

### Estado: ✅ COMPLETADO

### Cambios Realizados

#### 3.1 Backend - Nuevo endpoint PATCH /api/identity/email
**Archivo:** `server/routes.ts`

Creado endpoint para actualizar correo durante verificación:
```typescript
app.patch('/api/identity/email', async (req, res) => {
  // Valida nuevo email
  // Verifica que no exista otro usuario con ese email+tipo
  // Actualiza email y pone emailVerificado = false
});
```

#### 3.2 Frontend - UI de edición de correo
**Archivo:** `client/src/pages/auth/verify-pending.tsx`

- ✅ Agregados estados: `isEditingEmail`, `newEmail`, `isUpdatingEmail`
- ✅ Botón "Cambiar" junto al correo mostrado
- ✅ Formulario de edición con Input, Cancelar y Guardar
- ✅ Función `handleUpdateEmail` para llamar al endpoint
- ✅ Manejo de errores específico para cambio de email

---

## Fase 4: Validación Final

### Verificaciones Completadas

| # | Verificación | Estado |
|---|--------------|--------|
| 1 | Endpoint PUT /api/drivers/me/license-data existe | ✅ |
| 2 | verify-pending.tsx llama al endpoint correcto | ✅ |
| 3 | profile.tsx oculta licencia si licenciaVerificada | ✅ |
| 4 | Endpoint PATCH /api/identity/email existe | ✅ |
| 5 | UI de edición de correo implementada | ✅ |

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `server/routes.ts` | +PUT /api/drivers/me/license-data, +PATCH /api/identity/email |
| `client/src/pages/driver/profile.tsx` | Filtro para ocultar licencia verificada |
| `client/src/pages/auth/verify-pending.tsx` | Edición de correo, endpoint correcto para datos de licencia |

---

## Notas Técnicas

### Sobre los datos de licencia
- El número de licencia se guarda en `conductores.numeroLicencia`
- La clase de vehículo se guarda en `conductores.claseVehiculo`
- La fecha de vencimiento se guarda en `conductores.fechaVencimientoLicencia`

### Sobre el cambio de correo
- Cuando se cambia el correo, `emailVerificado` se pone en `false`
- El usuario debe verificar el nuevo correo con OTP
- Se valida que el nuevo correo no esté en uso por otro usuario del mismo tipo

---

## Fase 5: Limpieza de datos de prueba ✅

### Estado: ✅ COMPLETADO

### Fecha: 10 de Diciembre, 2025

### Usuarios Eliminados

| Email | Tipo | Nombre |
|-------|------|--------|
| khris2135@gmail.com | cliente | Khristopher Angel Tavarez Ureña |
| info@assanpos.com | conductor | Khristopher Angel Tavarez Ureña |
| khris2135@hotmail.com | conductor | Khristopher Angel Tavarez Ureña |
| khris2135@gmail.com | conductor | Khristopher Tavarez |

Todos los datos relacionados (conductor, documentos, servicios, etc.) fueron eliminados automáticamente por las restricciones CASCADE de la base de datos.
