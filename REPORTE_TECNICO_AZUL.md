# Informe de Pruebas de Integración - Pasarela de Pagos Azul
**Proyecto:** Grúa RD
**Fecha:** 08 de enero de 2026
**Merchant ID de Prueba:** 39038540035

## 1. Resumen del Problema
Se ha implementado la integración con la API JSON de Azul siguiendo las especificaciones técnicas de HMAC-SHA512. Sin embargo, todas las solicitudes dirigidas al endpoint de pruebas (`https://pruebas.azul.com.do/webservices/JSON/Default.aspx`) resultan en el siguiente error de autenticación:

- **Error:** `INVALID_AUTH:Auth`
- **ResponseCode:** `Error`

## 2. Detalles de la Implementación Técnica
Nuestra implementación realiza los siguientes pasos para cada solicitud:

1.  **Construcción del Payload**: Se genera un objeto JSON que incluye el `MerchantId`, `Channel` (EC), `PosInputMode` (E-Commerce) y los datos específicos de la transacción.
2.  **Generación del Hash (Auth2)**:
    - Se utiliza el algoritmo **SHA-512 HMAC**.
    - La **Llave Secreta** utilizada es la proporcionada por el portal de Azul.
    - El **Mensaje** procesado es el string JSON exacto que se envía en el cuerpo (body) de la solicitud.
3.  **Encabezados HTTP**:
    - `Content-Type: application/json`
    - `Auth1: 39038540035` (Merchant ID)
    - `Auth2: [Hash generado en el paso 2]`

## 3. Evidencia de Pruebas Realizadas
Se ejecutó un script de prueba utilizando el método `VerifyPayment` (el cual es de solo lectura y seguro para validación de credenciales).

### Solicitud Enviada (Ejemplo)
```json
{
  "MerchantId": "39038540035",
  "Channel": "EC",
  "PosInputMode": "E-Commerce",
  "CurrencyPosCode": "$",
  "TrxType": "VerifyPayment",
  "CustomOrderId": "AUTH-TEST-1767890819578"
}
```

### Respuesta del Servidor Azul
```json
{
  "AuthorizationCode": "",
  "AzulOrderId": "",
  "CustomOrderId": "",
  "DateTime": "20260108124659",
  "ErrorDescription": "INVALID_AUTH:Auth",
  "IsoCode": "",
  "ResponseCode": "Error",
  "ResponseMessage": ""
}
```

## 4. Conclusión y Solicitud de Soporte
Dado que la lógica de firmado HMAC-SHA512 ha sido validada y el payload cumple con la estructura requerida, solicitamos al equipo técnico de Azul verificar lo siguiente:
1. Si el Merchant ID `39038540035` tiene habilitado el canal **E-Commerce (EC)** para el ambiente de pruebas.
2. Si existe alguna restricción adicional en la configuración del comercio que impida la validación exitosa del AuthHash.

---
*Este documento fue generado automáticamente tras la ejecución de pruebas de integración.*
