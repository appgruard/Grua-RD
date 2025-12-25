# Plan de Cumplimiento y Certificación Azul - Grúa RD

Este plan detalla las acciones necesarias para cumplir con los requisitos de certificación de Azul para el portal web gruard.com, asegurando la transparencia para el tarjetahabiente y el cumplimiento de estándares de seguridad.

## 1. Identidad Visual y Logotipos de Marcas
Se desplegarán los logotipos obligatorios en las siguientes ubicaciones clave:
*   **Página Principal (Footer):** Visa, MasterCard, Verified by Visa, MasterCard ID Check.
*   **Página de Checkout:** Visa, MasterCard, Verified by Visa, MasterCard ID Check (cerca del botón de pago).
*   **Página de Políticas de Seguridad:** Verified by Visa, MasterCard ID Check.

## 2. Documentación Legal y Políticas (Visibles al Usuario)
Se crearán o actualizarán las siguientes páginas accesibles desde el pie de página y antes de confirmar cualquier pago:

### A. Política de Reembolsos, Devoluciones y Cancelaciones
*   **Contenido:** Basado en el PDF adjunto. Se especificará que los reembolsos solo aplican por fallas técnicas o cobros duplicados. Las cancelaciones siguen el esquema de penalización proporcional detallado en `PLAN_CANCELACION.md`.
*   **Visibilidad:** Checkbox obligatorio en el Checkout: "He leído y acepto las políticas de cancelación y reembolso".

### B. Información de Servicio al Cliente
*   **Correos:** info@gruard.com / support@gruard.com / payments@gruard.com
*   **Teléfono (Cel.):** 829-351-9324
*   **Ubicación:** Footer de todas las páginas y página de contacto.

### C. Política de Entrega
*   **Contenido:** El servicio es digital e inmediato tras la asignación. Se aclarará que los tiempos dependen del tráfico y ubicación.

### D. Dirección Permanente y Moneda
*   **Dirección:** CARRT. JUAN BOSCH C/ PRINCIPAL #106, CANCA LA REYNA, ESPAILLAT, República Dominicana.
*   **Moneda:** Se indicará explícitamente en el checkout que los cobros se realizan en **RD$ (Pesos Dominicanos)**.

### E. Políticas de Privacidad y Seguridad de Datos
*   **Contenido:** Descripción del uso de cifrado SSL/TLS, cumplimiento de estándares PCI-DSS (no almacenamiento de datos sensibles) y uso de 3D Secure.

## 3. Modelo de Recibo de Pago Digital
El sistema generará un comprobante (PDF y correo) con los siguientes campos obligatorios:
*   Nombre del Comercio: Grúa RD.
*   Dirección Legal y Contacto.
*   Referencia de Transacción (AzulOrderId / CustomOrderId).
*   Fecha y Hora.
*   Detalle del Servicio.
*   Monto Total en RD$.
*   Método de Pago (Marca de tarjeta y últimos 4 dígitos).
*   Estado de la Transacción (Aprobado).

## 4. Implementación de 3D Secure
*   Se habilitará el flujo de autenticación 3DS mediante el servicio `AzulPaymentService`.
*   Se mostrarán los logos de `Verified by Visa` y `MasterCard ID Check` durante el proceso de autenticación.

## Próximos Pasos (Pendiente de Autorización)
1.  Cargar activos (logos de marcas) en `client/src/assets/logos/`.
2.  Crear componentes de UI para las páginas de políticas (`client/src/pages/policies/`).
3.  Actualizar el Footer global para incluir información legal y logos.
4.  Añadir el modal de términos y condiciones en el flujo de solicitud de servicio.
