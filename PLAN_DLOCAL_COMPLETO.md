# Plan de Implementación: dLocal + Comisiones Admin + Branding PDF

**Fecha:** Diciembre 2024  
**Proyecto:** Grúa RD - Sistema de Grúas República Dominicana  
**Proveedor de Pagos:** dLocal (único proveedor)

---

## Resumen Ejecutivo

Este plan cubre la implementación completa de dLocal como único proveedor de pagos, incluyendo:
- Tokenización real de tarjetas
- Cobros reales para pagos de deuda
- Visualización de comisiones de dLocal en el panel admin
- Branding profesional de Grúa RD en todos los PDFs

---

## Estado Actual

### ✅ Lo que YA funciona:
| Funcionalidad | Estado |
|---------------|--------|
| Autorización/Captura de pagos | ✅ Implementado |
| Distribución 80/20 (Lun/Vie) | ✅ Configurado |
| Retiros inmediatos (100 DOP) | ✅ Implementado |
| Servicio dLocal base | ✅ Configurado |
| Credenciales dLocal | ✅ En ambiente |

### ❌ Lo que FALTA:
| Problema | Impacto |
|----------|---------|
| Tokenización genera tokens falsos | No se pueden cobrar tarjetas guardadas |
| Pago de deuda no cobra realmente | Solo marca como pagado sin cobrar |
| No se registran comisiones dLocal | Admin no puede ver costos reales |
| PDFs sin branding profesional | Falta identidad visual |

---

## Plan de Implementación (6 Fases)

---

## FASE 1: Actualizar Esquema de Base de Datos
**Tiempo estimado:** 15 minutos

### Cambios en tabla `comisiones`:
```sql
ALTER TABLE comisiones ADD COLUMN dlocal_fee_amount DECIMAL(12,2);
ALTER TABLE comisiones ADD COLUMN dlocal_fee_currency VARCHAR(3) DEFAULT 'DOP';
ALTER TABLE comisiones ADD COLUMN dlocal_net_amount DECIMAL(12,2);
```

### Cambios en tabla `wallet_transactions`:
```sql
ALTER TABLE wallet_transactions ADD COLUMN dlocal_transaction_id VARCHAR(255);
ALTER TABLE wallet_transactions ADD COLUMN dlocal_fee_amount DECIMAL(12,2);
```

### Criterio de éxito:
- [ ] Migración ejecutada sin errores
- [ ] Esquema actualizado en `shared/schema.ts`
- [ ] Tipos TypeScript actualizados

---

## FASE 2: Mejorar Servicio dLocal
**Tiempo estimado:** 30 minutos

### Archivo: `server/services/dlocal-payment.ts`

### Nuevas funciones a agregar:

#### 2.1 `saveCardWithValidation()`
```typescript
async saveCardWithValidation(request: {
  cardNumber: string;
  cardExpiry: string;
  cardCVV: string;
  cardholderName?: string;
  email: string;
  name: string;
  document: string;
}): Promise<{
  cardId: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}>
```

**Lógica:**
1. Hacer cobro de validación de 10 DOP (mínimo permitido) con `save: true`
2. Si el pago es exitoso, extraer el `card_id` de la respuesta
3. Reembolsar automáticamente los 10 DOP
4. Devolver el token real de dLocal

#### 2.2 `chargeWithSavedCard()`
```typescript
async chargeWithSavedCard(request: {
  cardId: string;
  amount: number;
  description: string;
  orderId: string;
  email: string;
  name: string;
  document: string;
}): Promise<{
  paymentId: string;
  status: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
}>
```

**Lógica:**
1. Llamar a POST `/payments` con el `card_id`
2. Extraer información de comisión de la respuesta
3. Calcular monto neto

#### 2.3 `extractDLocalFees()`
```typescript
extractDLocalFees(paymentResponse: any): {
  feeAmount: number;
  feeCurrency: string;
  netAmount: number;
}
```

### Criterio de éxito:
- [ ] Función `saveCardWithValidation` implementada y probada
- [ ] Función `chargeWithSavedCard` implementada y probada
- [ ] Función `extractDLocalFees` implementada
- [ ] Manejo de errores robusto

---

## FASE 3: Corregir Endpoints de Tarjetas
**Tiempo estimado:** 45 minutos

### Archivo: `server/routes.ts`

### 3.1 Endpoint: `POST /api/operator/payment-methods`

**Cambios:**
```typescript
// ANTES (incorrecto):
const cardToken = `DLOCAL_OP_${Date.now()}_${Math.random()...}`;

// DESPUÉS (correcto):
const result = await dlocalPaymentService.saveCardWithValidation({
  cardNumber,
  cardExpiry,
  cardCVV,
  cardholderName,
  email: user.email,
  name: `${user.nombre} ${user.apellido}`,
  document: user.cedula || '00000000000',
});
const cardToken = result.cardId; // Token real de dLocal
```

