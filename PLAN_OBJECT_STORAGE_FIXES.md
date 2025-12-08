# Plan: Corrección de Errores de Object Storage y Verificación

## Análisis del Problema

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

**Causa raíz:** El endpoint `/api/analytics/web-vitals` no está incluido en la lista `VERIFICATION_ALLOWED_PATTERNS` en `server/routes.ts` (líneas 455-478).

Los usuarios no verificados no pueden enviar telemetría de rendimiento web, lo cual debería permitirse ya que es solo datos de análisis que no requieren verificación de identidad.

### Error 3: Storage client reset periódico

**Causa raíz:** El diseño actual de `checkStorageHealth()` resetea el cliente en cada verificación de salud, causando:
- Desconexiones innecesarias de conexiones funcionales
- Condiciones de carrera con uploads en progreso
- Reconexiones frecuentes que afectan el rendimiento

---

## Plan de Solución

### Tarea 1: Corregir lógica de inicialización de Object Storage

**Archivo:** `server/services/object-storage.ts`

**Cambios:**

1. **Modificar `checkStorageHealth()`** (líneas 60-104):
   - NO llamar `resetStorageClient()` en cada health check
   - Solo resetear si la conexión actual está fallando
   - Implementar lógica de retry inteligente

2. **Mejorar `getStorageClient()`** (líneas 13-36):
   - Agregar retry automático con exponential backoff cuando falla
   - Mantener el estado de la última conexión exitosa
   - Solo reintentar después de un intervalo configurable (ej: 30 segundos)

**Código propuesto para `getStorageClient()`:**
```typescript
let lastRetryTime = 0;
const RETRY_INTERVAL = 30000; // 30 segundos

function getStorageClient(): Client | null {
  if (storage) {
    return storage;
  }

  const now = Date.now();
  // Si ya intentamos y falló, solo reintentar después del intervalo
  if (storageInitAttempted && (now - lastRetryTime) < RETRY_INTERVAL) {
    return null;
  }

  try {
    storage = new Client();
    storageInitAttempted = true;
    lastRetryTime = now;
    logger.info('Replit Object Storage initialized successfully');
    return storage;
  } catch (error) {
    storageInitAttempted = true;
    lastRetryTime = now;
    logger.warn('Replit Object Storage not available', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}
```

**Código propuesto para `checkStorageHealth()`:**
```typescript
export async function checkStorageHealth(): Promise<{ 
  status: string; 
  responseTime: number; 
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const storageClient = getStorageClient();
    if (!storageClient) {
      return { 
        status: "unhealthy", 
        responseTime: Date.now() - start,
        error: "Storage not initialized"
      };
    }
    
    const result = await storageClient.list({ prefix: '_health_' });
    const responseTime = Date.now() - start;
    
    if (!result.ok) {
      // Solo resetear si la operación falla con un cliente existente
      resetStorageClient();
      return {
        status: "unhealthy",
        responseTime,
        error: result.error?.message || "Storage operation failed"
      };
    }
    
    return { status: "healthy", responseTime };
  } catch (error) {
    // Solo resetear en caso de error de conexión
    resetStorageClient();
    return { 
      status: "unhealthy", 
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
```

### Tarea 2: Agregar `/api/analytics/web-vitals` a endpoints permitidos

**Archivo:** `server/routes.ts`

**Cambio:** Agregar la siguiente línea a `VERIFICATION_ALLOWED_PATTERNS` (después de línea 477):
```typescript
{ method: 'POST', path: '/api/analytics/web-vitals' },
```

**Justificación:** Web Vitals es telemetría de rendimiento que no requiere verificación de identidad. Bloquear esta telemetría para usuarios no verificados:
- Impide recopilar datos de rendimiento importantes
- No tiene implicaciones de seguridad
- Genera errores 403 innecesarios en los logs

### Tarea 3: Agregar manejo de errores más robusto en upload de documentos

**Archivo:** `server/routes.ts` (endpoint `/api/driver/documents`)

**Cambios:**
1. Verificar disponibilidad de storage antes de procesar el archivo
2. Retornar un mensaje de error más descriptivo al usuario
3. Sugerir reintentar la operación

**Código propuesto:**
```typescript
app.post("/api/driver/documents", upload.single('document'), async (req: Request, res: Response) => {
  // ... validaciones existentes ...

  // Verificar disponibilidad de storage ANTES de procesar
  if (!isStorageInitialized()) {
    return res.status(503).json({ 
      message: "El servicio de almacenamiento no está disponible temporalmente. Por favor intenta de nuevo en unos segundos.",
      retryable: true
    });
  }

  // ... resto del código ...
});
```

---

## Orden de Ejecución

1. **Tarea 1** - Corregir Object Storage (mayor impacto, resuelve error 500)
2. **Tarea 2** - Agregar web-vitals a permitidos (cambio simple, elimina errores 403)
3. **Tarea 3** - Mejorar manejo de errores en upload (mejora UX)

---

## Pruebas Recomendadas

1. Reiniciar el servidor y verificar que Object Storage se inicializa correctamente
2. Subir un documento de licencia como conductor
3. Verificar que los logs no muestran "Storage client reset" frecuentemente
4. Confirmar que `/api/analytics/web-vitals` retorna 200 para usuarios no verificados
5. Probar el flujo completo de verificación de conductor

---

## Notas Adicionales

- El error "Error during client init..." probablemente es `Error during client initialization` truncado en los logs
- La variable de entorno `REPLIT_OBJECT_STORAGE_BUCKET` o similar debe estar configurada para que el storage funcione
- Considerar agregar un endpoint de diagnóstico para verificar el estado del storage sin resetearlo
