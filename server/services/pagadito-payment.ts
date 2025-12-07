import { logger } from "../logger";

const PAGADITO_CODES: Record<string, string> = {
  "PG1001": "Conexión exitosa",
  "PG1002": "Transacción registrada exitosamente",
  "PG1003": "Estado de transacción obtenido",
  "PG2001": "Datos de conexión incompletos",
  "PG2002": "Formato de datos incorrecto",
  "PG3001": "No se pudo establecer conexión",
  "PG3002": "Error de autenticación",
  "PG3003": "Comercio inactivo",
  "PG3004": "Token de conexión inválido",
  "PG3005": "Origen de conexión inválido",
  "PG3006": "Sin detalles de transacción",
  "PG3007": "Monto de transacción inválido",
  "PG3008": "ERN ya utilizado",
  "PG4001": "Token de transacción no encontrado",
};

export type PagaditoStatus = 
  | "REGISTERED"
  | "COMPLETED"
  | "VERIFYING"
  | "REVOKED"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED";

export interface PagaditoPaymentItem {
  quantity: number;
  description: string;
  price: number;
}

export interface PagaditoPaymentRequest {
  ern: string;
  items: PagaditoPaymentItem[];
  currency?: string;
}

export interface PagaditoCreateResponse {
  success: boolean;
  redirectUrl: string;
  token: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PagaditoStatusResponse {
  success: boolean;
  status: PagaditoStatus;
  reference?: string;
  dateTransaction?: string;
  ern?: string;
  amount?: number;
  errorCode?: string;
  errorMessage?: string;
}

const PAGADITO_SOAP_URLS = {
  sandbox: "https://sandbox.pagadito.com/comercios/wspg/charges.php",
  production: "https://comercios.pagadito.com/wspg/charges.php",
};

const PAGADITO_REDIRECT_URLS = {
  sandbox: "https://sandbox.pagadito.com/pagadito/cargos/",
  production: "https://comercios.pagadito.com/pagadito/cargos/",
};

export class PagaditoPaymentService {
  private uid: string;
  private wsk: string;
  private soapUrl: string;
  private redirectBaseUrl: string;
  private isSandbox: boolean;

  constructor() {
    this.uid = process.env.PAGADITO_UID || "";
    this.wsk = process.env.PAGADITO_WSK || "";
    this.isSandbox = process.env.PAGADITO_SANDBOX !== "false";
    
    this.soapUrl = this.isSandbox ? PAGADITO_SOAP_URLS.sandbox : PAGADITO_SOAP_URLS.production;
    this.redirectBaseUrl = this.isSandbox ? PAGADITO_REDIRECT_URLS.sandbox : PAGADITO_REDIRECT_URLS.production;
  }

  isConfigured(): boolean {
    return !!(this.uid && this.wsk);
  }

  private getCodeMessage(code: string): string {
    return PAGADITO_CODES[code] || `Código desconocido: ${code}`;
  }

  private getReturnUrl(): string {
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
    return `${baseUrl}/api/pagadito/return`;
  }

  private buildSoapEnvelope(method: string, params: Record<string, string>): string {
    const namespace = this.isSandbox 
      ? "urn:https://sandbox.pagadito.com/comercios/wspg/charges"
      : "urn:https://comercios.pagadito.com/wspg/charges";
    
    let paramsXml = "";
    for (const [key, value] of Object.entries(params)) {
      const escapedValue = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
      paramsXml += `<${key} xsi:type="xsd:string">${escapedValue}</${key}>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope 
  xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:tns="${namespace}"
  xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
  SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <tns:${method}>${paramsXml}</tns:${method}>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
  }

  private async callSoap(method: string, params: Record<string, string>): Promise<any> {
    const soapEnvelope = this.buildSoapEnvelope(method, params);
    const namespace = this.isSandbox 
      ? "urn:https://sandbox.pagadito.com/comercios/wspg/charges"
      : "urn:https://comercios.pagadito.com/wspg/charges";
    
    logger.info(`Pagadito SOAP call: ${method}`, { 
      url: this.soapUrl,
      sandbox: this.isSandbox,
    });

    const response = await fetch(this.soapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": `${namespace}#${method}`,
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();
    
    const returnMatch = responseText.match(/<return[^>]*>([\s\S]*?)<\/return>/);
    if (!returnMatch) {
      logger.error("Pagadito SOAP response parse error", { 
        responseText: responseText.substring(0, 500),
      });
      throw new Error("No se pudo parsear la respuesta de Pagadito");
    }

    let returnValue = returnMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    
    try {
      return JSON.parse(returnValue);
    } catch {
      return returnValue;
    }
  }

  async connect(): Promise<{ success: boolean; token?: string; errorCode?: string; errorMessage?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: "CONFIG_ERROR",
        errorMessage: "Pagadito no está configurado. Configure PAGADITO_UID y PAGADITO_WSK.",
      };
    }

