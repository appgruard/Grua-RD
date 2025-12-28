import PDFDocument from "pdfkit";
import { Writable } from "stream";
import { logger } from "../logger";

export interface ReceiptData {
  receiptNumber: string;
  servicioId: string;
  fecha: Date;
  cliente: {
    nombre: string;
    apellido: string;
    email: string;
    cedula?: string;
  };
  conductor: {
    nombre: string;
    apellido: string;
    placaGrua: string;
  };
  servicio: {
    origenDireccion: string;
    destinoDireccion: string;
    distanciaKm: string;
  };
  costos: {
    costoTotal: string;
    montoOperador: string;
    montoEmpresa: string;
    porcentajeOperador: string;
    porcentajeEmpresa: string;
  };
  metodoPago: "efectivo" | "tarjeta";
  transactionId?: string;
}

export interface OperatorStatementPDFData {
  statementNumber: string;
  operatorName: string;
  operatorId: string;
  periodStart: Date;
  periodEnd: Date;
  generatedDate: Date;
  openingBalance: string;
  currentBalance: string;
  totalDebt: string;
  totalCredits: string;
  totalDebits: string;
  completedServices: number;
  transactions: Array<{
    date: Date;
    type: string;
    description: string;
    amount: string;
    servicioId?: string;
  }>;
  pendingDebts: Array<{
    id: string;
    originalAmount: string;
    remainingAmount: string;
    dueDate: Date;
    status: string;
    daysRemaining: number;
  }>;
  manualPayouts: Array<{
    date: Date;
    amount: string;
    notes?: string;
    evidenceUrl?: string;
    adminName?: string;
  }>;
}

export class PDFService {
  private readonly BRAND_PRIMARY = "#0b2545"; // Navy Blue
  private readonly BRAND_SECONDARY = "#1e40af"; // Blue
  private readonly BRAND_ACCENT = "#f5a623"; // Amber/Gold
  private readonly TEXT_PRIMARY = "#111827";
  private readonly TEXT_SECONDARY = "#4b5563";
  private readonly TEXT_TERTIARY = "#9ca3af";
  private readonly SUCCESS_COLOR = "#059669";
  private readonly BORDER_COLOR = "#f3f4f6";
  private readonly BACKGROUND_LIGHT = "#f9fafb";
  
  private readonly COMPANY_NAME = "Grúa RD";
  private readonly LEGAL_NAME = "GRUARD";
  private readonly COMPANY_TAGLINE = "Tu auxilio vial de confianza";
  private readonly COMPANY_PHONE = "829-351-9324";
  private readonly COMPANY_EMAIL = "info@gruard.com";
  private readonly COMPANY_WEBSITE = "www.gruard.com";
  
