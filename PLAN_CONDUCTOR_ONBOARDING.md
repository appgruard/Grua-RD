# Plan: Formulario de Onboarding para Cliente → Conductor

## Problema Identificado

Cuando un cliente hace clic en "Crear cuenta de conductor" desde su perfil:
1. Navega a `/onboarding` sin parámetros
2. El wizard no detecta correctamente que es un usuario existente que quiere añadir cuenta de conductor
3. Termina redirigiendo al formulario de verificación de cliente (`/verify-pending`)

### Causa Raíz
- El botón navega a `/onboarding` sin el parámetro `?tipo=conductor`
- El wizard usa `urlParams.get('tipo')` para detectar si es una cuenta secundaria
- Sin este parámetro, `isAddingSecondaryAccount` es `false`

---

## Solución Recomendada: Opción 1

Crear un flujo optimizado para clientes existentes que quieren convertirse en conductores, omitiendo los pasos ya completados.

### Cambios Necesarios

#### 1. Modificar navegación en profile.tsx del cliente

**Archivo:** `client/src/pages/client/profile.tsx`

Cambiar:
```javascript
onClick={() => setLocation('/onboarding')}
```
Por:
```javascript
onClick={() => setLocation('/onboarding?tipo=conductor')}
```

#### 2. Modificar onboarding-wizard.tsx para detectar cliente existente

**Archivo:** `client/src/pages/auth/onboarding-wizard.tsx`

**Cambios principales:**

1. **Detectar si es un cliente autenticado añadiendo cuenta de conductor:**
   - Si `user` existe y `user.userType === 'cliente'` y `preselectedType === 'conductor'`
   - Entonces es un cliente que quiere convertirse en conductor

2. **Saltar pasos ya completados:**
   - Email ya verificado (paso 3) → Saltar
   - Nombre y apellido ya existen → Pre-llenar
   - Teléfono ya existe → Pre-llenar

3. **Flujo optimizado para cliente → conductor:**
   - Paso 1: Información básica → SALTAR (ya tiene cuenta)
   - Paso 2: Cédula → MOSTRAR (si no verificada, o ya mostrar para conductor)
   - Paso 3: Verificación email → SALTAR (ya verificado como cliente)
   - Paso 4: Foto de perfil → MOSTRAR
   - Paso 5: Licencia de conducir (frontal y trasera) → MOSTRAR
   - Paso 6: Categorías de servicio → MOSTRAR
   - Paso 7: Vehículos por categoría → MOSTRAR
   - Paso 8: Documentos adicionales → MOSTRAR

4. **Crear endpoint backend para upgrade de cliente a conductor:**
   - Ruta: `POST /api/auth/upgrade-to-driver`
   - Crea registro en tabla `conductores` vinculado al usuario existente
   - Actualiza `userType` a 'conductor' (o manejar cuentas duales)

#### 3. Backend: Nuevo endpoint para upgrade

**Archivo:** `server/routes.ts`

Crear endpoint:
```typescript
POST /api/auth/upgrade-to-driver
Body: {
  licenciaFrontalUrl: string,
  licenciaTraseraUrl: string,
  fotoPerfilUrl: string,
  categorias: ServiceSelection[],
  vehiculos: VehicleData[]
}
```

---

## Tarea Extra: Icono de Ojo para Contraseñas

### Archivos a modificar:

1. **`client/src/pages/auth/login.tsx`**
   - Añadir estado `showPassword`
   - Cambiar input de password a `type={showPassword ? 'text' : 'password'}`
   - Añadir botón con icono `Eye` / `EyeOff` de lucide-react

2. **`client/src/pages/auth/onboarding-wizard.tsx`**
   - Mismo patrón para el campo de contraseña
   - Y para el campo de confirmar contraseña si existe

3. **`client/src/pages/auth/forgot-password.tsx`**
   - Si hay campo de nueva contraseña, aplicar mismo patrón

### Ejemplo de implementación:

```tsx
import { Eye, EyeOff } from 'lucide-react';

const [showPassword, setShowPassword] = useState(false);

<div className="relative">
  <Input
    type={showPassword ? 'text' : 'password'}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="pr-10"
  />
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="absolute right-0 top-0 h-full"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </Button>
</div>
```

---

## Lista de Tareas

### Fase 1: Corregir navegación básica
- [ ] Cambiar navegación en `client/profile.tsx` a `/onboarding?tipo=conductor`
- [ ] Verificar que onboarding-wizard detecte correctamente el parámetro

### Fase 2: Optimizar flujo para clientes existentes
- [ ] Modificar onboarding-wizard para detectar cliente autenticado → conductor
- [ ] Implementar lógica para saltar pasos ya completados (email verificado)
- [ ] Pre-llenar datos existentes (nombre, apellido, email, teléfono)
- [ ] Calcular pasos totales dinámicamente (menos pasos para clientes existentes)

### Fase 3: Backend
- [ ] Crear endpoint `/api/auth/upgrade-to-driver`
- [ ] Manejar creación de registro en tabla `conductores`
- [ ] Considerar si mantener cuenta dual o cambiar userType

### Fase 4: Icono de ojo para contraseñas
- [ ] Implementar en `login.tsx`
- [ ] Implementar en `onboarding-wizard.tsx`
- [ ] Implementar en `forgot-password.tsx` (si aplica)

---

## Notas Adicionales

- El cliente ya tiene: email, nombre, apellido, teléfono, contraseña, cédula verificada (posiblemente)
- El conductor necesita adicionalmente: foto de perfil, licencia, categorías, vehículos
- Se debe preservar la sesión del cliente durante el upgrade
- Considerar mostrar mensaje claro de que están "añadiendo" cuenta de conductor, no creando desde cero