    try {
      const data = await this.callSoap("connect", {
        uid: this.uid,
        wsk: this.wsk,
        format_return: "json",
      });

      if (data.code === "PG1001") {
        logger.info("Pagadito connection successful", {
          sandbox: this.isSandbox,
        });
        return {
          success: true,
          token: data.value,
        };
      } else {
        logger.error("Pagadito connection failed", {
          code: data.code,
          message: data.message,
        });
        return {
          success: false,
          errorCode: data.code,
          errorMessage: data.message || this.getCodeMessage(data.code),
        };
      }
    } catch (error: any) {
      logger.error("Pagadito connection error", {
        error: error.message,
      });
      return {
        success: false,
        errorCode: "NETWORK_ERROR",
        errorMessage: `Error de conexión: ${error.message}`,
      };
    }
  }

  async createPayment(request: PagaditoPaymentRequest): Promise<PagaditoCreateResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        redirectUrl: "",
        token: "",
        errorCode: "CONFIG_ERROR",
        errorMessage: "Pagadito no está configurado.",
      };
    }

    const connectResult = await this.connect();
    if (!connectResult.success || !connectResult.token) {
      return {
        success: false,
        redirectUrl: "",
        token: "",
        errorCode: connectResult.errorCode,
        errorMessage: connectResult.errorMessage,
      };
    }

    try {
      const totalAmount = request.items.reduce(
        (sum, item) => sum + (item.quantity * item.price),
        0
      );

      const details = request.items.map((item) => ({
        quantity: item.quantity.toString(),
        description: item.description.substring(0, 250),
        price: item.price.toFixed(2),
        url_product: "",
      }));

      const customParams = JSON.stringify({
        param1: this.getReturnUrl(),
      });

      const data = await this.callSoap("exec_trans", {
        token: connectResult.token,
        ern: request.ern,
        amount: totalAmount.toFixed(2),
        details: JSON.stringify(details),
        format_return: "json",
        currency: request.currency || "USD",
        custom_params: customParams,
        allow_pending_payments: "false",
      });

      if (data.code === "PG1002") {
        const redirectUrl = data.value || `${this.redirectBaseUrl}${connectResult.token}`;
        
        logger.info("Pagadito payment created", {
          ern: request.ern,
          amount: totalAmount,
          token: connectResult.token,
          redirectUrl,
        });

        return {
          success: true,
          redirectUrl: redirectUrl,
          token: connectResult.token,
        };
      } else {
        logger.error("Pagadito payment creation failed", {
          ern: request.ern,
          code: data.code,
          message: data.message,
        });
        return {
          success: false,
          redirectUrl: "",
          token: "",
          errorCode: data.code,
          errorMessage: data.message || this.getCodeMessage(data.code),
        };
      }
    } catch (error: any) {
      logger.error("Pagadito payment creation error", {
        ern: request.ern,
        error: error.message,
      });
      return {
        success: false,
        redirectUrl: "",
        token: "",
        errorCode: "NETWORK_ERROR",
        errorMessage: `Error al crear pago: ${error.message}`,
      };
    }
  }

  async getPaymentStatus(tokenTrans: string): Promise<PagaditoStatusResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: "FAILED",
        errorCode: "CONFIG_ERROR",
        errorMessage: "Pagadito no está configurado.",
      };
    }

    const connectResult = await this.connect();
    if (!connectResult.success || !connectResult.token) {
      return {
        success: false,
        status: "FAILED",
        errorCode: connectResult.errorCode,
        errorMessage: connectResult.errorMessage,
      };
    }

    try {
      const data = await this.callSoap("get_status", {
        token: connectResult.token,
        token_trans: tokenTrans,
        format_return: "json",
      });

      if (data.code === "PG1003") {
        const status = (data.value?.status || data.status) as PagaditoStatus;
        
        logger.info("Pagadito status retrieved", {
          tokenTrans,
          status,
          reference: data.value?.reference || data.reference,
        });

        return {
          success: true,
          status: status,
          reference: data.value?.reference || data.reference,
          dateTransaction: data.value?.date_trans || data.date_trans,
          ern: data.value?.ern || data.ern,
          amount: data.value?.amount ? parseFloat(data.value.amount) : undefined,
        };
      } else {
        logger.error("Pagadito status retrieval failed", {
          tokenTrans,
          code: data.code,
          message: data.message,
        });
        return {
          success: false,
          status: "FAILED",
          errorCode: data.code,
          errorMessage: data.message || this.getCodeMessage(data.code),
        };
      }
    } catch (error: any) {
      logger.error("Pagadito status error", {
        tokenTrans,
        error: error.message,
      });
      return {
        success: false,
        status: "FAILED",
        errorCode: "NETWORK_ERROR",
        errorMessage: `Error al consultar estado: ${error.message}`,
      };
    }
  }

  isPaymentSuccessful(status: PagaditoStatus): boolean {
    return status === "COMPLETED";
  }

  isPaymentPending(status: PagaditoStatus): boolean {
    return status === "REGISTERED" || status === "VERIFYING";
  }

  isPaymentFailed(status: PagaditoStatus): boolean {
    return ["FAILED", "CANCELED", "EXPIRED", "REVOKED"].includes(status);
  }

  getStatusMessage(status: PagaditoStatus): string {
    const messages: Record<PagaditoStatus, string> = {
      REGISTERED: "Pago en proceso",
      COMPLETED: "Pago completado exitosamente",
      VERIFYING: "Pago en verificación (puede tomar hasta 72 horas)",
      REVOKED: "Pago rechazado después de verificación",
      FAILED: "Error al procesar el pago",
      CANCELED: "Pago cancelado por el usuario",
      EXPIRED: "Pago expirado (tiempo límite excedido)",
    };
    return messages[status] || "Estado desconocido";
  }

  calculateCommission(totalAmount: number): { operatorAmount: number; companyAmount: number } {
    const operatorPercentage = 0.80;
    const companyPercentage = 0.20;
    
    const operatorAmount = parseFloat((totalAmount * operatorPercentage).toFixed(2));
    const companyAmount = parseFloat((totalAmount * companyPercentage).toFixed(2));
    
    return { operatorAmount, companyAmount };
  }

  validatePayoutRequest(amount: number, balanceDisponible: number): { valid: boolean; error?: string } {
    const minPayout = 500;
    
    if (amount < minPayout) {
      return { valid: false, error: `El monto mínimo de retiro es RD$${minPayout}` };
    }

    if (amount > balanceDisponible) {
      return { valid: false, error: "El monto excede el balance disponible" };
    }

    return { valid: true };
  }

  getDRBanks(): Record<string, string> {
    return {
      "BPD": "Banco Popular Dominicano",
      "BHD": "Banco BHD León",
      "BANRESERVAS": "Banreservas",
      "SCOTIABANK": "Scotiabank",
      "PROMERICA": "Banco Promerica",
      "SANTA_CRUZ": "Banco Santa Cruz",
      "CARIBE": "Banco Caribe",
      "LAFISE": "Banco Lafise",
      "VIMENCA": "Banco Vimenca",
      "ADEMI": "Banco Ademi",
      "ADOPEM": "Banco Adopem",
      "BELLBANK": "Bellbank",
      "EMPIRE": "Empire Bank",
    };
  }
}

export const pagaditoPaymentService = new PagaditoPaymentService();
