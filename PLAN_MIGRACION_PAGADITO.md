# Plan de Migración: dLocal → Pagadito

## Resumen Ejecutivo

Este documento describe el plan completo para migrar el sistema de pagos de **dLocal** a **Pagadito** en la aplicación Grúa RD.

### Diferencias Clave entre APIs

| Característica | dLocal | Pagadito |
|----------------|--------|----------|
| Modelo de pago | Pago directo con tarjeta | Redirección a página de Pagadito |
| Tokenización | Sí (card_id) | No disponible directo |
| Pre-autorización | Sí | No |
| Payouts | Sí | No (requiere otro método) |
| Webhooks | Sí | URL de retorno |
| Países | Global | Centroamérica + RD |

### Impacto en Funcionalidades Actuales

⚠️ **Funcionalidades que cambiarán:**
1. **Flujo de pago**: El usuario será redirigido a Pagadito para completar el pago
2. **Tarjetas guardadas**: Pagadito guarda tarjetas en su sistema (no tokenización directa)
3. **Pre-autorizaciones**: No disponible - se cambiará a pago completo al confirmar servicio
4. **Payouts a conductores**: Requiere solución alternativa (transferencia manual o integración bancaria)

---

## Fases de Implementación

### FASE 1: Preparación e Investigación ✅ COMPLETADA
**Tiempo estimado: 1-2 horas**

- [x] Investigar documentación de Pagadito
- [x] Analizar código actual de dLocal
- [x] Identificar todos los archivos afectados
- [x] Crear plan de migración
- [x] Configurar credenciales de Sandbox (PAGADITO_UID, PAGADITO_WSK)

**Archivos identificados:**
- `server/services/dlocal-payment.ts` (1136 líneas)
- `server/routes.ts` (rutas de webhook, pagos, payouts)
- `shared/schema.ts` (campos dlocal*)
- `server/storage.ts` (métodos de almacenamiento)
- `client/src/pages/admin/payment-fees.tsx`
- `server/services/scheduled-payouts.ts`

---

### FASE 2: Crear Servicio de Pagadito ✅ COMPLETADA
**Tiempo estimado: 2-3 horas**

Creado `server/services/pagadito-payment.ts` con implementación SOAP según documentación oficial:

```typescript
interface PagaditoConfig {
  uid: string;      // PAGADITO_UID
  wsk: string;      // PAGADITO_WSK  
  sandbox: boolean; // PAGADITO_SANDBOX
}

interface PagaditoPaymentRequest {
  ern: string;           // External Reference Number (ID del servicio)
  amount: number;
  description: string;
  items: Array<{
    quantity: number;
    description: string;
    price: number;
  }>;
  returnUrl: string;
}

interface PagaditoPaymentResponse {
  success: boolean;
  redirectUrl: string;  // URL para redirigir al usuario
  token: string;        // Token de la transacción
}

interface PagaditoStatusResponse {
  status: 'REGISTERED' | 'COMPLETED' | 'VERIFYING' | 'REVOKED' | 'FAILED' | 'CANCELED' | 'EXPIRED';
  reference?: string;   // Número de aprobación
  dateTransaction?: string;
}
```

**Métodos implementados:**
1. `connect()` - Autenticación SOAP con UID/WSK
2. `createPayment()` - Crear transacción y obtener URL de redirección
3. `getPaymentStatus()` - Verificar estado del pago vía SOAP
4. `isConfigured()` - Verificar credenciales
5. `testConnection()` - Probar conexión con Pagadito

---

### FASE 3: Actualizar Esquema de Base de Datos ✅ COMPLETADA
**Tiempo estimado: 1 hora**

Crear migración para:
1. Renombrar campos `dlocal*` a `pagadito*` o crear nuevos
2. Agregar campos específicos de Pagadito:
   - `pagaditoToken` - Token de transacción
   - `pagaditoReference` - Número de aprobación
   - `pagaditoStatus` - Estado del pago

**Campos a modificar en `servicios`:**
```sql
-- Nuevos campos para Pagadito
pagadito_token TEXT,
pagadito_reference TEXT,
pagadito_status TEXT,

-- Mantener campos existentes para histórico
-- dlocal_payment_id, dlocal_payment_status (marcar como legacy)
```

