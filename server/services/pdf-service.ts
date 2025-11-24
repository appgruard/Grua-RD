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
  stripePaymentId?: string;
}

export class PDFService {
  private readonly BRAND_COLOR = "#2563eb";
  private readonly SECONDARY_COLOR = "#64748b";
  private readonly SUCCESS_COLOR = "#22c55e";

  async generateReceipt(data: ReceiptData): Promise<Buffer> {
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

        this.addHeader(doc, data);
        this.addReceiptInfo(doc, data);
        this.addClientInfo(doc, data);
        this.addDriverInfo(doc, data);
        this.addServiceDetails(doc, data);
        this.addCostBreakdown(doc, data);
        this.addFooter(doc, data);

        doc.end();

        stream.on("finish", () => {
          const pdfBuffer = Buffer.concat(buffers);
          logger.info("PDF receipt generated successfully", {
            receiptNumber: data.receiptNumber,
            size: pdfBuffer.length,
          });
          resolve(pdfBuffer);
        });

        stream.on("error", (error) => {
          logger.error("Error generating PDF receipt", { error });
          reject(error);
        });
      } catch (error) {
        logger.error("Error creating PDF document", { error });
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    doc
      .fontSize(28)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Grúa RD", 50, 50);

    doc
      .fontSize(10)
      .fillColor(this.SECONDARY_COLOR)
      .font("Helvetica")
      .text("Servicios de Grúa República Dominicana", 50, 85);

    doc
      .fontSize(20)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("RECIBO DE SERVICIO", 350, 50, { align: "right" });
  }

  private addReceiptInfo(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const startY = 130;

    doc.fontSize(10).fillColor("#000000").font("Helvetica-Bold");
    doc.text("No. Recibo:", 350, startY);
    doc.text("Fecha:", 350, startY + 20);
    doc.text("ID Servicio:", 350, startY + 40);

    doc.font("Helvetica").fillColor(this.SECONDARY_COLOR);
    doc.text(data.receiptNumber, 450, startY);
    doc.text(
      new Date(data.fecha).toLocaleDateString("es-DO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      450,
      startY + 20
    );
    doc.text(data.servicioId.substring(0, 18), 450, startY + 40);

    doc
      .moveTo(50, startY + 70)
      .lineTo(550, startY + 70)
      .strokeColor("#e2e8f0")
      .stroke();
  }

  private addClientInfo(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const startY = 220;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Información del Cliente", 50, startY);

    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Nombre:", 50, startY + 30);
    doc.text("Email:", 50, startY + 50);
    if (data.cliente.cedula) {
      doc.text("Cédula:", 50, startY + 70);
    }

    doc.font("Helvetica").fillColor(this.SECONDARY_COLOR);
    doc.text(
      `${data.cliente.nombre} ${data.cliente.apellido}`,
      150,
      startY + 30
    );
    doc.text(data.cliente.email, 150, startY + 50);
    if (data.cliente.cedula) {
      doc.text(data.cliente.cedula, 150, startY + 70);
    }
  }

  private addDriverInfo(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const startY = 220;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Información del Conductor", 320, startY);

    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Conductor:", 320, startY + 30);
    doc.text("Placa Grúa:", 320, startY + 50);

    doc.font("Helvetica").fillColor(this.SECONDARY_COLOR);
    doc.text(
      `${data.conductor.nombre} ${data.conductor.apellido}`,
      410,
      startY + 30
    );
    doc.text(data.conductor.placaGrua, 410, startY + 50);

    const lineY = data.cliente.cedula ? startY + 100 : startY + 80;
    doc
      .moveTo(50, lineY)
      .lineTo(550, lineY)
      .strokeColor("#e2e8f0")
      .stroke();
  }

  private addServiceDetails(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const startY = data.cliente.cedula ? 360 : 340;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Detalles del Servicio", 50, startY);

    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Origen:", 50, startY + 30);
    doc.text("Destino:", 50, startY + 50);
    doc.text("Distancia:", 50, startY + 70);

    doc.font("Helvetica").fillColor(this.SECONDARY_COLOR);
    doc.text(data.servicio.origenDireccion, 150, startY + 30, {
      width: 400,
    });
    doc.text(data.servicio.destinoDireccion, 150, startY + 50, {
      width: 400,
    });
    doc.text(`${data.servicio.distanciaKm} km`, 150, startY + 70);

    doc
      .moveTo(50, startY + 100)
      .lineTo(550, startY + 100)
      .strokeColor("#e2e8f0")
      .stroke();
  }

  private addCostBreakdown(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const startY = data.cliente.cedula ? 490 : 470;

    doc
      .fontSize(14)
      .fillColor(this.BRAND_COLOR)
      .font("Helvetica-Bold")
      .text("Desglose de Costos", 50, startY);

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
      { label: "Costo Total del Servicio", value: data.costos.costoTotal },
      {
        label: `Pago al Conductor (${data.costos.porcentajeOperador}%)`,
        value: data.costos.montoOperador,
      },
      {
        label: `Comisión Plataforma (${data.costos.porcentajeEmpresa}%)`,
        value: data.costos.montoEmpresa,
      },
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
        .text(`RD$ ${row.value}`, 450, currentY, { align: "right" });

      currentY += rowHeight;
    });

    doc
      .fillColor(this.SUCCESS_COLOR)
      .rect(50, currentY - 5, 500, rowHeight + 5)
      .fill();

    doc
      .fontSize(12)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("TOTAL PAGADO", 60, currentY + 2);
    doc.text(`RD$ ${data.costos.costoTotal}`, 450, currentY + 2, {
      align: "right",
    });

    currentY += rowHeight + 20;

    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Método de Pago:", 60, currentY);
    doc
      .font("Helvetica")
      .fillColor(this.SECONDARY_COLOR)
      .text(
        data.metodoPago === "efectivo" ? "Efectivo" : "Tarjeta de Crédito",
        180,
        currentY
      );

    if (data.metodoPago === "tarjeta" && data.stripePaymentId) {
      doc
        .fontSize(9)
        .fillColor(this.SECONDARY_COLOR)
        .font("Helvetica")
        .text(`ID Transacción: ${data.stripePaymentId}`, 60, currentY + 20);
    }
  }

  private addFooter(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 80;

    doc
      .moveTo(50, footerY - 20)
      .lineTo(550, footerY - 20)
      .strokeColor("#e2e8f0")
      .stroke();

    doc
      .fontSize(9)
      .fillColor(this.SECONDARY_COLOR)
      .font("Helvetica")
      .text("Gracias por usar GruaRD", 50, footerY, {
        align: "center",
        width: 500,
      });

    doc.text(
      "Para soporte técnico, contáctenos: soporte@gruard.com | Tel: (809) 555-1234",
      50,
      footerY + 15,
      { align: "center", width: 500 }
    );

    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(
        "Este documento es un comprobante digital válido del servicio prestado.",
        50,
        footerY + 35,
        { align: "center", width: 500 }
      );
  }

  generateReceiptNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `GRD-${timestamp}-${random}`;
  }
}

export const pdfService = new PDFService();
