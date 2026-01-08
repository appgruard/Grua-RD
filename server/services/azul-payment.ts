/**
 * Azul Payment Service - Dominican Republic Payment Gateway
 * 
 * Handles:
 * - DataVault tokenization (create, use, delete tokens)
 * - Payment processing (Sale, Hold, Post, Void, Refund)
 * - 3D Secure 2.0 support
 * - Payment verification
 */

import { logSystem } from '../logger';
import crypto from 'crypto';

// Azul API Configuration
const AZUL_SANDBOX_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';
const AZUL_PRODUCTION_URL = 'https://pagos.azul.com.do/webservices/JSON/Default.aspx';

// Environment configuration
const getAzulConfig = () => ({
  merchantId: process.env.AZUL_MERCHANT_ID || '',
  authKey: process.env.AZUL_AUTH_KEY || '',
  environment: (process.env.AZUL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  channel: process.env.AZUL_CHANNEL || 'EC',
  posInputMode: process.env.AZUL_POS_INPUT_MODE || 'E-Commerce',
});

const getApiUrl = () => {
  const config = getAzulConfig();
  return config.environment === 'production' ? AZUL_PRODUCTION_URL : AZUL_SANDBOX_URL;
};

// Types
export interface AzulCardData {
  cardNumber: string;
  expiration: string; // Format: YYYYMM
  cvc: string;
  cardHolderName?: string;
}

export interface AzulTokenData {
  dataVaultToken: string;
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface AzulPaymentRequest {
  amount: number; // In centavos (RD$100.00 = 10000)
  itbis?: number; // Tax in centavos
  customOrderId: string;
  customerServicePhone?: string;
  orderDescription?: string;
  saveToDataVault?: boolean;
}

export interface AzulResponse {
  success: boolean;
  isoCode: string;
  responseMessage: string;
  authorizationCode?: string;
  azulOrderId?: string;
  customOrderId?: string;
  dateTime?: string;
  rrn?: string;
  dataVaultToken?: string;
  errorDescription?: string;
  rawResponse?: any;
}

export interface Azul3DSResponse extends AzulResponse {
  threeDSMethodURL?: string;
  threeDSServerTransID?: string;
  acsUrl?: string;
  creq?: string;
  requires3DS?: boolean;
}

// ISO Response Codes
const ISO_CODES: Record<string, string> = {
  '00': 'Aprobada',
  '01': 'Referir a emisor',
  '02': 'Referir a emisor',
  '03': 'Comercio inválido',
  '04': 'Capturar tarjeta',
  '05': 'Declinada',
  '06': 'Error general',
  '07': 'Capturar tarjeta',
  '12': 'Transacción inválida',
  '13': 'Monto inválido',
  '14': 'Número de tarjeta inválido',
  '15': 'Emisor no existe',
  '19': 'Re-ingrese transacción',
  '25': 'Registro no encontrado',
  '30': 'Error de formato',
  '41': 'Tarjeta reportada perdida',
  '43': 'Tarjeta robada',
  '51': 'Fondos insuficientes',
  '54': 'Tarjeta expirada',
  '55': 'PIN incorrecto',
  '57': 'Transacción no permitida',
  '58': 'Transacción no permitida',
  '61': 'Excede límite de monto',
  '62': 'Tarjeta restringida',
  '63': 'Violación de seguridad',
  '65': 'Excede límite de frecuencia',
  '75': 'PIN excede intentos',
  '76': 'Llave no sincronizada',
  '77': 'Script inválido',
  '78': 'Llaves desincronizadas',
  '79': 'Error de llaves',
  '80': 'Error de fecha',
  '81': 'Error de PIN',
  '82': 'CVV incorrecto',
  '83': 'CVV requerido',
  '84': 'Transacción no válida',
  '85': 'Rechazada',
  '86': 'Rechazada',
  '87': 'Error de autenticación 3DS',
  '88': '3DS no disponible',
  '89': 'Autenticación 3DS fallida',
  '91': 'Emisor no disponible',
  '92': 'Ruta no encontrada',
  '93': 'Violación de ley',
  '94': 'Transacción duplicada',
  '96': 'Error del sistema',
  '99': 'Error desconocido',
};

export class AzulPaymentService {
  /**
   * Check if Azul is properly configured
   */
  static isConfigured(): boolean {
    const config = getAzulConfig();
    return !!(config.merchantId && config.authKey);
  }

  /**
   * Generate auth hash for Azul requests using SHA512HMAC
   */
  private static generateAuthHash(data: string): string {
    const config = getAzulConfig();
    return crypto
      .createHmac('sha512', config.authKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Make a request to Azul API
   */
  private static async makeRequest(data: Record<string, any>): Promise<any> {
    const config = getAzulConfig();
    const url = getApiUrl();
    
    // For Azul JSON WebService using SHA512HMAC:
    // 1. Headers: Auth1 = MerchantId, Auth2 = AuthKey
    // 2. AuthHash inside JSON: HMAC-SHA512(ConcatenatedValues, AuthKey)
    // The ConcatenatedValues for Sale/Hold is: MerchantId + TrxType + Amount + Itbis + CustomOrderId + AuthKey
    
    const trxType = data.TrxType || 'Sale';
    const amount = data.Amount || '000000000000';
    const itbis = data.Itbis || '000000000000';
    const customOrderId = data.CustomOrderId || '';

    // Precise concatenation order from JSON manual
    const hashString = `${config.merchantId}${trxType}${amount}${itbis}${customOrderId}${config.authKey}`;
    
    const authHash = crypto
      .createHmac('sha512', config.authKey)
      .update(hashString)
      .digest('hex');
    
    const requestData = {
      ...data,
      MerchantId: config.merchantId,
      Channel: config.channel,
      PosInputMode: config.posInputMode,
      CurrencyPosCode: '$',
      AuthHash: authHash
    };

    const headers = {
      'Content-Type': 'application/json',
      'Auth1': config.merchantId,
      'Auth2': config.authKey
    };

    try {
      logSystem.info('Azul API request', { 
        url, 
        method: trxType,
        customOrderId
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Azul API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      logSystem.info('Azul API response', { 
        isoCode: responseData.IsoCode,
        responseMessage: responseData.ResponseMessage,
        azulOrderId: responseData.AzulOrderId
      });

      return responseData;
    } catch (error) {
      logSystem.error('Azul API request failed', error);
      throw error;
    }
  }

  /**
   * Parse Azul response to standard format
   */
  private static parseResponse(response: any): AzulResponse {
    const isoCode = response.IsoCode || response.isoCode || '';
    const success = isoCode === '00';
    
    return {
      success,
      isoCode,
      responseMessage: response.ResponseMessage || ISO_CODES[isoCode] || 'Error desconocido',
      authorizationCode: response.AuthorizationCode,
      azulOrderId: response.AzulOrderId,
      customOrderId: response.CustomOrderId,
      dateTime: response.DateTime,
      rrn: response.RRN,
      dataVaultToken: response.DataVaultToken,
      errorDescription: response.ErrorDescription,
      rawResponse: response,
    };
  }

  /**
   * Detect card brand from card number
   */
  static detectCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'Amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    if (/^3(?:0[0-5]|[68])/.test(cleaned)) return 'Diners';
    
    return 'Unknown';
  }

  /**
   * Create a token using DataVault (tokenize card)
   */
  static async createToken(cardData: AzulCardData): Promise<AzulResponse & { tokenData?: AzulTokenData }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
        errorDescription: 'Faltan credenciales de Azul',
      };
    }

    try {
      const cleanCardNumber = cardData.cardNumber.replace(/\D/g, '');
      const cardBrand = this.detectCardBrand(cleanCardNumber);
      
      const requestData = {
        TrxType: 'CREATE',
        CardNumber: cleanCardNumber,
        Expiration: cardData.expiration,
        CVC: cardData.cvc,
        CustomOrderId: `TOKEN-${Date.now()}`,
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success && parsed.dataVaultToken) {
        // Parse expiration (YYYYMM format)
        const expiryYear = parseInt(cardData.expiration.substring(0, 4));
        const expiryMonth = parseInt(cardData.expiration.substring(4, 6));

        logSystem.info('Azul token created', {
          last4: cleanCardNumber.slice(-4),
          cardBrand,
        });

        return {
          ...parsed,
          tokenData: {
            dataVaultToken: parsed.dataVaultToken,
            cardBrand,
            last4: cleanCardNumber.slice(-4),
            expiryMonth,
            expiryYear,
          },
        };
      }

      logSystem.error('Azul token creation failed', {
        isoCode: parsed.isoCode,
        message: parsed.responseMessage,
      });

      return parsed;
    } catch (error) {
      logSystem.error('Azul createToken error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al crear token',
        errorDescription: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Delete a token from DataVault
   */
  static async deleteToken(dataVaultToken: string): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData = {
        TrxType: 'DELETE',
        DataVaultToken: dataVaultToken,
        CustomOrderId: `DELETE-${Date.now()}`,
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success) {
        logSystem.info('Azul token deleted', { token: dataVaultToken.slice(-8) });
      } else {
        logSystem.error('Azul token deletion failed', {
          token: dataVaultToken.slice(-8),
          isoCode: parsed.isoCode,
        });
      }

      return parsed;
    } catch (error) {
      logSystem.error('Azul deleteToken error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al eliminar token',
      };
    }
  }

  /**
   * Process a payment using a token (Sale)
   */
  static async processPaymentWithToken(
    dataVaultToken: string,
    payment: AzulPaymentRequest
  ): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData = {
        TrxType: 'Sale',
        DataVaultToken: dataVaultToken,
        Amount: payment.amount.toString().padStart(12, '0'),
        Itbis: (payment.itbis || 0).toString().padStart(12, '0'),
        CustomOrderId: payment.customOrderId,
        CustomerServicePhone: payment.customerServicePhone || '',
        OrderDescription: payment.orderDescription || '',
        SaveToDataVault: payment.saveToDataVault ? '1' : '0',
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success) {
        logSystem.info('Azul payment processed', {
          amount: payment.amount / 100,
          azulOrderId: parsed.azulOrderId,
          customOrderId: payment.customOrderId,
        });
      } else {
        logSystem.error('Azul payment failed', {
          amount: payment.amount / 100,
          customOrderId: payment.customOrderId,
          isoCode: parsed.isoCode,
          message: parsed.responseMessage,
        });
      }

      return parsed;
    } catch (error) {
      logSystem.error('Azul processPaymentWithToken error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al procesar pago',
      };
    }
  }

  /**
   * Process a payment with card data (Sale with optional tokenization)
   */
  static async processPaymentWithCard(
    cardData: AzulCardData,
    payment: AzulPaymentRequest
  ): Promise<AzulResponse & { tokenData?: AzulTokenData }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const cleanCardNumber = cardData.cardNumber.replace(/\D/g, '');
      const cardBrand = this.detectCardBrand(cleanCardNumber);
      
      const requestData = {
        TrxType: 'Sale',
        CardNumber: cleanCardNumber,
        Expiration: cardData.expiration,
        CVC: cardData.cvc,
        Amount: payment.amount.toString().padStart(12, '0'),
        Itbis: (payment.itbis || 0).toString().padStart(12, '0'),
        CustomOrderId: payment.customOrderId,
        CustomerServicePhone: payment.customerServicePhone || '',
        OrderDescription: payment.orderDescription || '',
        SaveToDataVault: payment.saveToDataVault ? '1' : '0',
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success) {
        logSystem.info('Azul payment with card processed', {
          amount: payment.amount / 100,
          azulOrderId: parsed.azulOrderId,
          customOrderId: payment.customOrderId,
          savedToken: !!parsed.dataVaultToken,
        });

        // If token was saved, return token data
        if (parsed.dataVaultToken && payment.saveToDataVault) {
          const expiryYear = parseInt(cardData.expiration.substring(0, 4));
          const expiryMonth = parseInt(cardData.expiration.substring(4, 6));

          return {
            ...parsed,
            tokenData: {
              dataVaultToken: parsed.dataVaultToken,
              cardBrand,
              last4: cleanCardNumber.slice(-4),
              expiryMonth,
              expiryYear,
            },
          };
        }
      } else {
        logSystem.error('Azul payment with card failed', {
          amount: payment.amount / 100,
          customOrderId: payment.customOrderId,
          isoCode: parsed.isoCode,
          message: parsed.responseMessage,
        });
      }

      return parsed;
    } catch (error) {
      logSystem.error('Azul processPaymentWithCard error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al procesar pago',
      };
    }
  }

  /**
   * Authorize a payment (Hold) - funds are held but not captured
   */
  static async authorizePayment(
    dataVaultToken: string,
    payment: AzulPaymentRequest
  ): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData = {
        TrxType: 'Hold',
        DataVaultToken: dataVaultToken,
        Amount: payment.amount.toString().padStart(12, '0'),
        Itbis: (payment.itbis || 0).toString().padStart(12, '0'),
        CustomOrderId: payment.customOrderId,
        CustomerServicePhone: payment.customerServicePhone || '',
        OrderDescription: payment.orderDescription || '',
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success) {
        logSystem.info('Azul payment authorized (Hold)', {
          amount: payment.amount / 100,
          azulOrderId: parsed.azulOrderId,
          customOrderId: payment.customOrderId,
        });
      } else {
        logSystem.error('Azul authorization failed', {
          amount: payment.amount / 100,
          customOrderId: payment.customOrderId,
          isoCode: parsed.isoCode,
        });
      }

      return parsed;
    } catch (error) {
      logSystem.error('Azul authorizePayment error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al autorizar pago',
      };
    }
  }

  /**
   * Capture a previously authorized payment (Post)
   */
  static async capturePayment(azulOrderId: string, amount?: number): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData: Record<string, any> = {
        TrxType: 'Post',
        AzulOrderId: azulOrderId,
        CustomOrderId: `CAPTURE-${Date.now()}`,
      };

      if (amount !== undefined) {
        requestData.Amount = amount.toString().padStart(12, '0');
      }

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success) {
        logSystem.info('Azul payment captured (Post)', {
          azulOrderId,
          amount: amount ? amount / 100 : 'original',
        });
      } else {
        logSystem.error('Azul capture failed', {
          azulOrderId,
          isoCode: parsed.isoCode,
        });
      }

      return parsed;
    } catch (error) {
      logSystem.error('Azul capturePayment error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al capturar pago',
      };
    }
  }

  /**
   * Void a transaction (before settlement)
   */
  static async voidPayment(azulOrderId: string): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData = {
        TrxType: 'Void',
        AzulOrderId: azulOrderId,
        CustomOrderId: `VOID-${Date.now()}`,
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success) {
        logSystem.info('Azul payment voided', { azulOrderId });
      } else {
        logSystem.error('Azul void failed', {
          azulOrderId,
          isoCode: parsed.isoCode,
        });
      }

      return parsed;
    } catch (error) {
      logSystem.error('Azul voidPayment error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al anular pago',
      };
    }
  }

  /**
   * Refund a transaction (after settlement)
   */
  static async refundPayment(
    azulOrderId: string, 
    amount: number,
    itbis?: number
  ): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData = {
        TrxType: 'Refund',
        AzulOrderId: azulOrderId,
        Amount: amount.toString().padStart(12, '0'),
        Itbis: (itbis || 0).toString().padStart(12, '0'),
        CustomOrderId: `REFUND-${Date.now()}`,
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success) {
        logSystem.info('Azul payment refunded', {
          azulOrderId,
          amount: amount / 100,
        });
      } else {
        logSystem.error('Azul refund failed', {
          azulOrderId,
          isoCode: parsed.isoCode,
        });
      }

      return parsed;
    } catch (error) {
      logSystem.error('Azul refundPayment error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al reembolsar pago',
      };
    }
  }

  /**
   * Verify a transaction status
   */
  static async verifyPayment(customOrderId: string): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData = {
        TrxType: 'VerifyPayment',
        CustomOrderId: customOrderId,
      };

      const response = await this.makeRequest(requestData);
      return this.parseResponse(response);
    } catch (error) {
      logSystem.error('Azul verifyPayment error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al verificar pago',
      };
    }
  }

  /**
   * Initialize 3D Secure authentication
   */
  static async init3DSecure(
    dataVaultToken: string,
    payment: AzulPaymentRequest,
    browserInfo: {
      userAgent: string;
      acceptHeader: string;
      colorDepth: number;
      screenHeight: number;
      screenWidth: number;
      timeZoneOffset: number;
      language: string;
    }
  ): Promise<Azul3DSResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
        requires3DS: false,
      };
    }

    try {
      const requestData = {
        TrxType: 'Sale',
        DataVaultToken: dataVaultToken,
        Amount: payment.amount.toString().padStart(12, '0'),
        Itbis: (payment.itbis || 0).toString().padStart(12, '0'),
        CustomOrderId: payment.customOrderId,
        ThreeDSAuthMethod: '02', // Challenge flow
        BrowserUserAgent: browserInfo.userAgent,
        BrowserAcceptHeader: browserInfo.acceptHeader,
        BrowserColorDepth: browserInfo.colorDepth.toString(),
        BrowserScreenHeight: browserInfo.screenHeight.toString(),
        BrowserScreenWidth: browserInfo.screenWidth.toString(),
        BrowserTZ: browserInfo.timeZoneOffset.toString(),
        BrowserLanguage: browserInfo.language,
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      // Check if 3DS is required
      if (response.ThreeDSMethodURL || response.AcsUrl) {
        return {
          ...parsed,
          requires3DS: true,
          threeDSMethodURL: response.ThreeDSMethodURL,
          threeDSServerTransID: response.ThreeDSServerTransID,
          acsUrl: response.AcsUrl,
          creq: response.CReq,
        };
      }

      return {
        ...parsed,
        requires3DS: false,
      };
    } catch (error) {
      logSystem.error('Azul init3DSecure error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al iniciar 3D Secure',
        requires3DS: false,
      };
    }
  }

  /**
   * Complete 3D Secure payment after authentication
   */
  static async complete3DSecure(
    threeDSServerTransID: string,
    customOrderId: string
  ): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData = {
        TrxType: 'ThreeDSComplete',
        ThreeDSServerTransID: threeDSServerTransID,
        CustomOrderId: customOrderId,
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success) {
        logSystem.info('Azul 3DS payment completed', {
          customOrderId,
          azulOrderId: parsed.azulOrderId,
        });
      } else {
        logSystem.error('Azul 3DS payment failed', {
          customOrderId,
          isoCode: parsed.isoCode,
        });
      }

      return parsed;
    } catch (error) {
      logSystem.error('Azul complete3DSecure error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al completar 3D Secure',
      };
    }
  }

  /**
   * Convert amount to Azul format (centavos)
   */
  static toAzulAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert Azul amount (centavos) to decimal
   */
  static fromAzulAmount(amount: number): number {
    return amount / 100;
  }

  /**
   * Format expiration date for Azul (YYYYMM)
   */
  static formatExpiration(month: number, year: number): string {
    const fullYear = year < 100 ? 2000 + year : year;
    return `${fullYear}${month.toString().padStart(2, '0')}`;
  }

  /**
   * Get human-readable error message for ISO code
   */
  static getErrorMessage(isoCode: string): string {
    return ISO_CODES[isoCode] || 'Error desconocido';
  }
}

export default AzulPaymentService;