---

### FASE 4: Actualizar Rutas del Backend ✅ COMPLETADA
**Tiempo estimado: 2-3 horas**

**Endpoints implementados en `server/routes.ts`:**

1. **Test de conexión:**
   - `GET /api/pagadito/test-connection` - Verifica conexión con Pagadito

2. **Nuevo endpoint de pago:**
   - `POST /api/pagadito/create-payment` - Crear transacción y retornar URL de redirección
   
3. **Callback de retorno:**
   - `GET /api/pagadito/return` - Maneja retorno del usuario desde Pagadito (HTML response)
   
4. **Verificación de estado:**
   - `GET /api/pagadito/status/:token` - Consultar estado del pago

---

### FASE 5: Actualizar Frontend ✅ COMPLETADA
**Tiempo estimado: 2-3 horas**

**Implementado en `client/src/pages/client/tracking.tsx`:**

1. **Flujo de pago nuevo:**
   - Botón "Pagar con Pagadito" que inicia el proceso
   - Redirección automática a página de Pagadito
   - Manejo de estados de carga durante el proceso

2. **Simplificación del checkout:**
   - Pagadito maneja la captura de datos de tarjeta
   - No se requieren formularios de tarjeta en la app

3. **Integración con el backend:**
   - Llamada a `/api/pagadito/create-payment` para obtener URL
   - Redirección al usuario a la página de Pagadito
   - Retorno automático tras completar pago

---

### FASE 6: Solución para Payouts a Conductores ✅ COMPLETADA
**Tiempo estimado: 1-2 horas**

Pagadito NO ofrece payouts directos. Se implementó la Opción A (Pago Manual):

**Endpoints Administrativos Implementados:**
1. `GET /api/admin/withdrawals` - Lista todos los retiros pendientes con filtros
2. `POST /api/admin/withdrawals/:id/process-manual` - Procesa pago manualmente
3. `POST /api/admin/withdrawals/:id/reject` - Rechaza solicitud de retiro

**Flujo de Pago Manual:**
1. Conductor solicita retiro desde la app
2. Admin ve solicitudes pendientes en panel administrativo
3. Admin procesa transferencia bancaria manualmente
4. Admin marca como pagado en el sistema con referencia de transacción
5. Conductor recibe notificación de pago completado

**Archivos Modificados:**
- `server/storage.ts` - Agregado método `getAllWithdrawals()`
- `server/routes.ts` - Endpoints administrativos para retiros

---

### FASE 7: Testing y Validación ✅ COMPLETADA
**Tiempo estimado: 2-3 horas**

**Pruebas realizadas (Diciembre 2024):**
1. [x] Conexión con Sandbox de Pagadito - `/api/pagadito/test-connection` retorna 200 OK
2. [x] Creación de transacciones - Genera URL de redirección correctamente
3. [x] Manejo de errores - Respuestas de error apropiadas
4. [x] Validación de estados - Consulta de status funciona vía SOAP

**Resultados de Pruebas:**
```
# Test conexión
GET /api/pagadito/test-connection
Response: {"success":true,"message":"Conexión exitosa con Pagadito","sandbox":true}

# Crear pago de prueba (servicio ID: ffbd7a40-3d87-409c-8a6a-d94db576989d)
POST /api/pagadito/create-payment
Response: {
  "success": true,
  "redirectUrl": "https://sandbox.pagadito.com/comercios/index.php?mod=login&token=...",
  "token": "44dd34346ced98ee5747f2d4534efc41"
}

# Verificar estado del pago
GET /api/pagadito/status/44dd34346ced98ee5747f2d4534efc41
Response: {
  "success": true,
  "status": "REGISTERED",
  "statusMessage": "Pago en proceso",
  "isPending": true
}
```

**Tarjetas de prueba Pagadito Sandbox:**
- VISA: 4111111111111111, exp 12/2030, CVV 123
- VISA: 4242424242424242, exp 12/2030, CVV 123
- MasterCard: 5555555555554444, exp 12/2030, CVV 123

---

