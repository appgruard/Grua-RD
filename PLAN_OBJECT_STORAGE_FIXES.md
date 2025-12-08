# Plan: Corrección de Errores de Object Storage y Verificación

## Estado: ✅ COMPLETADO (2025-12-08)

---

## Resumen de Cambios Implementados

### ✅ Tarea 1: Corregir lógica de inicialización de Object Storage
**Archivo:** `server/services/object-storage.ts`

**Cambios realizados:**
1. Se agregó `lastRetryTime` y `RETRY_INTERVAL` (30 segundos) para controlar reintentos
2. Se modificó `getStorageClient()` para implementar retry inteligente con intervalo configurable
3. Se modificó `checkStorageHealth()` para NO resetear el cliente en cada verificación
4. Solo se resetea el cliente cuando una operación falla con un cliente existente

### ✅ Tarea 2: Agregar `/api/analytics/web-vitals` a endpoints permitidos
**Archivo:** `server/routes.ts`

**Cambio realizado:**
- Se agregó `{ method: 'POST', path: '/api/analytics/web-vitals' }` a `VERIFICATION_ALLOWED_PATTERNS`

### ✅ Tarea 3: Mejorar manejo de errores en upload de documentos
**Archivo:** `server/routes.ts`

**Cambio realizado:**
- Se agregó verificación de `isStorageInitialized()` ANTES de procesar el archivo
- Retorna error 503 con mensaje descriptivo y `retryable: true` si storage no disponible

### ✅ Extra: Corregir rutas de botones de cambio de tipo de cuenta
**Archivos:** `client/src/pages/client/profile.tsx`, `client/src/pages/driver/profile.tsx`

**Cambio realizado:**
- Corregido botón "Crear cuenta de Conductor" en perfil cliente: `/auth/onboarding-wizard?tipo=conductor` → `/onboarding?tipo=conductor`
- Corregido botón "Crear cuenta de Cliente" en perfil conductor: `/auth/onboarding-wizard?tipo=cliente` → `/onboarding?tipo=cliente`

---

## Análisis del Problema (Referencia)

### Error 1: `POST /api/driver/documents 500` - "Error during client init..."

**Causa raíz:** El cliente de Object Storage tiene un problema de diseño en su lógica de inicialización y reinicio.

En `server/services/object-storage.ts`:

1. **Línea 67-69 en `checkStorageHealth()`**: Cada health check llama a `resetStorageClient()`, lo que:
   - Establece `storage = null`
   - Establece `storageInitAttempted = false`
   - Esto desconecta una conexión de almacenamiento que ya funcionaba

2. **Línea 33-35 en `getStorageClient()`**: Cuando `storageInitAttempted` es `true` pero `storage` es `null` (inicialización fallida), las llamadas subsiguientes devuelven `null` sin reintentar.

3. **Condición de carrera**: Si un upload de documento ocurre inmediatamente después de un health check (cuando el storage está siendo reinicializado), el upload falla con error 500.

**Flujo del problema:**
```
Health Check → resetStorageClient() → storage = null → Usuario intenta subir documento → getStorageClient() retorna null → Error 500
```

### Error 2: `POST /api/analytics/web-vitals 403` - "Unverified user blocked"

**Causa raíz:** El endpoint `/api/analytics/web-vitals` no está incluido en la lista `VERIFICATION_ALLOWED_PATTERNS` en `server/routes.ts`.

Los usuarios no verificados no pueden enviar telemetría de rendimiento web, lo cual debería permitirse ya que es solo datos de análisis que no requieren verificación de identidad.

### Error 3: Storage client reset periódico

**Causa raíz:** El diseño actual de `checkStorageHealth()` resetea el cliente en cada verificación de salud, causando:
- Desconexiones innecesarias de conexiones funcionales
- Condiciones de carrera con uploads en progreso
- Reconexiones frecuentes que afectan el rendimiento

---

## Pruebas Recomendadas

1. ✅ Reiniciar el servidor y verificar que Object Storage se inicializa correctamente
2. Subir un documento de licencia como conductor
3. Verificar que los logs no muestran "Storage client reset" frecuentemente
4. Confirmar que `/api/analytics/web-vitals` retorna 200 para usuarios no verificados
5. Probar el flujo completo de verificación de conductor
6. Probar que los botones de cambio de tipo de cuenta navegan correctamente

---

## Notas Adicionales

- El error "Error during client init..." probablemente es `Error during client initialization` truncado en los logs
- La variable de entorno `REPLIT_OBJECT_STORAGE_BUCKET` o similar debe estar configurada para que el storage funcione
- Considerar agregar un endpoint de diagnóstico para verificar el estado del storage sin resetearlo
