# Plan de Corrección: Registro de Conductor para Usuarios Existentes

## Resumen del Problema

Cuando un usuario que ya existe como **cliente** intenta registrarse como **conductor**, el proceso falla durante la verificación. Los logs muestran `VERIFICATION_BLOCKED` o errores al intentar avanzar, incluso cuando los documentos ya están subidos.

### Evidencia de Logs (11 Dic 2025)

```
18:04:46 POST /api/documents/upload 404 :: {"message":"Conductor no encontrado"}
18:05:38 Creating conductor record for user during document upload {"userId":"ddd5fcb2-..."}
18:05:57 VERIFICATION_BLOCKED: {"path":"/api/drivers/me/license-data","method":"PUT",
         "emailVerificado":true,"cedulaVerificada":true,"fotoVerificada":true}
18:06:06 VERIFICATION_BLOCKED: {"path":"/api/drivers/me/license-data"} (segundo intento)
18:06:17 POST /api/auth/logout 200 (usuario tuvo que hacer logout)
18:06:22 POST /api/auth/login 200 (login de nuevo - ahora funciona)
18:06:30 PUT /api/drivers/me/servicios 200 (categorías configuradas exitosamente)
18:06:55 POST /api/drivers/me/vehiculos 200 (vehículo registrado exitosamente)
```

### Causas Raíz Identificadas

1. **Endpoint `/api/documents/upload` NO auto-crea conductor**:
   - A diferencia de `/api/driver/documents`, este endpoint falla con "Conductor no encontrado"
   - El usuario tiene que usar el otro endpoint que sí auto-crea

2. **Ruta `/api/drivers/me/license-data` NO está en lista de rutas permitidas**:
   - El middleware bloquea `PUT /api/drivers/me/license-data` aunque es necesario durante verificación
   - El usuario tiene email, cédula y foto verificados pero aún es bloqueado

3. **Sesión desactualizada después de crear conductor**:
   - El conductor se crea durante `/api/driver/documents` (línea 18:05:38)
   - Pero el middleware sigue leyendo `user.conductor` del objeto de sesión que NO tiene el conductor nuevo
   - Solución temporal del usuario: logout + login para refrescar sesión

4. **Modelo de datos dual mal documentado**:
   - `userId` = ID en tabla `users` (ej: `ddd5fcb2-...`)
   - `conductorId` = ID en tabla `conductores` (ej: `d914c40a-...`)
   - Algunos endpoints mezclan estos IDs

5. **Polling excesivo del frontend** (problema secundario):
   - El frontend hace polling cada ~100ms a `/api/identity/verification-status` y `/api/drivers/me/servicios`
   - Causa carga innecesaria en el servidor

---

## Análisis Detallado por Componente

### 1. Flujo de Registro (server/routes.ts)

**Archivo**: `server/routes.ts` (líneas 832-960, 962-1037)

#### Endpoint `/api/auth/register`
- ✅ Verifica correctamente que no exista otro usuario con el mismo email + userType
- ✅ Crea un nuevo usuario con `userType: 'conductor'`
- ⚠️ **Problema**: Si el conductor se registra sin `conductorData`, no se crea el registro en `conductores`
- ⚠️ **Problema**: El campo `estadoCuenta` queda como `'pendiente_verificacion'`

#### Endpoint `/api/auth/add-driver-account`
- Diseñado para que un cliente autenticado agregue perfil de conductor
- ✅ Crea nuevo usuario con `userType: 'conductor'` copiando datos del cliente
- ⚠️ **Problema**: NO crea automáticamente el registro en tabla `conductores`

### 2. Endpoint become-driver (server/routes.ts, líneas 3439-3531)

```javascript
app.post("/api/drivers/become-driver", ...)
```

- ⚠️ **Problema crítico**: Este endpoint intenta **convertir** un usuario cliente a conductor (cambia `userType`), pero el sistema está diseñado para tener **dos usuarios separados** por email.
- Conflicto con el modelo dual donde un email puede tener perfiles separados.