### 3.2 Endpoint: `POST /api/client/payment-methods`
**Mismos cambios que operador**

### 3.3 Endpoint: `POST /api/operator/pay-debt-with-card`

**Cambios:**
```typescript
// ANTES (incorrecto):
// Solo llamaba a WalletService.completeDebtPayment() sin cobrar

// DESPUÉS (correcto):
// 1. Obtener el card_id real del método de pago
const paymentMethod = await storage.getOperatorPaymentMethodById(paymentMethodId);

// 2. Cobrar realmente con dLocal
const chargeResult = await dlocalPaymentService.chargeWithSavedCard({
  cardId: paymentMethod.dlocalCardId,
  amount: paymentAmount,
  description: `Pago de deuda - Operador ${conductor.id}`,
  orderId: `DEBT-${wallet.id}-${Date.now()}`,
  email: user.email,
  name: `${user.nombre} ${user.apellido}`,
  document: user.cedula || '00000000000',
});

// 3. Si éxito, actualizar deuda con información de comisión
if (chargeResult.status === 'PAID') {
  await WalletService.completeDebtPayment(
    wallet.id,
    paymentAmount.toFixed(2),
    chargeResult.paymentId,
    chargeResult.feeAmount // Nueva columna
  );
}
```

### Criterio de éxito:
- [ ] Guardar tarjeta obtiene token real de dLocal
- [ ] Pago de deuda cobra realmente la tarjeta
- [ ] Se registran las comisiones de dLocal en cada transacción
- [ ] Manejo de errores muestra mensajes claros al usuario

---

## FASE 4: Panel Admin - Visualización de Comisiones
**Tiempo estimado:** 45 minutos

### 4.1 Backend: Nuevo endpoint de estadísticas

**Archivo:** `server/routes.ts`

```typescript
GET /api/admin/payment-fees
```

**Respuesta:**
```json
{
  "summary": {
    "totalCollected": 150000.00,
    "totalDLocalFees": 5250.00,
    "netReceived": 144750.00,
    "feePercentage": 3.5
  },
  "byPeriod": [
    {
      "date": "2024-12-01",
      "collected": 10000,
      "fees": 350,
      "net": 9650
    }
  ],
  "recentTransactions": [
    {
      "id": "...",
      "servicioId": "...",
      "amount": 1000,
      "dlocalFee": 35,
      "netAmount": 965,
      "operatorShare": 772,
      "companyShare": 193,
      "createdAt": "..."
    }
  ]
}
```

### 4.2 Frontend: Componente de Comisiones

**Archivo:** `client/src/pages/admin/PaymentFeesPanel.tsx`

**Elementos a mostrar:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 COMISIONES DE PROCESADOR                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Total Cobrado│  │ Comisión     │  │ Neto Recibido│          │
│  │ RD$150,000   │  │ dLocal       │  │ RD$144,750   │          │
│  │              │  │ RD$5,250     │  │              │          │
│  │              │  │ (3.5%)       │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  TRANSACCIONES RECIENTES                                        │
├──────────┬──────────┬───────────┬───────────┬──────────────────┤
│ Servicio │ Monto    │ Com.dLocal│ Neto      │ Distribución     │
├──────────┼──────────┼───────────┼───────────┼──────────────────┤
│ #12345   │ RD$1,000 │ RD$35     │ RD$965    │ Op:772 / GRD:193 │
│ #12344   │ RD$2,500 │ RD$87.50  │ RD$2,412  │ Op:1,930/GRD:482 │
└──────────┴──────────┴───────────┴───────────┴──────────────────┘
```

### 4.3 Detalle de servicio individual

**Agregar sección en vista de servicio:**

```
┌─────────────────────────────────────────────────────────────────┐
│  💳 DESGLOSE FINANCIERO                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cobrado al cliente:           RD$ 1,000.00                    │
│  (-) Comisión dLocal (3.5%):   RD$    35.00   ← NUEVO          │
│  ───────────────────────────────────────────                   │
│  (=) Monto neto:               RD$   965.00                    │
│                                                                 │
│  DISTRIBUCIÓN:                                                  │
│  • Operador (80%):             RD$   772.00                    │
│  • Grúa RD (20%):              RD$   193.00                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Criterio de éxito:
- [ ] Endpoint de estadísticas de comisiones funcionando
- [ ] Panel de admin muestra resumen de comisiones
- [ ] Tabla de transacciones con columnas de comisión
- [ ] Detalle de servicio muestra desglose completo
- [ ] Filtros por período funcionando

