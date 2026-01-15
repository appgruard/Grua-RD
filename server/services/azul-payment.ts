import { logSystem } from '../logger';
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';

// Azul API Configuration
const AZUL_SANDBOX_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';
const AZUL_PRODUCTION_URL = 'https://pagos.azul.com.do/webservices/JSON/Default.aspx';

// Certificate Paths
const CERT_PATH = process.env.AZUL_CERT_PATH || '/opt/certificados/gruard/app.gruard.com.crt';
const KEY_PATH = process.env.AZUL_KEY_PATH || '/opt/certificados/gruard/app.gruard.com.key';

// Environment configuration
const getAzulConfig = () => ({
  merchantId: process.env.AZUL_MERCHANT_ID || '39038540035',
  authKey: process.env.AZUL_AUTH_KEY || 'splitit', // Used as Auth1/Auth2 headers
  environment: (process.env.AZUL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  channel: process.env.AZUL_CHANNEL || 'EC',
  posInputMode: process.env.AZUL_POS_INPUT_MODE || 'E-Commerce',
});

const getApiUrl = () => {
  const config = getAzulConfig();
  return config.environment === 'production' ? AZUL_PRODUCTION_URL : AZUL_SANDBOX_URL;
};

// Create HTTPS Agent with certificates
const getHttpsAgent = () => {
  try {
    if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
      return new https.Agent({
        cert: fs.readFileSync(CERT_PATH),
        key: fs.readFileSync(KEY_PATH),
        rejectUnauthorized: true
      });
    }
    logSystem.warn('Azul certificates not found, using default agent (Sandbox only)');
    return undefined;
  } catch (error) {
    logSystem.error('Error loading Azul certificates', error);
    return undefined;
  }
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

export interface CardHolderInfo {
  billingAddressCity?: string;
  billingAddressCountry?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingAddressLine3?: string;
  billingAddressState?: string;
  billingAddressZip?: string;
  email?: string;
  name: string;
  phoneHome?: string;
  phoneMobile?: string;
  phoneWork?: string;
  shippingAddressCity?: string;
  shippingAddressCountry?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingAddressLine3?: string;
  shippingAddressState?: string;
  shippingAddressZip?: string;
}

export interface BrowserInfo {
  acceptHeader: string;
  ipAddress: string;
  language: string;
  colorDepth: number;
  screenWidth: number;
  screenHeight: number;
  timeZone: string;
  userAgent: string;
  javaScriptEnabled: string;
}

export interface AzulPaymentRequest {
  amount: number; // In centavos (RD$100.00 = 10000)
  itbis?: number; // Tax in centavos
  customOrderId: string;
  customerServicePhone?: string;
  orderDescription?: string;
  saveToDataVault?: boolean;
  cardHolderInfo?: CardHolderInfo;
  browserInfo?: BrowserInfo;
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
    return !!(config.merchantId);
  }

  /**
   * Make a request to Azul API using https.request and digital certificates
   */
  private static async makeRequest(data: Record<string, any>): Promise<any> {
    const config = getAzulConfig();
    const apiUrl = getApiUrl();
    const url = new URL(apiUrl);
    
    // Prepare standardized request data
    const requestData: Record<string, any> = {
      Channel: config.channel,
      Store: config.merchantId,
      PosInputMode: config.posInputMode,
      CurrencyPosCode: 'RD$',
      ...data,
    };

    const jsonPayload = JSON.stringify(requestData);
    
    // According to Azul new instructions:
    // Auth1 and Auth2 headers are set to 'splitit' (or configured authKey)
    // Security is handled by the digital certificate in the HTTPS agent
    const headers = {
      'Content-Type': 'application/json',
      'Auth1': config.authKey,
      'Auth2': config.authKey,
      'Content-Length': Buffer.byteLength(jsonPayload)
    };

    logSystem.info('Azul API request (Cert-based)', { 
      hostname: url.hostname,
      merchantId: config.merchantId,
      trxType: data.TrxType,
      customOrderId: data.CustomOrderId
    });

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        agent: getHttpsAgent(),
        headers
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Azul API error: ${res.statusCode} ${responseBody}`));
              return;
            }
            const responseData = JSON.parse(responseBody);
            logSystem.info('Azul API response', { 
              isoCode: responseData.IsoCode,
              responseMessage: responseData.ResponseMessage
            });
            resolve(responseData);
          } catch (error) {
            reject(new Error(`Failed to parse Azul response: ${responseBody}`));
          }
        });
      });

      req.on('error', (error) => {
        logSystem.error('Azul API connection failed', error);
        reject(error);
      });

      req.write(jsonPayload);
      req.end();
    });
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

      return parsed;
    } catch (error) {
      logSystem.error('Azul createToken error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al crear token',
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
      return this.parseResponse(response);
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
        Amount: payment.amount.toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: payment.customOrderId,
        CustomOrderId: payment.customOrderId,
        CustomerServicePhone: payment.customerServicePhone || '8090000000',
        OrderDescription: payment.orderDescription || 'Pago Gruas RD',
        SaveToDataVault: payment.saveToDataVault ? '1' : '0',
        Payments: '1',
        Plan: '0'
      };

      const response = await this.makeRequest(requestData);
      return this.parseResponse(response);
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
   * Process a payment with card data (Sale)
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
        Amount: payment.amount.toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: payment.customOrderId,
        CustomOrderId: payment.customOrderId,
        CustomerServicePhone: payment.customerServicePhone || '8090000000',
        OrderDescription: payment.orderDescription || 'Pago Gruas RD',
        SaveToDataVault: payment.saveToDataVault ? '1' : '0',
        Payments: '1',
        Plan: '0'
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

      if (parsed.success && parsed.dataVaultToken && payment.saveToDataVault) {
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
   * Authorize a payment (Hold)
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
        Amount: payment.amount.toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: payment.customOrderId,
        CustomOrderId: payment.customOrderId,
        CustomerServicePhone: payment.customerServicePhone || '8090000000',
        OrderDescription: payment.orderDescription || 'Autorizacion Gruas RD',
        Payments: '1',
        Plan: '0'
      };

      const response = await this.makeRequest(requestData);
      return this.parseResponse(response);
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
  static async capturePayment(azulOrderId: string, amount: number): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const requestData = {
        TrxType: 'Post',
        AzulOrderId: azulOrderId,
        Amount: amount.toString(),
      };

      const response = await this.makeRequest(requestData);
      return this.parseResponse(response);
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
   * Refund a payment (Refund)
   */
  static async refundPayment(azulOrderId: string, amount: number): Promise<AzulResponse> {
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
        Amount: amount.toString(),
      };

      const response = await this.makeRequest(requestData);
      return this.parseResponse(response);
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
    browserInfo: any
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
        Amount: payment.amount.toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: payment.customOrderId,
        CustomOrderId: payment.customOrderId,
        ThreeDSAuthMethod: '02',
        BrowserInfo: {
          AcceptHeader: browserInfo.acceptHeader,
          IPAddress: browserInfo.ipAddress || '0.0.0.0',
          Language: browserInfo.language,
          ColorDepth: browserInfo.colorDepth.toString(),
          ScreenWidth: browserInfo.screenWidth.toString(),
          ScreenHeight: browserInfo.screenHeight.toString(),
          TimeZone: browserInfo.timeZoneOffset?.toString() || '0',
          UserAgent: browserInfo.userAgent,
          JavaScriptEnabled: 'true',
        },
      };

      const response = await this.makeRequest(requestData);
      const parsed = this.parseResponse(response);

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
      return this.parseResponse(response);
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