### FASE 8: Limpieza y Documentación ✅ COMPLETADA
**Tiempo estimado: 1 hora**

1. [x] Código de dLocal mantenido para histórico y compatibilidad
2. [x] Documentación actualizada (este archivo)
3. [x] Variables de entorno configuradas (PAGADITO_UID, PAGADITO_WSK)
4. [x] Archivos de configuración actualizados
5. [x] Corregido bug en logger (paymentInitiated -> paymentStarted)

---

## Variables de Entorno Requeridas

```env
# Remover (dLocal)
DLOCAL_X_LOGIN=
DLOCAL_X_TRANS_KEY=
DLOCAL_SECRET_KEY=
DLOCAL_SANDBOX=

# Agregar (Pagadito)
PAGADITO_UID=          # Identificador de comercio
PAGADITO_WSK=          # Web Service Key
PAGADITO_SANDBOX=true  # true para sandbox, false para producción
```

---

## Flujo de Pago Actualizado

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│  Grúa RD    │────▶│  Pagadito   │
│ Solicita    │     │ Crea trans  │     │ Página pago │
│ Servicio    │     │ Redirect    │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Servicio   │◀────│  Grúa RD    │◀────│  Pagadito   │
│  Confirmado │     │ Verifica    │     │  Retorna    │
│             │     │ Estado      │     │  a URL      │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Tiempo Total Estimado

| Fase | Tiempo |
|------|--------|
| Fase 1: Preparación | 1-2 horas |
| Fase 2: Servicio Pagadito | 2-3 horas |
| Fase 3: Esquema BD | 1 hora |
| Fase 4: Rutas Backend | 2-3 horas |
| Fase 5: Frontend | 2-3 horas |
| Fase 6: Payouts | 1-2 horas |
| Fase 7: Testing | 2-3 horas |
| Fase 8: Limpieza | 1 hora |
| **TOTAL** | **12-18 horas** |

---

## Estado Actual

### ✅ MIGRACIÓN 100% COMPLETADA (Diciembre 2024)

| Fase | Estado |
|------|--------|
| Fase 1: Preparación | ✅ Completada |
| Fase 2: Servicio Pagadito | ✅ Completada |
| Fase 3: Esquema BD | ✅ Completada |
| Fase 4: Rutas Backend | ✅ Completada |
| Fase 5: Frontend | ✅ Completada |
| Fase 6: Payouts | ✅ Completada (Opción A - Pago Manual) |
| Fase 7: Testing | ✅ Completada |
| Fase 8: Documentación | ✅ Completada |

### Archivos Implementados

| Archivo | Descripción |
|---------|-------------|
| `server/services/pagadito-payment.ts` | Servicio SOAP para comunicación con Pagadito |
| `server/routes.ts` (líneas 476-673) | Endpoints de la API de Pagadito |
| `server/routes.ts` (líneas 6684-6850) | Endpoints administrativos de retiros manuales |
| `client/src/pages/client/tracking.tsx` | Frontend con botón de pago Pagadito |
| `shared/schema.ts` | Campos pagaditoToken, pagaditoReference, pagaditoStatus |
| `server/storage.ts` | Métodos getServicioByPagaditoToken, getAllWithdrawals |

### Secretos Configurados

- `PAGADITO_UID`: Configurado
- `PAGADITO_WSK`: Configurado

### Próximos Pasos (Opcionales)

1. Remover código legacy de dLocal cuando ya no sea necesario
2. Implementar interfaz administrativa para gestionar retiros
3. Agregar más pruebas de integración end-to-end

---

## Notas Importantes

1. **Pagadito no soporta pagos directos con tarjeta** - El usuario SIEMPRE será redirigido a la página de Pagadito.

2. **No hay tokenización directa** - Las tarjetas guardadas se manejan dentro del ecosistema de Pagadito.

3. **No hay pre-autorizaciones** - El modelo de "autorizar primero, capturar después" no está disponible.

4. **Payouts requieren solución alternativa** - Pagadito no ofrece payouts a terceros.

5. **Monedas soportadas** - USD y monedas locales de Centroamérica. Verificar soporte para DOP.