### 3. Middleware de Verificación (server/routes.ts, líneas 469-600)

```javascript
const userNeedsVerification = (user: any): boolean => {
  // Para conductores verifica: 
  // cedulaVerificada, emailVerificado, fotoVerificada, 
  // licenciaVerificada, categoriasConfiguradas, vehiculosRegistrados
}
```

**Problemas Identificados**:

1. **Obtención del conductor**: El middleware accede a `user.conductor` que debe venir poblado desde `storage.getUserById()`.

2. **Rutas permitidas durante verificación** (`VERIFICATION_ALLOWED_PATTERNS`):
   - ✅ Incluye rutas de escaneo de licencia
   - ⚠️ Puede faltar `/api/auth/add-driver-account` si el usuario necesita agregar perfil conductor

3. **Flags verificados**:
   - `cedulaVerificada` → en tabla `users`
   - `emailVerificado` → en tabla `users`
   - `fotoVerificada` → en tabla `users`
   - `licenciaVerificada` → en tabla `conductores`
   - `categoriasConfiguradas` → en tabla `conductores`
   - `vehiculosRegistrados` → en tabla `conductores`

### 4. Subida de Documentos (server/routes.ts, líneas 6760-6927)

```javascript
app.post("/api/driver/documents", ...)
```

**Auto-creación del conductor**:
```javascript
let conductor = await storage.getConductorByUserId(req.user!.id);
if (!conductor) {
  conductor = await storage.createConductor({
    userId: req.user!.id,
    licencia: '',
    placaGrua: '',
    marcaGrua: '',
    modeloGrua: '',
  });
}
```

✅ **Correcto**: Este endpoint auto-crea el conductor si no existe.

**Documentos almacenados**:
```javascript
await uploadDocument({
  userId: conductor.id, // ← Usa conductorId, no userId
  documentType: type,
  ...
});
```

⚠️ **Inconsistencia**: El `uploadDocument` recibe `conductor.id` pero el parámetro se llama `userId`.

### 5. Esquema de Documentos (shared/schema.ts, líneas 385-408)

```javascript
export const documentos = pgTable("documentos", {
  usuarioId: varchar("usuario_id").references(() => users.id),
  conductorId: varchar("conductor_id").references(() => conductores.id),
  servicioId: varchar("servicio_id").references(() => servicios.id),
  // ...
});
```

⚠️ **Problema**: Un documento puede tener `usuarioId`, `conductorId` o `servicioId`. Debe estar claro cuándo usar cada uno:
- Documentos de conductor (licencia): usar `conductorId`
- Documentos de cliente (seguro): usar `usuarioId`

### 6. Storage Interface (server/storage.ts)

**Métodos relevantes**:
- `getConductorByUserId(userId)` → Obtiene conductor por userId ✅
- `getDocumentosByConductorId(conductorId)` → Usa conductorId
- `getDocumentosByUsuarioId(usuarioId)` → Usa userId

⚠️ **Posible inconsistencia**: Algunos endpoints llaman `getDocumentosByUsuarioId` cuando deberían llamar `getDocumentosByConductorId`.

---

## Plan de Correcciones

### Corrección 1: Asegurar Creación Automática del Perfil Conductor

**Archivos a modificar**: `server/routes.ts`

**Descripción**: Cuando un usuario con `userType: 'conductor'` no tiene registro en tabla `conductores`, debe crearse automáticamente.

**Lugares donde agregar auto-creación**:

1. **Después del registro** (`/api/auth/register`):
   ```javascript
   // Línea ~910: Después de crear usuario conductor
   if (userType === 'conductor') {
     await storage.createConductor({
       userId: user.id,
       licencia: '',
       placaGrua: '',
       marcaGrua: '',
       modeloGrua: '',
     });
   }
   ```

