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

interface DLocalAuthorizationRequest {
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

interface DLocalAuthorizationResponse {
  authorizationId: string;
  status: string;
  statusCode: string;
  statusDetail: string;
  amount: number;
  currency: string;
  authorized: boolean;
  cardId?: string;
}

interface DLocalCaptureResponse {
  paymentId: string;
  authorizationId: string;
  status: string;
  statusCode: string;
  statusDetail: string;
  amount: number;
  currency: string;
  captured: boolean;
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

// New interfaces for card tokenization and saved card charging (Phase 2)
interface SaveCardRequest {
  cardNumber: string;
  cardExpiry: string;
  cardCVV: string;
  cardholderName?: string;
  email: string;
  name: string;
  document: string;
}

interface SaveCardResponse {
  cardId: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

interface ChargeWithSavedCardRequest {
  cardId: string;
  amount: number;
  description: string;
  orderId: string;
  email: string;
  name: string;
  document: string;
}

interface ChargeWithSavedCardResponse {
  paymentId: string;
  status: string;
  amount: number;
  feeAmount: number;
  feeCurrency: string;
  netAmount: number;
}

interface DLocalFees {
  feeAmount: number;
  feeCurrency: string;
  netAmount: number;
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

  async createAuthorization(request: DLocalAuthorizationRequest): Promise<DLocalAuthorizationResponse> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured. Configure DLOCAL_X_LOGIN, DLOCAL_X_TRANS_KEY, and DLOCAL_SECRET_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const orderId = `AUTH-${request.servicioId}-${Date.now()}`;
        
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
            capture: false,
          };
        } else if (request.cardNumber && request.cardExpiry && request.cardCVV) {
          const [expMonth, expYear] = request.cardExpiry.split('/');
          payload.card = {
            holder_name: request.name,
            number: request.cardNumber.replace(/\s/g, ''),
            cvv: request.cardCVV,
            expiration_month: parseInt(expMonth),
            expiration_year: parseInt(expYear.length === 2 ? `20${expYear}` : expYear),
            capture: false,
          };
        }

        const payloadStr = JSON.stringify(payload);
        
        const response = await fetch(`${this.apiUrl}/secure_payments`, {
          method: "POST",
          headers: this.getHeaders(payloadStr),
          body: payloadStr,
        });

        const data = await response.json();

        if (!response.ok) {
          logger.error("dLocal authorization failed", {
            servicioId: request.servicioId,
            status: response.status,
            error: data,
          });
          throw new Error(data.message || `Authorization failed: ${response.status}`);
        }

        const authorized = data.status === "AUTHORIZED";

        logger.info("dLocal authorization created", {
          authorizationId: data.id,
          servicioId: request.servicioId,
          status: data.status,
          authorized,
          amount: request.amount,
        });

