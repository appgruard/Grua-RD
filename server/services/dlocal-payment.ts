import { logger } from "../logger";
import crypto from "crypto";

interface DLocalPaymentRequest {
  amount: number;
  servicioId: string;
  email: string;
  name: string;
  document: string;
  description: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
  cardToken?: string;
}

interface DLocalPaymentResponse {
  paymentId: string;
  status: string;
  statusCode: string;
  statusDetail: string;
  amount: number;
  currency: string;
  approved: boolean;
  cardId?: string;
}

interface DLocalPayoutRequest {
  externalId: string;
  amount: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryDocument: string;
  beneficiaryEmail: string;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountType: string;
}

interface DLocalPayoutResponse {
  payoutId: string;
  externalId: string;
  status: string;
  statusCode: string;
  amount: number;
  currency: string;
}

const DLOCAL_STATUS_CODES: Record<string, string> = {
  "100": "La transacción fue aprobada",
  "200": "La transacción fue rechazada",
  "300": "Pendiente",
  "400": "Error en la transacción",
  "401": "Tarjeta expirada",
  "402": "Fondos insuficientes",
  "403": "Tarjeta robada o perdida",
  "404": "Error de CVV",
  "405": "Error de autenticación 3DS",
  "406": "Límite excedido",
  "407": "Tarjeta restringida",
  "500": "Error interno del sistema",
};

