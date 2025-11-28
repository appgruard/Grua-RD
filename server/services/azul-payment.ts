import { logger } from "../logger";
import crypto from "crypto";

interface AzulTransactionRequest {
  amount: number;
  servicioId: string;
  email: string;
  description: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
  token?: string;
  useToken?: boolean;
}

interface AzulTransactionResponse {
  transactionId: string;
  responseCode: string;
  responseMessage: string;
  amount: number;
  authCode?: string;
  token?: string;
  approved: boolean;
}

const AZUL_ERROR_CODES: Record<string, string> = {
  "00": "Transacción aprobada",
  "01": "Tarjeta bloqueada - Contacte su banco",
  "02": "Tarjeta reportada como robada",
  "03": "Comercio inválido",
  "04": "Retener tarjeta",
  "05": "Transacción denegada",
  "06": "Error de procesamiento",
  "07": "Retener tarjeta - Condiciones especiales",
  "12": "Transacción inválida",
  "13": "Monto inválido",
  "14": "Número de tarjeta inválido",
  "15": "Emisor no encontrado",
  "19": "Reintentar transacción",
  "30": "Error de formato",
  "33": "Tarjeta expirada",
  "41": "Tarjeta perdida",
  "43": "Tarjeta robada",
  "51": "Fondos insuficientes",
  "54": "Tarjeta expirada",
  "55": "PIN incorrecto",
  "57": "Transacción no permitida",
  "58": "Transacción no permitida en terminal",
  "61": "Excede límite de retiro",
  "62": "Tarjeta restringida",
  "63": "Violación de seguridad",
  "65": "Excede límite de transacciones",
  "75": "Intentos de PIN excedidos",
  "76": "Cuenta bloqueada",
  "78": "Cuenta desactivada",
  "82": "Timeout en transacción",
  "91": "Emisor no disponible",
  "94": "Transacción duplicada",
  "96": "Error del sistema",
};

const RETRYABLE_CODES = ["06", "19", "82", "91", "96"];

export class AzulPaymentService {
  private merchantId: string;
  private authKey: string;
  private apiUrl: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor() {
    this.merchantId = process.env.AZUL_MERCHANT_ID || "";
    this.authKey = process.env.AZUL_AUTH_KEY || "";
    this.apiUrl = process.env.AZUL_API_URL || "https://api.azul.com.do/webservices/API_Operation/processTransaction";
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
  }

  isConfigured(): boolean {
    return !!(this.merchantId && this.authKey);
  }

  private generateAuthHash(merchantId: string, transactionId: string, amount: string, authKey: string): string {
    const message = `${merchantId}${transactionId}${amount}${authKey}`;
    return crypto.createHash("sha256").update(message).digest("hex");
  }

  private getErrorMessage(responseCode: string): string {
    return AZUL_ERROR_CODES[responseCode] || `Error desconocido (código: ${responseCode})`;
  }