        return {
          authorizationId: data.id,
          status: data.status,
          statusCode: data.status_code || "100",
          statusDetail: data.status_detail || this.getStatusMessage(data.status_code || "100"),
          amount: request.amount,
          currency: "DOP",
          authorized,
          cardId: data.card?.card_id,
        };
      },
      "dLocal Authorization",
      { servicioId: request.servicioId, amount: request.amount }
    );
  }

  async captureAuthorization(authorizationId: string, amount: number, orderId: string): Promise<DLocalCaptureResponse> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured.");
    }

    return this.executeWithRetry(
      async () => {
        const payload = {
          authorization_id: authorizationId,
          amount: amount,
          currency: "DOP",
          order_id: `${orderId}-CAP-${Date.now()}`,
        };

        const payloadStr = JSON.stringify(payload);
        
        const response = await fetch(`${this.apiUrl}/payments`, {
          method: "POST",
          headers: this.getHeaders(payloadStr),
          body: payloadStr,
        });

        const data = await response.json();

        if (!response.ok) {
          logger.error("dLocal capture failed", {
            authorizationId,
            status: response.status,
            error: data,
          });
          throw new Error(data.message || `Capture failed: ${response.status}`);
        }

        const captured = data.status === "PAID";

        logger.info("dLocal payment captured", {
          paymentId: data.id,
          authorizationId,
          status: data.status,
          captured,
          amount,
        });

        return {
          paymentId: data.id,
          authorizationId: authorizationId,
          status: data.status,
          statusCode: data.status_code || "100",
          statusDetail: data.status_detail || this.getStatusMessage(data.status_code || "100"),
          amount: amount,
          currency: "DOP",
          captured,
        };
      },
      "dLocal Capture",
      { authorizationId, amount }
    );
  }

  async cancelAuthorization(authorizationId: string): Promise<{ cancelled: boolean; status: string }> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured.");
    }

    return this.executeWithRetry(
      async () => {
        const response = await fetch(`${this.apiUrl}/payments/${authorizationId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Login": this.xLogin,
            "X-Trans-Key": this.xTransKey,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          logger.error("dLocal cancel authorization failed", {
            authorizationId,
            status: response.status,
            error: data,
          });
          throw new Error(data.message || `Cancel authorization failed: ${response.status}`);
        }

        const cancelled = data.status === "CANCELLED" || data.status === "VOIDED";

        logger.info("dLocal authorization cancelled", {
          authorizationId,
          status: data.status,
          cancelled,
        });

        return {
          cancelled,
          status: data.status,
        };
      },
      "dLocal Cancel Authorization",
      { authorizationId }
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

  /**
   * PHASE 2: Real card tokenization with validation charge
   * 
   * This method tokenizes a card by:
   * 1. Making a small validation charge of 10 DOP (minimum allowed) with save: true
   * 2. If payment succeeds, extracting the card_id from the response
   * 3. Automatically refunding the 10 DOP charge
   * 4. Returning the real dLocal token
   */
  async saveCardWithValidation(request: SaveCardRequest): Promise<SaveCardResponse> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured. Configure DLOCAL_X_LOGIN, DLOCAL_X_TRANS_KEY, and DLOCAL_SECRET_KEY.");
    }

    const VALIDATION_AMOUNT = 10; // Minimum amount in DOP for validation
    
    return this.executeWithRetry(
      async () => {
        const orderId = `VALIDATE-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // Parse card expiry
        const [expMonth, expYear] = request.cardExpiry.split('/');
        const fullYear = parseInt(expYear.length === 2 ? `20${expYear}` : expYear);
        
        // Step 1: Create payment with save: true to get real card token
        const payload = {
          amount: VALIDATION_AMOUNT,
          currency: "DOP",
          country: "DO",
          payment_method_id: "CARD",
          payment_method_flow: "DIRECT",
          order_id: orderId,
          description: "Validación de tarjeta - Grúa RD",
          notification_url: `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5000'}/api/dlocal/webhook`,
          payer: {
            name: request.name,
            email: request.email,
            document: request.document,
            address: {
              country: "DO",
            },
          },
          card: {
            holder_name: request.cardholderName || request.name,
            number: request.cardNumber.replace(/\s/g, ''),
            cvv: request.cardCVV,
            expiration_month: parseInt(expMonth),
            expiration_year: fullYear,
            capture: true,
            save: true, // This tells dLocal to save the card and return a card_id
          },
        };

        const payloadStr = JSON.stringify(payload);
        
        logger.info("Initiating card validation payment", {
          orderId,
          amount: VALIDATION_AMOUNT,
          email: request.email,
        });
        
        const response = await fetch(`${this.apiUrl}/payments`, {
          method: "POST",
          headers: this.getHeaders(payloadStr),
          body: payloadStr,
        });

        const data = await response.json();

        // Check for HTTP errors first
        if (!response.ok) {
          logger.error("Card validation payment HTTP error", {
            orderId,
            status: response.status,
            error: data,
          });
          throw new Error(data.message || `Error de validación de tarjeta: ${this.getStatusMessage(data.status_code || "400")}`);
        }

        // Validate payment status - must be PAID or AUTHORIZED for a successful validation
        const validStatuses = ["PAID", "AUTHORIZED"];
        if (!validStatuses.includes(data.status)) {
          logger.error("Card validation payment not approved", {
            orderId,
            status: data.status,
            statusCode: data.status_code,
            statusDetail: data.status_detail,
          });
          
          // Provide user-friendly error messages based on status
          const errorMessages: Record<string, string> = {
            "PENDING": "La validación está pendiente. Intente con otra tarjeta.",
            "IN_PROCESS": "La validación está en proceso. Intente nuevamente en unos minutos.",
            "REJECTED": "La tarjeta fue rechazada. Verifique los datos e intente nuevamente.",
            "CANCELLED": "La validación fue cancelada. Intente nuevamente.",
            "EXPIRED": "La transacción expiró. Intente nuevamente.",
          };
          
          const errorMsg = errorMessages[data.status] || 
            `Validación de tarjeta fallida: ${this.getStatusMessage(data.status_code || "200")}`;
          throw new Error(errorMsg);
        }

        // Validate payment ID exists before proceeding to refund
        const paymentId = data.id;
        if (!paymentId) {
          logger.error("No payment ID in validation response", { data });
          throw new Error("Error interno: No se recibió ID de transacción de dLocal.");
        }

        // CRITICAL: Check if we got the card_id - this is the whole point of the validation
        const cardId = data.card?.card_id;
        if (!cardId || typeof cardId !== 'string' || cardId.trim() === '') {
          logger.error("No valid card_id in validation response", { 
            data,
            cardField: data.card,
          });
          throw new Error("dLocal no devolvió un token de tarjeta válido. La tarjeta no pudo ser guardada.");
        }

        logger.info("Card validation payment successful, proceeding to refund", {
          paymentId,
          cardId,
          orderId,
        });

        // Step 2: Refund the validation charge
        try {
          const refundPayload = {
            payment_id: paymentId,
            amount: VALIDATION_AMOUNT,
            currency: "DOP",
          };

          const refundPayloadStr = JSON.stringify(refundPayload);
          
          const refundResponse = await fetch(`${this.apiUrl}/refunds`, {
            method: "POST",
            headers: this.getHeaders(refundPayloadStr),
            body: refundPayloadStr,
          });

          const refundData = await refundResponse.json();

          if (!refundResponse.ok) {
            logger.warn("Validation refund failed, but card was saved", {
              paymentId,
              cardId,
              refundError: refundData,
            });
            // Don't throw - the card was still saved successfully
          } else {
            logger.info("Validation charge refunded successfully", {
              refundId: refundData.id,
              paymentId,
            });
          }
        } catch (refundError: any) {
          logger.warn("Error refunding validation charge", {
            paymentId,
            error: refundError.message,
          });
          // Don't throw - the card was still saved successfully
        }

        // Extract card information from response
        const cardInfo = data.card || {};
        const last4 = cardInfo.last4 || request.cardNumber.slice(-4);
        const brand = cardInfo.brand || this.detectCardBrand(request.cardNumber);

        logger.info("Card saved successfully with real dLocal token", {
          cardId,
          brand,
          last4,
        });

        return {
          cardId,
          brand,
          last4,
          expiryMonth: parseInt(expMonth),
          expiryYear: fullYear,
        };
      },
      "dLocal Card Validation",
      { email: request.email }
    );
  }

  /**
   * PHASE 2: Charge a saved card using the real dLocal card_id
   * 
   * This method charges a previously saved card and extracts fee information.
   * Fee data is extracted from dLocal's response - if not present, fees are set to 0
   * with a warning logged for manual review.
   */
  async chargeWithSavedCard(request: ChargeWithSavedCardRequest): Promise<ChargeWithSavedCardResponse> {
    if (!this.isConfigured()) {
      throw new Error("dLocal payment service not configured. Configure DLOCAL_X_LOGIN, DLOCAL_X_TRANS_KEY, and DLOCAL_SECRET_KEY.");
    }

    // Validate request parameters
    if (!request.cardId || typeof request.cardId !== 'string' || request.cardId.trim() === '') {
      throw new Error("Se requiere un token de tarjeta válido para procesar el pago.");
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error("El monto debe ser mayor a 0.");
    }

    return this.executeWithRetry(
      async () => {
        const payload = {
          amount: request.amount,
          currency: "DOP",
          country: "DO",
          payment_method_id: "CARD",
          payment_method_flow: "DIRECT",
          order_id: request.orderId,
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
          card: {
            card_id: request.cardId,
            capture: true,
          },
        };

        const payloadStr = JSON.stringify(payload);
        
        logger.info("Charging saved card", {
          orderId: request.orderId,
          amount: request.amount,
          cardId: request.cardId.substring(0, 8) + "...",
        });
        
        const response = await fetch(`${this.apiUrl}/payments`, {
          method: "POST",
          headers: this.getHeaders(payloadStr),
          body: payloadStr,
        });

        const data = await response.json();

        if (!response.ok) {
          logger.error("Saved card charge failed", {
            orderId: request.orderId,
            status: response.status,
            error: data,
          });
          throw new Error(data.message || `Pago fallido: ${this.getStatusMessage(data.status_code || "400")}`);
        }

        // Validate payment ID exists
        if (!data.id) {
          logger.error("No payment ID in charge response", { data });
          throw new Error("Error interno: No se recibió ID de transacción de dLocal.");
        }

        // Validate payment status
        const validStatuses = ["PAID", "AUTHORIZED"];
        if (!validStatuses.includes(data.status)) {
          logger.error("Saved card charge not approved", {
            orderId: request.orderId,
            status: data.status,
            statusCode: data.status_code,
          });
          throw new Error(`Pago rechazado: ${this.getStatusMessage(data.status_code || "200")}`);
        }

        // Get the actual amount from response (should match request, but use API response as source of truth)
        const chargedAmount = data.amount !== undefined ? parseFloat(data.amount) : request.amount;

        // Extract fee information from dLocal response (no estimation)
        const fees = this.extractDLocalFees(data, chargedAmount);

        logger.info("Saved card charged successfully", {
          paymentId: data.id,
          orderId: request.orderId,
          amount: chargedAmount,
          feeAmount: fees.feeAmount,
          feeSource: fees.feeAmount > 0 ? "dlocal_response" : "not_provided",
          netAmount: fees.netAmount,
        });

        return {
          paymentId: data.id,
          status: data.status,
          amount: chargedAmount,
          feeAmount: fees.feeAmount,
          feeCurrency: fees.feeCurrency,
          netAmount: fees.netAmount,
        };
      },
      "dLocal Saved Card Charge",
      { orderId: request.orderId, amount: request.amount }
    );
  }

  /**
   * PHASE 2: Extract dLocal fee information from payment response
   * 
   * dLocal includes fee information in their payment response.
   * This function extracts and calculates:
   * - feeAmount: The amount dLocal charged as processing fee
   * - feeCurrency: The currency of the fee (typically same as payment)
   * - netAmount: The amount after deducting the fee
   * 
   * IMPORTANT: This function does NOT estimate fees. If dLocal does not provide
   * fee data in the response, feeAmount will be 0 and a warning will be logged.
   * This ensures accurate financial reporting rather than fabricated numbers.
   */
  extractDLocalFees(paymentResponse: any, originalAmount: number): DLocalFees {
    let feeAmount = 0;
    let feeCurrency = "DOP";
    let feeFound = false;
    
    // Check for explicit fee fields in dLocal response
    // dLocal may return fee information in different formats
    if (paymentResponse.fee_amount !== undefined && paymentResponse.fee_amount !== null) {
      const parsed = parseFloat(paymentResponse.fee_amount);
      if (!isNaN(parsed) && parsed >= 0) {
        feeAmount = parsed;
        feeFound = true;
      }
    } else if (paymentResponse.fee !== undefined && paymentResponse.fee !== null) {
      const parsed = parseFloat(paymentResponse.fee);
      if (!isNaN(parsed) && parsed >= 0) {
        feeAmount = parsed;
        feeFound = true;
      }
    } else if (paymentResponse.processor_fee !== undefined && paymentResponse.processor_fee !== null) {
      const parsed = parseFloat(paymentResponse.processor_fee);
      if (!isNaN(parsed) && parsed >= 0) {
        feeAmount = parsed;
        feeFound = true;
      }
    }

    // Log warning if fee data was not provided by dLocal
    if (!feeFound) {
      logger.warn("dLocal response did not include fee information - fee set to 0", {
        paymentId: paymentResponse.id,
        originalAmount,
        responseKeys: Object.keys(paymentResponse || {}),
      });
    }

    // Get fee currency if available
    if (paymentResponse.fee_currency) {
      feeCurrency = paymentResponse.fee_currency;
    }

    // Calculate net amount (originalAmount - feeAmount)
    const netAmount = parseFloat((originalAmount - feeAmount).toFixed(2));

    return {
      feeAmount: parseFloat(feeAmount.toFixed(2)),
      feeCurrency,
      netAmount,
    };
  }

  /**
   * Detect card brand from card number
   */
  private detectCardBrand(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) {
      return "VISA";
    } else if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
      return "MASTERCARD";
    } else if (/^3[47]/.test(cleanNumber)) {
      return "AMEX";
    } else if (/^6(?:011|5)/.test(cleanNumber)) {
      return "DISCOVER";
    } else if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) {
      return "DINERS";
    }
    
    return "UNKNOWN";
  }
}

export const dlocalPaymentService = new DLocalPaymentService();