const DR_BANKS: Record<string, string> = {
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

export class DLocalPaymentService {
  private xLogin: string;
  private xTransKey: string;
  private secretKey: string;
  private apiUrl: string;
  private payoutsUrl: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor() {
    this.xLogin = process.env.DLOCAL_X_LOGIN || "";
    this.xTransKey = process.env.DLOCAL_X_TRANS_KEY || "";
    this.secretKey = process.env.DLOCAL_SECRET_KEY || "";
    
    const isSandbox = process.env.DLOCAL_SANDBOX === "true";
    this.apiUrl = isSandbox 
      ? "https://sandbox.dlocal.com" 
      : "https://api.dlocal.com";
    this.payoutsUrl = isSandbox 
      ? "https://sandbox.dlocal.com/payouts" 
      : "https://api.dlocal.com/payouts";
    
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
  }

  isConfigured(): boolean {
    return !!(this.xLogin && this.xTransKey && this.secretKey);
  }

  private generateSignature(payload: string): string {
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");
  }

  private getHeaders(payload: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Login": this.xLogin,
      "X-Trans-Key": this.xTransKey,
      "Payload-Signature": this.generateSignature(payload),
    };
  }

  private getStatusMessage(statusCode: string): string {
    return DLOCAL_STATUS_CODES[statusCode] || `Estado desconocido (código: ${statusCode})`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Record<string, any>
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`${operationName} succeeded on retry`, {
            ...context,
            attempt,
          });
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        const isNetworkError = error.name === 'FetchError' || 
                              error.message.includes('network') || 
                              error.message.includes('timeout') ||
                              error.message.includes('ECONNREFUSED');
        
        if (attempt < this.maxRetries && isNetworkError) {
          logger.warn(`${operationName} attempt ${attempt} failed, retrying...`, {
            ...context,
            error: error.message,
            nextAttemptIn: this.retryDelayMs * attempt,
          });
          
          await this.delay(this.retryDelayMs * attempt);
        } else {
          break;
        }
      }
    }
    
    logger.error(`${operationName} failed after ${this.maxRetries} attempts`, {
      ...context,
      error: lastError?.message,
    });
    
    throw lastError;
  }

  async createPayment(request: DLocalPaymentRequest): Promise<DLocalPaymentResponse> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured. Configure DLOCAL_X_LOGIN, DLOCAL_X_TRANS_KEY, and DLOCAL_SECRET_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const orderId = `SRV-${request.servicioId}-${Date.now()}`;
        
        const payload: any = {
          amount: request.amount,
          currency: "DOP",
          country: "DO",
          payment_method_id: "CARD",
          payment_method_flow: "DIRECT",
          order_id: orderId,
          description: request.description,
          notification_url: `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5000'}/api/dlocal/webhook`,
          payer: {
            name: request.name,
            email: request.email,
            document: request.document,
            address: {
              country: "DO",
            },
          },
        };

        if (request.cardToken) {
          payload.card = {
            card_id: request.cardToken,
          };
        } else if (request.cardNumber && request.cardExpiry && request.cardCVV) {
          const [expMonth, expYear] = request.cardExpiry.split('/');
          payload.card = {
            holder_name: request.name,
            number: request.cardNumber.replace(/\s/g, ''),
            cvv: request.cardCVV,
            expiration_month: parseInt(expMonth),
            expiration_year: parseInt(expYear.length === 2 ? `20${expYear}` : expYear),
            capture: true,
          };
        }

        const payloadStr = JSON.stringify(payload);
        
        const response = await fetch(`${this.apiUrl}/payments`, {
          method: "POST",
          headers: this.getHeaders(payloadStr),
          body: payloadStr,
        });

        const data = await response.json();

        if (!response.ok) {
          logger.error("dLocal payment failed", {
            servicioId: request.servicioId,
            status: response.status,
            error: data,
          });
          throw new Error(data.message || `Payment failed: ${response.status}`);
        }

        const approved = data.status === "PAID" || data.status === "AUTHORIZED";

        logger.info("dLocal payment processed", {
          paymentId: data.id,
          servicioId: request.servicioId,
          status: data.status,
          approved,
          amount: request.amount,
        });

        return {
          paymentId: data.id,
          status: data.status,
          statusCode: data.status_code || "100",
          statusDetail: data.status_detail || this.getStatusMessage(data.status_code || "100"),
          amount: request.amount,
          currency: "DOP",
          approved,
          cardId: data.card?.card_id,
        };
      },
      "dLocal Payment",
      { servicioId: request.servicioId, amount: request.amount }
    );
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ refundId: string; status: string }> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured.");
    }

    return this.executeWithRetry(
      async () => {
        const payload: any = {
          payment_id: paymentId,
        };

        if (amount) {
          payload.amount = amount;
          payload.currency = "DOP";
        }

        const payloadStr = JSON.stringify(payload);
        
        const response = await fetch(`${this.apiUrl}/refunds`, {
          method: "POST",
          headers: this.getHeaders(payloadStr),
          body: payloadStr,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Refund failed: ${response.status}`);
        }

        logger.info("dLocal refund processed", {
          refundId: data.id,
          paymentId,
          status: data.status,
        });

        return {
          refundId: data.id,
          status: data.status,
        };
      },
      "dLocal Refund",
      { paymentId, amount }
    );
  }

  async getPaymentStatus(paymentId: string): Promise<DLocalPaymentResponse> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured.");
    }

    const response = await fetch(`${this.apiUrl}/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "X-Login": this.xLogin,
        "X-Trans-Key": this.xTransKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Failed to get payment status: ${response.status}`);
    }

    return {
      paymentId: data.id,
      status: data.status,
      statusCode: data.status_code || "100",
      statusDetail: data.status_detail || "",
      amount: data.amount,
      currency: data.currency,
      approved: data.status === "PAID" || data.status === "AUTHORIZED",
    };
  }

  async createPayout(request: DLocalPayoutRequest): Promise<DLocalPayoutResponse> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured. Configure DLOCAL_X_LOGIN, DLOCAL_X_TRANS_KEY, and DLOCAL_SECRET_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const payload = {
          external_id: request.externalId,
          amount: request.amount,
          currency: request.currency,
          country: "DO",
          notification_url: `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5000'}/api/dlocal/payout-webhook`,
          beneficiary: {
            name: request.beneficiaryName,
            document: request.beneficiaryDocument,
            email: request.beneficiaryEmail,
            bank_account: {
              bank_code: request.bankCode,
              account_number: request.bankAccountNumber,
              account_type: request.bankAccountType,
            },
          },
        };

        const payloadStr = JSON.stringify(payload);
        
        const response = await fetch(this.payoutsUrl, {
          method: "POST",
          headers: this.getHeaders(payloadStr),
          body: payloadStr,
        });

        const data = await response.json();

        if (!response.ok) {
          logger.error("dLocal payout failed", {
            externalId: request.externalId,
            status: response.status,
            error: data,
          });
          throw new Error(data.message || `Payout failed: ${response.status}`);
        }

        logger.info("dLocal payout created", {
          payoutId: data.id,
          externalId: request.externalId,
          status: data.status,
          amount: request.amount,
        });

        return {
          payoutId: data.id,
          externalId: request.externalId,
          status: data.status,
          statusCode: data.status_code || "",
          amount: request.amount,
          currency: request.currency,
        };
      },
      "dLocal Payout",
      { externalId: request.externalId, amount: request.amount }
    );
  }

  async getPayoutStatus(payoutId: string): Promise<DLocalPayoutResponse> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured.");
    }

    const response = await fetch(`${this.payoutsUrl}/${payoutId}`, {
      method: "GET",
      headers: {
        "X-Login": this.xLogin,
        "X-Trans-Key": this.xTransKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Failed to get payout status: ${response.status}`);
    }

    return {
      payoutId: data.id,
      externalId: data.external_id,
      status: data.status,
      statusCode: data.status_code || "",
      amount: data.amount,
      currency: data.currency,
    };
  }

  getDRBanks(): Record<string, string> {
    return DR_BANKS;
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

  calculateCommission(totalAmount: number): { operatorAmount: number; companyAmount: number } {
    const operatorPercentage = 0.80;
    const companyPercentage = 0.20;
    
    const operatorAmount = parseFloat((totalAmount * operatorPercentage).toFixed(2));
    const companyAmount = parseFloat((totalAmount * companyPercentage).toFixed(2));
    
    return { operatorAmount, companyAmount };
  }
}

export const dlocalPaymentService = new DLocalPaymentService();