  async generateReceipt(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "LETTER",
          margins: { top: 40, bottom: 40, left: 50, right: 50 },
          bufferPages: true,
        });

        const buffers: Buffer[] = [];
        const stream = new Writable({
          write(chunk, encoding, callback) {
            buffers.push(chunk);
            callback();
          },
        });

        doc.pipe(stream);

        // -- Header --
        this.addHeader(doc, data);
        
        // -- Main Sections --
        let currentY = 160;
        
        // Info Box (Receipt details)
        this.addReceiptSummary(doc, data, currentY);
        currentY += 80;

        // Two columns: Client and Driver
        this.addParticipantsInfo(doc, data, currentY);
        currentY += 120;

        // Service Journey
        this.addServicePath(doc, data, currentY);
        currentY += 130;

        // Cost Table
        this.addModernCostBreakdown(doc, data, currentY);

        // -- Footer --
        this.addFooter(doc, data);

        doc.end();

        stream.on("finish", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        stream.on("error", (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const pageWidth = doc.page.width;
    
    // Top Accent Bar
    doc.rect(0, 0, pageWidth, 5).fill(this.BRAND_PRIMARY);
    
    // Brand Logo/Text
    doc
      .fontSize(24)
      .fillColor(this.BRAND_PRIMARY)
      .font("Helvetica-Bold")
      .text(this.COMPANY_NAME, 50, 45);
    
    doc
      .fontSize(9)
      .fillColor(this.BRAND_ACCENT)
      .font("Helvetica-Bold")
      .text(this.COMPANY_TAGLINE.toUpperCase(), 52, 72, { characterSpacing: 1 });
    
    // Document Title
    doc
      .fontSize(16)
      .fillColor(this.TEXT_PRIMARY)
      .font("Helvetica-Bold")
      .text("RECIBO DE SERVICIO", 300, 55, { align: "right", width: 250 });
      
    doc
      .fontSize(9)
      .fillColor(this.TEXT_SECONDARY)
      .font("Helvetica")
      .text(`#${data.receiptNumber}`, 300, 75, { align: "right", width: 250 });
  }

  private addReceiptSummary(doc: PDFKit.PDFDocument, data: ReceiptData, y: number): void {
    doc.fillColor(this.BACKGROUND_LIGHT).roundedRect(50, y, 500, 60, 4).fill();
    
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    const colWidth = 160;
    
    // Labels
    doc.fontSize(8).fillColor(this.TEXT_TERTIARY).font("Helvetica-Bold");
    doc.text("FECHA DE EMISIÓN", 70, y + 15);
    doc.text("ID DE SERVICIO", 70 + colWidth, y + 15);
    doc.text("MÉTODO DE PAGO", 70 + (colWidth * 2), y + 15);
    
    // Values
    doc.fontSize(10).fillColor(this.TEXT_PRIMARY).font("Helvetica");
    doc.text(formatDate(data.fecha), 70, y + 30);
    doc.text(data.servicioId.substring(0, 15).toUpperCase(), 70 + colWidth, y + 30);
    doc.text(data.metodoPago === "efectivo" ? "EFECTIVO" : "TARJETA BANCARIA", 70 + (colWidth * 2), y + 30);
  }

  private addParticipantsInfo(doc: PDFKit.PDFDocument, data: ReceiptData, y: number): void {
    const colWidth = 240;
    
    // Client Column
    doc.fontSize(10).fillColor(this.BRAND_SECONDARY).font("Helvetica-Bold").text("CLIENTE", 50, y);
    doc.rect(50, y + 15, 30, 2).fill(this.BRAND_ACCENT);
    
    doc.fontSize(11).fillColor(this.TEXT_PRIMARY).font("Helvetica-Bold").text(`${data.cliente.nombre} ${data.cliente.apellido}`, 50, y + 30);
    doc.fontSize(9).fillColor(this.TEXT_SECONDARY).font("Helvetica").text(data.cliente.email, 50, y + 45);
    if (data.cliente.cedula) {
      doc.fontSize(9).fillColor(this.TEXT_TERTIARY).text(`Cédula: ${data.cliente.cedula}`, 50, y + 58);
    }
    
    // Driver Column
    doc.fontSize(10).fillColor(this.BRAND_SECONDARY).font("Helvetica-Bold").text("UNIDAD DE ASISTENCIA", 310, y);
    doc.rect(310, y + 15, 30, 2).fill(this.BRAND_ACCENT);
    
    doc.fontSize(11).fillColor(this.TEXT_PRIMARY).font("Helvetica-Bold").text(`${data.conductor.nombre} ${data.conductor.apellido}`, 310, y + 30);
    doc.fontSize(9).fillColor(this.TEXT_SECONDARY).font("Helvetica").text(`Placa: ${data.conductor.placaGrua}`, 310, y + 45);
    doc.fontSize(9).fillColor(this.TEXT_TERTIARY).text("Estatus: Servicio Completado", 310, y + 58);
  }

  private addServicePath(doc: PDFKit.PDFDocument, data: ReceiptData, y: number): void {
    doc.fontSize(10).fillColor(this.BRAND_SECONDARY).font("Helvetica-Bold").text("DETALLE DEL TRAYECTO", 50, y);
    doc.rect(50, y + 15, 30, 2).fill(this.BRAND_ACCENT);
    
    const journeyY = y + 35;
    
    // Origin
    doc.circle(60, journeyY, 4).fill(this.BRAND_ACCENT);
    doc.fontSize(9).fillColor(this.TEXT_TERTIARY).font("Helvetica-Bold").text("ORIGEN", 75, journeyY - 4);
    doc.fontSize(9).fillColor(this.TEXT_PRIMARY).font("Helvetica").text(data.servicio.origenDireccion, 75, journeyY + 8, { width: 450 });
    
    // Vertical Line
    doc.moveTo(60, journeyY + 8).lineTo(60, journeyY + 45).dash(2, { space: 2 }).strokeColor(this.TEXT_TERTIARY).stroke().undash();
    
    // Destino
    const destY = journeyY + 55;
    doc.circle(60, destY, 4).fill(this.BRAND_PRIMARY);
    doc.fontSize(9).fillColor(this.TEXT_TERTIARY).font("Helvetica-Bold").text("DESTINO", 75, destY - 4);
    doc.fontSize(9).fillColor(this.TEXT_PRIMARY).font("Helvetica").text(data.servicio.destinoDireccion, 75, destY + 8, { width: 450 });
    
    doc.fontSize(9).fillColor(this.TEXT_SECONDARY).font("Helvetica-Bold").text(`DISTANCIA TOTAL: ${data.servicio.distanciaKm} KM`, 50, destY + 45);
  }

  private addModernCostBreakdown(doc: PDFKit.PDFDocument, data: ReceiptData, y: number): void {
    doc.fontSize(10).fillColor(this.BRAND_SECONDARY).font("Helvetica-Bold").text("DESGLOSE ECONÓMICO", 50, y);
    doc.rect(50, y + 15, 30, 2).fill(this.BRAND_ACCENT);
    
    let currentY = y + 35;
    
    const addRow = (label: string, value: string, isTotal: boolean = false) => {
      if (isTotal) {
        doc.rect(50, currentY, 500, 35).fill(this.BRAND_PRIMARY);
        doc.fontSize(12).fillColor("#ffffff").font("Helvetica-Bold").text(label, 70, currentY + 12);
        doc.fontSize(14).text(`RD$ ${value}`, 400, currentY + 10, { align: "right", width: 130 });
      } else {
        doc.fontSize(10).fillColor(this.TEXT_SECONDARY).font("Helvetica").text(label, 70, currentY);
        doc.fillColor(this.TEXT_PRIMARY).font("Helvetica-Bold").text(`RD$ ${value}`, 400, currentY, { align: "right", width: 130 });
        doc.moveTo(50, currentY + 15).lineTo(550, currentY + 15).strokeColor(this.BORDER_COLOR).lineWidth(0.5).stroke();
      }
      currentY += isTotal ? 45 : 25;
    };
    
    addRow("Cargo por Servicio de Grúa", data.costos.costoTotal);
    
    if (data.metodoPago === "tarjeta") {
      addRow("Impuestos y Tasas Transaccionales", "Incluidos");
    }
    
    currentY += 10;
    addRow("TOTAL PAGADO", data.costos.costoTotal, true);
    
    if (data.transactionId) {
      doc.fontSize(8).fillColor(this.TEXT_TERTIARY).font("Helvetica-Oblique").text(`Ref. Transacción: ${data.transactionId}`, 50, currentY + 5);
    }
  }

  private addFooter(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 80;
    
    doc.rect(50, footerY, 500, 0.5).fill(this.BORDER_COLOR);
    
    doc
      .fontSize(8)
      .fillColor(this.TEXT_SECONDARY)
      .font("Helvetica")
      .text(
        `GRUARD | RNC: Registro Nacional del Contribuyente | Tel: ${this.COMPANY_PHONE}`,
        50,
        footerY + 15,
        { align: "center", width: 500 }
      );
      
    doc
      .fontSize(7)
      .fillColor(this.TEXT_TERTIARY)
      .text(
        "Este recibo es un comprobante digital de asistencia vial generado por la plataforma Grúa RD.",
        50,
        footerY + 30,
        { align: "center", width: 500 }
      );
      
    doc.rect(0, pageHeight - 5, doc.page.width, 5).fill(this.BRAND_PRIMARY);
  }

  generateReceiptNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `GRD-${timestamp}-${random}`;
  }

  generateStatementNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `EC-${timestamp}-${random}`;
  }

  async generateOperatorStatement(data: OperatorStatementPDFData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "LETTER",
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const buffers: Buffer[] = [];
        const stream = new Writable({
          write(chunk, encoding, callback) {
            buffers.push(chunk);
            callback();
          },
        });

        doc.pipe(stream);

        this.addOperatorStatementHeader(doc, data);
        this.addOperatorInfo(doc, data);
        this.addOperatorSummary(doc, data);
        this.addOperatorTransactions(doc, data);
        this.addOperatorPendingDebts(doc, data);
        this.addOperatorManualPayouts(doc, data);
        this.addBrandedFooter(doc);

        doc.end();

        stream.on("finish", () => {
          const pdfBuffer = Buffer.concat(buffers);
          logger.info("Operator statement PDF generated successfully", {
            statementNumber: data.statementNumber,
            operatorId: data.operatorId,
            size: pdfBuffer.length,
          });
          resolve(pdfBuffer);
        });

        stream.on("error", (error) => {
          logger.error("Error generating operator statement PDF", { error });
          reject(error);
        });
      } catch (error) {
        logger.error("Error creating operator statement PDF document", { error });
        reject(error);
      }
    });
  }

  private addOperatorStatementHeader(doc: PDFKit.PDFDocument, data: OperatorStatementPDFData): void {
    this.addBrandedHeader(doc, "ESTADO DE CUENTA - OPERADOR");
    
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("es-DO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    doc
      .fontSize(10)
      .fillColor(this.TEXT_SECONDARY)
      .font("Helvetica")
      .text(`Periodo: ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`, 50, 115);
    
    doc
      .fontSize(9)
      .text(`No. Estado: ${data.statementNumber}`, 350, 115, { align: "right", width: 200 });
    
    doc
      .fontSize(9)
      .text(`Generado: ${formatDate(data.generatedDate)}`, 350, 130, { align: "right", width: 200 });
  }

  private addOperatorInfo(doc: PDFKit.PDFDocument, data: OperatorStatementPDFData): void {
    const startY = 155;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Informacion del Operador", 50, startY);

    doc.fontSize(10).fillColor("#000000").font("Helvetica-Bold");
    doc.text("Nombre:", 50, startY + 25);
    doc.text("ID Operador:", 50, startY + 45);
    doc.text("Servicios Completados:", 300, startY + 25);

    doc.font("Helvetica").fillColor(this.SECONDARY_COLOR);
    doc.text(data.operatorName, 130, startY + 25);
    doc.text(data.operatorId.substring(0, 18) + "...", 130, startY + 45);
    doc.text(data.completedServices.toString(), 450, startY + 25);

    doc
      .moveTo(50, startY + 70)
      .lineTo(550, startY + 70)
      .strokeColor(this.BORDER_COLOR)
      .lineWidth(1)
      .stroke();
  }

  private addOperatorSummary(doc: PDFKit.PDFDocument, data: OperatorStatementPDFData): void {
    const startY = 235;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Resumen Financiero", 50, startY);

    const kpiY = startY + 25;
    const kpiWidth = 160;
    const kpiHeight = 55;

    const kpis = [
      { label: "Balance Inicial", value: `RD$ ${data.openingBalance}` },
      { label: "Balance Actual", value: `RD$ ${data.currentBalance}` },
      { label: "Deuda Total", value: `RD$ ${data.totalDebt}`, color: parseFloat(data.totalDebt) > 0 ? "#ef4444" : this.SUCCESS_COLOR },
    ];

    kpis.forEach((kpi, index) => {
      const x = 50 + (index * (kpiWidth + 10));
      
      doc.fillColor("#f8fafc").roundedRect(x, kpiY, kpiWidth, kpiHeight, 5).fill();
      
      doc
        .fontSize(9)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(kpi.label, x + 10, kpiY + 10, { width: kpiWidth - 20 });
      
      doc
        .fontSize(14)
        .fillColor(kpi.color || "#000000")
        .font("Helvetica-Bold")
        .text(kpi.value, x + 10, kpiY + 30, { width: kpiWidth - 20 });
    });

    const summaryY = kpiY + kpiHeight + 10;
    doc
      .fontSize(10)
      .fillColor(this.SECONDARY_COLOR)
      .font("Helvetica")
      .text(`Total Creditos: RD$ ${data.totalCredits}  |  Total Debitos: RD$ ${data.totalDebits}`, 50, summaryY);
  }

  private addOperatorTransactions(doc: PDFKit.PDFDocument, data: OperatorStatementPDFData): void {
    if (data.transactions.length === 0) return;

    const startY = 355;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Transacciones del Periodo", 50, startY);

    let currentY = startY + 25;
    const rowHeight = 20;

    doc
      .fillColor("#f8fafc")
      .rect(50, currentY, 500, rowHeight)
      .fill();
    
    doc
      .fontSize(9)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Fecha", 60, currentY + 5)
      .text("Tipo", 140, currentY + 5)
      .text("Descripcion", 230, currentY + 5)
      .text("Monto", 480, currentY + 5, { align: "right", width: 60 });

    currentY += rowHeight + 5;

    const typeLabels: Record<string, string> = {
      service_commission: "Comision",
      cash_advance: "Adelanto Efect.",
      manual_payout: "Pago Manual",
      debt_payment: "Pago Deuda",
      adjustment: "Ajuste",
    };

    const maxTransactions = Math.min(data.transactions.length, 8);
    data.transactions.slice(0, maxTransactions).forEach((tx, index) => {
      if (index % 2 === 0) {
        doc.fillColor("#ffffff").rect(50, currentY - 3, 500, rowHeight).fill();
      }

      const dateStr = new Date(tx.date).toLocaleDateString("es-DO", {
        month: "short",
        day: "numeric",
      });
      
      const amountColor = tx.amount.startsWith("-") ? "#ef4444" : this.SUCCESS_COLOR;
      
      doc
        .fontSize(8)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(dateStr, 60, currentY)
        .text(typeLabels[tx.type] || tx.type, 140, currentY)
        .text(tx.description.substring(0, 30), 230, currentY);
      
      doc
        .fillColor(amountColor)
        .font("Helvetica-Bold")
        .text(`RD$ ${tx.amount}`, 480, currentY, { align: "right", width: 60 });
      
      currentY += rowHeight;
    });

    if (data.transactions.length > maxTransactions) {
      doc
        .fontSize(8)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica-Oblique")
        .text(`... y ${data.transactions.length - maxTransactions} transacciones mas`, 60, currentY + 5);
    }
  }

  private addOperatorPendingDebts(doc: PDFKit.PDFDocument, data: OperatorStatementPDFData): void {
    if (data.pendingDebts.length === 0) return;

    doc.addPage();
    const startY = 50;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Deudas Pendientes", 50, startY);

    let currentY = startY + 25;
    const rowHeight = 25;

    doc
      .fillColor("#f8fafc")
      .rect(50, currentY, 500, rowHeight)
      .fill();
    
    doc
      .fontSize(9)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("ID", 60, currentY + 7)
      .text("Monto Original", 150, currentY + 7)
      .text("Monto Restante", 260, currentY + 7)
      .text("Vencimiento", 370, currentY + 7)
      .text("Dias Rest.", 470, currentY + 7);

    currentY += rowHeight + 5;

    data.pendingDebts.forEach((debt, index) => {
      if (index % 2 === 0) {
        doc.fillColor("#ffffff").rect(50, currentY - 3, 500, rowHeight).fill();
      }

      const dueDate = new Date(debt.dueDate).toLocaleDateString("es-DO", {
        month: "short",
        day: "numeric",
      });

      const daysColor = debt.daysRemaining <= 0 ? "#ef4444" : 
                        debt.daysRemaining <= 3 ? "#f59e0b" : 
                        this.SUCCESS_COLOR;
      
      doc
        .fontSize(8)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(debt.id.substring(0, 8) + "...", 60, currentY + 2)
        .text(`RD$ ${debt.originalAmount}`, 150, currentY + 2)
        .text(`RD$ ${debt.remainingAmount}`, 260, currentY + 2)
        .text(dueDate, 370, currentY + 2);
      
      doc
        .fillColor(daysColor)
        .font("Helvetica-Bold")
        .text(debt.daysRemaining.toString(), 470, currentY + 2);
      
      currentY += rowHeight;
    });
  }

  private addOperatorManualPayouts(doc: PDFKit.PDFDocument, data: OperatorStatementPDFData): void {
    if (data.manualPayouts.length === 0) return;

    const needsNewPage = data.pendingDebts.length === 0;
    if (needsNewPage) {
      doc.addPage();
    }
    
    const startY = data.pendingDebts.length === 0 ? 50 : 50 + (data.pendingDebts.length * 25) + 100;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Pagos Manuales Realizados", 50, startY);

    let currentY = startY + 25;
    const rowHeight = 25;

    doc
      .fillColor("#f8fafc")
      .rect(50, currentY, 500, rowHeight)
      .fill();
    
    doc
      .fontSize(9)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Fecha", 60, currentY + 7)
      .text("Monto", 150, currentY + 7)
      .text("Registrado por", 250, currentY + 7)
      .text("Notas", 380, currentY + 7);

    currentY += rowHeight + 5;

    data.manualPayouts.forEach((payout, index) => {
      if (index % 2 === 0) {
        doc.fillColor("#ffffff").rect(50, currentY - 3, 500, rowHeight).fill();
      }

      const payoutDate = new Date(payout.date).toLocaleDateString("es-DO", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      });
      
      doc
        .fontSize(8)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(payoutDate, 60, currentY + 2)
        .text(`RD$ ${payout.amount}`, 150, currentY + 2)
        .text(payout.adminName || "Admin", 250, currentY + 2)
        .text((payout.notes || "-").substring(0, 25), 380, currentY + 2);
      
      currentY += rowHeight;
    });
  }

  async generateAnalyticsReport(data: AnalyticsReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "LETTER",
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const buffers: Buffer[] = [];
        const stream = new Writable({
          write(chunk, encoding, callback) {
            buffers.push(chunk);
            callback();
          },
        });

        doc.pipe(stream);

        this.addAnalyticsHeader(doc, data);
        this.addKPISection(doc, data);
        this.addVehicleSection(doc, data);
        this.addStatusSection(doc, data);
        this.addDriverRankingSection(doc, data);
        this.addAnalyticsFooter(doc);

        doc.end();

        stream.on("finish", () => {
          const pdfBuffer = Buffer.concat(buffers);
          logger.info("Analytics PDF report generated successfully", {
            period: `${data.startDate} to ${data.endDate}`,
            size: pdfBuffer.length,
          });
          resolve(pdfBuffer);
        });

        stream.on("error", (error) => {
          logger.error("Error generating analytics PDF report", { error });
          reject(error);
        });
      } catch (error) {
        logger.error("Error creating analytics PDF document", { error });
        reject(error);
      }
    });
  }

  private addAnalyticsHeader(doc: PDFKit.PDFDocument, data: AnalyticsReportData): void {
    this.addBrandedHeader(doc, "REPORTE DE ANALYTICS");
    
    doc
      .fontSize(10)
      .fillColor(this.TEXT_SECONDARY)
      .font("Helvetica")
      .text(`Periodo: ${data.startDate} - ${data.endDate}`, 50, 120);
    
    doc
      .fontSize(9)
      .text(`Generado: ${new Date().toLocaleDateString("es-DO")}`, 350, 120, { align: "right", width: 200 });
  }

  private addKPISection(doc: PDFKit.PDFDocument, data: AnalyticsReportData): void {
    const startY = 140;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Indicadores Clave de Rendimiento (KPIs)", 50, startY);

    const kpiY = startY + 30;
    const kpiWidth = 125;
    const kpiHeight = 60;

    const kpis = [
      { label: "Tiempo Respuesta", value: `${data.kpis.avgResponseMinutes.toFixed(1)} min` },
      { label: "Tasa Aceptacion", value: `${data.kpis.acceptanceRate.toFixed(1)}%` },
      { label: "Tasa Cancelacion", value: `${data.kpis.cancellationRate.toFixed(1)}%` },
      { label: "Ingreso Promedio", value: `RD$ ${data.kpis.avgRevenuePerService.toFixed(0)}` },
    ];

    kpis.forEach((kpi, index) => {
      const x = 50 + (index * (kpiWidth + 10));
      
      doc.fillColor("#f8fafc").roundedRect(x, kpiY, kpiWidth, kpiHeight, 5).fill();
      
      doc
        .fontSize(9)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(kpi.label, x + 10, kpiY + 10, { width: kpiWidth - 20 });
      
      doc
        .fontSize(16)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(kpi.value, x + 10, kpiY + 30, { width: kpiWidth - 20 });
    });

    doc
      .fontSize(10)
      .fillColor(this.SECONDARY_COLOR)
      .font("Helvetica")
      .text(`Total Servicios: ${data.kpis.totalServices} | Completados: ${data.kpis.completedServices} | Cancelados: ${data.kpis.cancelledServices}`, 50, kpiY + 75);
  }

  private addVehicleSection(doc: PDFKit.PDFDocument, data: AnalyticsReportData): void {
    const startY = 280;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Distribucion por Tipo de Vehiculo", 50, startY);

    const vehicleLabels: Record<string, string> = {
      carro: "Carro",
      motor: "Motor",
      jeep: "Jeep",
      camion: "Camion",
      no_especificado: "No Especificado",
    };

    let currentY = startY + 25;
    
    doc
      .fillColor("#f8fafc")
      .rect(50, currentY, 500, 20)
      .fill();
    
    doc
      .fontSize(9)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Tipo de Vehiculo", 60, currentY + 5)
      .text("Cantidad", 300, currentY + 5)
      .text("Ingresos", 420, currentY + 5);

    currentY += 25;

    data.vehicles.forEach((vehicle, index) => {
      if (index % 2 === 0) {
        doc.fillColor("#ffffff").rect(50, currentY - 3, 500, 20).fill();
      }
      
      doc
        .fontSize(9)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(vehicleLabels[vehicle.tipoVehiculo] || vehicle.tipoVehiculo, 60, currentY)
        .text(vehicle.count.toString(), 300, currentY)
        .text(`RD$ ${vehicle.revenue.toFixed(2)}`, 420, currentY);
      
      currentY += 20;
    });
  }

  private addStatusSection(doc: PDFKit.PDFDocument, data: AnalyticsReportData): void {
    const startY = 420;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Distribucion por Estado", 50, startY);

    const statusLabels: Record<string, string> = {
      pendiente: "Pendiente",
      aceptado: "Aceptado",
      conductor_en_sitio: "En Sitio",
      cargando: "Cargando",
      en_progreso: "En Progreso",
      completado: "Completado",
      cancelado: "Cancelado",
    };

    let currentY = startY + 25;

    data.statusBreakdown.forEach((status, index) => {
      const percentage = data.kpis.totalServices > 0 
        ? ((status.count / data.kpis.totalServices) * 100).toFixed(1)
        : "0";
      
      doc
        .fontSize(9)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(`${statusLabels[status.status] || status.status}: ${status.count} (${percentage}%)`, 60, currentY);
      
      currentY += 15;
    });
  }

  private addDriverRankingSection(doc: PDFKit.PDFDocument, data: AnalyticsReportData): void {
    if (data.driverRankings.length === 0) return;

    doc.addPage();
    const startY = 50;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Ranking de Conductores (Top 10)", 50, startY);

    let currentY = startY + 25;

    doc
      .fillColor("#f8fafc")
      .rect(50, currentY, 500, 20)
      .fill();
    
    doc
      .fontSize(9)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("#", 60, currentY + 5)
      .text("Conductor", 90, currentY + 5)
      .text("Servicios", 350, currentY + 5)
      .text("Calificacion", 450, currentY + 5);

    currentY += 25;

    data.driverRankings.slice(0, 10).forEach((driver, index) => {
      if (index % 2 === 0) {
        doc.fillColor("#ffffff").rect(50, currentY - 3, 500, 20).fill();
      }
      
      doc
        .fontSize(9)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text((index + 1).toString(), 60, currentY)
        .text(driver.driverName, 90, currentY)
        .text(driver.completedServices.toString(), 350, currentY)
        .text(driver.averageRating > 0 ? driver.averageRating.toFixed(2) : "N/A", 450, currentY);
      
      currentY += 20;
    });
  }

  private addAnalyticsFooter(doc: PDFKit.PDFDocument): void {
    this.addBrandedFooter(doc);
  }

  async generarEstadoFinancieroSocio(data: EstadoFinancieroSocioData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "LETTER",
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const buffers: Buffer[] = [];
        const stream = new Writable({
          write(chunk, encoding, callback) {
            buffers.push(chunk);
            callback();
          },
        });

        doc.pipe(stream);

        this.addSocioHeader(doc, data);
        this.addSocioInfo(doc, data);
        this.addDistribucionPeriodo(doc, data);
        this.addResumenInversion(doc, data);
        this.addSocioFooter(doc);

        doc.end();

        stream.on("finish", () => {
          const pdfBuffer = Buffer.concat(buffers);
          logger.info("Partner financial statement PDF generated", {
            socioId: data.socio.id,
            periodo: data.periodo,
            size: pdfBuffer.length,
          });
          resolve(pdfBuffer);
        });

        stream.on("error", (error) => {
          logger.error("Error generating partner financial statement PDF", { error });
          reject(error);
        });
      } catch (error) {
        logger.error("Error creating partner financial statement PDF document", { error });
        reject(error);
      }
    });
  }

  private addSocioHeader(doc: PDFKit.PDFDocument, data: EstadoFinancieroSocioData): void {
    this.addBrandedHeader(doc, "ESTADO FINANCIERO");
    
    const [year, month] = data.periodo.split("-");
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const periodoDisplay = `${monthNames[parseInt(month) - 1]} ${year}`;

    doc
      .fontSize(10)
      .fillColor(this.TEXT_SECONDARY)
      .font("Helvetica")
      .text(`Periodo: ${periodoDisplay}`, 50, 120);
    
    doc
      .fontSize(9)
      .text(`Generado: ${new Date().toLocaleDateString("es-DO")}`, 350, 120, { align: "right", width: 200 });
  }

  private addSocioInfo(doc: PDFKit.PDFDocument, data: EstadoFinancieroSocioData): void {
    const startY = 140;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Informacion del Socio", 50, startY);

    doc.fontSize(10).fillColor("#000000").font("Helvetica-Bold");
    doc.text("Nombre:", 50, startY + 30);
    doc.text("Email:", 50, startY + 50);
    doc.text("% Participacion:", 50, startY + 70);
    doc.text("Fecha Ingreso:", 50, startY + 90);

    doc.font("Helvetica").fillColor(this.SECONDARY_COLOR);
    doc.text(data.socio.user?.nombre || "N/A", 170, startY + 30);
    doc.text(data.socio.user?.email || "N/A", 170, startY + 50);
    doc.text(`${data.socio.porcentajeParticipacion}%`, 170, startY + 70);
    doc.text(
      new Date(data.socio.fechaInversion).toLocaleDateString("es-DO"),
      170,
      startY + 90
    );

    doc
      .moveTo(50, startY + 120)
      .lineTo(550, startY + 120)
      .strokeColor("#e2e8f0")
      .stroke();
  }

  private addDistribucionPeriodo(doc: PDFKit.PDFDocument, data: EstadoFinancieroSocioData): void {
    const startY = 280;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Distribucion del Periodo", 50, startY);

    if (!data.distribucion) {
      doc
        .fontSize(10)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text("No hay distribucion calculada para este periodo.", 50, startY + 30);
      return;
    }

    const rowHeight = 25;
    let currentY = startY + 35;

    doc
      .fillColor("#f8fafc")
      .rect(50, currentY - 5, 500, rowHeight)
      .fill();

    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Concepto", 60, currentY);
    doc.text("Monto", 450, currentY, { align: "right" });

    currentY += rowHeight;

    const rows = [
      { label: "Ingresos Totales Periodo", value: `RD$ ${parseFloat(data.distribucion.ingresosTotales).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` },
      { label: "Comision Empresa (30%)", value: `RD$ ${parseFloat(data.distribucion.comisionEmpresa).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` },
      { label: `Su Participacion (${data.distribucion.porcentajeAlMomento}%)`, value: `RD$ ${parseFloat(data.distribucion.montoSocio).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` },
    ];

    rows.forEach((row, index) => {
      const bgColor = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      doc.fillColor(bgColor).rect(50, currentY - 5, 500, rowHeight).fill();

      doc
        .fontSize(10)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(row.label, 60, currentY);
      doc
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(row.value, 450, currentY, { align: "right" });

      currentY += rowHeight;
    });

    const estadoColor = data.distribucion.estado === 'pagado' ? this.SUCCESS_COLOR : "#f59e0b";
    const estadoTexto = data.distribucion.estado === 'pagado' ? 'PAGADO' : 
                        data.distribucion.estado === 'aprobado' ? 'APROBADO - PENDIENTE PAGO' : 'CALCULADO';

    doc
      .fillColor(estadoColor)
      .rect(50, currentY - 5, 500, rowHeight + 5)
      .fill();

    doc
      .fontSize(12)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("ESTADO", 60, currentY + 2);
    doc.text(estadoTexto, 450, currentY + 2, { align: "right" });

    if (data.distribucion.estado === 'pagado' && data.distribucion.fechaPago) {
      currentY += rowHeight + 15;
      doc
        .fontSize(9)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(
          `Fecha de pago: ${new Date(data.distribucion.fechaPago).toLocaleDateString("es-DO")} | Metodo: ${data.distribucion.metodoPago || 'N/A'}`,
          60,
          currentY
        );
    }
  }

  private addResumenInversion(doc: PDFKit.PDFDocument, data: EstadoFinancieroSocioData): void {
    const startY = 480;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Resumen de Inversion", 50, startY);

    const kpiY = startY + 30;
    const kpiWidth = 155;
    const kpiHeight = 60;

    const roiColor = data.resumen.roi >= 0 ? this.SUCCESS_COLOR : "#ef4444";

    const kpis = [
      { label: "Inversion Total", value: `RD$ ${data.resumen.montoInversion.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` },
      { label: "Total Recibido", value: `RD$ ${data.resumen.totalRecibido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` },
      { label: "ROI", value: `${data.resumen.roi.toFixed(2)}%`, color: roiColor },
    ];

    kpis.forEach((kpi, index) => {
      const x = 50 + (index * (kpiWidth + 10));
      
      doc.fillColor("#f8fafc").roundedRect(x, kpiY, kpiWidth, kpiHeight, 5).fill();
      
      doc
        .fontSize(9)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(kpi.label, x + 10, kpiY + 10, { width: kpiWidth - 20 });
      
      doc
        .fontSize(14)
        .fillColor(kpi.color || "#000000")
        .font("Helvetica-Bold")
        .text(kpi.value, x + 10, kpiY + 32, { width: kpiWidth - 20 });
    });

    doc
      .fontSize(10)
      .fillColor(this.SECONDARY_COLOR)
      .font("Helvetica")
      .text(
        `Total Distribuciones: ${data.resumen.totalDistribuciones} | Pendiente de Pago: RD$ ${data.resumen.pendientePago.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`,
        50,
        kpiY + 75
      );
  }

  private addSocioFooter(doc: PDFKit.PDFDocument): void {
    this.addBrandedFooter(doc);
  }
}