---

## FASE 5: Branding Profesional en PDFs
**Tiempo estimado:** 30 minutos

### Archivo: `server/services/pdf-service.ts`

### 5.1 Actualizar constantes de marca

```typescript
export class PDFService {
  // Colores de marca Grúa RD
  private readonly BRAND_PRIMARY = "#2563eb";     // Azul principal
  private readonly BRAND_SECONDARY = "#1e40af";   // Azul oscuro
  private readonly BRAND_ACCENT = "#f59e0b";      // Amarillo/Naranja (grúa)
  private readonly TEXT_PRIMARY = "#1f2937";
  private readonly TEXT_SECONDARY = "#64748b";
  private readonly SUCCESS_COLOR = "#22c55e";
  private readonly BORDER_COLOR = "#e2e8f0";
  
  // Información de la empresa (sin RNC por ahora)
  private readonly COMPANY_NAME = "Grúa RD";
  private readonly COMPANY_TAGLINE = "Servicios de Grúa República Dominicana";
  private readonly COMPANY_PHONE = "(809) 555-1234";
  private readonly COMPANY_EMAIL = "soporte@gruard.com";
  private readonly COMPANY_WEBSITE = "www.gruard.com";
}
```

### 5.2 Nuevo diseño de encabezado

```typescript
private addBrandedHeader(doc: PDFKit.PDFDocument, title: string): void {
  // Barra superior con color de marca
  doc.rect(0, 0, doc.page.width, 8).fill(this.BRAND_PRIMARY);
  
  // Logo/Nombre de empresa con ícono de grúa
  doc
    .fontSize(32)
    .fillColor(this.BRAND_PRIMARY)
    .font("Helvetica-Bold")
    .text("🚗 Grúa RD", 50, 30);
  
  // Línea decorativa
  doc
    .moveTo(50, 70)
    .lineTo(200, 70)
    .strokeColor(this.BRAND_ACCENT)
    .lineWidth(3)
    .stroke();
  
  // Tagline
  doc
    .fontSize(10)
    .fillColor(this.TEXT_SECONDARY)
    .font("Helvetica")
    .text(this.COMPANY_TAGLINE, 50, 80);
  
  // Título del documento (derecha)
  doc
    .fontSize(18)
    .fillColor(this.TEXT_PRIMARY)
    .font("Helvetica-Bold")
    .text(title, 350, 40, { align: "right" });
}
```

### 5.3 Nuevo diseño de pie de página

```typescript
private addBrandedFooter(doc: PDFKit.PDFDocument): void {
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 100;
  
  // Línea separadora
  doc
    .moveTo(50, footerY)
    .lineTo(550, footerY)
    .strokeColor(this.BORDER_COLOR)
    .lineWidth(1)
    .stroke();
  
  // Información de contacto
  doc
    .fontSize(9)
    .fillColor(this.TEXT_SECONDARY)
    .font("Helvetica")
    .text(`📞 ${this.COMPANY_PHONE}  |  ✉️ ${this.COMPANY_EMAIL}  |  🌐 ${this.COMPANY_WEBSITE}`, 
          50, footerY + 15, { align: "center", width: 500 });
  
  // Mensaje de agradecimiento
  doc
    .fontSize(10)
    .fillColor(this.BRAND_PRIMARY)
    .font("Helvetica-Bold")
    .text("¡Gracias por confiar en Grúa RD!", 
          50, footerY + 35, { align: "center", width: 500 });
  
  // Nota legal
  doc
    .fontSize(8)
    .fillColor(this.TEXT_SECONDARY)
    .font("Helvetica")
    .text("Este documento es un comprobante digital válido del servicio prestado.", 
          50, footerY + 55, { align: "center", width: 500 });
  
  // Barra inferior con color de marca
  doc.rect(0, pageHeight - 8, doc.page.width, 8).fill(this.BRAND_PRIMARY);
}
```

### 5.4 Documentos a actualizar con branding

| Documento | Método | Cambios |
|-----------|--------|---------|
| Recibo de servicio | `generateReceipt()` | Header + Footer + Colores |
| Reporte de analytics | `generateAnalyticsReport()` | Header + Footer + Colores |
| Estado financiero socio | `generarEstadoFinancieroSocio()` | Header + Footer + Colores |
| Factura empresa | `generarFacturaEmpresa()` | Header + Footer + Colores |

### Ejemplo visual del nuevo recibo:

