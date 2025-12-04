# Plan de Implementación: Sistema de Billetera y Comisiones para Operadores

## Resumen del Sistema

El sistema de billetera permitirá a los operadores:
- Ver su saldo actual y deudas pendientes
- Gestionar automáticamente las comisiones del 20% en pagos en efectivo
- Saldar deudas mediante:
  - Servicios pagados con tarjeta por clientes
  - **Pago directo con tarjeta de crédito/débito del operador**
- Cumplir con el límite de 15 días para pagos o enfrentar restricciones

---

## FASE 1: Modelo de Datos y Base de Datos

### 1.1 Nuevas Tablas

#### Tabla `operator_wallets`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | serial | Identificador único |
| driver_id | integer | Referencia al operador |
| balance | decimal(10,2) | Saldo disponible (ganancias netas) |
| total_debt | decimal(10,2) | Deuda total pendiente |
| cash_services_blocked | boolean | Indica si los servicios en efectivo están bloqueados |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Última actualización |

#### Tabla `wallet_transactions`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | serial | Identificador único |
| wallet_id | integer | Referencia a la billetera |
| service_id | integer | Referencia al servicio (opcional) |
| type | enum | 'cash_commission', 'card_payment', 'debt_payment', 'direct_payment', 'withdrawal' |
| amount | decimal(10,2) | Monto de la transacción |
| commission_amount | decimal(10,2) | Monto de comisión (si aplica) |
| payment_intent_id | text | ID de Stripe (para pagos directos con tarjeta) |
| description | text | Descripción de la transacción |
| created_at | timestamp | Fecha de la transacción |

> **Nota:** El tipo `direct_payment` se usa cuando el operador paga su deuda directamente con su tarjeta de crédito/débito.

#### Tabla `operator_debts`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | serial | Identificador único |
| wallet_id | integer | Referencia a la billetera |
| service_id | integer | Referencia al servicio en efectivo |
| original_amount | decimal(10,2) | Monto original de la comisión (20%) |
| remaining_amount | decimal(10,2) | Monto pendiente por pagar |
| due_date | timestamp | Fecha límite de pago (15 días) |
| status | enum | 'pending', 'partial', 'paid', 'overdue' |
| created_at | timestamp | Fecha de creación |
| paid_at | timestamp | Fecha de pago completo (si aplica) |

### 1.2 Modificaciones a Tablas Existentes

#### Tabla `services`
- Agregar campo `payment_method`: enum ('cash', 'card', 'pending')
- Agregar campo `commission_processed`: boolean

### Entregables Fase 1:
- [x] Schema de Drizzle actualizado en `shared/schema.ts` *(Completado: 2024-12-04)*
- [x] Migraciones de base de datos *(Completado: db:push ejecutado exitosamente)*
- [x] Tipos e interfaces TypeScript *(Completado: Insert schemas, select schemas y types)*

**Tablas creadas:**
- `operator_wallets` - Billetera del operador con balance y deuda total
- `wallet_transactions` - Historial de transacciones
- `operator_debts` - Registro de deudas individuales por servicio

**Enums creados:**
- `tipo_transaccion_billetera`: cash_commission, card_payment, debt_payment, direct_payment, withdrawal, adjustment
- `estado_deuda`: pending, partial, paid, overdue

**Campo agregado a servicios:**
- `commission_processed`: boolean para evitar procesamiento duplicado de comisiones

---

## FASE 2: Lógica de Negocio Backend

### 2.1 Servicio de Billetera (`WalletService`)

```
Funciones principales:
- createWallet(driverId): Crear billetera para nuevo operador
- getWallet(driverId): Obtener información de billetera
- processServicePayment(serviceId, paymentMethod): Procesar pago de servicio
- calculateCommission(amount): Calcular 20% de comisión
- createDebt(walletId, serviceId, amount): Registrar nueva deuda
- payDebtFromCardService(walletId, cardPaymentAmount): Saldar deuda con pago de tarjeta de cliente
- payDebtWithDirectCard(walletId, amount, paymentMethodId): Pagar deuda con tarjeta propia del operador
- createPaymentIntent(walletId, amount): Crear intento de pago en Stripe
- checkOverdueDebts(): Verificar deudas vencidas (job programado)
- blockCashServices(walletId): Bloquear servicios en efectivo
- unblockCashServices(walletId): Desbloquear al saldar deuda
```

### 2.2 Flujo de Pago en Efectivo

```
1. Servicio completado con pago en efectivo
2. Calcular comisión (20% del total del servicio)
3. Registrar transacción tipo 'cash_commission'
4. Crear registro de deuda con fecha límite (+15 días)
5. Actualizar total_debt en billetera
6. Notificar al operador
```

### 2.3 Flujo de Pago con Tarjeta (Cliente paga con tarjeta)

