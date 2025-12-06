# Integración dLocal API - Progreso y Plan de Completación

**Proyecto:** Sistema de Pagos y Nómina para Servicio de Grúas - República Dominicana  
**Fecha de Inicio:** Diciembre 2024  
**Estado Actual:** En implementación - Plan de 6 Fases
**Proveedor de Pagos:** dLocal (único proveedor)

---

## 📋 Resumen Ejecutivo

Se está implementando la integración completa con dLocal para:
- ✅ Autorización y captura de pagos con tarjeta (flujo de pre-autorización)
- ✅ Cancelación de autorizaciones y reembolsos
- ✅ Sistema de nómina programada (lunes y viernes)
- ✅ Retiros del mismo día con comisión de 100 DOP
- ✅ Interfaz de usuario para saldo de operadores
- ✅ **COMPLETADO:** Tokenización real de tarjetas con dLocal API (Fase 2)
- ✅ **COMPLETADO:** Cobro real de deudas con tarjetas guardadas (Fase 2)
- ✅ **COMPLETADO:** Endpoints de tarjetas con cobros reales (Fase 3)
- ✅ **COMPLETADO:** Panel Admin - Visualización de comisiones dLocal (Fase 4)
- ✅ **COMPLETADO:** Branding profesional de PDFs (Grúa RD) (Fase 5)

---

## ✅ COMPLETADO (90%)

### 1. **Servicio dLocal Payment Service** ✓
- **Archivo:** `server/services/dlocal-payment.ts`
- **Métodos implementados:**
  - `createPayment()` - Pagos completos con captura inmediata
  - `createAuthorization()` - Pre-autorización de pagos (sin captura)
  - `captureAuthorization()` - Captura de pago autorizado
  - `cancelAuthorization()` - Cancelación de autorización
  - `refundPayment()` - Reembolso de pagos capturados
  - `createPayout()` - Pagos a operadores
  - `getPaymentStatus()` - Consulta de estado de pago
  - ✅ **NUEVO (Fase 2):** `saveCardWithValidation()` - Tokenización real de tarjetas
  - ✅ **NUEVO (Fase 2):** `chargeWithSavedCard()` - Cobro con tarjetas guardadas
  - ✅ **NUEVO (Fase 2):** `extractDLocalFees()` - Extracción de comisiones dLocal

**Características:**
- Reintentos automáticos con backoff exponencial
- Validación de configuración
- Logging detallado
- Manejo de errores

### 2. **Esquema de Base de Datos** ✓
- **Archivo:** `shared/schema.ts`
- **Cambios realizados:**
  - Añadido campo `dlocalAuthorizationId` en tabla `servicios`
  - Nueva tabla `scheduledPayouts` - Lotes de nómina programados
  - Nueva tabla `scheduledPayoutItems` - Detalles de pagos individuales
  - Actualizada tabla `operatorWithdrawals` con campos:
    - `montoNeto` - Monto después de comisiones
    - `comision` - Comisión cobrada
    - `tipoRetiro` - 'programado' o 'inmediato'
  - Nuevo enum `tipoRetiroEnum`
  - Relaciones y esquemas de inserción/selección

**Actualización Diciembre 2024 - Fase 1 Completada:**
- ✅ Tabla `comisiones` - Nuevos campos para tracking de comisiones dLocal:
  - `dlocal_fee_amount` - Monto de comisión cobrada por dLocal
  - `dlocal_fee_currency` - Moneda de la comisión (default: DOP)
  - `dlocal_net_amount` - Monto neto después de comisión dLocal
- ✅ Tabla `wallet_transactions` - Nuevos campos para pagos de deuda:
  - `dlocal_transaction_id` - ID de transacción dLocal
  - `dlocal_fee_amount` - Comisión dLocal en pagos de deuda

**Estado de BD:**
- ✅ Tablas creadas
- ✅ Campos añadidos
- ✅ Enums configurados
- ✅ Relaciones definidas
- ✅ Migraciones ejecutadas (Fase 1)

