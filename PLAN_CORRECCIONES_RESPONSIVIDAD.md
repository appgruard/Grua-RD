# Plan de Correcciones de Responsividad y Terminología

## Resumen de Problemas Identificados

1. **Pantalla "Confirmar Solicitud" (después de método de pago)** - Responsividad móvil
2. **Error al solicitar servicio de extracción** - Error funcional
3. **Pantalla "Confirmar Evaluación"** - Responsividad móvil  
4. **Pantalla inicio de operadores** - Responsividad tarjetas de estado
5. **Estados en app cliente** - Mensajes cuando el operador marca estados
6. **Terminología** - Cambiar "Conductor" por "Operador"

---

## Tarea 1: Corregir Responsividad en "Confirmar Solicitud"

**Archivo:** `client/src/pages/client/home.tsx` (líneas 963-1136)

**Problemas identificados:**
- La tarjeta de confirmación con altura `h-[55vh]` puede cortar contenido en móviles pequeños
- Los elementos de información (servicio, ubicación, pago, precio) usan padding/margin fijos que pueden ser muy grandes para móviles
- El grid de distancia/costo (`grid grid-cols-2`) no se adapta a pantallas muy pequeñas
- Los textos largos (direcciones) pueden desbordarse

**Solución propuesta:**
1. Cambiar altura del panel de `h-[55vh]` a `min-h-[50vh] max-h-[70vh]` para flexibilidad
2. Reducir padding en móviles: `p-3 sm:p-4` en las tarjetas de información
3. Cambiar grid a `grid grid-cols-1 sm:grid-cols-2` para apilar en móviles pequeños
4. Añadir `break-words` y `text-sm` en direcciones largas
5. Reducir tamaño de iconos en móviles: `w-4 h-4 sm:w-5 sm:h-5`

---

## Tarea 2: Diagnosticar y Corregir Error de Servicio de Extracción

**Archivos involucrados:**
- `client/src/pages/client/home.tsx` (función `handleConfirmRequest`, líneas 409-501)
- `server/routes.ts` (endpoint `/api/services/request`, línea 2076+)

**Análisis necesario:**
1. Revisar validación de campos requeridos para extracción
2. Verificar que `descripcionSituacion` se esté enviando correctamente
3. Revisar el endpoint del servidor para validación de servicios de extracción
4. Verificar que `requiereNegociacion` y `estadoNegociacion` se están configurando correctamente

**Posibles causas del error:**
- Campo `descripcionSituacion` no se está incluyendo en el payload
- Validación del servidor puede estar rechazando campos opcionales
- El campo `destinoDireccion` puede estar vacío cuando debería tomar el valor de `origenDireccion`

**Solución propuesta:**
1. Añadir logs para debug en el frontend
2. Verificar la validación del endpoint en servidor
3. Asegurar que todos los campos requeridos para extracción se envían correctamente

---

## Tarea 3: Corregir Responsividad en "Confirmar Evaluación"

**Archivo:** `client/src/pages/driver/extraction-evaluation.tsx` (337 líneas)

**Problemas identificados:**
- Las Cards con `p-4` pueden ser muy espaciadas en móviles
- El mapa con `h-40` fijo puede ser muy pequeño o grande según dispositivo
- El input de monto propuesto y botón pueden estar muy apretados
- Los badges pueden desbordarse en pantallas pequeñas

**Solución propuesta:**
1. Cambiar padding de Cards: `p-3 sm:p-4`
2. Hacer el mapa responsive: `h-32 sm:h-40`
3. Mejorar espaciado del formulario de propuesta
4. Añadir `flex-wrap` en contenedores de badges
5. Reducir tamaño de textos en móviles

---

## Tarea 4: Corregir Responsividad en Dashboard de Operadores

**Archivo:** `client/src/pages/driver/dashboard.tsx` (883 líneas)

**Problemas identificados:**
- El grid de información `grid grid-cols-2` (línea 494) no se adapta a móviles muy pequeños
- Las tarjetas de solicitudes cercanas tienen padding excesivo
- Los botones de navegación (Waze/Google Maps) pueden cortarse
- El panel inferior con altura `max-h-[65vh]` puede ser problemático

