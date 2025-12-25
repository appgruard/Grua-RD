# Requisitos de Cumplimiento Azul - Aplicación (App)

Este documento se enfoca exclusivamente en los cambios y elementos necesarios dentro de la aplicación móvil/web de Grúa RD para la certificación de Azul.

## 1. Interfaz de Pago (Checkout)
*   **Visualización de Logos:** Desplegar logos de Visa, MasterCard, Verified by Visa y MasterCard ID Check dentro del flujo de pago.
*   **Moneda:** Mostrar explícitamente el símbolo **RD$** en el total a pagar.
*   **Consentimiento:** Incluir un checkbox obligatorio: "Acepto las políticas de cancelación y reembolso" con un enlace que abra un modal resumen o redirija al landing.

## 2. Transparencia en Cancelaciones (Módulo App)
*   **Justificación de Cobros:** Al cancelar, la App debe mostrar el desglose (Penalización % + Recargo KM) antes de confirmar.
*   **Datos de Contacto:** Mantener acceso rápido a soporte (email/teléfono) en el perfil del usuario.

## 3. Comprobantes de Pago (Recibos Digitales)
*   Generación automática de recibos tras la captura (Post) con los datos del comercio, referencia de Azul y detalle del servicio en RD$.

## 4. Seguridad Técnica
*   Implementación del flujo 3D Secure 2.0 en el proceso de autorización.

