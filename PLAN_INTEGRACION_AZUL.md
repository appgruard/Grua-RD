# Plan de Integración: Azul API (República Dominicana)

## Objetivo
Migrar el sistema de pagos a Azul API con tokenización (DataVault) y crear un sistema de estados de cuenta para payouts manuales a operadores.

## Fases de Implementación

### Fase 1: Limpieza y Preparación ✅ (Completada)
- [x] Remover referencias a dLocal del código
- [x] Remover referencias a Pagadito del código
- [x] Limpiar archivos de servicios de pago obsoletos
- [x] Actualizar schema si es necesario

### Fase 2: Servicio Azul API
- [ ] Crear `server/services/azul-payment.ts` con:
  - Conexión a Azul Webservices
  - Tokenización (DataVault) - crear, usar y eliminar tokens
  - Procesamiento de pagos (Sale, Hold, Post, Void, Refund)
  - Manejo de 3D Secure 2.0
  - Verificación de pagos
- [ ] Configurar variables de entorno necesarias

### Fase 3: Actualizar Backend (Routes y Storage)
- [ ] Actualizar endpoints de payment-methods para usar Azul
- [ ] Actualizar lógica de cobro de servicios
- [ ] Actualizar endpoints de wallet/recarga
- [ ] Crear endpoints para gestión de tokens

### Fase 4: Actualizar Frontend
- [ ] Actualizar componente de agregar tarjeta para Azul
- [ ] Actualizar flujo de pago de servicios
- [ ] Manejar respuestas de 3D Secure si aplica

### Fase 5: Sistema de Payouts Manuales
- [ ] Crear modelo de datos para tracking de pagos a operadores
- [ ] Crear endpoint para generar estado de cuenta por operador
- [ ] Vista admin para ver pagos pendientes por operador
- [ ] Exportación de estados de cuenta (PDF/Excel)
- [ ] Registro de pagos realizados manualmente

---

## Credenciales Necesarias (Variables de Entorno)

```
AZUL_MERCHANT_ID=           # ID del comercio
AZUL_MERCHANT_NAME=         # Nombre del comercio
AZUL_MERCHANT_TYPE=         # Tipo de comercio
AZUL_AUTH1=                 # Credencial Auth1
AZUL_AUTH2=                 # Credencial Auth2
AZUL_ENVIRONMENT=sandbox    # sandbox o production
```

## URLs de Azul

- **Sandbox**: https://pruebas.azul.com.do/webservices/JSON/Default.aspx
- **Producción**: https://pagos.azul.com.do/webservices/JSON/Default.aspx

## Comisiones a Considerar

| Concepto | Porcentaje |
|----------|------------|
| MDR (Merchant Discount Rate) | 4% - 6% (negociable) |
| Retención ITBIS | 2% |

## Notas
- La tokenización permite guardar tarjetas de forma segura sin almacenar datos sensibles
- Cada token es único por comercio y tarjeta
- Los pagos con token no requieren CVV después de la primera transacción