```
1. Servicio completado con pago en tarjeta
2. Calcular comisión (20% del total del servicio)
3. Si hay deuda pendiente:
   a. Restar el 80% de la ganancia del operador de la deuda
   b. Si queda remanente, agregarlo al balance
4. Si no hay deuda:
   a. Agregar 80% al balance del operador
5. Registrar transacción tipo 'card_payment' y 'debt_payment' si aplica
6. Actualizar balance y total_debt
```

### 2.4 Flujo de Pago Directo con Tarjeta (Operador paga su deuda)

```
1. Operador accede a la sección de billetera
2. Selecciona "Pagar deuda" e ingresa monto (total o parcial)
3. Se muestra formulario de tarjeta (Stripe Elements)
4. Al confirmar:
   a. Crear PaymentIntent en Stripe
   b. Procesar pago
   c. Si es exitoso:
      - Registrar transacción tipo 'direct_payment'
      - Reducir deuda pendiente
      - Si deuda = 0, desbloquear servicios en efectivo
   d. Si falla: Mostrar error y permitir reintentar
5. Confirmar pago con recibo
```

### 2.5 Job de Verificación de Deudas Vencidas

```
Ejecutar cada hora:
1. Buscar deudas con due_date < ahora Y status != 'paid'
2. Marcar como 'overdue'
3. Bloquear servicios en efectivo para el operador
4. Notificar al operador del bloqueo
```

### Entregables Fase 2:
- [ ] Servicio de billetera en `server/services/wallet.ts`
- [ ] Rutas API en `server/routes.ts`
- [ ] Job programado para verificación de deudas
- [ ] Actualización de la interfaz de storage

---

## FASE 3: API Endpoints

### 3.1 Endpoints de Billetera

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/wallet` | Obtener billetera del operador actual |
| GET | `/api/wallet/transactions` | Historial de transacciones |
| GET | `/api/wallet/debts` | Lista de deudas pendientes |
| POST | `/api/wallet/process-payment` | Procesar pago de servicio |
| POST | `/api/wallet/pay-debt` | **Pagar deuda con tarjeta del operador** |
| POST | `/api/wallet/create-payment-intent` | **Crear intento de pago en Stripe** |

### 3.2 Respuesta de `/api/wallet`

```json
{
  "id": 1,
  "driverId": 5,
  "balance": 1500.00,
  "totalDebt": 320.00,
  "cashServicesBlocked": false,
  "pendingDebts": [
    {
      "id": 1,
      "serviceId": 45,
      "originalAmount": 200.00,
      "remainingAmount": 120.00,
      "dueDate": "2024-12-20T00:00:00Z",
      "status": "partial",
      "daysRemaining": 8
    }
  ],
  "recentTransactions": [...]
}
```

### Entregables Fase 3:
- [ ] Endpoints REST implementados
- [ ] Validación con Zod
- [ ] Manejo de errores
- [ ] Tests de integración (opcional)

---

## FASE 4: Interfaz de Usuario - App del Operador

### 4.1 Reemplazo de "Información de la Grúa" por "Billetera"

#### Componente Principal: `WalletSection.tsx`

```
Elementos visuales:
- Card de saldo actual (balance disponible)
- Card de deuda pendiente (con indicador de alerta si hay deuda)
- Indicador de días restantes para pago
- Lista de transacciones recientes
- Botón para ver historial completo
- **Botón "Pagar Deuda" (visible cuando hay deuda pendiente)**
```

### 4.2 Componente de Pago Directo: `PayDebtModal.tsx`

```
Elementos visuales:
- Modal con formulario de pago
- Monto de deuda total mostrado
- Campo para ingresar monto a pagar (parcial o total)
- Stripe Elements para tarjeta de crédito/débito
- Botón de confirmar pago
- Indicadores de procesamiento y confirmación
- Manejo de errores de pago
```

#### Flujo del Modal:
```
1. Usuario hace clic en "Pagar Deuda"
2. Modal muestra deuda total y permite ingresar monto
3. Usuario ingresa datos de tarjeta (Stripe Elements)
4. Al confirmar:
   - Mostrar spinner de procesamiento
   - Llamar a API para crear PaymentIntent
   - Confirmar pago con Stripe
   - Mostrar confirmación o error