```
┌─────────────────────────────────────────────────────────────────┐
│████████████████████████████████████████████████████████████████│  ← Barra azul
│                                                                 │
│  🚗 Grúa RD                           RECIBO DE SERVICIO       │
│  ═══════════                                                    │
│  Servicios de Grúa República Dominicana                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  No. Recibo: GRD-1733405982-0042                               │
│  Fecha: 5 de diciembre de 2024, 10:30 AM                       │
│  ID Servicio: SRV-abc123def456                                 │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  INFORMACIÓN DEL CLIENTE          INFORMACIÓN DEL CONDUCTOR    │
│  Nombre: Juan Pérez               Conductor: Pedro Gómez       │
│  Email: juan@email.com            Placa Grúa: A123456          │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  DETALLES DEL SERVICIO                                         │
│  Origen: Av. 27 de Febrero, Santo Domingo                      │
│  Destino: Autopista Duarte Km 15                               │
│  Distancia: 18.5 km                                            │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  DESGLOSE DE COSTOS                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Concepto                                    │    Monto  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Costo Total del Servicio                    │ RD$1,000  │   │
│  │ Pago al Conductor (80%)                     │ RD$  800  │   │
│  │ Comisión Plataforma (20%)                   │ RD$  200  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ████ TOTAL PAGADO                           │ RD$1,000  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Método de Pago: Tarjeta de Crédito                            │
│  ID Transacción: D-4-abc123def456                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📞 (809) 555-1234  |  ✉️ soporte@gruard.com  |  🌐 www.gruard.com │
│                                                                 │
│              ¡Gracias por confiar en Grúa RD!                  │
│                                                                 │
│   Este documento es un comprobante digital válido del servicio │
│                                                                 │
│████████████████████████████████████████████████████████████████│  ← Barra azul
└─────────────────────────────────────────────────────────────────┘
```

### Criterio de éxito:
- [ ] Encabezado con branding aplicado a todos los PDFs
- [ ] Pie de página con información de contacto
- [ ] Colores de marca consistentes
- [ ] Barras decorativas superior e inferior
- [ ] RNC omitido (se agregará después)

---

## FASE 6: Limpieza y Documentación
**Tiempo estimado:** 15 minutos

### Archivos a actualizar:

| Archivo | Cambio |
|---------|--------|
| `replit.md` | Cambiar "Azul Payment Gateway" → "dLocal" |
| `WALLET_IMPLEMENTATION_PLAN.md` | Eliminar referencias a Stripe |
| `PLAN_DESARROLLO_COMPLETO.md` | Actualizar a dLocal |
| `DLOCAL_INTEGRATION_PROGRESS.md` | Marcar como completado |
| Comentarios en código | Actualizar menciones de Stripe |

### Criterio de éxito:
- [ ] No hay menciones de "Azul" en el código
- [ ] No hay menciones de "Stripe" en comentarios activos
- [ ] Documentación refleja dLocal como único proveedor

---

## Cronograma Total

| Fase | Descripción | Tiempo |
|------|-------------|--------|
| 1 | Esquema de Base de Datos | 15 min |
| 2 | Servicio dLocal mejorado | 30 min |
| 3 | Corregir endpoints de tarjetas | 45 min |
| 4 | Panel Admin comisiones | 45 min |
| 5 | Branding PDFs | 30 min |
| 6 | Limpieza documentación | 15 min |
| **Total** | | **~3 horas** |

---

## Consideraciones Técnicas

### Comisiones de dLocal (estimado):
- **Tarjetas de crédito:** ~3.5% + fee fijo
- **Tarjetas de débito:** ~2.5% + fee fijo
- La respuesta de API incluye campo `fee` con el monto exacto

### Cobro de validación:
- Monto: 10 DOP (mínimo permitido en DR)
- Se reembolsa automáticamente después de obtener el token
- Tiempo de reembolso: instantáneo

### Cálculo de distribución:
```
Monto Bruto = Lo que paga el cliente
(-) Comisión dLocal = Fee del procesador
(=) Monto Neto = Disponible para distribuir

Operador = Monto Neto × 80%
Grúa RD = Monto Neto × 20%
```

### Ejemplo numérico:
```
Cliente paga:        RD$ 1,000.00
Comisión dLocal:     RD$    35.00 (3.5%)
─────────────────────────────────
Monto Neto:          RD$   965.00

Operador (80%):      RD$   772.00
Grúa RD (20%):       RD$   193.00
```

---

## Próximos Pasos (Post-Implementación)

1. **Agregar RNC** cuando esté disponible
2. **Logo gráfico** para PDFs (actualmente solo texto)
3. **Reportes de comisiones** exportables a Excel
4. **Dashboard de métricas** de procesador
5. **Alertas** cuando comisiones excedan umbral

---

## Aprobación

- [ ] **Cliente aprueba el plan**
- [ ] **Fecha de inicio:** _______________
- [ ] **Responsable:** Agente Replit

---

*Documento generado automáticamente - Diciembre 2024*
