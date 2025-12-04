# Plan de Correcciones de Responsividad y Terminología

## Resumen de Problemas Identificados

1. **Pantalla "Confirmar Solicitud" (después de método de pago)** - Responsividad móvil ✅ COMPLETADO
2. **Error al solicitar servicio de extracción** - Error funcional ✅ COMPLETADO
3. **Pantalla "Confirmar Evaluación"** - Responsividad móvil ✅ COMPLETADO
4. **Pantalla inicio de operadores** - Responsividad tarjetas de estado ✅ COMPLETADO
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

## Tarea 3: Corregir Responsividad en "Confirmar Evaluación" ✅ COMPLETADO

**Archivo:** `client/src/pages/driver/extraction-evaluation.tsx`

**Problemas identificados:**
- Las Cards con `p-4` pueden ser muy espaciadas en móviles
- El mapa con `h-40` fijo puede ser muy pequeño o grande según dispositivo
- El input de monto propuesto y botón pueden estar muy apretados
- Los badges pueden desbordarse en pantallas pequeñas

**Cambios realizados:**
1. Cambiado padding de Cards: `p-3 sm:p-4` en todas las Cards
2. Mapa responsive: `h-32 sm:h-40` para mejor visualización en móviles
3. Contenedor principal: `p-3 sm:p-4 space-y-3 sm:space-y-4`
4. Títulos de Cards: `text-sm sm:text-base` para textos responsivos
5. Reducido tamaño de textos descriptivos: `text-xs sm:text-sm`
6. Badges con `text-xs` y gap reducido: `gap-1.5 sm:gap-2`
7. Botón de propuesta: `h-11 sm:h-12 text-sm sm:text-base`
8. Espaciado del formulario: `space-y-3 sm:space-y-4`
9. Label del monto: `text-xs sm:text-sm`
10. Iconos con `flex-shrink-0` para evitar compresión
11. Direcciones con `line-clamp-2` para mejor legibilidad

---

## Tarea 4: Corregir Responsividad en Dashboard de Operadores ✅ COMPLETADO

**Archivo:** `client/src/pages/driver/dashboard.tsx`

**Problemas identificados:**
- El grid de información `grid grid-cols-2` no se adapta a móviles muy pequeños
- Las tarjetas de solicitudes cercanas tienen padding excesivo
- Los botones de navegación (Waze/Google Maps) pueden cortarse
- El panel inferior con altura `max-h-[65vh]` puede ser problemático

**Cambios realizados:**

### Panel de Servicio Activo:
1. Panel inferior: `max-h-[55vh] sm:max-h-[65vh]` para móviles pequeños
2. Contenedor scrollable: `px-3 sm:px-4` y cálculo de altura ajustado
3. Grid de detalles de servicio: `grid-cols-1 sm:grid-cols-2` para móviles
4. Padding en elementos: `p-2.5 sm:p-3` para mejor ajuste
5. Textos responsivos: `text-xs sm:text-sm` en información
6. Indicadores origen/destino: tamaño reducido `w-2 h-2 sm:w-2.5 sm:h-2.5`
7. Direcciones con `line-clamp-1` para evitar overflow
8. Botones de navegación: `h-9 sm:h-10` y texto acortado ("Waze", "Maps")
9. Iconos de navegación: `w-3.5 h-3.5 sm:w-4 sm:h-4`
10. Botones de acción: `h-11 sm:h-12 text-sm sm:text-base`
11. Sección de extracción: padding y tamaños reducidos

### Panel de Solicitudes Cercanas:
1. Panel: `max-h-[50vh] sm:max-h-[60vh]` para móviles
2. Header: `px-3 sm:px-4` y texto `text-xs sm:text-sm`
3. Cards de solicitudes: `p-3 sm:p-4`
4. Espaciado entre Cards: `space-y-2 sm:space-y-3`
5. Direcciones: `text-xs sm:text-sm` con `line-clamp-1`
6. Badges gap: `gap-1.5 sm:gap-2`
7. Texto "Requiere Negociacion" → "Negociacion" (más corto)
8. Descripción situación: padding `p-1.5 sm:p-2`
9. Precios y distancia: iconos y texto reducidos
10. Botones Aceptar/Rechazar: `h-9 sm:h-10 text-xs sm:text-sm`

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
| `client/src/pages/driver/extraction-evaluation.tsx` | 3 | ✅ Completado |
| `client/src/pages/driver/dashboard.tsx` | 4 | ✅ Completado |
| `client/src/pages/client/tracking.tsx` | 5, 6 | Pendiente |
| `client/src/pages/client/history.tsx` | 6 | Pendiente |
| `client/src/pages/empresa/solicitudes.tsx` | 6 | Pendiente |

---

## Criterios de Éxito

- [x] Pantalla de confirmar solicitud se ve correctamente en iPhone SE (375px)
- [x] Servicio de extracción se crea correctamente sin errores
- [x] Pantalla de confirmar evaluación es usable en móviles
- [x] Tarjetas de estado en dashboard de operadores no se cortan
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
- **Tarea 3 completada:** Mejorada responsividad en pantalla "Confirmar Evaluación"
  - Mapa responsivo: h-32 sm:h-40
  - Cards con padding reducido: p-3 sm:p-4
  - Textos responsivos en títulos y descripciones
  - Botón de propuesta con altura ajustada
  - Espaciado mejorado para formularios en móviles
- **Tarea 4 completada:** Mejorada responsividad en Dashboard de Operadores
  - Panel inferior con altura reducida para móviles: max-h-[55vh] sm:max-h-[65vh]
  - Grid de detalles de servicio adaptativo: grid-cols-1 sm:grid-cols-2
  - Botones de navegación más compactos
  - Cards de solicitudes con padding reducido
  - Textos y badges optimizados para pantallas pequeñas
