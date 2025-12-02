# Plan de Corrección: Verificación de Identidad y Validación de Foto de Perfil

## Bug Actual
Los operadores pueden saltarse la verificación de identidad (cédula OCR) y acceder a su cuenta sin haberse verificado. Aunque no completen la validación, pueden:
1. Ir atrás en el wizard
2. Iniciar sesión directamente
3. Acceder a funcionalidades de operador sin verificación

## Problema Raíz
1. **No hay validación en login** - El endpoint `/api/auth/login` no verifica si el operador completó la verificación OCR
2. **No hay estado verificado persistente** - `cedulaVerificada` se registra pero no se valida antes de permitir acceso
3. **Wizard incompleto sin restricción** - El usuario puede abandonar el wizard en cualquier momento
4. **Exposición de datos sensibles** - API responses exponían passwordHash y otros campos internos

## Soluciones Necesarias

### 1. Validación de Verificación en Login (Backend)

**Archivo:** `server/routes.ts` - Endpoint `POST /api/auth/login`

**Cambios:**
```typescript
// Después de autenticar exitosamente
if (user.userType === 'conductor') {
  // Verificar que la cédula fue verificada
  if (!user.cedulaVerificada) {
    return res.status(403).json({
      message: "Debe completar la verificación de identidad antes de acceder",
      requiresVerification: true,
      redirectTo: '/auth/verify-cedula'
    });
  }
  
  // Verificar que el teléfono fue verificado
  if (!user.telefonoVerificado) {
    return res.status(403).json({
      message: "Debe verificar su teléfono antes de acceder",
      requiresVerification: true,
      redirectTo: '/auth/verify-phone'
    });
  }
}
```

**Alternativa:** En `/api/auth/me`, validar que todos los requisitos estén completos

### 2. Bloqueo de Acceso para Verificación Incompleta (Frontend)

**Archivo:** `client/src/lib/auth.tsx` o `client/src/App.tsx`

**Cambios:**
- En el hook `useAuth` o en el componente router principal
- Si el usuario es `conductor` y `!cedulaVerificada`, redirigir a página de verificación
- Mostrar modal con opción para completar verificación o logout

**Nuevo componente:** `client/src/pages/auth/verify-cedula-pending.tsx`
- Similar a página de onboarding pero solo para completar verificación faltante
- Accessible desde:
  - Redirección al login si falta verificación
  - Botón en perfil "Completar verificación"
  - Modal de alerta en dashboard

### 3. Sanitización de Datos de Usuario en Respuestas API

**Archivo:** `server/routes.ts`

**Nuevas funciones helper:**
- `getSafeUser()` - Whitelist explícita de campos públicos
- `getSafeUserForAdmin()` - Whitelist para vistas de admin
- `getSafeUsersForAdmin()` - Sanitizar arrays de usuarios
- `getSafeDriver()` - Sanitizar conductores con usuarios embebidos
- `getSafeDrivers()` - Sanitizar arrays de conductores

**Objetivo:** Prevenir exposición de `passwordHash` y otros campos sensibles en todas las respuestas API

### 4. Validación de Foto de Perfil con Verifik (Backend)

**Archivo:** `server/services/verifik-ocr.ts`

**Nueva función:** `validateProfilePhoto()`
- Usa endpoint `/face/check` de Verifik (ya implementado)
- Valida que sea un rostro humano real
- Score mínimo de confianza: 60%
- Retorna: `{ isHumanFace: boolean, score: number, error?: string }`

**Implementar en:** `server/routes.ts` - Endpoint `POST /api/documents/upload`
- Si `tipoDocumento === 'foto_perfil_verificacion'`
- Validar con `validateProfilePhoto()`
- Rechazar si no pasa validación

### 5. Integración en Flujo de Onboarding/Perfil

**Para Nuevos Operadores (Onboarding):**
1. Paso 2: Verificación de cédula con OCR ✅ (ya existe)
2. Paso 3: Verificación de teléfono ✅ (ya existe)
3. Paso 4: Subir documentos (licencia, seguro) ✅ (ya existe)
4. **Nuevo Paso 4B:** Foto de perfil verificada
   - Capturar foto clara de rostro
   - Validar con Verifik (no es maquillaje, filtro, foto de foto)
   - Confirmar antes de continuar

**Para Operadores Existentes (Perfil):**
- En `client/src/pages/driver/profile.tsx`
- Al subir foto de perfil, validar automáticamente con Verifik
- Si falla: mostrar error + opciones (reintentarlo, usar otra foto)