5. Al éxito: Cerrar modal y actualizar billetera
```

#### Estados Visuales:

1. **Sin deuda**: 
   - Indicador verde
   - Mensaje: "Sin deudas pendientes"

2. **Deuda activa (en tiempo)**:
   - Indicador amarillo
   - Mostrar monto y días restantes
   - Mensaje: "Deuda pendiente: $X.XX - Quedan X días"

3. **Deuda próxima a vencer (≤3 días)**:
   - Indicador naranja
   - Alerta prominente
   - Mensaje: "¡Atención! Tu deuda vence pronto"

4. **Servicios bloqueados**:
   - Indicador rojo
   - Banner de alerta
   - Mensaje: "Servicios en efectivo bloqueados. Salda tu deuda para continuar."

### 4.3 Modal de Detalle de Deudas

```
- Lista de todas las deudas pendientes
- Progreso de pago de cada deuda
- Fecha de vencimiento
- Servicio asociado a cada deuda
```

### 4.4 Integración en Flujo de Servicio

```
Al completar servicio:
1. Mostrar resumen de pago
2. Si es efectivo: Mostrar desglose (Total - 20% comisión = Tu ganancia neta)
3. Si es tarjeta: Mostrar desglose y si aplica a deuda existente
4. Actualizar billetera en tiempo real
```

### Entregables Fase 4:
- [ ] Componente `WalletSection.tsx`
- [ ] Componente `WalletTransactionHistory.tsx`
- [ ] Componente `DebtDetailModal.tsx`
- [ ] **Componente `PayDebtModal.tsx` con Stripe Elements**
- [ ] Integración en la página del operador
- [ ] Estilos responsive

---

## FASE 5: Notificaciones y Alertas

### 5.1 Notificaciones Push

| Evento | Mensaje |
|--------|---------|
| Nueva deuda registrada | "Se ha registrado una comisión de $X.XX. Tienes 15 días para pagarla." |
| Deuda próxima a vencer (3 días) | "Tu deuda de $X.XX vence en 3 días." |
| Deuda próxima a vencer (1 día) | "¡Último día! Paga tu deuda de $X.XX para evitar bloqueos." |
| Servicios bloqueados | "Tus servicios en efectivo han sido bloqueados por deuda vencida." |
| Deuda saldada | "¡Felicidades! Tu deuda ha sido saldada completamente." |
| Servicios desbloqueados | "Tus servicios en efectivo han sido reactivados." |
| **Pago con tarjeta exitoso** | "Tu pago de $X.XX ha sido procesado exitosamente." |
| **Pago con tarjeta fallido** | "No se pudo procesar tu pago. Por favor, intenta de nuevo." |

### 5.2 Alertas en la App

- Banner persistente cuando hay deuda próxima a vencer
- Modal de confirmación al aceptar servicio en efectivo cuando hay deuda
- Indicador visual en el ícono de billetera cuando hay alertas

### Entregables Fase 5:
- [ ] Sistema de notificaciones push para operadores
- [ ] Componentes de alertas en la UI
- [ ] Integración con el flujo de aceptación de servicios

---

## FASE 6: Panel de Administración (Opcional)

### 6.1 Funcionalidades Admin

- Ver todas las billeteras de operadores
- Ver deudas pendientes del sistema
- Filtrar por estado (activas, vencidas, bloqueadas)
- Ajustar manualmente saldos/deudas (con registro de auditoría)
- Reportes de comisiones recaudadas

### Entregables Fase 6:
- [ ] Página de administración de billeteras
- [ ] Reportes y estadísticas
- [ ] Funciones de ajuste manual

---

## Cronograma Estimado

| Fase | Descripción | Duración Estimada |
|------|-------------|-------------------|
| 1 | Modelo de Datos | 1-2 horas |
| 2 | Lógica de Negocio | 2-3 horas |
| 3 | API Endpoints | 1-2 horas |
| 4 | Interfaz de Usuario | 2-3 horas |
| 5 | Notificaciones | 1-2 horas |
| 6 | Panel Admin (Opcional) | 2-3 horas |

**Total estimado: 9-15 horas**

---

## Consideraciones Técnicas

### Seguridad
- Validar que el operador solo pueda ver su propia billetera
- Registrar todas las transacciones con timestamps
- Proteger endpoints con autenticación
- **Pagos con Stripe: Nunca almacenar datos de tarjeta en nuestros servidores**
- **Usar Stripe Elements para cumplir con PCI DSS**

### Integración con Stripe
- Configurar cuenta de Stripe Connect (opcional para futuro)
- Usar PaymentIntents API para pagos seguros
- Manejar webhooks para confirmación de pagos
- Implementar reintentos en caso de fallo de red

### Rendimiento
- Índices en campos de búsqueda frecuente (driver_id, status, due_date)
- Caché para saldos de billetera
- Paginación en historial de transacciones

### Escalabilidad
- Job de verificación de deudas optimizado para grandes volúmenes
- Considerar cola de mensajes para notificaciones

---

## Dependencias Adicionales

Para implementar el pago directo con tarjeta, se requiere:
- `@stripe/stripe-js` - SDK de Stripe para el frontend
- `stripe` - SDK de Stripe para el backend
- Configuración de claves de Stripe (STRIPE_SECRET_KEY, VITE_STRIPE_PUBLIC_KEY)

---

## Próximos Pasos

Por favor indique:
1. ¿Desea comenzar con la Fase 1 (Modelo de Datos)?
2. ¿Hay alguna modificación adicional a los requerimientos?
3. ¿La Fase 6 (Panel de Administración) es necesaria en esta iteración?
4. ¿Ya tiene configurada una cuenta de Stripe para los pagos?
