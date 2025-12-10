# Plan de Correcciones - Licencia y Verificación de Conductor

**Fecha:** 10 de Diciembre, 2025  
**Estado:** 🟡 FASE 1 EN PROGRESO

---

## Resumen del Problema

Durante la verificación del conductor, la licencia se sube pero:
1. El campo `licenciaVerificada` en tabla `conductores` NO se actualiza
2. La fecha de vencimiento extraída por OCR NO se guarda en `documentos`
3. El perfil del conductor muestra opción de re-subir licencia aunque ya esté verificada
4. No hay opción de corregir el correo durante la verificación

---

## Fase 1: Backend - Actualizar estado de licencia y fecha de vencimiento

### Estado: 🟡 EN PROGRESO

### Cambios Requeridos

#### 1.1 Endpoint `POST /api/identity/scan-license` (licencia frontal)
**Archivo:** `server/routes.ts` (~líneas 2035-2145)

**Problema:** Después de guardar el documento, no se actualiza `conductores.licenciaVerificada`

**Solución:**
```typescript
// Después de storage.createDocumento(), agregar:
await storage.updateConductor(conductor.id, { 
  licenciaVerificada: true 
});
```

#### 1.2 Endpoint `POST /api/identity/scan-license-back` (licencia trasera)
**Archivo:** `server/routes.ts` (~líneas 2150-2250)

**Problema:** La fecha de vencimiento extraída por OCR no se persiste

**Solución:**
```typescript
// Al crear/actualizar el documento, incluir fechaExpiracion:
await storage.createDocumento({
  ...documentoData,
  fechaExpiracion: payload.licenseData?.expirationDate || null
});
```

#### 1.3 Verificar schema de documentos
**Archivo:** `shared/schema.ts`

Confirmar que `documentos` tiene campo `fechaExpiracion` tipo `date` o `text`

---

## Fase 2: Frontend - Ocultar subida de licencia si ya está verificada

### Estado: ⏳ PENDIENTE

### Cambios Requeridos

#### 2.1 Perfil del conductor
**Archivo:** `client/src/pages/driver/profile.tsx`

**Problema:** Muestra FileUpload de licencia aunque ya esté verificada

**Solución:**
```typescript
// Verificar licenciaVerificada antes de mostrar el componente de subida
{!conductor.licenciaVerificada && (
  <FileUpload tipo="licencia" ... />
)}

// Si ya está verificada, mostrar badge de confirmación con fecha de vencimiento
{conductor.licenciaVerificada && (
  <div className="flex items-center gap-2">
    <Badge variant="success">Licencia Verificada</Badge>
    {licenciaDoc?.fechaExpiracion && (
      <span>Vence: {formatDate(licenciaDoc.fechaExpiracion)}</span>
    )}
  </div>
)}
```

#### 2.2 Mostrar fecha de vencimiento
Consumir `fechaExpiracion` del documento de licencia y mostrarlo en el perfil

---

## Fase 3: Permitir cambio de correo durante verificación

### Estado: ⏳ PENDIENTE

### Cambios Requeridos

#### 3.1 Backend - Nuevo endpoint
**Archivo:** `server/routes.ts`

Crear endpoint `PATCH /api/identity/email` para actualizar correo:
```typescript
app.patch('/api/identity/email', async (req, res) => {
  // Validar nuevo email
  // Verificar que no exista otro usuario con ese email+tipo
  // Actualizar email en tabla correspondiente
  // Invalidar emailVerificado (requiere re-verificación)
});
```

#### 3.2 Frontend - Formulario editable
**Archivo:** `client/src/pages/auth/verify-pending.tsx`

- Cambiar campo de email de solo lectura a editable
- Agregar botón "Cambiar correo"
- Llamar al nuevo endpoint cuando se cambie
- Mostrar estado de "email pendiente de verificación"

---

## Fase 4: Pruebas y Validación

### Estado: ⏳ PENDIENTE

### Verificaciones

| # | Verificación | Criterio de Éxito |
|---|--------------|-------------------|
| 1 | Subir licencia frontal | `licenciaVerificada` = true en BD |
| 2 | Subir licencia trasera | `fechaExpiracion` guardada en documento |
| 3 | Ver perfil conductor | No muestra opción de subir licencia si ya verificada |
| 4 | Ver perfil conductor | Muestra fecha de vencimiento de licencia |
| 5 | Cambiar correo en verificación | Email se actualiza, emailVerificado = false |

---

## Archivos a Modificar

| Archivo | Fase | Cambio |
|---------|------|--------|
| `server/routes.ts` | 1, 3 | Actualizar endpoints de licencia, crear endpoint de email |
| `shared/schema.ts` | 1 | Verificar campo fechaExpiracion |
| `server/storage.ts` | 1 | Posible método para actualizar email |
| `client/src/pages/driver/profile.tsx` | 2 | Ocultar upload si verificada, mostrar fecha |
| `client/src/pages/auth/verify-pending.tsx` | 3 | Permitir edición de correo |

---

## Dependencias Entre Fases

```
Fase 1 (Backend licencia) → Fase 2 (Frontend perfil)
                          ↘
Fase 3 (Cambio de correo)  → Fase 4 (Pruebas)
```

Fase 1 y Fase 3 pueden ejecutarse en paralelo.
Fase 2 depende de Fase 1.
Fase 4 depende de todas las anteriores.

---

## Notas Técnicas

### Sobre la fecha de vencimiento
- La API Verifik extrae `expirationDate` del OCR de la licencia
- Se devuelve en `payload.licenseData.expirationDate`
- Debe guardarse en `documentos.fechaExpiracion`

### Sobre el cambio de correo
- Si se cambia el correo, `emailVerificado` debe ponerse en `false`
- Se requiere re-enviar OTP al nuevo correo
- Validar que el nuevo correo no esté en uso por otro usuario del mismo tipo