2. **En `/api/auth/add-driver-account`** (línea ~1001):
   ```javascript
   // Después de crear el nuevo usuario conductor
   await storage.createConductor({
     userId: newConductorUser.id,
     licencia: '',
     placaGrua: '',
     marcaGrua: '',
     modeloGrua: '',
   });
   ```

3. **En `userNeedsVerification`**: Manejar caso donde `user.conductor` es null.

### Corrección 2: Ajustar Middleware de Verificación (CRÍTICO)

**Archivo**: `server/routes.ts` (líneas 469-600)

**Cambios**:

1. **Agregar rutas faltantes a `VERIFICATION_ALLOWED_PATTERNS`** (línea ~505):
   ```javascript
   // AGREGAR ESTAS RUTAS:
   { method: 'PUT', path: '/api/drivers/me/license-data' },  // ← FALTA - causa VERIFICATION_BLOCKED
   { method: 'POST', path: '/api/auth/add-driver-account' },
   { method: 'POST', path: '/api/drivers/become-driver' },
   ```

2. **Modificar `userNeedsVerification` para obtener datos frescos del conductor**:
   
   El problema es que `user.conductor` viene del objeto de sesión, que NO se actualiza cuando se crea el conductor. Hay dos soluciones:

   **Solución A (Recomendada)**: Hacer la función async y obtener conductor de storage:
   ```javascript
   const userNeedsVerification = async (user: any): Promise<boolean> => {
     if (user.userType === 'conductor') {
       // SIEMPRE obtener conductor fresco de storage, no de sesión
       const conductor = await storage.getConductorByUserId(user.id);
       
       // Si no existe conductor, permitir acceso a rutas de verificación
       if (!conductor) {
         return true; // Necesita verificación, pero no bloqueamos rutas permitidas
       }
       
       // Verificar flags usando conductor fresco
       const licenciaVerificada = !!conductor.licenciaVerificada;
       const categoriasConfiguradas = !!conductor.categoriasConfiguradas;
       const vehiculosRegistrados = !!conductor.vehiculosRegistrados;
       
       return !cedulaVerificada || !emailVerificado || !fotoVerificada || 
              !licenciaVerificada || !categoriasConfiguradas || !vehiculosRegistrados;
     }
     // ... resto de la lógica para cliente
   }
   ```

   **Solución B**: Actualizar sesión después de crear conductor:
   ```javascript
   // En cada endpoint que crea/modifica conductor:
   const updatedUser = await storage.getUserById(req.user!.id);
   await new Promise((resolve) => req.login(updatedUser, resolve));
   ```

3. **El middleware debe convertirse a async** si se usa Solución A:
   ```javascript
   app.use(async (req: Request, res: Response, next) => {
     // ... 
     if (!(await userNeedsVerification(user))) {
       return next();
     }
     // ...
   });
   ```

### Corrección 3: Agregar Auto-creación en `/api/documents/upload`

**Archivo**: `server/routes.ts`

**Problema**: El endpoint `/api/documents/upload` retorna 404 "Conductor no encontrado" porque NO tiene auto-creación de conductor, a diferencia de `/api/driver/documents`.

**Ubicar el endpoint** `/api/documents/upload` y agregar la misma lógica de auto-creación:

```javascript
app.post("/api/documents/upload", upload.single('document'), async (req, res) => {
  // ... validaciones ...
  
  if (req.user!.userType === 'conductor') {
    let conductor = await storage.getConductorByUserId(req.user!.id);
    
    // AGREGAR: Auto-crear conductor si no existe
    if (!conductor) {
      logSystem.info('Creating conductor record for user during document upload', { userId: req.user!.id });
      conductor = await storage.createConductor({
        userId: req.user!.id,
        licencia: '',
        placaGrua: '',
        marcaGrua: '',
        modeloGrua: '',
      });
    }
    
    // Continuar con la lógica existente usando conductor.id
  }
});
```

### Corrección 4: Consistencia en Asociación de Documentos

**Archivos**: `server/routes.ts`, `server/storage.ts`