### 6. Schema/Tipos Necesarios

**En `shared/schema.ts`:**
```typescript
// Agregar campo para validación de foto
photoVerified: boolean (default: false)
photoVerificationScore: number | null (default: null)

// O una tabla separada de verificaciones
export const identityVerifications = pgTable('identity_verifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  cedulaVerificada: boolean('cedula_verificada').default(false),
  cedulaScore: numeric('cedula_score'),
  fotoVerificada: boolean('foto_verificada').default(false),
  fotoScore: numeric('foto_score'),
  telefonoVerificado: boolean('telefono_verificado').default(false),
  verificadoEn: timestamp('verificado_en'),
});
```

### 7. Endpoints Necesarios

**1. `POST /api/identity/verify-profile-photo`**
- Valida foto de perfil con Verifik
- Retorna: `{ verified: boolean, score: number, error?: string }`
- Requiere autenticación

**2. `POST /api/identity/complete-verification`**
- Marca toda la verificación como completa
- Solo disponible si todos los pasos están completados
- Requiere `cedulaVerificada && telefonoVerificado && fotoVerificada`

**3. `GET /api/identity/verification-status`**
- Retorna estado completo de verificación del usuario
- Para operadores: `{ cedulaVerificada, telefonoVerificado, fotoVerificada, completa }`

### 8. Cambios en EditProfileModal

**Archivo:** `client/src/components/EditProfileModal.tsx`

```typescript
// Al subir foto de perfil para operadores
const handlePhotoUpload = async (file: File) => {
  try {
    // 1. Validar con Verifik primero
    const base64 = await convertToBase64(file);
    const verifyResponse = await fetch('/api/identity/verify-profile-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 })
    });
    
    const verifyData = await verifyResponse.json();
    
    if (!verifyData.verified) {
      toast({
        title: 'Foto no válida',
        description: verifyData.error || 'La foto no parece ser de una persona real',
        variant: 'destructive'
      });
      return;
    }
    
    // 2. Si validó, subir normalmente
    await uploadPhoto(file);
  } catch (error) {
    // manejar error
  }
};
```

### 9. Página de Verificación Pendiente

**Nuevo archivo:** `client/src/pages/auth/verify-cedula-pending.tsx`

- Similar a página de onboarding pero solo para completar verificación faltante
- Accessible desde:
  - Redirección al login si falta verificación
  - Botón en perfil "Completar verificación"
  - Modal de alerta en dashboard

## Orden de Implementación

### Fase 1: Crítica (Bloquear acceso sin verificación) ✅ COMPLETADA - 2 Dic 2025

**Estado:** Implementado y funcionando

**Cambios realizados:**

1. ✅ **Validación en login backend** (`server/routes.ts`)
   - Endpoint `POST /api/auth/login` ahora valida `cedulaVerificada` y `telefonoVerificado` para conductores
   - Retorna 403 con `requiresVerification: true` si falta alguna verificación
   - Incluye `verificationStatus` con el estado de cada verificación

2. ✅ **Página de verificación pendiente** (`client/src/pages/auth/verify-pending.tsx`)
   - Nueva página que permite completar verificación de cédula y teléfono
   - Reutiliza lógica de escaneo OCR existente
   - Flujo de 2 pasos: primero cédula, luego teléfono
   - Indicador de progreso visual

3. ✅ **Actualización del hook de autenticación** (`client/src/lib/auth.tsx`)
   - Nuevos estados: `pendingVerification` y `pendingVerificationUser`
   - Manejo de error 403 con `requiresVerification`
   - Nueva función `clearPendingVerification()`
   - Manejo robusto de respuestas JSON malformadas

4. ✅ **Protección de rutas** (`client/src/App.tsx`)
   - `ProtectedRoute` redirige a `/verify-pending` si conductor no está verificado
   - Nueva ruta `/verify-pending` registrada
   - Verificación basada en datos del servidor (no en estado en memoria)
   - Eliminación de dependencia en `pendingVerification` para protección de rutas

5. ✅ **Alerta visual en dashboard** (`client/src/pages/driver/dashboard.tsx`)
   - Alerta prominente si el conductor accede sin verificación completa
   - Botón directo para completar verificación

6. ✅ **Página de login actualizada** (`client/src/pages/auth/login.tsx`)
   - Detecta error de verificación requerida
   - Redirige automáticamente a `/verify-pending`
   - Toast informativo para el usuario
   - Validación de verificación basada en datos del servidor

