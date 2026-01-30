# Grúa RD - Instrucciones de Testing para Google Play y App Store

## Credenciales de Prueba

### Google Play Console

**Cuenta Cliente (para probar solicitud de servicios):**
- Email: `googleplay.cliente@gruard.test`
- Contraseña: `Test123456!`

**Cuenta Conductor/Grúero (para probar aceptación de servicios):**
- Email: `googleplay.conductor@gruard.test`
- Contraseña: `Test123456!`

### App Store Connect

**Cuenta Cliente:**
- Email: `appstore.cliente@gruard.test`
- Contraseña: `Test123456!`

**Cuenta Conductor/Grúero:**
- Email: `appstore.conductor@gruard.test`
- Contraseña: `Test123456!`

---

## Tarjetas de Prueba para Pagos (Sandbox de Azul)

La aplicación utiliza el gateway de pagos Azul en modo sandbox. Use estas tarjetas de prueba:

### Tarjeta con Verificación 3D Secure (Recomendada)
```
Número: 4005 5200 0000 0129
Fecha de Vencimiento: 12/28
CVV: 123
Nombre: Cualquier nombre
```

### Tarjeta Alternativa (Sin 3DS Method)
```
Número: 4147 4630 1111 0059
Fecha de Vencimiento: 12/28
CVV: 123
Nombre: Cualquier nombre
```

**Nota:** Las transacciones en sandbox no generan cargos reales.

---

## Flujo de Testing Completo

### Parte 1: Testing como Cliente

1. **Iniciar Sesión**
   - Abrir la aplicación
   - Ingresar con las credenciales de cliente correspondientes
   - Verificar que accede al dashboard del cliente

2. **Solicitar un Servicio de Grúa**
   - Tocar el botón "Solicitar Grúa" o "+" en la pantalla principal
   - Permitir acceso a la ubicación cuando se solicite
   - Seleccionar ubicación de origen (puede arrastrar el marcador en el mapa)
   - Seleccionar ubicación de destino
   - Seleccionar tipo de vehículo (sedán, SUV, pickup, etc.)
   - Revisar el precio estimado
   - Confirmar la solicitud

3. **Simular Pago**
   - Cuando aparezca la pantalla de pago, seleccionar "Tarjeta de Crédito/Débito"
   - Ingresar los datos de la tarjeta de prueba (ver sección anterior)
   - Completar el proceso de pago 3D Secure
   - El pago se procesará exitosamente en modo sandbox

4. **Seguimiento del Servicio**
   - Ver en tiempo real la ubicación del conductor asignado
   - Recibir notificaciones de cambios de estado
   - Comunicarse con el conductor si es necesario

5. **Finalizar y Calificar**
   - Al completarse el servicio, calificar al conductor
   - Ver el recibo del servicio

### Parte 2: Testing como Conductor/Grúero

1. **Iniciar Sesión**
   - Cerrar sesión de la cuenta cliente
   - Ingresar con las credenciales de conductor

2. **Activar Disponibilidad**
   - En el dashboard, activar el toggle "Disponible"
   - Permitir acceso a la ubicación en segundo plano

3. **Recibir y Aceptar Solicitudes**
   - Esperar a recibir una solicitud (o crear una desde otra cuenta cliente)
   - Ver los detalles de la solicitud (origen, destino, precio)
   - Aceptar o rechazar la solicitud

4. **Ejecutar el Servicio**
   - Navegar hacia el cliente usando Waze o Google Maps
   - Marcar "En camino" cuando esté en ruta
   - Marcar "Llegué" cuando llegue al punto de origen
   - Marcar "Servicio en progreso" al cargar el vehículo
   - Marcar "Completado" al llegar al destino

5. **Verificar Ganancias**
   - Ver el balance actualizado en la wallet
   - Revisar el historial de servicios completados

---

## Testing Coordinado (2 Dispositivos)

Para una experiencia completa de testing, se recomienda usar dos dispositivos:

1. **Dispositivo 1:** Iniciar sesión como cliente
2. **Dispositivo 2:** Iniciar sesión como conductor

### Pasos:
1. En el Dispositivo 2 (conductor), activar disponibilidad
2. En el Dispositivo 1 (cliente), crear una solicitud de servicio
3. En el Dispositivo 2, aceptar la solicitud
4. Seguir el flujo completo de ambos lados

---

## Testing con un Solo Dispositivo

Si solo tiene un dispositivo disponible:

1. Ingresar como **cliente**
2. Crear una solicitud de servicio
3. El sistema asignará automáticamente un conductor disponible (los conductores de prueba están configurados como disponibles)
4. Cerrar sesión
5. Ingresar como **conductor** 
6. Ver la solicitud pendiente y aceptarla
7. Completar el servicio paso a paso
8. Cerrar sesión
9. Ingresar como **cliente** para ver el servicio completado y calificar

---

## Funcionalidades a Verificar

### Como Cliente:
- [ ] Login/Logout funciona correctamente
- [ ] Mapa muestra ubicación actual
- [ ] Puede arrastrar marcadores para seleccionar ubicaciones
- [ ] Cálculo de precio funciona
- [ ] Proceso de pago con tarjeta de prueba
- [ ] Tracking en tiempo real del conductor
- [ ] Historial de servicios
- [ ] Calificación de servicios
- [ ] Notificaciones push (si están habilitadas)

### Como Conductor:
- [ ] Login/Logout funciona correctamente
- [ ] Toggle de disponibilidad
- [ ] Recepción de solicitudes
- [ ] Aceptar/Rechazar solicitudes
- [ ] Navegación a Waze/Google Maps
- [ ] Cambio de estados del servicio
- [ ] Ver balance de wallet
- [ ] Historial de servicios

---

## Notas Importantes

1. **Ubicación:** Los conductores de prueba están pre-configurados en Santo Domingo, República Dominicana. Para mejor experiencia de testing, solicite servicios en esa área.

2. **Pagos:** Todas las transacciones se procesan en el ambiente sandbox de Azul. No se generan cargos reales.

3. **Notificaciones:** Las notificaciones push funcionan solo si el usuario ha otorgado permisos.

4. **Datos de Prueba:** Las cuentas de prueba tienen todos los documentos verificados para evitar bloqueos durante el testing.

---

## Soporte

Si encuentra algún problema durante el testing:

- **Email:** support@gruard.com
- **Teléfono:** +1 829-351-9324
- **Dirección:** CARRT. JUAN BOSCH C/ PRINCIPAL #106, CANCA LA REYNA, ESPAILLAT, República Dominicana

---

*Documento preparado para revisores de Google Play Store y Apple App Store*
*Versión: 1.0*
*Fecha: Enero 2026*