**Regla**:
- Documentos de **licencia** (`licencia`, `licencia_trasera`) → asociar con `conductorId`
- Documentos de **cédula** y **foto perfil** → asociar con `usuarioId` (pertenecen al user)
- Documentos de **seguro cliente** → asociar con `usuarioId`

**Verificar endpoint** `/api/driver/documents`:
```javascript
// Asegurar que el documento se crea con conductorId correcto
await storage.createDocumento({
  tipo: type,
  conductorId: conductor.id,  // Para licencia
  usuarioId: null,            // No usar para documentos de conductor
  // ...
});
```

### Corrección 5: Ajustar getUserById para Incluir Conductor

**Archivo**: `server/storage.ts`

**Verificar** que `getUserById` retorne el objeto conductor embebido:
```javascript
async getUserById(id: string): Promise<UserWithConductor | undefined> {
  // Debe hacer JOIN con conductores
  // Retornar user.conductor si existe
}
```

### Corrección 6: Mejorar Endpoint de Verification Status

**Archivo**: `server/routes.ts`

El endpoint `/api/identity/verification-status` ya existe y funciona (retorna 200). Verificar que:
1. Obtenga datos frescos del conductor (no de sesión)
2. Retorne todos los flags necesarios
3. Incluya lista de pasos pendientes

```javascript
app.get("/api/identity/verification-status", async (req, res) => {
  const user = req.user;
  // IMPORTANTE: Obtener conductor fresco de storage
  const conductor = await storage.getConductorByUserId(user.id);
  
  return res.json({
    userType: user.userType,
    emailVerified: user.emailVerificado,
    cedulaVerified: user.cedulaVerificada,
    photoVerified: user.fotoVerificada,
    // Solo para conductores:
    hasConductorProfile: !!conductor,
    licenseVerified: conductor?.licenciaVerificada ?? false,
    licenseFrontUploaded: !!conductor?.licenciaFrontalUrl,
    licenseBackUploaded: !!conductor?.licenciaTraseraUrl,
    categoriesConfigured: conductor?.categoriasConfiguradas ?? false,
    vehiclesRegistered: conductor?.vehiculosRegistrados ?? false,
    // Lista de pasos pendientes para el frontend
    pendingSteps: [...],
  });
});
```

### Corrección 7: Refrescar Sesión Después de Crear/Modificar Conductor

**Archivo**: `server/routes.ts`

En cada endpoint que crea o modifica el conductor, refrescar la sesión:

**Endpoints a modificar**:
- `/api/driver/documents` (después de crear conductor)
- `/api/documents/upload` (después de crear conductor)
- `/api/drivers/me/servicios` (después de crear conductor)
- `/api/drivers/me/license-data` (después de crear conductor)
- `/api/drivers/me/vehiculos` (después de crear conductor)

**Código a agregar después de crear conductor**:
```javascript
// Refrescar sesión con datos actualizados
const updatedUser = await storage.getUserById(req.user!.id);
if (updatedUser) {
  await new Promise<void>((resolve, reject) => {
    req.login(updatedUser as any, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
```

### Corrección 8: Deprecar/Eliminar become-driver (Opcional)

**Archivo**: `server/routes.ts` (líneas 3439-3531)

**Opción A**: Eliminar el endpoint y usar solo `add-driver-account`

**Opción B**: Modificar `become-driver` para que:
1. NO cambie el userType del usuario actual
2. En su lugar, cree un nuevo usuario con `userType: 'conductor'`
3. Copie datos y cree registro en `conductores`

### Corrección 9: Validación de Email No-Única

**Archivo**: `server/routes.ts`

Asegurar que ningún endpoint de registro/verificación:
1. Valide email como único globalmente
2. Dispare constraint de unicidad

El constraint correcto es `(email, userType)` único (ya existe en schema).

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `server/routes.ts` | Correcciones 1, 2, 3, 4, 6, 7, 8, 9 |
| `server/storage.ts` | Corrección 5 (verificar getUserById) |

