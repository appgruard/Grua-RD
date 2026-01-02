# Plan de Integración de Cancelación con API Azul - Grúa RD

Este plan detalla la implementación técnica para integrar el sistema de cancelaciones con el gateway de pagos Azul, cumpliendo con los requerimientos de penalizaciones proporcionales y compensación al conductor.

## 1. Estrategia de Transacción: Auth / Capture (Hold / Post)

Para permitir cancelaciones con penalizaciones parciales sin recurrir a reembolsos manuales (que son lentos y costosos), utilizaremos el flujo de **Hold & Post**.

### Credenciales y Entorno de Pruebas
*   **URL Payment Page:** https://pruebas.azul.com.do/paymentpage/Default.aspx
*   **MerchantID:** 39038540035
*   **Algoritmo de Hash:** SHA512HMAC
*   **Llave Privada (Pruebas):** `asdhakjshdkjasdasmndajksdkjaskldga8odya9d8yoasyd98asdyaisdhoaisyd0a8sydoashd8oasydoiahdpiashd09ayusidhaos8dy0a8dya08syd0a8ssdsax`

1.  **Creación del Servicio (Flujo de 1-2 Toques):** 
    *   Para mantener la rapidez, la App usará `DataVault` (tarjetas guardadas).
    *   Al solicitar, el cliente confirma con un solo toque y el sistema realiza un `TrxType: Hold` en segundo plano. No hay pasos intermedios de redirección si la tarjeta ya está tokenizada.
2.  **Cancelación del Servicio:**
    *   Si la cancelación es **sin penalización**: Se realiza un `TrxType: Void` (Anulación) sobre el `AzulOrderId` del Hold. Los fondos se liberan inmediatamente.
    *   Si la cancelación es **con penalización**: Se realiza un `TrxType: Post` (Captura) pero enviando el campo `Amount` con el valor de la penalización calculada. Esto cobra solo la penalización y libera el resto automáticamente.
3.  **Finalización del Servicio:** Si el servicio se completa con éxito, se realiza un `TrxType: Post` por el monto total (o el monto final negociado).

## 2. Lógica de Negocio en `server/routes.ts`

Se debe modificar el endpoint `POST /api/servicios/:id/cancelar` para incluir:

### Cálculo de Penalización Dinámica
```typescript
// Pseudocódigo de la lógica a implementar
const porcentaje = calcularPorcentajePorEstado(servicio.estado);
const recargoDistancia = calcularRecargoPorDistancia(distanciaRecorrida);
const montoPenalizacion = (servicio.costoTotal * porcentaje) + recargoDistancia;

// Verificar si aplica exoneración por ETA
if (tiempoTranscurrido > (etaOriginal + margenTrafico + 10min)) {
    montoPenalizacion = 0;
}
```

### Integración con Azul
*   **Void:** `AzulPaymentService.voidPayment(servicio.azulOrderId)`
*   **Captura Parcial:** `AzulPaymentService.capturePayment(servicio.azulOrderId, montoPenalizacion * 100)` (monto en centavos).

## 3. Cambios en el Data Model (`shared/schema.ts`)

Para soportar la transparencia requerida, añadiremos campos a la tabla `cancelaciones_servicio`:
*   `tiempo_espera_real`: integer (segundos).
*   `distancia_recorrida_operador`: decimal (km).
*   `eta_original`: integer (segundos).
*   `monto_total_servicio`: decimal.
*   `justificacion_texto`: text.

## 4. Consideraciones de Seguridad y Cumplimiento (PCI)

*   No se almacenan datos de tarjetas (cumplido mediante `DataVaultToken`).
*   Todas las operaciones de captura parcial se registran en `logTransaction` para auditoría.
*   Se enviará un recibo PDF actualizado al cliente detallando el cobro de la penalización y la liberación del excedente.

## 5. Próximos Pasos (Pendiente de Autorización)

1.  Modificar `shared/schema.ts` para incluir los nuevos campos de auditoría de cancelación.
2.  Actualizar `AzulPaymentService` para asegurar que el método `capturePayment` soporte el envío de montos menores al original (Captura Parcial) y utilice la encriptación SHA512HMAC con la llave proporcionada.
3.  Implementar la lógica de cálculo en `server/routes.ts` y conectarla con el servicio de Azul.

## 6. Datos de Prueba (Tarjetas)
Para las validaciones en el entorno de pruebas, se utilizarán las siguientes tarjetas:
1.  `5413****3300****8960****0119` Exp. 202812 cvv. 979
2.  `4012****0000****3333****0026` Exp. 202812 cvv. 123
3.  `6011****0009****9009****9818` Exp. 202812 cvv. 818
4.  `5424****1802****7979****1732` Exp. 202812 cvv. 732
5.  `4260****5500****6184****5872` Exp. 202812 cvv. 872
6.  `4005****5200****0000****0129` Exp. 202812 cvv. 977 (Límite RD$ 75)