  private isRetryable(responseCode: string): boolean {
    return RETRYABLE_CODES.includes(responseCode);
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

  async processPayment(request: AzulTransactionRequest): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured. Configure AZUL_MERCHANT_ID and AZUL_AUTH_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const transactionId = `${request.servicioId}-${Date.now()}`;
        const amountStr = request.amount.toFixed(2);
        const authHash = this.generateAuthHash(this.merchantId, transactionId, amountStr, this.authKey);

        const payload = {
          MerchantId: this.merchantId,
          Channel: "WEB",
          Store: "1",
          TransactionType: "SALE",
          TransactionId: transactionId,
          Amount: amountStr,
          Currency: "DOP",
          OrderNumber: request.servicioId,
          AuthHash: authHash,
          Email: request.email,
          Description: request.description,
          ...(request.cardNumber && {
            CardNumber: request.cardNumber,
            CardExpiry: request.cardExpiry,
            Cvv: request.cardCVV,
          }),
          ...(request.token && request.useToken && {
            DataVaultToken: request.token,
          }),
        };

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const approved = data.ResponseCode === "00";

        logger.info("Azul SALE transaction processed", {
          transactionId,
          servicioId: request.servicioId,
          responseCode: data.ResponseCode,
          approved,
          amount: request.amount,
        });

        return {
          transactionId: data.TransactionId || transactionId,
          responseCode: data.ResponseCode,
          responseMessage: this.getErrorMessage(data.ResponseCode),
          amount: request.amount,
          authCode: data.AuthCode,
          token: data.DataVaultToken,
          approved,
        };
      },
      "Azul SALE",
      { servicioId: request.servicioId, amount: request.amount }
    );
  }

  async holdFunds(request: AzulTransactionRequest): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured. Configure AZUL_MERCHANT_ID and AZUL_AUTH_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const transactionId = `${request.servicioId}-HOLD-${Date.now()}`;
        const amountStr = request.amount.toFixed(2);
        const authHash = this.generateAuthHash(this.merchantId, transactionId, amountStr, this.authKey);

        const payload = {
          MerchantId: this.merchantId,
          Channel: "WEB",
          Store: "1",
          TransactionType: "HOLD",
          TransactionId: transactionId,
          Amount: amountStr,
          Currency: "DOP",
          OrderNumber: request.servicioId,
          AuthHash: authHash,
          Email: request.email,
          Description: request.description,
          ...(request.cardNumber && {
            CardNumber: request.cardNumber,
            CardExpiry: request.cardExpiry,
            Cvv: request.cardCVV,
          }),
        };

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const approved = data.ResponseCode === "00";

        logger.info("Azul HOLD transaction processed", {
          transactionId,
          servicioId: request.servicioId,
          responseCode: data.ResponseCode,
          approved,
        });

        return {
          transactionId: data.TransactionId || transactionId,
          responseCode: data.ResponseCode,
          responseMessage: this.getErrorMessage(data.ResponseCode),
          amount: request.amount,
          authCode: data.AuthCode,
          approved,
        };
      },
      "Azul HOLD",
      { servicioId: request.servicioId, amount: request.amount }
    );
  }

  async captureHold(holdTransactionId: string, amount: number): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured. Configure AZUL_MERCHANT_ID and AZUL_AUTH_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const transactionId = `${holdTransactionId}-POST-${Date.now()}`;
        const amountStr = amount.toFixed(2);
        const authHash = this.generateAuthHash(this.merchantId, holdTransactionId, amountStr, this.authKey);

        const payload = {
          MerchantId: this.merchantId,
          Channel: "WEB",
          Store: "1",
          TransactionType: "POST",
          OriginalTransactionId: holdTransactionId,
          Amount: amountStr,
          Currency: "DOP",
          AuthHash: authHash,
        };

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const approved = data.ResponseCode === "00";

        logger.info("Azul POST (capture) transaction processed", {
          transactionId,
          holdTransactionId,
          responseCode: data.ResponseCode,
          approved,
        });

        return {
          transactionId: data.TransactionId || transactionId,
          responseCode: data.ResponseCode,
          responseMessage: this.getErrorMessage(data.ResponseCode),
          amount,
          authCode: data.AuthCode,
          approved,
        };
      },
      "Azul POST",
      { holdTransactionId, amount }
    );
  }

  async voidTransaction(originalTransactionId: string): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured. Configure AZUL_MERCHANT_ID and AZUL_AUTH_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const transactionId = `${originalTransactionId}-VOID-${Date.now()}`;
        const authHash = this.generateAuthHash(this.merchantId, originalTransactionId, "0.00", this.authKey);

        const payload = {
          MerchantId: this.merchantId,
          Channel: "WEB",
          Store: "1",
          TransactionType: "VOID",
          OriginalTransactionId: originalTransactionId,
          AuthHash: authHash,
        };

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const approved = data.ResponseCode === "00";

        logger.info("Azul VOID transaction processed", {
          transactionId,
          originalTransactionId,
          responseCode: data.ResponseCode,
          approved,
        });

        return {
          transactionId: data.TransactionId || transactionId,
          responseCode: data.ResponseCode,
          responseMessage: this.getErrorMessage(data.ResponseCode),
          amount: 0,
          authCode: data.AuthCode,
          approved,
        };
      },
      "Azul VOID",
      { originalTransactionId }
    );
  }

  async createDataVaultToken(
    cardNumber: string,
    cardExpiry: string,
    cardCVV: string,
    conductorId: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured. Configure AZUL_MERCHANT_ID and AZUL_AUTH_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const transactionId = `DVT-${conductorId}-${Date.now()}`;
        const authHash = this.generateAuthHash(this.merchantId, transactionId, "0.00", this.authKey);

        const payload = {
          MerchantId: this.merchantId,
          Channel: "WEB",
          Store: "1",
          TransactionType: "CREATE_DATA_VAULT_TOKEN",
          TransactionId: transactionId,
          AuthHash: authHash,
          CardNumber: cardNumber,
          CardExpiry: cardExpiry,
          CVV: cardCVV,
        };

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.ResponseCode !== "00" || !data.DataVaultToken) {
          throw new Error(this.getErrorMessage(data.ResponseCode));
        }

        logger.info("Azul DataVault token created", {
          conductorId,
          tokenLength: data.DataVaultToken.length,
        });

        return data.DataVaultToken;
      },
      "Azul DataVault",
      { conductorId }
    );
  }

  async refundTransaction(originalTransactionId: string, amount: number): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured. Configure AZUL_MERCHANT_ID and AZUL_AUTH_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const transactionId = `${originalTransactionId}-REFUND-${Date.now()}`;
        const amountStr = amount.toFixed(2);
        const authHash = this.generateAuthHash(this.merchantId, originalTransactionId, amountStr, this.authKey);

        const payload = {
          MerchantId: this.merchantId,
          Channel: "WEB",
          Store: "1",
          TransactionType: "REFUND",
          OriginalTransactionId: originalTransactionId,
          Amount: amountStr,
          Currency: "DOP",
          AuthHash: authHash,
        };

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const approved = data.ResponseCode === "00";

        logger.info("Azul REFUND transaction processed", {
          transactionId,
          originalTransactionId,
          responseCode: data.ResponseCode,
          approved,
          amount,
        });

        return {
          transactionId: data.TransactionId || transactionId,
          responseCode: data.ResponseCode,
          responseMessage: this.getErrorMessage(data.ResponseCode),
          amount,
          authCode: data.AuthCode,
          approved,
        };
      },
      "Azul REFUND",
      { originalTransactionId, amount }
    );
  }

  async verifyTransaction(transactionId: string): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured. Configure AZUL_MERCHANT_ID and AZUL_AUTH_KEY.");
    }

    return this.executeWithRetry(
      async () => {
        const authHash = this.generateAuthHash(this.merchantId, transactionId, "0.00", this.authKey);

        const payload = {
          MerchantId: this.merchantId,
          Channel: "WEB",
          Store: "1",
          TransactionType: "VERIFY",
          OriginalTransactionId: transactionId,
          AuthHash: authHash,
        };

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        logger.info("Azul VERIFY transaction processed", {
          transactionId,
          responseCode: data.ResponseCode,
          found: data.ResponseCode === "00",
        });

        return {
          transactionId: data.TransactionId || transactionId,
          responseCode: data.ResponseCode,
          responseMessage: this.getErrorMessage(data.ResponseCode),
          amount: parseFloat(data.Amount || "0"),
          authCode: data.AuthCode,
          approved: data.ResponseCode === "00",
        };
      },
      "Azul VERIFY",
      { transactionId }
    );
  }
}

export const azulPaymentService = new AzulPaymentService();