---

## Orden de Implementación (Priorizado)

### Fase 1: Correcciones Críticas (Resuelven el bug principal)
1. **Corrección 2**: Agregar `/api/drivers/me/license-data` a `VERIFICATION_ALLOWED_PATTERNS`
2. **Corrección 2**: Modificar `userNeedsVerification` para obtener conductor de storage (no de sesión)
3. **Corrección 3**: Agregar auto-creación de conductor en `/api/documents/upload`

### Fase 2: Correcciones de Consistencia
4. **Corrección 1**: Auto-crear conductor en endpoints de registro
5. **Corrección 7**: Refrescar sesión después de crear/modificar conductor
6. **Corrección 5**: Verificar que `getUserById` incluye conductor

### Fase 3: Mejoras Adicionales
7. **Corrección 4**: Consistencia en asociación de documentos
8. **Corrección 6**: Mejorar endpoint de verification status
9. **Corrección 8**: Decidir qué hacer con become-driver (opcional)
10. **Corrección 9**: Revisar validaciones de email

---

## Pruebas Requeridas

### Escenario 1: Usuario nuevo se registra como conductor
1. Registrar nuevo usuario con `userType: 'conductor'`
2. Verificar que se crea registro en tabla `conductores`
3. Completar flujo de verificación (cédula, email, foto, licencia, categorías, vehículos)
4. Verificar que no hay bloqueos de VERIFICATION_BLOCKED

### Escenario 2: Usuario existente (cliente) agrega perfil conductor
1. Iniciar sesión como cliente
2. Usar `/api/auth/add-driver-account` para crear perfil conductor
3. Verificar que se crea nuevo usuario con `userType: 'conductor'`
4. Verificar que se crea registro en tabla `conductores`
5. Completar flujo de verificación sin hacer logout/login

### Escenario 3: Verificar que la ruta `/api/drivers/me/license-data` no es bloqueada
1. Conductor con email, cédula y foto verificados
2. Subir documentos de licencia
3. Intentar `PUT /api/drivers/me/license-data`
4. **Esperado**: Retorna 200, NO 403 VERIFICATION_BLOCKED

### Escenario 4: Verificar consistencia de documentos
1. Subir licencia frontal y trasera
2. Verificar que documentos tienen `conductorId` correcto (no `userId`)
3. Verificar que `/api/documents/my-documents` retorna los documentos

### Escenario 5: Sin necesidad de logout/login
1. Completar todo el flujo de verificación
2. Verificar que NO es necesario hacer logout + login para que el sistema reconozca los flags actualizados

---

## Notas Adicionales

### Hallazgos de los Logs

- El usuario pudo completar el flujo **solo después de hacer logout + login**
- Esto indica que la sesión no se estaba actualizando con los datos del conductor
- El middleware `userNeedsVerification` usaba `user.conductor` de la sesión en lugar de obtenerlo de storage

### Modelo de Datos

El sistema tiene dos patrones que coexisten:
1. **Modelo de conversión** (`become-driver`): Cambia userType de un usuario existente
2. **Modelo dual** (`add-driver-account`): Crea usuario separado con mismo email

**Recomendación**: Estandarizar en el **modelo dual** para evitar conflictos y mantener separación clara entre perfiles.

### Tipos de Datos

Los flags booleanos en PostgreSQL pueden venir como:
- `true`/`false` (boolean)
- `1`/`0` (integer si la columna tiene tipo incorrecto)

El código actual maneja esto con `!!` pero verificar consistencia en todas las verificaciones.

### Problema de Polling del Frontend (Secundario)

El frontend hace polling excesivo (~10 requests/segundo) a:
- `/api/identity/verification-status`
- `/api/drivers/me/servicios`

Esto no causa el bug pero debería corregirse para mejorar rendimiento. Considerar:
- Usar WebSockets para actualizaciones en tiempo real
- Aumentar intervalo de polling a 5-10 segundos
- Implementar debounce en el frontend
