# Plan de Correcciones - Flujo de Verificación de Conductores

## Resumen de Problemas Identificados

### Bug 1: Se solicita foto de perfil nuevamente después de la verificación
**Ubicación**: `client/src/pages/auth/verify-pending.tsx`
**Problema**: Después de que el conductor completa la verificación, al acceder al dashboard se le vuelve a pedir la foto de perfil aunque ya la subió durante la verificación.
**Causa probable**: El estado `fotoVerificada` no se está sincronizando correctamente con el backend, o hay una condición en el dashboard que pide la foto sin verificar el estado actual.

### Bug 2: No aparece el apartado para subir licencia (frontal y trasera)
**Ubicación**: Flujo de verificación/onboarding
**Problema**: Durante la verificación o después de completarla, no se muestra la opción para que el conductor suba su licencia de conducir (frente y reverso).
**Causa probable**: El flujo de verificación actual solo incluye cédula, email y foto de perfil, pero no incluye la subida de licencia como paso obligatorio.

### Bug 3: No aparece el apartado para seleccionar categorías y vehículos
**Ubicación**: Flujo de verificación/onboarding
**Problema**: El conductor no ve las opciones para seleccionar las categorías de servicio que ofrece ni para registrar sus vehículos por categoría.
**Causa probable**: El flujo `verify-pending.tsx` no incluye estos pasos. Solo están disponibles en `onboarding-wizard.tsx` para nuevos registros o en el perfil del conductor.

### Bug 4: Campo "Información de la Grúa" en Editar Perfil
**Ubicación**: `client/src/components/EditProfileModal.tsx` (líneas 579-655)
**Problema**: El modal de editar perfil muestra campos de "Información de la Grúa" (placaGrua, marcaGrua, modeloGrua) que no deberían existir ya que los conductores pueden tener múltiples vehículos por categoría.
**Solución**: Eliminar la sección "Información de la Grúa" del EditProfileModal y dirigir al usuario a la sección "Vehículos por Categoría" en el perfil para gestionar sus vehículos.

### Bug 5: Siguiente paso no se muestra hasta actualizar la página
**Ubicación**: `client/src/pages/auth/verify-pending.tsx`
**Problema**: Después de completar un paso (ej: subir cédula), las opciones del siguiente paso (ej: "Subir archivo" o "Abrir cámara" para foto de perfil) no se despliegan automáticamente. El usuario debe refrescar la página para ver las opciones.
**Causa probable**: El estado del componente no se está actualizando correctamente después de completar un paso. Es posible que el cambio de `currentStep` no esté disparando un re-render del contenido del paso.

---

## Plan de Implementación

### Tarea 1: Corregir Bug 5 - UI del siguiente paso no se despliega
**Prioridad**: Alta (afecta la experiencia de usuario)
**Archivos a modificar**: `client/src/pages/auth/verify-pending.tsx`

**Pasos**:
1. Revisar la función `scanCedulaImage` y cómo actualiza `currentStep`
2. Asegurar que después de `setCurrentStep('email')` o `setCurrentStep('photo')`, el componente renderice correctamente las opciones del nuevo paso
3. Verificar que no hay condiciones que oculten los botones de acción del paso actual
4. Forzar un re-render si es necesario usando una key única en el contenedor del paso

**Prueba de aceptación**: Al completar el escaneo de cédula, las opciones del siguiente paso (email o foto) deben aparecer automáticamente sin necesidad de refrescar.

---

### Tarea 2: Corregir Bug 1 - Foto de perfil solicitada nuevamente
**Prioridad**: Alta
**Archivos a modificar**: 
- `client/src/pages/auth/verify-pending.tsx`
- `client/src/pages/driver/dashboard.tsx` (si aplica)
- Verificar endpoint `/api/identity/verification-status`

**Pasos**:
1. Verificar que `fotoVerificada` se establece a `true` correctamente en el backend después de validar la foto
2. Revisar la lógica de redirección después de completar la verificación
3. Asegurar que el dashboard no tiene condiciones que soliciten la foto nuevamente si ya está verificada
4. Verificar que `refreshUser()` actualiza correctamente el estado del usuario con `fotoVerificada: true`

**Prueba de aceptación**: Después de completar todos los pasos de verificación, el conductor debe acceder directamente al dashboard sin que se le pida foto nuevamente.

---

### Tarea 3: Corregir Bug 4 - Eliminar "Información de la Grúa" del perfil
**Prioridad**: Media
**Archivos a modificar**: 
- `client/src/components/EditProfileModal.tsx`
- `client/src/pages/driver/profile.tsx` (remover props relacionados)

**Pasos**:
1. En `EditProfileModal.tsx`:
   - Eliminar estados: `placaGrua`, `marcaGrua`, `modeloGrua`
   - Eliminar la sección JSX "Información de la Grúa" (líneas 579-655 aproximadamente)
   - Eliminar la interfaz `conductorData` del tipo de props (o solo dejar `licencia`)
   - Eliminar la lógica de actualización de estos campos en `handleSubmit`

2. En `profile.tsx`:
   - Actualizar la llamada a `EditProfileModal` para no pasar los campos de grúa

**Prueba de aceptación**: El modal de editar perfil no debe mostrar campos de placa, marca o modelo de grúa. Los vehículos se gestionan únicamente desde la sección "Vehículos por Categoría".

---

### Tarea 4: Agregar pasos de licencia, categorías y vehículos al flujo de verificación
**Prioridad**: Alta
**Archivos a modificar**: 
- `client/src/pages/auth/verify-pending.tsx`
- Posiblemente crear nuevos componentes para estos pasos

**Pasos**:
1. Extender el flujo de verificación para conductores con pasos adicionales:
   - Paso 4: Subir licencia de conducir (frente y reverso)
   - Paso 5: Seleccionar categorías de servicio
   - Paso 6: Registrar vehículos por categoría

2. Actualizar la lógica de `getSteps()` para incluir los nuevos pasos

3. Agregar el contenido JSX para cada nuevo paso:
   - Licencia: Similar al componente de documentos en `profile.tsx` o `onboarding-wizard.tsx`
   - Categorías: Usar `ServiceCategoryMultiSelect` 
   - Vehículos: Usar `VehicleCategoryForm`

4. Actualizar las mutaciones y el flujo de navegación

5. Modificar la condición de verificación completa para incluir:
   - `cedulaVerificada`
   - `emailVerificado`
   - `fotoVerificada`
   - Licencia subida (al menos frente)
   - Al menos una categoría seleccionada
   - Al menos un vehículo registrado

**Nota**: Esta tarea es significativa y puede requerir dividirse en sub-tareas.

**Prueba de aceptación**: El conductor debe poder completar todos los pasos de verificación incluyendo licencia, categorías y vehículos antes de acceder al dashboard.

---

## Orden de Implementación Recomendado

1. **Bug 5** (UI siguiente paso) - Es el más urgente para la experiencia de usuario
2. **Bug 1** (foto solicitada nuevamente) - Relacionado con el flujo de verificación
3. **Bug 4** (eliminar info grúa) - Cambio independiente y rápido
4. **Bugs 2 y 3** (agregar licencia, categorías, vehículos) - Cambio más extenso

---

## Notas Adicionales

- La app está desplegada en CapRover, no en Replit. Los cambios requieren hacer deploy manual.
- Los conductores pueden tener múltiples vehículos y seleccionar múltiples categorías.
- El flujo de verificación tiene 3 pasos actuales (cédula, email, foto) pero debería tener 6 pasos para conductores.
- Los clientes solo requieren 2 pasos (cédula, email).