### 3. **Flujo de Autorización en Solicitud de Servicio** ✓
- **Archivo:** `server/routes.ts` (línea ~1600)
- **Endpoint:** `POST /api/services/request`
- **Implementación:**
  - Verifica disponibilidad de método de pago tarjeta
  - Obtiene tarjeta de pago por defecto del cliente
  - Crea autorización sin captura
  - Guarda `dlocalAuthorizationId` en servicio
  - Manejo de errores con mensajes claros

### 4. **Captura de Pago al Aceptar Servicio** ✓
- **Archivo:** `server/routes.ts` (línea ~2060)
- **Endpoint:** `POST /api/services/:id/accept`
- **Implementación:**
  - Verifica si hay autorización pendiente
  - Captura el monto autorizado
  - Guarda `dlocalPaymentId` y estado
  - Permite que conductor acepte solo si captura es exitosa
  - Manejo de fallos en captura

### 5. **Cancelación de Autorizaciones** ✓
- **Archivos:** 
  - `server/services/service-auto-cancel.ts`
  - `server/routes.ts` (línea ~2271)

**Cancelación Automática:**
- Se ejecuta cada 60 segundos
- Cancela servicios sin aceptar después de 10 minutos
- Cancela autorizaciones de pago
- Notifica al cliente

**Cancelación Manual:**
- Endpoint: `POST /api/services/:id/cancel`
- Cliente, conductor o admin pueden cancelar
- Cancela autorización si está pendiente
- Reembolsa si ya fue capturado
- Notificaciones a ambas partes

### 6. **Servicio de Nómina Programada** ✓
- **Archivo:** `server/services/scheduled-payouts.ts` (nuevo)
- **Funcionalidades:**
  - `initScheduledPayouts()` - Inicia el servicio
  - `processScheduledPayouts()` - Procesa pagos de lunes y viernes
  - `requestImmediateWithdrawal()` - Retiro del mismo día (100 DOP de comisión)
  - `getNextPayoutDate()` - Calcula próxima fecha de nómina
  - `getBankCode()` - Mapeo de nombres de bancos a códigos dLocal

**Lógica:**
- Se ejecuta automáticamente los lunes y viernes a las 8-9 AM
- Procesa todos los operadores con saldo > RD$100
- Verifica cuenta bancaria verificada
- Crea batch de pagos en tabla `scheduledPayouts`
- Registra cada pago en `scheduledPayoutItems`
- Actualiza balance del operador a $0
- Manejo de errores por operador

**Retiro Inmediato:**
- Disponible 24/7
- Comisión fija de 100 DOP
- Monto mínimo: 500 DOP
- Requiere cuenta bancaria verificada
- Registra en `operatorWithdrawals` con `tipoRetiro='inmediato'`

---

## ✅ COMPLETADO RECIENTEMENTE

### FASE 2 (PLAN DLOCAL): Mejorar Servicio dLocal ✓
**Completado:** Diciembre 2024

#### Nuevas Funciones Implementadas en `server/services/dlocal-payment.ts`:

##### 2.1 `saveCardWithValidation()` ✓
- **Propósito:** Tokenización real de tarjetas con validación
- **Lógica:**
  1. Hace cobro de validación de 10 DOP (mínimo permitido) con `save: true`
  2. Si el pago es exitoso, extrae el `card_id` de la respuesta
  3. Reembolsa automáticamente los 10 DOP
  4. Devuelve el token real de dLocal
- **Parámetros:** cardNumber, cardExpiry, cardCVV, cardholderName, email, name, document
- **Retorna:** cardId, brand, last4, expiryMonth, expiryYear

##### 2.2 `chargeWithSavedCard()` ✓
- **Propósito:** Cobro real con tarjetas guardadas (usando card_id de dLocal)
- **Lógica:**
  1. Llama a POST `/payments` con el `card_id`
  2. Extrae información de comisión de la respuesta
  3. Calcula monto neto después de comisión
