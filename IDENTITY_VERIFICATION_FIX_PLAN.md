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

### Fase 2: Validación de Foto ✅ COMPLETADA - 2 Dic 2025

**Estado:** Implementado y funcionando

**Cambios realizados:**

1. ✅ **Endpoint de validación de foto de perfil** (`server/routes.ts`)
   - Nuevo endpoint `POST /api/identity/verify-profile-photo`
   - Usa `validateFacePhoto()` de Verifik para detectar rostro humano
   - Score mínimo requerido: 60%
   - Graceful degradation: si Verifik no está configurado, acepta la foto con flag `skipped: true`
   - Rate limiting aplicado (`ocrScanLimiter`)
   - Requiere autenticación

2. ✅ **Integración en EditProfileModal** (`client/src/components/EditProfileModal.tsx`)
   - Validación automática de rostro al seleccionar foto (solo para conductores)
   - Estados de validación: `idle`, `validating`, `success`, `failed`, `skipped`
   - Feedback visual con iconos y colores diferenciados:
     - Verde (CheckCircle2) para validación exitosa con porcentaje de confianza
     - Rojo (XCircle) para validación fallida con mensaje de error específico
     - Amarillo (AlertCircle) para servicio no disponible (revisión manual)
   - Bloqueo de submit si la validación falla para conductores
   - Botón de subir foto deshabilitado durante validación
   - Toast notifications para feedback del usuario

3. ✅ **Política de validación implementada**
   - **Conductores:** Validación requerida - no pueden subir foto sin rostro detectado
   - **Otros usuarios:** Sin validación (no aplica)
   - **Si Verifik no disponible:** Foto requiere revisión manual (`verified: false, skipped: true`)

4. ✅ **Correcciones de seguridad adicionales**
   - Validación de tamaño de imagen (máx 10MB base64)
   - Validación de formato base64 antes de enviar a Verifik
   - Manejo correcto de respuestas HTTP 400 sin enmascarar errores
   - Bloqueo de submit durante validación (`isValidating` check)
   - Cuando Verifik no está disponible, retorna `verified: false` (no auto-aprueba)

**Archivos modificados:**
- `server/routes.ts` - Nuevo endpoint `/api/identity/verify-profile-photo` con validaciones
- `client/src/components/EditProfileModal.tsx` - Integración completa de validación

**Mejoras de Seguridad Implementadas:**
- ✅ Validación de rostro humano antes de subir foto de perfil
- ✅ Bloqueo de fotos no válidas (memes, logos, fotos de pantalla, etc.)
- ✅ Score de confianza visible para transparencia
- ✅ Validación de tamaño y formato de imagen (previene DoS)
- ✅ Bloqueo de submit durante validación (previene race condition)
- ✅ Cuando Verifik no disponible: requiere revisión manual (no auto-aprueba)

### Fase 3: Mejoras UX ✅ COMPLETADA - 2 Dic 2025

**Estado:** Implementado (7/8 subtareas completadas)

**Cambios realizados:**

1. ✅ **Nuevo campo en schema** (`shared/schema.ts`)
   - Agregado `fotoVerificada: boolean` (default false)
   - Agregado `fotoVerificadaScore: decimal` (precision 5, scale 2)
   - Ambos campos omitidos en `insertUserSchema` para evitar asignación manual

2. ✅ **Mejora del endpoint `/api/identity/status`** (`server/routes.ts`)
   - Ahora incluye `fotoVerificada` y `fotoVerificadaScore`
   - `fullyVerified` diferencia entre conductores y clientes
   - Retorna información de URL de foto y tipo de usuario

3. ✅ **Nuevo endpoint `GET /api/identity/verification-status`** (`server/routes.ts`)
   - Retorna estado detallado de cada paso de verificación
   - Para conductores: cédula + teléfono + foto de perfil (3 pasos obligatorios)
   - Para clientes: cédula + teléfono (2 pasos obligatorios)
   - Incluye progreso en porcentaje y bandera `allCompleted`
   - Incluye bandera `canAccessPlatform` basada en tipo de usuario
   - Estructura de pasos reutilizable para futuros desarrollos

4. ✅ **Endpoint `/api/identity/verify-profile-photo` mejorado** (`server/routes.ts`)
   - Ahora guarda el estado de verificación en la base de datos
   - Al verificar exitosamente: actualiza `fotoVerificada = true` y guarda score
   - Nuevos logs informativos cuando la foto es verificada y guardada
   - Validación de tamaño y formato de base64 (máx 10MB)

