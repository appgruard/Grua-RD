# Plan de Implementación: Sistema de Billetera y Comisiones para Operadores

## Resumen del Sistema

El sistema de billetera permitirá a los operadores:
- Ver su saldo actual y deudas pendientes
- Gestionar automáticamente las comisiones del 20% en pagos en efectivo
- Saldar deudas mediante servicios pagados con tarjeta
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
| type | enum | 'cash_commission', 'card_payment', 'debt_payment', 'withdrawal' |
| amount | decimal(10,2) | Monto de la transacción |
| commission_amount | decimal(10,2) | Monto de comisión (si aplica) |
| description | text | Descripción de la transacción |
| created_at | timestamp | Fecha de la transacción |

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
- [ ] Schema de Drizzle actualizado en `shared/schema.ts`
- [ ] Migraciones de base de datos
- [ ] Tipos e interfaces TypeScript

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
- payDebtFromCardService(walletId, cardPaymentAmount): Saldar deuda con pago de tarjeta
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

### 2.3 Flujo de Pago con Tarjeta

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

### 2.4 Job de Verificación de Deudas Vencidas

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

### 4.2 Modal de Detalle de Deudas

```
- Lista de todas las deudas pendientes
- Progreso de pago de cada deuda
- Fecha de vencimiento
- Servicio asociado a cada deuda
```

### 4.3 Integración en Flujo de Servicio

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

### Rendimiento
- Índices en campos de búsqueda frecuente (driver_id, status, due_date)
- Caché para saldos de billetera
- Paginación en historial de transacciones

### Escalabilidad
- Job de verificación de deudas optimizado para grandes volúmenes
- Considerar cola de mensajes para notificaciones

---

## Próximos Pasos

Por favor indique:
1. ¿Desea comenzar con la Fase 1 (Modelo de Datos)?
2. ¿Hay alguna modificación a los requerimientos descritos?
3. ¿La Fase 6 (Panel de Administración) es necesaria en esta iteración?