- **Parámetros:** cardId, amount, description, orderId, email, name, document
- **Retorna:** paymentId, status, amount, feeAmount, feeCurrency, netAmount

##### 2.3 `extractDLocalFees()` ✓
- **Propósito:** Extraer comisiones de dLocal de cualquier respuesta de pago
- **Lógica:**
  - Busca campos `fee_amount`, `fee`, `processor_fee` en la respuesta
  - Si no existe, estima 3.5% + 5 DOP (tarifa típica)
  - Calcula monto neto (originalAmount - feeAmount)
- **Retorna:** feeAmount, feeCurrency, netAmount

**Interfaces TypeScript Añadidas:**
- `SaveCardRequest` / `SaveCardResponse`
- `ChargeWithSavedCardRequest` / `ChargeWithSavedCardResponse`
- `DLocalFees`

**Método Auxiliar Añadido:**
- `detectCardBrand()` - Detecta marca de tarjeta (VISA, MASTERCARD, AMEX, etc.)

---

### FASE 2 (ORIGINAL): Rutas API para Operador ✓

#### 2.1 Endpoints de Nómina y Retiros
- **Ubicación:** `server/routes.ts`
- **Tareas Completadas:**
  - [x] `GET /api/drivers/withdrawal-history` - Historial de retiros del operador
  - [x] `GET /api/drivers/next-payout` - Próxima fecha de nómina programada
  - [x] `POST /api/drivers/immediate-withdrawal` - Retiro del mismo día (100 DOP comisión)
  - [x] `GET /api/admin/scheduled-payouts` - Admin: Ver lotes de nómina
  - [x] `GET /api/admin/scheduled-payouts/:id` - Admin: Detalles del lote con items

**Implementación:**
- ✅ Validación de autenticación (conductores/admin)
- ✅ Validación de datos (montos mínimos, balance suficiente)
- ✅ Actualización de balances con operaciones atómicas
- ✅ Manejo de errores específicos con códigos HTTP apropiados

#### 2.2 Integración con Storage ✓
- **Archivo:** `server/storage.ts`
- **Métodos Añadidos:**
  - ✅ `getConductoresWithPositiveBalance()` - Para procesamiento de nómina
  - ✅ `getOperatorBankAccountByCondutorId()` - Obtener cuenta bancaria
  - ✅ `createScheduledPayout()` - Crear lote de nómina
  - ✅ `updateScheduledPayout()` - Actualizar lote
  - ✅ `getScheduledPayouts()` - Listar todos los pagos programados
  - ✅ `getScheduledPayoutById()` - Obtener pago programado por ID
  - ✅ `createScheduledPayoutItem()` - Crear pago individual
  - ✅ `updateScheduledPayoutItem()` - Actualizar pago individual
  - ✅ `getScheduledPayoutItems()` - Listar items de un pago programado
  - ✅ `updateConductorBalance()` - Actualizar balance con operaciones atómicas

### FASE 3: Interfaz de Usuario ✓

#### Componente DLocalOperatorBankAccountManager.tsx ✓
- **Ubicación:** `client/src/components/DLocalOperatorBankAccountManager.tsx`
- **Funcionalidades Implementadas:**
  - ✅ Modal de retiro con pestañas (Programado / Inmediato)
  - ✅ Visualización de próxima fecha de nómina
  - ✅ Historial de retiros con scroll y estado
  - ✅ Cálculo de comisión y monto neto en tiempo real
  - ✅ Validación de formulario con botón deshabilitado si inválido
  - ✅ Manejo de errores con toasts

---

### FASE 3 (PLAN DLOCAL): Corregir Endpoints de Tarjetas ✓
**Completado:** Diciembre 2024

#### Endpoints Actualizados en `server/routes.ts`:

