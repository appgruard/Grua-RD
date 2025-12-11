# Plan de Corrección: Registro de Conductor para Usuarios Existentes

## Resumen del Problema

Cuando un usuario que ya existe como **cliente** intenta registrarse como **conductor**, el proceso falla durante la verificación. Los logs muestran `VERIFICATION_BLOCKED` o errores al intentar avanzar, incluso cuando los documentos ya están subidos.

### Causas Raíz Identificadas

1. **Modelo de datos dual**: El sistema permite que un mismo email tenga dos perfiles (cliente + conductor), pero son **usuarios distintos con IDs diferentes**.

2. **Confusión entre userId y driverId/conductorId**: Algunos endpoints asumen que el `conductorId` es igual al `userId`, cuando en realidad:
   - `userId` = ID en tabla `users`
   - `conductorId` = ID en tabla `conductores` (perfil adicional que referencia a `userId`)

3. **Documentos asociados incorrectamente**: Los documentos pueden estar grabándose bajo `usuarioId` cuando deberían usar `conductorId`, o viceversa.

4. **Middleware de verificación demasiado restrictivo**: El middleware `userNeedsVerification` bloquea endpoints necesarios para completar la verificación.

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

### Corrección 2: Ajustar Middleware de Verificación

**Archivo**: `server/routes.ts` (líneas 469-500)

**Cambios**:

1. Si el usuario es conductor pero no tiene registro `conductor` aún, debe:
   - Permitir acceso a endpoints de verificación
   - NO bloquear porque faltan flags que requieren conductor

2. Obtener el conductor desde storage si no viene en el objeto user:
   ```javascript
   const userNeedsVerification = async (user: any): Promise<boolean> => {
     if (user.userType === 'conductor') {
       let conductor = user.conductor;
       if (!conductor) {
         conductor = await storage.getConductorByUserId(user.id);
       }
       // Ahora verificar flags usando conductor obtenido
     }
   }
   ```

3. Agregar rutas faltantes a `VERIFICATION_ALLOWED_PATTERNS`:
   ```javascript
   { method: 'POST', path: '/api/auth/add-driver-account' },
   { method: 'POST', path: '/api/drivers/become-driver' },
   ```

### Corrección 3: Consistencia en Asociación de Documentos

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

### Corrección 4: Ajustar getUserById para Incluir Conductor

**Archivo**: `server/storage.ts`

**Verificar** que `getUserById` retorne el objeto conductor embebido:
```javascript
async getUserById(id: string): Promise<UserWithConductor | undefined> {
  // Debe hacer JOIN con conductores
  // Retornar user.conductor si existe
}
```

### Corrección 5: Endpoint `/api/identity/status` o `/api/identity/verification-status`

**Archivo**: `server/routes.ts`

Crear o ajustar endpoint para que el frontend pueda:
1. Saber exactamente qué pasos faltan
2. Obtener el estado actual de cada flag
3. Recibir mensajes claros

```javascript
app.get("/api/identity/verification-status", async (req, res) => {
  const user = req.user;
  let conductor = await storage.getConductorByUserId(user.id);
  
  return res.json({
    emailVerified: user.emailVerificado,
    cedulaVerified: user.cedulaVerificada,
    photoVerified: user.fotoVerificada,
    // Solo para conductores:
    licenseVerified: conductor?.licenciaVerificada ?? false,
    licenseFrontUploaded: !!conductor?.licenciaFrontalUrl,
    licenseBackUploaded: !!conductor?.licenciaTraseraUrl,
    categoriesConfigured: conductor?.categoriasConfiguradas ?? false,
    vehiclesRegistered: conductor?.vehiculosRegistrados ?? false,
    // Conductor existe?
    hasConductorProfile: !!conductor,
    // Lista de pasos pendientes
    pendingSteps: [...],
  });
});
```

### Corrección 6: Deprecar/Eliminar become-driver

**Archivo**: `server/routes.ts` (líneas 3439-3531)

**Opción A**: Eliminar el endpoint y usar solo `add-driver-account`

**Opción B**: Modificar `become-driver` para que:
1. NO cambie el userType del usuario actual
2. En su lugar, cree un nuevo usuario con `userType: 'conductor'`
3. Copie datos y cree registro en `conductores`

### Corrección 7: Validación de Email No-Única

**Archivo**: `server/routes.ts`

Asegurar que ningún endpoint de registro/verificación:
1. Valide email como único globalmente
2. Dispare constraint de unicidad

El constraint correcto es `(email, userType)` único (ya existe en schema).

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `server/routes.ts` | Correcciones 1, 2, 3, 5, 6, 7 |
| `server/storage.ts` | Corrección 4 (verificar getUserById) |

---

## Orden de Implementación

1. **Corrección 4**: Verificar que `getUserById` incluye conductor
2. **Corrección 1**: Auto-crear conductor en registro
3. **Corrección 2**: Ajustar middleware de verificación
4. **Corrección 3**: Consistencia en documentos
5. **Corrección 5**: Mejorar endpoint de status
6. **Corrección 6**: Decidir qué hacer con become-driver
7. **Corrección 7**: Revisar validaciones de email

---

## Pruebas Requeridas

1. Usuario nuevo se registra como conductor → flujo completo funciona
2. Usuario existente (cliente) agrega perfil conductor → flujo completo funciona
3. Documentos de licencia se asocian correctamente al conductorId
4. Middleware no bloquea durante verificación cuando los documentos están subidos
5. El endpoint de status retorna información precisa sobre el progreso

---

## Notas Adicionales

- El sistema actual tiene dos patrones:
  1. **Modelo de conversión** (`become-driver`): Cambia userType de un usuario existente
  2. **Modelo dual** (`add-driver-account`): Crea usuario separado con mismo email

- Recomendación: Estandarizar en el **modelo dual** para evitar conflictos y mantener separación clara entre perfiles.

- Los flags booleanos en la base de datos pueden venir como `1`/`0` (integer) en lugar de `true`/`false`. El código ya maneja esto con `!!` pero verificar consistencia.