export interface AnalyticsReportData {
  startDate: string;
  endDate: string;
  kpis: {
    avgResponseMinutes: number;
    avgServiceDurationMinutes: number;
    acceptanceRate: number;
    cancellationRate: number;
    avgRevenuePerService: number;
    totalServices: number;
    completedServices: number;
    cancelledServices: number;
  };
  vehicles: Array<{
    tipoVehiculo: string;
    count: number;
    revenue: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  driverRankings: Array<{
    driverId: string;
    driverName: string;
    completedServices: number;
    averageRating: number;
  }>;
}

export interface EstadoFinancieroSocioData {
  socio: {
    id: string;
    porcentajeParticipacion: string;
    montoInversion: string;
    fechaInversion: Date;
    user?: {
      nombre: string;
      email: string;
    } | null;
  };
  periodo: string;
  distribucion: {
    ingresosTotales: string;
    comisionEmpresa: string;
    porcentajeAlMomento: string;
    montoSocio: string;
    estado: string;
    fechaPago?: Date | null;
    metodoPago?: string | null;
  } | null;
  resumen: {
    porcentajeParticipacion: number;
    montoInversion: number;
    fechaInversion: Date;
    totalDistribuciones: number;
    totalRecibido: number;
    pendientePago: number;
    roi: number;
  };
}

export const pdfService = new PDFService();