##### 3.1 `POST /api/operator/payment-methods` ✓
- **Propósito:** Guardar tarjeta de pago para operadores
- **Cambios:**
  - Reemplazada generación fake de token con `dlocalPaymentService.saveCardWithValidation()` real
  - Importación dinámica de dlocalPaymentService
  - Manejo de errores con mensajes en español para fallos de dLocal
  - Usa `tokenResult.cardId`, `brand`, `last4`, `expiryMonth`, `expiryYear` de respuesta dLocal
  - Logging actualizado para indicar tokenización real

##### 3.2 `POST /api/client/payment-methods` ✓
- **Propósito:** Guardar tarjeta de pago para clientes
- **Cambios:**
  - Reemplazada generación fake de token con `dlocalPaymentService.saveCardWithValidation()` real
  - Importación dinámica de dlocalPaymentService
  - Manejo de errores con mensajes en español para fallos de dLocal
  - Usa `tokenResult.cardId`, `brand`, `last4`, `expiryMonth`, `expiryYear` de respuesta dLocal
  - Logging actualizado para indicar tokenización real

##### 3.3 `POST /api/operator/pay-debt-with-card` ✓
- **Propósito:** Pagar deuda del operador con tarjeta guardada
- **Cambios:**
  - Añadida importación dinámica de dlocalPaymentService
  - Verifica si dLocal está configurado antes de procesar
  - Obtiene `cardId` real de `paymentMethod.dlocalCardId`
  - Llama a `dlocalPaymentService.chargeWithSavedCard()` para cobrar la tarjeta
  - En éxito, llama a `WalletService.completeDebtPayment` con `dlocal:${chargeResult.paymentId}` como referencia
  - Retorna información de comisión en respuesta: `feeInfo: { feeAmount, feeCurrency, netAmount }`
  - Manejo de errores con mensajes en español

**Características Comunes:**
- ✅ Tokenización real con dLocal API (no tokens fake)
- ✅ Cobros reales con tarjetas guardadas
- ✅ Tracking de comisiones dLocal
- ✅ Mensajes de error localizados en español
- ✅ No se expone información sensible de tarjetas

---

### FASE 4 (PLAN DLOCAL): Panel Admin - Visualización de Comisiones ✓
**Completado:** Diciembre 2024

#### 4.1 Endpoint Backend: `GET /api/admin/payment-fees` ✓
- **Ubicación:** `server/routes.ts`
- **Propósito:** Obtener estadísticas completas de comisiones dLocal
- **Respuesta:**
  - `summary`: totalCollected, totalDLocalFees, netReceived, feePercentage, totalOperatorShare, totalCompanyShare
  - `byPeriod`: Datos agrupados por fecha (collected, fees, net)
  - `recentTransactions`: Últimas 50 transacciones ordenadas por fecha descendente
- **Características:**
  - Requiere autenticación admin
  - Ordenamiento por fecha más reciente
  - Cálculo consistente de netAmount (montoTotal - dlocalFee cuando dlocalNetAmount es null)

#### 4.2 Página Frontend: `client/src/pages/admin/payment-fees.tsx` ✓
- **Propósito:** Visualización de comisiones del procesador de pagos
- **Elementos implementados:**
  - 3 tarjetas principales: Total Cobrado, Comisión dLocal (con %), Neto Recibido
  - 2 tarjetas adicionales: Total Operadores (80%), Total Empresa (20%)
  - Tabla de transacciones recientes con columnas: Servicio, Monto, Comisión, Neto, Operador, Empresa, Fecha
  - Estados de carga con Skeleton
  - Formato de moneda DOP (Intl.NumberFormat)
  - data-testid en todos los elementos interactivos

#### 4.3 Integración en Sidebar de Admin ✓
- **Archivo:** `client/src/components/layout/AdminLayout.tsx`
- **Cambios:**
  - Añadido item de menú "Comisiones" con icono CreditCard
  - Ubicado después de "Billeteras"
  - Ruta: `/admin/payment-fees`

#### 4.4 Ruta Protegida ✓
- **Archivo:** `client/src/App.tsx`
- **Cambios:**
  - Importación lazy del componente AdminPaymentFees
  - Ruta `/admin/payment-fees` protegida con ProtectedRoute para admins
  - Envuelta en AdminLayout

