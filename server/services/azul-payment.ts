import { logger } from "../logger";
import { storage } from "../storage";
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

export class AzulPaymentService {
  private merchantId: string;
  private authKey: string;
  private apiUrl: string;
  private certPath?: string;
  private keyPath?: string;

  constructor() {
    this.merchantId = process.env.AZUL_MERCHANT_ID || "";
    this.authKey = process.env.AZUL_AUTH_KEY || "";
    this.apiUrl = process.env.AZUL_API_URL || "https://api.azul.com.do/webservices/API_Operation/processTransaction";
    this.certPath = process.env.AZUL_CERT_PATH;
    this.keyPath = process.env.AZUL_KEY_PATH;
  }

  isConfigured(): boolean {
    return !!(this.merchantId && this.authKey);
  }

  /**
   * Genera Hash para autenticación con Azul
   */
  private generateAuthHash(merchantId: string, transactionId: string, amount: string, authKey: string): string {
    const message = `${merchantId}${transactionId}${amount}${authKey}`;
    return crypto.createHash("sha256").update(message).digest("hex");
  }

  /**
   * Procesa un pago SALE (venta inmediata) con Azul
   */
  async processPayment(request: AzulTransactionRequest): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured");
    }

    try {
      const transactionId = `${request.servicioId}-${Date.now()}`;
      const amountStr = request.amount.toFixed(2);
      const authHash = this.generateAuthHash(this.merchantId, transactionId, amountStr, this.authKey);

      // Construir payload SALE
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
        // Datos de tarjeta si se proporciona
        ...(request.cardNumber && {
          CardNumber: request.cardNumber,
          CardExpiry: request.cardExpiry,
          Cvv: request.cardCVV,
        }),
        // O usar token si se proporciona
        ...(request.token && request.useToken && {
          DataVaultToken: request.token,
        }),
      };

      // Realizar llamada HTTP POST a Azul
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Parsear respuesta de Azul
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
        responseMessage: data.ResponseMessage || "Transaction processed",
        amount: request.amount,
        authCode: data.AuthCode,
        token: data.DataVaultToken,
        approved,
      };
    } catch (error: any) {
      logger.error("Azul SALE transaction failed", {
        error: error.message,
        servicioId: request.servicioId,
      });
      throw error;
    }
  }

  /**
   * Procesa un HOLD (reserva de fondos)
   */
  async holdFunds(request: AzulTransactionRequest): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured");
    }

    try {
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
        responseMessage: data.ResponseMessage || "Hold processed",
        amount: request.amount,
        authCode: data.AuthCode,
        approved,
      };
    } catch (error: any) {
      logger.error("Azul HOLD transaction failed", {
        error: error.message,
        servicioId: request.servicioId,
      });
      throw error;
    }
  }

  /**
   * Completa un HOLD (POST) - captura los fondos
   */
  async captureHold(holdTransactionId: string, amount: number): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured");
    }

    try {
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
        responseMessage: data.ResponseMessage || "Capture processed",
        amount,
        authCode: data.AuthCode,
        approved,
      };
    } catch (error: any) {
      logger.error("Azul POST transaction failed", {
        error: error.message,
        holdTransactionId,
      });
      throw error;
    }
  }

  /**
   * Anula una transacción (VOID)
   */
  async voidTransaction(originalTransactionId: string): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured");
    }

    try {
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
        responseMessage: data.ResponseMessage || "Void processed",
        amount: 0,
        authCode: data.AuthCode,
        approved,
      };
    } catch (error: any) {
      logger.error("Azul VOID transaction failed", {
        error: error.message,
        originalTransactionId,
      });
      throw error;
    }
  }

  /**
   * Crea un token DataVault para guardar tarjeta de conductor
   */
  async createDataVaultToken(
    cardNumber: string,
    cardExpiry: string,
    cardCVV: string,
    conductorId: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured");
    }

    try {
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

      const data = await response.json();

      if (data.ResponseCode !== "00" || !data.DataVaultToken) {
        throw new Error(`Failed to create DataVault token: ${data.ResponseMessage}`);
      }

      logger.info("Azul DataVault token created", {
        conductorId,
        tokenLength: data.DataVaultToken.length,
      });

      return data.DataVaultToken;
    } catch (error: any) {
      logger.error("Azul DataVault token creation failed", {
        error: error.message,
        conductorId,
      });
      throw error;
    }
  }

  /**
   * Procesa un reembolso (REFUND)
   */
  async refundTransaction(originalTransactionId: string, amount: number): Promise<AzulTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("Azul payment service not configured");
    }

    try {
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
        responseMessage: data.ResponseMessage || "Refund processed",
        amount,
        authCode: data.AuthCode,
        approved,
      };
    } catch (error: any) {
      logger.error("Azul REFUND transaction failed", {
        error: error.message,
        originalTransactionId,
        amount,
      });
      throw error;
    }
  }
}

export const azulPaymentService = new AzulPaymentService();
