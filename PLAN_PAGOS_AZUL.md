# Plan de Reestructuración del Sistema de Pagos (Azul API)

Este plan detalla los pasos necesarios para migrar el sistema de pagos actual a la integración oficial de Azul, utilizando certificados digitales y los encabezados de autenticación correctos.

## Fase 1: Infraestructura y Configuración de Certificados (ACTUAL)
- [x] Definir la estructura de configuración para certificados en el servidor.
- [x] Crear el servicio base compatible con `https.Agent`.
- [x] Actualizar el script de prueba externo con la lógica de certificados.
- [x] Documentar la ubicación necesaria de los certificados en el VPS.

## Fase 2: Actualización del Servicio de Pagos (`AzulPaymentService`) (EN PROGRESO)
- [x] Refactorizar `makeRequest` para usar `https.request` con el agente de certificados.
- [x] Ajustar el payload de las transacciones para coincidir con la documentación oficial (`Store`, `Plan`, `Payments`, etc.).
- [x] Implementar el manejo de errores basado en códigos HTTP y respuestas JSON de Azul.
- [x] Actualizar los métodos de Venta, Hold, Post y Refund.

## Fase 3: Integración y Pruebas en el Sistema
- [ ] Actualizar las rutas de la API en `server/routes.ts` para usar la nueva lógica.
- [ ] Realizar pruebas de conectividad desde el entorno de desarrollo (usando certificados de prueba si están disponibles).
- [ ] Verificar el flujo de respuesta (ISO Codes) y almacenamiento de órdenes.

## Fase 4: Despliegue y Validación en CapRover
- [ ] Configurar las variables de entorno para las rutas de los certificados en producción.
- [ ] Validar los permisos de lectura de los archivos `.crt` y `.key` en el contenedor.
- [ ] Realizar una transacción de prueba real en el sandbox desde el VPS.

---

## Notas de Implementación (Fase 1)
Se ha actualizado el script `test-azul-api.js` para incluir la lógica de `https.Agent`.
Es imperativo que en el VPS los certificados estén ubicados en:
- Certificado: `/opt/certificados/gruard/app.gruard.com.crt`
- Llave: `/opt/certificados/gruard/app.gruard.com.key`