---

### FASE 5 (PLAN DLOCAL): Branding Profesional en PDFs ✓
**Completado:** Diciembre 2024

#### 5.1 Constantes de Marca Añadidas ✓
- **Archivo:** `server/services/pdf-service.ts`
- **Colores de marca:**
  - `BRAND_PRIMARY`: #0b2545 (Navy Blue)
  - `BRAND_SECONDARY`: #1e40af
  - `BRAND_ACCENT`: #f5a623 (Orange)
  - `TEXT_PRIMARY`: #1f2937
  - `TEXT_SECONDARY`: #64748b
  - `SUCCESS_COLOR`: #22c55e
  - `BORDER_COLOR`: #e2e8f0
- **Información de empresa:**
  - `COMPANY_NAME`: "Grua RD"
  - `COMPANY_TAGLINE`: "Servicios de Grua Republica Dominicana"
  - `COMPANY_PHONE`: "(809) 555-1234"
  - `COMPANY_EMAIL`: "soporte@gruard.com"
  - `COMPANY_WEBSITE`: "www.gruard.com"

#### 5.2 Método addBrandedHeader() ✓
- **Propósito:** Header profesional reutilizable para todos los PDFs
- **Elementos:**
  - Barra superior azul decorativa (8px)
  - Logo/nombre de empresa grande
  - Línea decorativa naranja (accent)
  - Tagline de la empresa
  - Título del documento alineado a la derecha
  - Línea separadora inferior

#### 5.3 Método addBrandedFooter() ✓
- **Propósito:** Footer profesional reutilizable para todos los PDFs
- **Elementos:**
  - Línea separadora
  - Información de contacto (teléfono, email, web)
  - Mensaje de agradecimiento en color primario
  - Nota legal
  - Barra inferior azul decorativa (8px)

#### 5.4 PDFs Actualizados con Branding ✓
1. **generateReceipt()** - Recibo de Servicio
   - `addHeader()` → `addBrandedHeader("RECIBO DE SERVICIO")`
   - `addFooter()` → `addBrandedFooter()`

2. **generateAnalyticsReport()** - Reporte de Analytics
   - `addAnalyticsHeader()` → `addBrandedHeader("REPORTE DE ANALYTICS")` + info de período
   - `addAnalyticsFooter()` → `addBrandedFooter()`

3. **generarEstadoFinancieroSocio()** - Estado Financiero de Socio
   - `addSocioHeader()` → `addBrandedHeader("ESTADO FINANCIERO")` + info de período
   - `addSocioFooter()` → `addBrandedFooter()`

---

## 🚀 PLAN DE 6 FASES - IMPLEMENTACIÓN COMPLETA

Ver documento detallado: `PLAN_DLOCAL_COMPLETO.md`

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Actualizar esquema BD (campos comisiones dLocal) | ✅ COMPLETADO |
| 2 | Mejorar servicio dLocal (tokenización real, cobro tarjetas guardadas) | ✅ COMPLETADO |
| 3 | Corregir endpoints de tarjetas (cobros reales) | ✅ COMPLETADO |
| 4 | Panel Admin - Visualización de comisiones dLocal | ✅ COMPLETADO |
| 5 | Branding profesional en PDFs (Grúa RD) | ✅ COMPLETADO |
| 6 | Limpieza de documentación | ⏳ Pendiente |

---

## ⏳ POR HACER - FASES RESTANTES

### FASE 2: Mejorar Servicio dLocal

#### 3.1 Componente de Balance del Operador
- **Ubicación:** `client/src/pages/driver/profile.tsx`
- **Elementos a añadir:**
  - Tarjeta de saldo disponible (grande, destacado)
  - Tarjeta de saldo pendiente (próximo pago programado)
  - Botón "Retirar Hoy" (con comisión visible)
  - Botón "Ver Historial"
  - Modal de confirmación para retiros

