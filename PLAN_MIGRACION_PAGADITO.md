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

### FASE 1: Preparación e Investigación ✅ (En progreso)
**Tiempo estimado: 1-2 horas**

- [x] Investigar documentación de Pagadito
- [x] Analizar código actual de dLocal
- [x] Identificar todos los archivos afectados
- [x] Crear plan de migración
- [ ] Configurar credenciales de Sandbox

**Archivos identificados:**
- `server/services/dlocal-payment.ts` (1136 líneas)
- `server/routes.ts` (rutas de webhook, pagos, payouts)
- `shared/schema.ts` (campos dlocal*)
- `server/storage.ts` (métodos de almacenamiento)
- `client/src/pages/admin/payment-fees.tsx`
- `server/services/scheduled-payouts.ts`

---

### FASE 2: Crear Servicio de Pagadito
**Tiempo estimado: 2-3 horas**

Crear `server/services/pagadito-payment.ts` con:

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

**Métodos a implementar:**
1. `connect()` - Autenticación con UID/WSK
2. `createPayment()` - Crear transacción y obtener URL de redirección
3. `getPaymentStatus()` - Verificar estado del pago
4. `isConfigured()` - Verificar credenciales

---

### FASE 3: Actualizar Esquema de Base de Datos
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

### FASE 4: Actualizar Rutas del Backend
**Tiempo estimado: 2-3 horas**

1. **Nuevo endpoint de pago:**
   - `POST /api/pagadito/create-payment` - Crear transacción y retornar URL
   
2. **Callback de retorno:**
   - `GET /api/pagadito/return` - Manejar retorno del usuario desde Pagadito
   
3. **Verificación de estado:**
   - `GET /api/pagadito/status/:token` - Consultar estado del pago

4. **Actualizar rutas existentes:**
   - Modificar lógica de pago en creación de servicios
   - Cambiar flujo de pre-autorización a pago completo

---

### FASE 5: Actualizar Frontend
**Tiempo estimado: 2-3 horas**

1. **Flujo de pago nuevo:**
   - Mostrar botón "Pagar con Pagadito"
   - Redirigir a Pagadito
   - Manejar retorno y mostrar resultado

2. **Eliminar formularios de tarjeta:**
   - Pagadito maneja la captura de datos de tarjeta
   - Simplificar flujo de checkout

3. **Componentes a modificar:**
   - Formulario de pago en solicitud de servicio
   - Panel de métodos de pago guardados
   - Historial de pagos

---

### FASE 6: Solución para Payouts a Conductores
**Tiempo estimado: 1-2 horas**

Pagadito NO ofrece payouts directos. Opciones:

**Opción A: Pago Manual**
- Registrar balance de conductor
- Admin procesa pagos manualmente vía transferencia bancaria
- Marcar como pagado en el sistema

**Opción B: Integración con Banco (Futuro)**
- Integrar API bancaria para transferencias
- Automatizar proceso de pago

**Implementación inicial:** Opción A (Pago Manual)

---

### FASE 7: Testing y Validación
**Tiempo estimado: 2-3 horas**

1. Probar en Sandbox de Pagadito
2. Verificar flujo completo de pago
3. Probar casos de error
4. Validar actualización de estados
5. Probar flujo de conductores

---

### FASE 8: Limpieza y Documentación
**Tiempo estimado: 1 hora**

1. Remover código de dLocal no utilizado
2. Actualizar documentación
3. Actualizar variables de entorno
4. Actualizar archivos de configuración

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

### ✅ Fase 1 Completada
- Documentación de Pagadito revisada
- Código dLocal analizado
- Plan creado

### 🔄 Próximo Paso
Configurar credenciales de Sandbox de Pagadito y comenzar Fase 2.

---

## Notas Importantes

1. **Pagadito no soporta pagos directos con tarjeta** - El usuario SIEMPRE será redirigido a la página de Pagadito.

2. **No hay tokenización directa** - Las tarjetas guardadas se manejan dentro del ecosistema de Pagadito.

3. **No hay pre-autorizaciones** - El modelo de "autorizar primero, capturar después" no está disponible.

4. **Payouts requieren solución alternativa** - Pagadito no ofrece payouts a terceros.

5. **Monedas soportadas** - USD y monedas locales de Centroamérica. Verificar soporte para DOP.
