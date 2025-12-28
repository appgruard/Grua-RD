
import { pdfService } from "../server/services/pdf-service";
import fs from "fs";
import path from "path";

async function generateTestReceipt() {
  const receiptData = {
    receiptNumber: "GRD-TEST-12345",
    servicioId: "serv_test_987654321",
    fecha: new Date(),
    cliente: {
      nombre: "Juan",
      apellido: "Pérez",
      email: "juan.perez@example.com",
      cedula: "001-0000000-1",
    },
    conductor: {
      nombre: "Pedro",
      apellido: "Rodríguez",
      placaGrua: "L123456",
    },
    servicio: {
      origenDireccion: "Calle El Sol #10, Santiago, RD",
      destinoDireccion: "Av. 27 de Febrero #200, Santo Domingo, RD",
      distanciaKm: "155",
    },
    costos: {
      costoTotal: "5500.00",
      montoOperador: "4400.00",
      montoEmpresa: "1100.00",
      porcentajeOperador: "80",
      porcentajeEmpresa: "20",
    },
    metodoPago: "efectivo" as const,
  };

  try {
    console.log("Generando recibo de prueba...");
    const buffer = await pdfService.generateReceipt(receiptData);
    const filePath = path.join(process.cwd(), "recibo_prueba.pdf");
    fs.writeFileSync(filePath, buffer);
    console.log(`Recibo generado exitosamente en: ${filePath}`);
    process.exit(0);
  } catch (error) {
    console.error("Error generando el recibo:", error);
    process.exit(1);
  }
}

generateTestReceipt();
