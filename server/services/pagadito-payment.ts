import { logger } from "../logger";

// Pagadito API Response Codes
const PAGADITO_CODES: Record<string, string> = {
  "PG1001": "Conexión exitosa",
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

// Pagadito Transaction Status
export type PagaditoStatus = 
  | "REGISTERED"   // Transacción registrada, pago en proceso
  | "COMPLETED"    // Pago exitoso
  | "VERIFYING"    // En revisión (hasta 72 horas)
  | "REVOKED"      // Pago denegado después de verificación
  | "FAILED"       // Error en procesamiento
  | "CANCELED"     // Cancelado por usuario
  | "EXPIRED";     // Expirado (10 minutos sin pago)

export interface PagaditoPaymentItem {
  quantity: number;
  description: string;
  price: number;
}

export interface PagaditoPaymentRequest {
  ern: string;              // External Reference Number (ID único del servicio)
  items: PagaditoPaymentItem[];
  currency?: string;        // Default: USD
}

export interface PagaditoCreateResponse {
  success: boolean;
  redirectUrl: string;      // URL para redirigir al usuario a Pagadito
  token: string;            // Token de la transacción
  errorCode?: string;
  errorMessage?: string;
}

export interface PagaditoStatusResponse {
  success: boolean;
  status: PagaditoStatus;
  reference?: string;       // Número de aprobación de Pagadito
  dateTransaction?: string; // Fecha de la transacción
  ern?: string;             // ERN original
  amount?: number;          // Monto total
  errorCode?: string;
  errorMessage?: string;
}

// Pagadito API URLs
const PAGADITO_URLS = {
  sandbox: "https://sandbox.pagadito.com/comercios/apipg/charges.php",
  production: "https://comercios.pagadito.com/apipg/charges.php",
};

const PAGADITO_REDIRECT_URLS = {
  sandbox: "https://sandbox.pagadito.com/pagadito/cargos/",
  production: "https://comercios.pagadito.com/pagadito/cargos/",
};

export class PagaditoPaymentService {
  private uid: string;
  private wsk: string;
  private apiUrl: string;
  private redirectBaseUrl: string;
  private isSandbox: boolean;
  private connectionToken: string | null = null;

  constructor() {
    this.uid = process.env.PAGADITO_UID || "";
    this.wsk = process.env.PAGADITO_WSK || "";
    this.isSandbox = process.env.PAGADITO_SANDBOX !== "false";
    
    this.apiUrl = this.isSandbox ? PAGADITO_URLS.sandbox : PAGADITO_URLS.production;
    this.redirectBaseUrl = this.isSandbox ? PAGADITO_REDIRECT_URLS.sandbox : PAGADITO_REDIRECT_URLS.production;
  }

  isConfigured(): boolean {
    return !!(this.uid && this.wsk);
  }

  private getCodeMessage(code: string): string {
    return PAGADITO_CODES[code] || `Código desconocido: ${code}`;
  }

  private getReturnUrl(): string {
    const baseUrl = process.env.ALLOWED_ORIGINS?.split(',')[0] || process.env.APP_URL || 'http://localhost:5000';
    return `${baseUrl}/api/pagadito/return`;
  }

  /**
   * Connect to Pagadito API and get connection token
   * This must be called before any other API operation
   */
  async connect(): Promise<{ success: boolean; token?: string; errorCode?: string; errorMessage?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: "CONFIG_ERROR",
        errorMessage: "Pagadito no está configurado. Configure PAGADITO_UID y PAGADITO_WSK.",
      };
    }

    try {
      const formData = new URLSearchParams();
      formData.append("operation", "f3f191ce3326905ff4ea20b6efe7d732"); // connect operation hash
      formData.append("uid", this.uid);
      formData.append("wsk", this.wsk);
      formData.append("format_return", "json");

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (data.code === "PG1001") {
        this.connectionToken = data.value;
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

  /**
   * Create a payment transaction and get redirect URL
   * User will be redirected to Pagadito to complete payment
   */
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

    // First, connect to get a fresh token
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
      // Calculate total amount
      const totalAmount = request.items.reduce(
        (sum, item) => sum + (item.quantity * item.price),
        0
      );

      // Build transaction details
      const details = request.items.map((item, index) => ({
        quantity: item.quantity,
        description: item.description.substring(0, 250), // Max 250 chars
        price: item.price.toFixed(2),
      }));

      const formData = new URLSearchParams();
      formData.append("operation", "41216f8caf94aaa598db137e36f81cd8"); // exec_trans operation hash
      formData.append("token", connectResult.token);
      formData.append("ern", request.ern);
      formData.append("currency", request.currency || "USD");
      formData.append("format_return", "json");
      formData.append("custom_params", JSON.stringify({
        return_url: this.getReturnUrl(),
      }));

      // Add transaction details
      details.forEach((detail, index) => {
        formData.append(`details[${index}][quantity]`, detail.quantity.toString());
        formData.append(`details[${index}][description]`, detail.description);
        formData.append(`details[${index}][price]`, detail.price);
      });

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (data.code === "PG1002") { // Transaction created successfully
        const redirectUrl = data.value || `${this.redirectBaseUrl}${connectResult.token}`;
        
        logger.info("Pagadito payment created", {
          ern: request.ern,
          amount: totalAmount,
          token: connectResult.token,
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

  /**
   * Check the status of a payment transaction
   * Called after user returns from Pagadito
   */
  async getPaymentStatus(token: string): Promise<PagaditoStatusResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: "FAILED",
        errorCode: "CONFIG_ERROR",
        errorMessage: "Pagadito no está configurado.",
      };
    }

    // Connect first to establish session
    const connectResult = await this.connect();
    if (!connectResult.success) {
      return {
        success: false,
        status: "FAILED",
        errorCode: connectResult.errorCode,
        errorMessage: connectResult.errorMessage,
      };
    }

    try {
      const formData = new URLSearchParams();
      formData.append("operation", "ebb4943d95e83a9a2a7e59f25cf09c40"); // get_status operation hash
      formData.append("token", token);
      formData.append("format_return", "json");

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (data.code === "PG1003") { // Status retrieved successfully
        const status = data.status as PagaditoStatus;
        
        logger.info("Pagadito status retrieved", {
          token,
          status,
          reference: data.reference,
        });

        return {
          success: true,
          status: status,
          reference: data.reference,
          dateTransaction: data.date_trans,
          ern: data.ern,
          amount: data.amount ? parseFloat(data.amount) : undefined,
        };
      } else {
        logger.error("Pagadito status retrieval failed", {
          token,
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
        token,
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

  /**
   * Check if a payment was successful
   */
  isPaymentSuccessful(status: PagaditoStatus): boolean {
    return status === "COMPLETED";
  }

  /**
   * Check if a payment is still pending/in progress
   */
  isPaymentPending(status: PagaditoStatus): boolean {
    return status === "REGISTERED" || status === "VERIFYING";
  }

  /**
   * Check if a payment failed or was cancelled
   */
  isPaymentFailed(status: PagaditoStatus): boolean {
    return ["FAILED", "CANCELED", "EXPIRED", "REVOKED"].includes(status);
  }

  /**
   * Get user-friendly status message in Spanish
   */
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

  /**
   * Calculate commission split (80% operator, 20% company)
   */
  calculateCommission(totalAmount: number): { operatorAmount: number; companyAmount: number } {
    const operatorPercentage = 0.80;
    const companyPercentage = 0.20;
    
    const operatorAmount = parseFloat((totalAmount * operatorPercentage).toFixed(2));
    const companyAmount = parseFloat((totalAmount * companyPercentage).toFixed(2));
    
    return { operatorAmount, companyAmount };
  }

  /**
   * Validate payout request (for manual payouts)
   */
  validatePayoutRequest(amount: number, balanceDisponible: number): { valid: boolean; error?: string } {
    const minPayout = 500; // RD$500 minimum
    
    if (amount < minPayout) {
      return { valid: false, error: `El monto mínimo de retiro es RD$${minPayout}` };
    }

    if (amount > balanceDisponible) {
      return { valid: false, error: "El monto excede el balance disponible" };
    }

    return { valid: true };
  }

  /**
   * Get list of Dominican Republic banks for manual payouts
   */
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

// Singleton instance
export const pagaditoPaymentService = new PagaditoPaymentService();