**Solución propuesta:**
1. Cambiar grid de detalles de servicio: `grid grid-cols-1 xs:grid-cols-2`
2. Reducir padding en Cards: `p-3 sm:p-4`
3. Mejorar botones de navegación con `text-xs` y mejor truncamiento
4. Ajustar alturas del panel inferior para móviles
5. Hacer badges con `flex-wrap` y tamaño reducido

---

## Tarea 5: Corregir Mensajes de Estado en App Cliente

**Archivo:** `client/src/pages/client/tracking.tsx`

**Problema:**
Cuando el operador marca "Cargando" o "Conductor en sitio", los mensajes muestran "Conductor" en lugar de "Operador".

**Líneas a modificar:**
- Línea 145: `title: 'Conductor'` → `title: 'Operador'`
- Línea 159: `'Buscando conductor...'` → `'Buscando operador...'`
- Línea 160: `'Conductor en camino'` → `'Operador en camino'`
- Línea 161: `'Conductor en el punto'` → `'Operador en el punto'`
- Línea 189: fallback `'Conductor'` → `'Operador'`
- Línea 394: Título del chat

---

## Tarea 6: Cambiar Terminología "Conductor" → "Operador"

**Archivos a modificar:**

### Archivos del Cliente (mayor prioridad):

1. **`client/src/pages/client/tracking.tsx`**
   - statusLabels: "Buscando conductor", "Conductor en camino", "Conductor en el punto"
   - Título del Drawer de chat
   - Fallback del nombre del conductor
   - Marker title

2. **`client/src/pages/client/history.tsx`**
   - Línea 89: `'Conductor en sitio'`
   - Línea 163-167: Referencias a conductor

3. **`client/src/pages/client/home.tsx`**
   - Línea 129: `'Esperando que un conductor acepte'`
   - Línea 702: `'Un conductor revisará tu caso'`
   - Línea 726: `'para que el conductor evalúe'`
   - Línea 774: `'se negociará con el conductor'`
   - Línea 991: `'El conductor evaluará'`
   - Línea 1082: `'El conductor propondrá'`

4. **`client/src/pages/empresa/solicitudes.tsx`**
   - Línea 547: `'Conductor en camino'`

5. **`client/src/components/chat/NegotiationChatBox.tsx`**
   - Referencias al conductor en mensajes

6. **`client/src/pages/auth/onboarding-wizard.tsx`**
   - Línea 701: `<SelectItem value="conductor">Operador</SelectItem>` (ya está correcto)

### Notas importantes:
- NO cambiar valores internos como `userType: 'conductor'` o rutas `/driver`
- Solo cambiar textos visibles al usuario (UI labels)
- Mantener consistencia en género: "el operador", "un operador"

---

## Orden de Ejecución Recomendado

1. **Tarea 2** (Error de extracción) - Crítico para funcionalidad
2. **Tarea 1** (Confirmar solicitud) - Alta visibilidad para clientes
3. **Tarea 5** (Mensajes de estado) - Corrección de terminología prioritaria
4. **Tarea 6** (Terminología general) - Consistencia de marca
5. **Tarea 3** (Confirmar evaluación) - Afecta a operadores
6. **Tarea 4** (Dashboard operadores) - Afecta a operadores

---

## Archivos Afectados (Resumen)

| Archivo | Tareas |
|---------|--------|
| `client/src/pages/client/home.tsx` | 1, 2, 6 |
| `client/src/pages/client/tracking.tsx` | 5, 6 |
| `client/src/pages/client/history.tsx` | 6 |
| `client/src/pages/driver/dashboard.tsx` | 4 |
| `client/src/pages/driver/extraction-evaluation.tsx` | 3 |
| `client/src/pages/empresa/solicitudes.tsx` | 6 |
| `server/routes.ts` | 2 |

---

## Criterios de Éxito

- [ ] Pantalla de confirmar solicitud se ve correctamente en iPhone SE (375px)
- [ ] Servicio de extracción se crea correctamente sin errores
- [ ] Pantalla de confirmar evaluación es usable en móviles
- [ ] Tarjetas de estado en dashboard de operadores no se cortan
- [ ] Todos los textos visibles dicen "Operador" en lugar de "Conductor"
- [ ] Estados en tracking del cliente muestran "Operador"
