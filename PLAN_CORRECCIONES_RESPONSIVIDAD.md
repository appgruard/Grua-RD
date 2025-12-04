# Plan de Correcciones de Responsividad y Terminología

## Resumen de Problemas Identificados

1. **Pantalla "Confirmar Solicitud" (después de método de pago)** - Responsividad móvil ✅ COMPLETADO
2. **Error al solicitar servicio de extracción** - Error funcional ✅ COMPLETADO
3. **Pantalla "Confirmar Evaluación"** - Responsividad móvil  
4. **Pantalla inicio de operadores** - Responsividad tarjetas de estado
5. **Estados en app cliente** - Mensajes cuando el operador marca estados
6. **Terminología** - Cambiar "Conductor" por "Operador"

---

## Tarea 1: Corregir Responsividad en "Confirmar Solicitud" ✅ COMPLETADO

**Archivo:** `client/src/pages/client/home.tsx`

**Cambios realizados:**
1. Cambiado altura del panel de `h-[55vh] md:h-[50vh]` a `min-h-[45vh] max-h-[70vh] h-auto` para flexibilidad
2. Reducido padding en móviles: `px-3 sm:px-4` en lugar de `px-4`
3. Reducido espaciado: `space-y-2 sm:space-y-3` en lugar de `space-y-3`
4. Cambiado texto a `text-xs sm:text-sm` y `text-sm sm:text-base` para mejor legibilidad
5. Reducido tamaño de iconos en móviles: `w-4 h-4 sm:w-5 sm:h-5`
6. Añadido `line-clamp-2 break-words` en direcciones largas en lugar de `truncate`
7. Reducido altura de botón principal: `h-12 sm:h-14`
8. Añadido `truncate` en títulos del header para evitar overflow
9. También se cambió "conductor" a "operador" en mensajes de extracción

---

## Tarea 2: Diagnosticar y Corregir Error de Servicio de Extracción ✅ COMPLETADO

**Archivo:** `server/routes.ts` (líneas 2095-2131)

**Problema identificado:**
La validación del servidor solo exceptuaba servicios "onsite" de la validación de destino diferente al origen. Los servicios de extracción también usan el mismo origen y destino, pero no estaban siendo exceptuados.

**Solución aplicada:**
1. Añadida función `isExtractionService()` en el servidor
2. Modificada la validación para exceptuar tanto servicios onsite como servicios de extracción:
   ```javascript
   const isExtraction = isExtractionService(data.servicioCategoria || '');
   if (isOnsite || isExtraction) {
     return true;
   }
   ```

**Resultado:** Los servicios de extracción ahora se pueden crear correctamente sin el error "Servicios de transporte requieren un destino diferente al origen".

---

## Tarea 3: Corregir Responsividad en "Confirmar Evaluación" (PENDIENTE)

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

## Tarea 4: Corregir Responsividad en Dashboard de Operadores (PENDIENTE)

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

## Tarea 5: Corregir Mensajes de Estado en App Cliente (PENDIENTE)

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

## Tarea 6: Cambiar Terminología "Conductor" → "Operador" (PARCIALMENTE COMPLETADO)

### Archivos modificados:

1. **`client/src/pages/client/home.tsx`** ✅ COMPLETADO
   - Línea 132: `'Esperando que un operador acepte'`
   - Línea 705: `'Un operador revisará tu caso'`
   - Línea 729: `'para que el operador evalúe'`
   - Línea 777: `'se negociará con el operador'`
   - Línea 994: `'El operador evaluará'`
   - Línea 1085: `'El operador propondrá'`

### Archivos pendientes:

2. **`client/src/pages/client/tracking.tsx`**
   - statusLabels: "Buscando conductor", "Conductor en camino", "Conductor en el punto"
   - Título del Drawer de chat
   - Fallback del nombre del conductor
   - Marker title

3. **`client/src/pages/client/history.tsx`**
   - Línea 89: `'Conductor en sitio'`
   - Línea 163-167: Referencias a conductor

4. **`client/src/pages/empresa/solicitudes.tsx`**
   - Línea 547: `'Conductor en camino'`

5. **`client/src/components/chat/NegotiationChatBox.tsx`**
   - Referencias al conductor en mensajes

### Notas importantes:
- NO cambiar valores internos como `userType: 'conductor'` o rutas `/driver`
- Solo cambiar textos visibles al usuario (UI labels)
- Mantener consistencia en género: "el operador", "un operador"

---

## Archivos Afectados (Resumen)

| Archivo | Tareas | Estado |
|---------|--------|--------|
| `client/src/pages/client/home.tsx` | 1, 6 | ✅ Completado |
| `server/routes.ts` | 2 | ✅ Completado |
| `client/src/pages/client/tracking.tsx` | 5, 6 | Pendiente |
| `client/src/pages/client/history.tsx` | 6 | Pendiente |
| `client/src/pages/driver/dashboard.tsx` | 4 | Pendiente |
| `client/src/pages/driver/extraction-evaluation.tsx` | 3 | Pendiente |
| `client/src/pages/empresa/solicitudes.tsx` | 6 | Pendiente |

---

## Criterios de Éxito

- [x] Pantalla de confirmar solicitud se ve correctamente en iPhone SE (375px)
- [x] Servicio de extracción se crea correctamente sin errores
- [ ] Pantalla de confirmar evaluación es usable en móviles
- [ ] Tarjetas de estado en dashboard de operadores no se cortan
- [ ] Todos los textos visibles dicen "Operador" en lugar de "Conductor"
- [ ] Estados en tracking del cliente muestran "Operador"

---

## Historial de Cambios

### 2025-12-04
- **Tarea 1 completada:** Mejorada responsividad de pantalla "Confirmar Solicitud"
  - Ajustada altura del panel para mejor flexibilidad
  - Reducido padding/espaciado para móviles pequeños
  - Mejorado truncamiento de textos largos
  - Reducido tamaño de iconos y botones
- **Tarea 2 completada:** Corregido error de servicios de extracción
  - Añadida función `isExtractionService()` en servidor
  - Modificada validación para exceptuar servicios de extracción
- **Tarea 6 parcial:** Cambiada terminología a "Operador" en home.tsx