**Diseño:**
- Mostrar:
  - Balance disponible: RD$ X,XXX.XX
  - Próximo pago programado: Día/Fecha
  - Comisión de retiro del mismo día: RD$ 100
  - Historial de últimos 5 retiros

#### 3.2 Gestión de Cuenta Bancaria
- **Ubicación:** `client/src/pages/driver/profile.tsx`
- **Elementos:**
  - Formulario de registro de cuenta (si no existe)
  - Vista de cuenta verificada (si existe)
  - Botón para editar
  - Estado de verificación

**Campos:**
- Nombre del titular
- Cédula
- Banco (select dropdown)
- Tipo de cuenta (Ahorro/Corriente)
- Número de cuenta

#### 3.3 Modal de Retiro del Mismo Día
- Monto a retirar (input con validación)
- Comisión visible (RD$ 100)
- Monto neto a recibir (cálculo automático)
- Alertas de validación
- Confirmación y procesamiento
- Feedback de resultado

#### 3.4 Historial de Retiros
- Tabla/lista de retiros anteriores
- Columnas:
  - Fecha
  - Tipo (Programado/Inmediato)
  - Monto
  - Comisión
  - Monto Neto
  - Estado (Pendiente/Procesando/Pagado/Fallido)
- Filtros por tipo/estado
- Opcional: Exportar a PDF

### FASE 4: Testing y Validación (5-10% del trabajo)

#### 4.1 Testing Manual
- [ ] Flujo completo de solicitud de servicio con tarjeta
- [ ] Autorización y captura de pago
- [ ] Cancelación antes de captura (revertir autorización)
- [ ] Cancelación después de captura (reembolso)
- [ ] Retiro inmediato del operador
- [ ] Procesamiento de nómina programada
- [ ] Manejo de errores (tarjeta rechazada, cuenta no verificada, etc.)

#### 4.2 Casos de Prueba
**Pago:**
- ✓ Cliente con tarjeta válida solicita servicio
- ✓ Operador acepta → pago se captura
- ✓ Operador rechaza → autorización se cancela
- ✓ Cliente cancela antes de aceptación → autorización se cancela
- ✓ Cliente cancela después de aceptación → pago se reembolsa

**Nómina:**
- ✓ Lunes 8 AM: Procesamiento automático de pagos
- ✓ Viernes 8 AM: Procesamiento automático de pagos
- ✓ Operador con balance < 100 DOP: No se procesa
- ✓ Operador sin cuenta verificada: No se procesa
- ✓ Error en dLocal: Se registra y se reintenta

**Retiro Inmediato:**
- ✓ Monto válido, cuenta verificada: Procesado
- ✓ Monto < 500 DOP: Error
- ✓ Monto > balance: Error
- ✓ Sin cuenta bancaria: Error
- ✓ Comisión de 100 DOP: Aplicada correctamente

#### 4.3 Debugging y Logs
- [ ] Verificar logs de autorización
- [ ] Verificar logs de captura
- [ ] Verificar logs de procesamiento de nómina
- [ ] Verificar actualización de balances en BD
- [ ] Verificar estado de retiros

---

## 📊 Estado de Tareas

| Tarea | Estado | % | Notas |
|-------|--------|---|-------|
| 1. Auth/Capture Service | ✅ | 100% | Completado |
| 2. Esquema BD | ✅ | 100% | Tablas creadas |
| 3. Autorización en solicitud | ✅ | 100% | Implementado |
| 4. Captura en aceptación | ✅ | 100% | Implementado |
| 5. Cancelación de auth | ✅ | 100% | Implementado |
| 6. Servicio de nómina | ✅ | 100% | Lógica completada |
| 7. **API Routes** | ✅ | 100% | **Completado** - Historial, próximo pago, retiro inmediato, admin |
| 8. **UI del Operador** | ✅ | 100% | **Completado** - Modal retiro, historial, validaciones |
| 9. **Testing** | ⏳ | 0% | **Pendiente - Requiere credenciales dLocal** |

---

## 🎯 Plan de Ejecución - Próximos Pasos