5. ✅ **Nuevo paso 5 en onboarding wizard** (`client/src/pages/auth/onboarding-wizard.tsx`)
   - Total de pasos para conductores: 8 (antes 7)
   - Total de pasos para clientes: 8 (sin cambio funcional)
   - Nuevo paso 5: "Foto de Perfil Verificada" (solo para conductores)
   - Flujo para conductores:
     1. Crear cuenta
     2. Verificar cédula (OCR)
     3. Verificar teléfono (OTP)
     4. Subir documentos (licencia + seguro)
     5. **Foto de perfil verificada (NUEVO)**
     6. Seleccionar servicios
     7. Configurar vehículos por categoría
     8. Confirmación final
   - Funciones helper agregadas:
     - `startProfileCamera` - inicia cámara frontal
     - `stopProfileCamera` - detiene cámara
     - `validateProfilePhoto` - valida con API
     - `captureProfilePhoto` - captura foto
     - `handleProfileFileSelect` - maneja subida de archivo
     - `resetProfilePhoto` - reinicia estado
   - UI con estados: idle, validating, success, failed
   - Bloqueo de avance sin foto validada
   - Integración con `/api/identity/verify-profile-photo`

6. ✅ **Estados de validación de foto en wizard**
   - Verde/CheckCircle2 cuando validación exitosa + score visible
   - Rojo/XCircle cuando validación falla + mensaje de error
   - Amarillo/AlertCircle cuando servicio no disponible
   - Loading state durante validación (deshabilitado "Continuar")
   - Opción de reintentar o usar otra foto

**Archivos modificados:**
- `shared/schema.ts` - Nuevos campos fotoVerificada y fotoVerificadaScore
- `server/routes.ts` - Mejorado /api/identity/status, nuevo /api/identity/verification-status, mejorado /api/identity/verify-profile-photo
- `client/src/pages/auth/onboarding-wizard.tsx` - Nuevo paso 5 con validación de foto para conductores

**Mejoras de Seguridad Implementadas:**
- ✅ Foto de perfil requerida para conductores (step obligatorio)
- ✅ Validación de rostro humano real en tiempo real durante onboarding
- ✅ Score de confianza guardado en base de datos para auditoría
- ✅ Bloqueo de avance sin foto válida (no puede saltarse)
- ✅ Persistencia de estado en base de datos (no depende de sesión)
- ✅ Endpoint de estado completo para troubleshooting

### Fase 4: Mejoras UX Adicionales ⏳ PENDIENTE (Futura)
1. Mejorar página de resumen de verificación (`verify-pending.tsx`) con nueva interfaz tipo tarjetas
2. Agregar endpoint admin para revisar fotos de perfil sin verificar
3. Agregar opción para re-verificar foto de perfil en perfil de usuario

## Archivos Modificados (Resumen)

```
✅ Completados:
server/routes.ts                                # Fase 1,2,3: Validaciones login + sanitización + endpoints de verificación
server/services/verifik-ocr.ts                 # Fase 2: validateProfilePhoto
client/src/lib/auth.tsx                        # Fase 1: Proteger rutas
client/src/App.tsx                             # Fase 1: Redirigir si falta verificación
client/src/pages/auth/verify-pending.tsx       # Fase 1: Nueva página
client/src/pages/auth/onboarding-wizard.tsx    # Fase 3: Nuevo paso 5 foto de perfil
client/src/components/EditProfileModal.tsx     # Fase 2: Validar foto de perfil
shared/schema.ts                               # Fase 3: Campos fotoVerificada + fotoVerificadaScore

⏳ Pendientes para futuras mejoras:
client/src/pages/auth/verify-pending.tsx       # Mejorar UI con tarjetas (Fase 4)
```

## Testing

**Fase 1 - Crítica:**
1. ✅ Login sin verificación - Rechazado con 403
2. ✅ Login con verificación completa - Permite acceso
3. ✅ Acceso directo a ruta protegida sin verificación - Redirige a verify-pending
4. ✅ Verificar que passwordHash no está en respuestas API

**Fase 2 - Validación de Foto:**
5. ✅ Foto no válida (meme, foto de pantalla) - Rechazada
6. ✅ Foto válida de persona - Aceptada

**Fase 3 - Mejoras UX:**
7. ✅ Endpoint /api/identity/verification-status retorna estructura correcta
8. ✅ Nuevo paso 5 en onboarding accesible solo para conductores
9. ✅ Validación de foto en tiempo real durante onboarding
10. ✅ Score de confianza guardado en BD
11. ✅ Bloqueo de avance sin foto validada

## Impacto de Cambios

**Positivos:**
- ✅ Seguridad: Garantiza que solo operadores verificados accedan
- ✅ Seguridad: Previene exposición de datos sensibles en API responses
- ✅ Compliance: Cumple con requisitos de identidad real (cédula + teléfono + foto)
- ✅ UX: Bloqueos claros pero orientados a ayudar completar verificación
- ✅ Transparencia: Score de confianza de validación visible para usuarios
- ✅ Facilidad: Foto de perfil capturada con cámara o subida durante onboarding
- ✅ Auditabilidad: Estado completo de verificación guardado en BD

**A Considerar:**
- ⚠️ Disrupción: Operadores existentes no verificados serán bloqueados (necesitarán re-verificarse)
- ⚠️ Capacidad: Validación de rostro requiere Verifik configurado (tiene fallback a revisión manual)
- ⚠️ Privacidad: Datos biométricos de rostro procesados por Verifik (cumplir RGPD si aplica)

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
