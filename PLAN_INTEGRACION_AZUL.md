# Plan de Integración: Azul API (República Dominicana)

## Objetivo
Migrar el sistema de pagos a Azul API con tokenización (DataVault) y crear un sistema de estados de cuenta para payouts manuales a operadores.

## Fases de Implementación

### Fase 1: Limpieza y Preparación ✅ (Completada)
- [x] Remover referencias a dLocal del código
- [x] Remover referencias a Pagadito del código
- [x] Limpiar archivos de servicios de pago obsoletos
- [x] Actualizar schema si es necesario

### Fase 2: Servicio Azul API ✅ (Completada)
- [x] Crear `server/services/azul-payment.ts` con:
  - Conexión a Azul Webservices (JSON API)
  - Tokenización (DataVault) - crear, usar y eliminar tokens
  - Procesamiento de pagos (Sale, Hold, Post, Void, Refund)
  - Manejo de 3D Secure 2.0
  - Verificación de pagos
- [x] Configurar variables de entorno necesarias (AZUL_ENVIRONMENT, AZUL_CHANNEL, AZUL_POS_INPUT_MODE)

**Funciones implementadas en azul-payment.ts:**
- `createToken()` - Tokenización de tarjetas con DataVault
- `deleteToken()` - Eliminar tokens
- `processPaymentWithToken()` - Cobrar usando token
- `processPaymentWithCard()` - Cobrar con tarjeta (opcionalmente guardar token)
- `authorizePayment()` - Autorizar (Hold)
- `capturePayment()` - Capturar (Post)
- `voidPayment()` - Anular transacción
- `refundPayment()` - Reembolsar
- `verifyPayment()` - Verificar estado de pago
- `init3DSecure()` / `complete3DSecure()` - Flujo 3D Secure 2.0

### Fase 3: Actualizar Backend (Routes y Storage) ✅ (Completada)
- [x] Actualizar endpoints de payment-methods para usar Azul
  - POST/GET/DELETE/PUT `/api/payment-methods` ahora delegan a endpoints específicos por tipo de usuario
  - Clientes: `/api/client/payment-methods`
  - Operadores: `/api/operator/payment-methods`
- [x] Actualizar lógica de cobro de servicios
  - `/api/services/:id/complete` usa Azul cuando `metodoPago === 'tarjeta'`
- [x] Actualizar endpoints de wallet/recarga
  - `/api/wallet/pay-debt` ahora usa Azul API directamente
  - `/api/operator/pay-debt-with-card` funciona con Azul
- [x] Endpoints para gestión de tokens ya implementados
  - Clientes: `/api/client/payment-methods` (CRUD completo)
  - Operadores: `/api/operator/payment-methods` (CRUD completo)

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

**Ya configuradas:**
```
AZUL_ENVIRONMENT=sandbox    # sandbox o production
AZUL_CHANNEL=EC             # E-Commerce
AZUL_POS_INPUT_MODE=E-Commerce
```

**Pendientes (solicitar al usuario):**
```
AZUL_MERCHANT_ID=           # ID del comercio
AZUL_MERCHANT_NAME=         # Nombre del comercio
AZUL_MERCHANT_TYPE=         # Tipo de comercio
AZUL_AUTH1=                 # Credencial Auth1
AZUL_AUTH2=                 # Credencial Auth2
```

## URLs de Azul

- **Sandbox**: https://pruebas.azul.com.do/webservices/JSON/Default.aspx
- **Producción**: https://pagos.azul.com.do/webservices/JSON/Default.aspx

## Formato de Montos

- Los montos se envían en **centavos** (sin decimales)
- Ejemplo: RD$1,500.00 = `150000`
- El servicio incluye helpers: `toAzulAmount()` y `fromAzulAmount()`

## Códigos de Respuesta

- `00` = Aprobada
- `05` = Declinada
- `51` = Fondos insuficientes
- `54` = Tarjeta expirada
- `82` = CVV incorrecto
- Ver todos los códigos en `azul-payment.ts`

## Comisiones a Considerar

| Concepto | Porcentaje |
|----------|------------|
| MDR (Merchant Discount Rate) | 4% - 6% (negociable) |
| Retención ITBIS | 2% |

## Notas
- La tokenización permite guardar tarjetas de forma segura sin almacenar datos sensibles
- Cada token es único por comercio y tarjeta
- Los pagos con token no requieren CVV después de la primera transacción
- El servicio detecta automáticamente la marca de tarjeta (Visa, Mastercard, Amex, etc.)