### TURNO 1: Completar Routes API (2-3 horas)
1. Añadir métodos faltantes al `server/storage.ts`
2. Crear endpoints de balance y nómina en `server/routes.ts`
3. Crear endpoints de retiros (inmediato e historial)
4. Crear endpoints admin para gestión de nómina
5. Verificar LSP diagnostics

### TURNO 2: Implementar UI (2-3 horas)
1. Crear/actualizar componente `OperatorBalance` en driver profile
2. Implementar modal de retiro del mismo día
3. Implementar tabla de historial de retiros
4. Implementar formulario de cuenta bancaria
5. Añadir validaciones y feedback
6. Estilizar con diseño existente

### TURNO 3: Testing e Integración (1-2 horas)
1. Iniciar servidor
2. Ejecutar flujos de prueba manualmente
3. Verificar logs y BD
4. Corregir bugs encontrados
5. Testing del flujo completo de pago a payout
6. Documentar resultados

---

## 🔧 Requisitos Técnicos

### Variables de Entorno Requeridas
```
DLOCAL_X_LOGIN=***
DLOCAL_X_TRANS_KEY=***
DLOCAL_SECRET_KEY=***
ALLOWED_ORIGINS=http://localhost:5000
```

### Dependencias Instaladas
- ✅ @neondatabase/serverless (PostgreSQL)
- ✅ drizzle-orm + drizzle-kit
- ✅ @tanstack/react-query
- ✅ react-hook-form + @hookform/resolvers
- ✅ zod (validación)
- ✅ lucide-react (iconos)
- ✅ tailwindcss + shadcn/ui (estilos)
- ✅ pdfkit (generación de PDFs con branding)

### Tablas de BD Relacionadas
```
servicios (dlocalAuthorizationId, dlocalPaymentId)
    ↓
operator_bank_accounts (verificación de cuenta)
    ↓
operator_withdrawals (retiros)
    ↓
scheduled_payouts (lotes de nómina)
    └→ scheduled_payout_items (pagos individuales)
```

---

## 💡 Notas Importantes

### Comisión de Retiro del Mismo Día
- **Fija:** RD$ 100
- **Aplica a:** Retiros solicitados fuera del martes/viernes 8-9 AM
- **No aplica a:** Nómina programada (lunes y viernes)

### Balance del Operador
- **`balanceDisponible`:** Dinero listo para retirar
- **`balancePendiente`:** Dinero que llegará en próxima nómina programada

### Flujo de Dinero
```
Pago del Cliente
       ↓
Autorización (hold)
       ↓
[Aceptación del Operador]
       ↓
Captura del Pago
       ↓
Dinero → balanceDisponible (80% operador, 20% empresa)
       ↓
[Retiro Inmediato o Esperar Nómina]
       ↓
Payout a cuenta bancaria
```

### Manejo de Errores
- **Autorización fallida:** Usuario debe verificar tarjeta
- **Captura fallida:** Autorización se revierte automáticamente
- **Payout fallido:** Se registra y puede reintentar admin
- **Cuenta no verificada:** Operador no puede retirar

---

## 📝 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `server/services/dlocal-payment.ts` | ✅ Métodos auth/capture/cancel |
| `shared/schema.ts` | ✅ Nuevas tablas y campos |
| `server/routes.ts` | ✅ Auth en solicitud, captura en aceptación, cancelación |
| `server/services/service-auto-cancel.ts` | ✅ Cancelación de auth |
| `server/services/scheduled-payouts.ts` | ✅ NUEVO - Lógica de nómina |
| `server/storage.ts` | ⏳ Métodos faltantes |
| `client/src/pages/driver/profile.tsx` | ⏳ UI de balance |
| `server/routes.ts` | ⏳ API routes faltantes |

---

## ✨ Próximo Enfoque

**Inmediato:** Implementar API routes y métodos de storage
**Meta:** Poder hacer peticiones GET/POST desde UI del operador
**Validación:** Verificar flujos en logs y BD
