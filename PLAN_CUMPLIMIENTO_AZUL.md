# Requisitos de Cumplimiento Azul - Aplicación (App)

Este documento se enfoca exclusivamente en los cambios y elementos necesarios dentro de la aplicación móvil/web de Grúa RD para la certificación de Azul.

## 1. Interfaz de Pago (Checkout Optimizado)
*   **One-Touch Payment:** El flujo debe priorizar el uso de tarjetas guardadas (`DataVaultToken`). El checkbox de políticas debe estar pre-seleccionado o integrado en el botón de "Solicitar Grúa" para no añadir pasos extra.
*   **Visualización de Logos:** Desplegar logos de Visa, MasterCard, Verified by Visa y MasterCard ID Check de forma discreta para no saturar la interfaz móvil.

## 2. Transparencia en Cancelaciones (Módulo App)
*   **Justificación de Cobros:** Al cancelar, la App debe mostrar el desglose (Penalización % + Recargo KM) antes de confirmar.
*   **Datos de Contacto:** Mantener acceso rápido a soporte (email/teléfono) en el perfil del usuario.

## 3. Comprobantes de Pago (Recibos Digitales)
*   Generación automática de recibos tras la captura (Post) con los datos del comercio, referencia de Azul y detalle del servicio en RD$.

## 4. Seguridad Técnica
*   Implementación del flujo 3D Secure 2.0 en el proceso de autorización.

