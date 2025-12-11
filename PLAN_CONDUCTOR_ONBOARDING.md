# Plan: Formulario de Onboarding para Cliente → Añadir Cuenta de Conductor

## Estado: ✅ COMPLETADO (11 Diciembre 2025)

---

## Problema Identificado

Cuando un cliente hace clic en "Crear cuenta de conductor" desde su perfil:
1. Navega a `/onboarding` sin parámetros
2. El wizard no detecta correctamente que es un usuario existente que quiere añadir cuenta de conductor
3. Termina redirigiendo al formulario de verificación de cliente (`/verify-pending`)

### Causa Raíz
- El botón navega a `/onboarding` sin el parámetro `?tipo=conductor`
- El wizard usa `urlParams.get('tipo')` para detectar si es una cuenta secundaria
- Sin este parámetro, `isAddingSecondaryAccount` es `false`

### Nota Importante
El sistema soporta **cuentas duales** - el usuario puede tener AMBAS cuentas (cliente y conductor) activas simultáneamente. No es un "upgrade" que reemplace la cuenta de cliente, sino la **creación de una cuenta adicional de conductor** vinculada al mismo usuario.

---

## Solución Implementada

### Fase 1: Corregir navegación básica ✅

**Archivo:** `client/src/pages/client/profile.tsx`

Cambiado:
```javascript
onClick={() => setLocation('/onboarding')}
```
Por:
```javascript
onClick={() => setLocation('/onboarding?tipo=conductor')}
```

---

### Fase 2: Optimizar flujo para clientes existentes ✅

**Archivo:** `client/src/pages/auth/onboarding-wizard.tsx`

**Cambios implementados:**

1. **Nueva flag de detección** (línea 64):
   ```typescript
   const isClientAddingDriverAccount = Boolean(user && (user as any).userType === 'cliente' && preselectedType === 'conductor');
   ```

2. **Configuración dinámica de pasos** (líneas 211-220):
   - Array `stepConfig` con condiciones de visibilidad para cada paso
   - `visibleSteps` filtra solo los pasos necesarios
   - `TOTAL_VISIBLE_STEPS` proporciona el conteo correcto

3. **Helpers de navegación** (líneas 222-235):
   - `getNextVisibleStep()` - encuentra el siguiente paso visible
   - `getFirstVisibleStep()` - encuentra el primer paso visible

4. **Banner informativo** (líneas 1581-1591):
   - Muestra alerta cuando `isClientAddingDriverAccount` es true
   - Mensaje: "Estás añadiendo una cuenta de conductor a tu perfil existente. Podrás alternar entre ambas cuentas."

5. **Auto-completar pasos en mount** (líneas 113-147):
   - Pre-llena formData con datos existentes del usuario
   - Marca pasos 1, 2 (si cédula verificada), 3 (si email verificado) como completados
   - Salta al primer paso visible que necesita completarse

6. **Progreso actualizado** (línea 1594):
   - Muestra "Paso X de Y" usando índice de paso visible

---

### Fase 3: Backend - Endpoint para cuenta dual ✅

**Archivo:** `server/routes.ts`

Nuevo endpoint: `POST /api/auth/add-driver-account`

**Funcionalidad:**
- Verifica que el usuario esté autenticado y sea cliente
- Verifica que no tenga ya una cuenta de conductor
- Crea nuevo usuario con `userType: 'conductor'` y mismo email
- Copia datos comunes: nombre, apellido, teléfono, cédula, verificaciones
- Usa el mismo passwordHash (misma contraseña)
- Envía email de bienvenida como operador
- Inicia sesión automáticamente en la nueva cuenta de conductor

**Integración con frontend:**
- El `finalizeProfileMutation` en el wizard detecta `isClientAddingDriverAccount`
- Llama primero al endpoint para crear la cuenta de conductor
- Luego actualiza los datos específicos del conductor (licencia, vehículos, etc.)

---

### Fase 4: Icono de ojo para contraseñas ✅

**Archivos modificados:**

1. **`client/src/pages/auth/login.tsx`**
   - Añadido `Eye, EyeOff` a imports
   - Estado `showPassword`
   - Botón toggle en campo de contraseña

2. **`client/src/pages/auth/onboarding-wizard.tsx`**
   - Añadido `Eye, EyeOff` a imports
   - Estado `showPassword`
   - Botón toggle en campo de contraseña

3. **`client/src/pages/auth/forgot-password.tsx`**
   - Añadido `Eye, EyeOff` a imports
   - Estados `showNewPassword` y `showConfirmPassword`
   - Botones toggle en ambos campos de contraseña

---

## Lista de Tareas Completadas

### Fase 1: Corregir navegación básica
- [x] Cambiar navegación en `client/profile.tsx` a `/onboarding?tipo=conductor`
- [x] Verificar que onboarding-wizard detecte correctamente el parámetro

### Fase 2: Optimizar flujo para clientes existentes
- [x] Modificar onboarding-wizard para detectar cliente autenticado → conductor
- [x] Implementar lógica para saltar pasos ya completados (email verificado)
- [x] Pre-llenar datos existentes (nombre, apellido, email, teléfono)
- [x] Calcular pasos totales dinámicamente (menos pasos para clientes existentes)

### Fase 3: Backend
- [x] Crear endpoint `/api/auth/add-driver-account`
- [x] Crear nuevo usuario con `userType: 'conductor'` vinculado al mismo email
- [x] Copiar datos comunes del cliente (nombre, apellido, teléfono, cédula)
- [x] Integrar con finalizeProfileMutation en el wizard

### Fase 4: Icono de ojo para contraseñas
- [x] Implementar en `login.tsx`
- [x] Implementar en `onboarding-wizard.tsx`
- [x] Implementar en `forgot-password.tsx`

---

## Notas Adicionales

- **Sistema de cuentas duales:** El usuario mantiene AMBAS cuentas (cliente y conductor) activas
- El cliente ya tiene: email, nombre, apellido, teléfono, contraseña, cédula verificada (posiblemente)
- El conductor necesita adicionalmente: foto de perfil, licencia, categorías, vehículos
- En el login, si el usuario tiene ambas cuentas, se le muestra selector para elegir con cuál ingresar
- Se muestra mensaje claro de que están "añadiendo" cuenta de conductor, no reemplazando la de cliente
- La nueva cuenta de conductor comparte el mismo email pero es un registro separado en `users`