7. ✅ **Sanitización de datos de usuario - DEFENSA EN PROFUNDIDAD** (`server/routes.ts`)
   - Nueva función `getSafeUser()` con whitelist explícita de campos públicos
   - Aplicada en endpoints: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/users/profile`
   - Nueva función `getSafeUserForAdmin()` para vistas de admin
   - Aplicada en endpoints: `/api/admin/users`, `/api/admin/drivers`
   - Nuevo helper `getSafeDrivers()` para sanitizar arrays de conductores
   - **Resultado:** Password hashes y otros campos sensibles nunca se exponen en respuestas API

**Archivos modificados:**
- `server/routes.ts` - Validación en login + sanitización de respuestas
- `client/src/lib/auth.tsx` - Estados de verificación pendiente + manejo robusto de JSON
- `client/src/App.tsx` - Nueva ruta y ProtectedRoute actualizado
- `client/src/pages/auth/login.tsx` - Manejo de redirección
- `client/src/pages/auth/verify-pending.tsx` - Nueva página (creada)
- `client/src/pages/driver/dashboard.tsx` - Alerta de verificación

**Mejoras de Seguridad Implementadas:**
- ✅ Verificación forzada en login para conductores
- ✅ Bloqueo de acceso a rutas protegidas sin verificación
- ✅ Sanitización de todas las respuestas de usuario (whitelist explícita)
- ✅ Eliminación de dependencia en estado en memoria (server-authoritative)
- ✅ Manejo robusto de errores JSON

### Fase 2: Validación de Foto ⏳ PENDIENTE
1. Crear endpoint `POST /api/identity/verify-profile-photo` 
2. Integrar validación en `EditProfileModal.tsx`
3. Agregar validación opcional/requerida según política

### Fase 3: Mejoras UX ⏳ PENDIENTE
1. Crear endpoint `GET /api/identity/verification-status`
2. Agregar paso de foto de perfil en onboarding
3. Mejorar página de resumen de verificación

## Archivos a Modificar

```
server/routes.ts                          # ✅ Validaciones en login + sanitización
server/services/verifik-ocr.ts           # Ya tiene validateProfilePhoto
client/src/lib/auth.tsx                  # ✅ Proteger rutas para no-verificados
client/src/App.tsx                       # ✅ Redirigir si falta verificación
client/src/pages/auth/verify-cedula-pending.tsx  # ✅ Nuevo
client/src/components/EditProfileModal.tsx       # Validar foto de perfil
shared/schema.ts                         # Agregar fotoVerificada campo
```

## Testing

1. **Login sin verificación** - Verificar que se rechaza ✅
2. **Login con verificación completa** - Verificar que permite acceso ✅
3. **Acceso directo a ruta protegida sin verificación** - Verificar que redirige ✅
4. **Verificar que passwordHash no está en respuestas API** - ✅
5. **Foto no válida (meme, foto de pantalla)** - Verificar que rechaza (Fase 2)
6. **Foto válida de persona** - Verificar que acepta (Fase 2)

## Impacto de Cambios

- ✅ Seguridad: Garantiza que solo operadores verificados accedan
- ✅ Seguridad: Previene exposición de datos sensibles en API responses
- ✅ Compliance: Cumple con requisitos de identidad real
- ✅ UX: Bloqueos claros pero orientados a ayudar completar verificación
- ⚠️ Disrupción: Operadores existentes no verificados serán bloqueados (necesitarán re-verificarse)

## Decisiones de Diseño

### Sanitización de Datos (Whitelist vs Blacklist)
**Decisión:** Usar whitelist explícita en `getSafeUser()` en lugar de blacklist
**Justificación:** 
- Whitelist es más seguro (solo campos permitidos se exponen)
- Blacklist corre riesgo de nuevos campos sensibles que se olviden de excluir
- Mantiene consistencia si se agregan nuevos campos a la tabla User

### Server-Authoritative Verification Check
**Decisión:** Verificación basada en datos del servidor (`/api/auth/me`) en lugar de estado en memoria
**Justificación:**
- Previene que usuarios manipulen estado del cliente para saltarse verificación
- Consulta de fuente autoritaria cada vez que se accede a ruta protegida
- ProtectedRoute ahora no depende de `pendingVerification` (que es temporal)

### Respuesta 403 en Login vs Acceso a Dashboard
**Decisión:** Login retorna 403, pero permite autenticación parcial (no crea sesión)
**Justificación:**
- Cliente recibe error claro con instrucciones
- No crea sesión autenticada - usuario must complete verification
- Flujo es intuitivo: login → rechazado → página de verificación → login de nuevo
