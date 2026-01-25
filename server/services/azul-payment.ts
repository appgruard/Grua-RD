import { logSystem } from '../logger';
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';

// Azul API Configuration
const AZUL_SANDBOX_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';
const AZUL_PRODUCTION_URL = 'https://pagos.azul.com.do/webservices/JSON/Default.aspx';

// Certificate Paths
const CERT_PATH = process.env.AZUL_CERT_PATH || '/etc/azul/certs/app.gruard.com.bundle.crt';
const KEY_PATH = process.env.AZUL_KEY_PATH || '/etc/azul/certs/app.gruard.com.key';

// Environment configuration
const getAzulConfig = () => ({
  merchantId: process.env.AZUL_MERCHANT_ID || '39038540035',
  authKey: process.env.AZUL_AUTH_KEY || 'splitit',
  auth3DS: process.env.AZUL_AUTH_3DS || '3dsecure',
  environment: (process.env.AZUL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  channel: process.env.AZUL_CHANNEL || 'EC',
  posInputMode: process.env.AZUL_POS_INPUT_MODE || 'E-Commerce',
  baseUrl: process.env.APP_BASE_URL || 'https://app.gruard.com',
});

const getApiUrl = () => {
  const config = getAzulConfig();
  return config.environment === 'production' ? AZUL_PRODUCTION_URL : AZUL_SANDBOX_URL;
};

// Create HTTPS Agent with certificates
const getHttpsAgent = () => {
  try {
    logSystem.info('Checking Azul certificates', { 
      certPath: CERT_PATH, 
      keyPath: KEY_PATH,
      certExists: fs.existsSync(CERT_PATH),
      keyExists: fs.existsSync(KEY_PATH)
    });
    
    if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
      const cert = fs.readFileSync(CERT_PATH);
      const key = fs.readFileSync(KEY_PATH);
      logSystem.info('Azul certificates loaded successfully', { 
        certSize: cert.length,
        keySize: key.length
      });
      return new https.Agent({
        cert,
        key,
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
  requestorChallengeIndicator?: string;
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

export interface ThreeDSMethodResponse extends AzulResponse {
  methodForm?: string;
  azulOrderId?: string;
}

export interface ThreeDSChallengeResponse extends AzulResponse {
  redirectPostUrl?: string;
  creq?: string;
  md?: string;
  paReq?: string;
  azulOrderId?: string;
}

export interface Initiate3DSPaymentResult {
  success: boolean;
  sessionId: string;
  azulOrderId?: string;
  isoCode: string;
  responseMessage: string;
  flowType: '3D2METHOD' | '3D' | 'APPROVED' | 'DECLINED' | 'ERROR';
  methodForm?: string;
  challengeData?: {
    redirectPostUrl: string;
    creq: string;
    md?: string;
  };
  authorizationCode?: string;
  errorDescription?: string;
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
   * Generate numeric OrderNumber (max 15 digits as required by Azul)
   */
  static generateOrderNumber(): string {
    const now = Date.now();
    const timestamp = (now % 100000000000).toString().padStart(11, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return timestamp + random.toString();
  }

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
    
    // Prepare standardized request data according to Azul documentation
    // Si hay ThreeDSAuth, no agregar ForceNo3DS para permitir el flujo 3DS
    const has3DSAuth = data.ThreeDSAuth !== undefined;
    const requestData: Record<string, any> = {
      Channel: config.channel,
      Store: config.merchantId,
      ...(has3DSAuth ? {} : { 
        PosInputMode: config.posInputMode,
        CurrencyPosCode: '$',
        AcquirerRefData: '1',
        ForceNo3DS: '1',
      }),
      ...data,
    };

    const jsonPayload = JSON.stringify(requestData);
    
    const authKey = config.authKey || 'splitit';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Auth1': authKey,
      'Auth2': authKey,
      'Content-Length': Buffer.byteLength(jsonPayload).toString(),
      'User-Agent': 'GruaRD-App/1.0',
      'Host': url.hostname
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
        path: url.pathname + (url.search || ''),
        method: 'POST',
        agent: getHttpsAgent(),
        headers,
        // Forzar versión mínima de TLS para cumplimiento de seguridad de Azul
        minVersion: 'TLSv1.2' as any
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              logSystem.error('Azul API error response', { statusCode: res.statusCode, body: responseBody });
              reject(new Error(`Azul API error: ${res.statusCode} ${responseBody}`));
              return;
            }
            if (!responseBody) {
              reject(new Error('Azul API returned empty response'));
              return;
            }
            const responseData = JSON.parse(responseBody);
            logSystem.info('Azul API response received', { 
              isoCode: responseData.IsoCode,
              responseMessage: responseData.ResponseMessage
            });
            resolve(responseData);
          } catch (error) {
            logSystem.error('Failed to parse Azul response', { body: responseBody, error });
            reject(new Error(`Failed to parse Azul response: ${responseBody}`));
          }
        });
      });

      req.on('error', (error) => {
        logSystem.error('Azul API connection failed', error);
        reject(error);
      });

      // Set timeout for the request
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Azul API request timed out after 30 seconds'));
      });

      req.write(jsonPayload);
      req.end();
    });
  }

  /**
   * Continue 3DS authentication after Method Notification
   */
  static async continue3DSAuthentication(
    azulOrderId: string,
    status: string = 'RECEIVED'
  ): Promise<Azul3DSResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const config = getAzulConfig();
      const requestData = {
        Channel: config.channel,
        Store: config.merchantId,
        AzulOrderId: azulOrderId,
        MethodNotificationStatus: status,
      };

      const url = `https://pruebas.azul.com.do/webservices/JSON/Default.aspx?processthreedsmethod`;
      
      const jsonPayload = JSON.stringify(requestData);
      const authKey = config.authKey || 'splitit';
      
      const options: https.RequestOptions = {
        method: 'POST',
        agent: getHttpsAgent(),
        headers: {
          'Content-Type': 'application/json',
          'Auth1': authKey,
          'Auth2': authKey,
          'Content-Length': Buffer.byteLength(jsonPayload).toString(),
          'User-Agent': 'GruaRD-App/1.0',
        },
        minVersion: 'TLSv1.2' as any
      };

      return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = https.request({
          ...options,
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const responseData = JSON.parse(body);
              const parsed = this.parseResponse(responseData);
              resolve({
                ...parsed,
                acsUrl: responseData.ThreeDSChallenge?.RedirectPostUrl,
                creq: responseData.ThreeDSChallenge?.CReq,
                requires3DS: responseData.IsoCode === '3D',
              });
            } catch (e) {
              reject(new Error(`Error parsing continue response: ${body}`));
            }
          });
        });

        req.on('error', reject);
        req.write(jsonPayload);
        req.end();
      });
    } catch (error) {
      logSystem.error('Azul continue3DSAuthentication error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al continuar 3DS',
      };
    }
  }

  /**
   * Process 3D Secure challenge response
   */
  static async processThreeDSChallenge(
    azulOrderId: string,
    cres: string
  ): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      const config = getAzulConfig();
      const requestData = {
        Channel: config.channel,
        Store: config.merchantId,
        AzulOrderId: azulOrderId,
        CRes: cres,
      };

      // Endpoint específico para procesar el challenge
      const url = `https://pruebas.azul.com.do/webservices/JSON/Default.aspx?processthreedschallenge`;
      
      const jsonPayload = JSON.stringify(requestData);
      const authKey = config.authKey || 'splitit';
      
      const options: https.RequestOptions = {
        method: 'POST',
        agent: getHttpsAgent(),
        headers: {
          'Content-Type': 'application/json',
          'Auth1': authKey,
          'Auth2': authKey,
          'Content-Length': Buffer.byteLength(jsonPayload).toString(),
          'User-Agent': 'GruaRD-App/1.0',
        },
        minVersion: 'TLSv1.2' as any
      };

      return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = https.request({
          ...options,
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const responseData = JSON.parse(body);
              resolve(this.parseResponse(responseData));
            } catch (e) {
              reject(new Error(`Error parsing challenge response: ${body}`));
            }
          });
        });

        req.on('error', reject);
        req.write(jsonPayload);
        req.end();
      });
    } catch (error) {
      logSystem.error('Azul processThreeDSChallenge error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al procesar desafío',
      };
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
        CustomOrderId: this.generateOrderNumber(),
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
        CustomOrderId: this.generateOrderNumber(),
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
      const orderNumber = this.generateOrderNumber();
      const requestData = {
        TrxType: 'Sale',
        DataVaultToken: dataVaultToken,
        Amount: payment.amount.toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: orderNumber,
        CustomOrderId: payment.customOrderId || orderNumber,
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
      const orderNumber = this.generateOrderNumber();
      
      const requestData = {
        TrxType: 'Sale',
        CardNumber: cleanCardNumber,
        Expiration: cardData.expiration,
        CVC: cardData.cvc,
        Amount: payment.amount.toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: orderNumber,
        CustomOrderId: payment.customOrderId || orderNumber,
        CustomerServicePhone: payment.customerServicePhone || '8090000000',
        OrderDescription: payment.orderDescription || 'Pago Gruas RD',
        SaveToDataVault: payment.saveToDataVault ? '1' : '0',
        Payments: '1',
        Plan: '0',
        ForceNo3DS: '1'
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
      const orderNumber = this.generateOrderNumber();
      const requestData = {
        TrxType: 'Hold',
        DataVaultToken: dataVaultToken,
        Amount: payment.amount.toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: orderNumber,
        CustomOrderId: payment.customOrderId || orderNumber,
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
   * Según documentación Azul: requiere Channel, Store, AzulOrderId, Amount, Itbis
   */
  static async capturePayment(azulOrderId: string, amount: number, itbis?: number): Promise<AzulResponse> {
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
        Itbis: (itbis || 0).toString(),
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
   * Según documentación Azul: requiere OriginalDate (formato YYYYMMDD), AzulOrderId, Amount, Itbis
   */
  static async refundPayment(azulOrderId: string, amount: number, itbis?: number, originalDate?: string): Promise<AzulResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isoCode: '99',
        responseMessage: 'Azul no está configurado correctamente',
      };
    }

    try {
      // OriginalDate debe ser la fecha de la transacción original en formato YYYYMMDD
      const refundDate = originalDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
      
      const requestData = {
        TrxType: 'Refund',
        AzulOrderId: azulOrderId,
        Amount: amount.toString(),
        Itbis: (itbis || 0).toString(),
        OriginalDate: refundDate,
        Payments: '1',
        Plan: '0',
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
   * Initialize 3D Secure authentication with explicit card data
   */
  static async init3DSecureWithCard(
    cardData: AzulCardData,
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
      const orderNumber = this.generateOrderNumber();
      // Request exactamente igual al script test-3dsecure.cjs
      const requestData = {
        CardNumber: cardData.cardNumber,
        Expiration: cardData.expiration,
        CVC: cardData.cvc,
        PosInputMode: 'E-Commerce',
        TrxType: 'Sale',
        Amount: (payment.amount || 0).toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: orderNumber,
        CustomOrderId: payment.customOrderId || orderNumber,
        ThreeDSAuth: {
          TermUrl: `${getAzulConfig().baseUrl}/api/payments/azul/3ds-callback`,
          MethodNotificationUrl: `${getAzulConfig().baseUrl}/api/payments/azul/3ds-method-notification`,
          RequestorChallengeIndicator: '01',
        },
        CardHolderInfo: {
          Name: cardData.cardHolderName || 'Juan Perez Prueba',
          Email: payment.cardHolderInfo?.email || 'test@gruard.com',
          PhoneHome: payment.cardHolderInfo?.phoneHome || '8095551234',
          PhoneMobile: payment.cardHolderInfo?.phoneMobile || '8295551234',
          BillingAddressLine1: payment.cardHolderInfo?.billingAddressLine1 || 'Calle Principal #123',
          BillingAddressCity: payment.cardHolderInfo?.billingAddressCity || 'Santo Domingo',
          BillingAddressCountry: payment.cardHolderInfo?.billingAddressCountry || 'DO',
          BillingAddressZip: payment.cardHolderInfo?.billingAddressZip || '10101',
        },
        BrowserInfo: {
          AcceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          IPAddress: browserInfo.ipAddress || '200.88.232.119',
          Language: 'es-DO',
          ColorDepth: '24',
          ScreenWidth: '1920',
          ScreenHeight: '1080',
          TimeZone: '240',
          UserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          JavaScriptEnabled: 'true',
        },
      };

      logSystem.info('=== INIT 3DS REQUEST ===', { payload: JSON.stringify(requestData, null, 2) });
      const response = await this.makeRequest(requestData);
      logSystem.info('=== INIT 3DS RESPONSE ===', { response: JSON.stringify(response, null, 2) });
      const parsed = this.parseResponse(response);

      return {
        ...parsed,
        threeDSMethodURL: response.ThreeDSMethodURL,
        threeDSServerTransID: response.ThreeDSServerTransID,
        acsUrl: response.ThreeDSChallenge?.RedirectPostUrl,
        creq: response.ThreeDSChallenge?.CReq,
        requires3DS: response.IsoCode === '3D' || response.IsoCode === '3D2METHOD',
      };
    } catch (error) {
      logSystem.error('Azul init3DSecureWithCard error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error del sistema al iniciar 3DS',
        requires3DS: false,
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
      const orderNumber = this.generateOrderNumber();
      const requestData = {
        TrxType: 'Sale',
        DataVaultToken: dataVaultToken,
        Amount: payment.amount.toString(),
        Itbis: (payment.itbis || 0).toString(),
        OrderNumber: orderNumber,
        CustomOrderId: payment.customOrderId || orderNumber,
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
   * Make a 3DS-specific request with 3dsecure auth headers
   */
  private static async make3DSRequest(url: string, data: Record<string, any>): Promise<any> {
    const config = getAzulConfig();
    const urlObj = new URL(url);
    
    const requestData: Record<string, any> = {
      Channel: config.channel,
      Store: config.merchantId,
      ...data,
    };

    const jsonPayload = JSON.stringify(requestData);
    const auth3DS = config.auth3DS;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Auth1': auth3DS,
      'Auth2': auth3DS,
      'Content-Length': Buffer.byteLength(jsonPayload).toString(),
      'User-Agent': 'GruaRD-App/1.0',
      'Host': urlObj.hostname
    };

    logSystem.info('Azul 3DS API request', { 
      hostname: urlObj.hostname,
      merchantId: config.merchantId,
      path: urlObj.pathname,
      auth3DS: auth3DS,
      payloadKeys: Object.keys(requestData),
      amount: requestData.Amount,
      itbis: requestData.Itbis,
    });

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + (urlObj.search || ''),
        method: 'POST',
        agent: getHttpsAgent(),
        headers,
        minVersion: 'TLSv1.2' as any
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          try {
            logSystem.info('Azul 3DS raw response', { 
              statusCode: res.statusCode,
              headers: res.headers,
              bodyLength: responseBody.length,
              bodyPreview: responseBody.substring(0, 500),
            });
            
            if (!responseBody) {
              reject(new Error('Azul API returned empty response'));
              return;
            }
            const responseData = JSON.parse(responseBody);
            logSystem.info('Azul 3DS API response parsed', { 
              isoCode: responseData.IsoCode,
              responseMessage: responseData.ResponseMessage,
              azulOrderId: responseData.AzulOrderId,
              allKeys: Object.keys(responseData),
            });
            resolve(responseData);
          } catch (error) {
            logSystem.error('Failed to parse Azul 3DS response', { body: responseBody, error });
            reject(new Error(`Failed to parse Azul response: ${responseBody}`));
          }
        });
      });

      req.on('error', (error) => {
        logSystem.error('Azul 3DS API connection failed', error);
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Azul 3DS API request timed out'));
      });

      req.write(jsonPayload);
      req.end();
    });
  }

  /**
   * Initiate a 3D Secure 2.0 payment with card data
   */
  static async initiate3DSPaymentWithCard(
    cardData: AzulCardData,
    payment: AzulPaymentRequest,
    browserInfo: BrowserInfo,
    sessionId: string
  ): Promise<Initiate3DSPaymentResult> {
    const config = getAzulConfig();
    const apiUrl = getApiUrl();

    try {
      const cleanCardNumber = cardData.cardNumber.replace(/\D/g, '');
      const orderNumber = this.generateOrderNumber();

      // Itbis debe ser string vacio si es 0, segun documentacion Azul
      const itbisValue = payment.itbis && payment.itbis > 0 ? payment.itbis.toString() : '';
      
      const requestData = {
        CardNumber: cleanCardNumber,
        Expiration: cardData.expiration,
        CVC: cardData.cvc,
        PosInputMode: 'E-Commerce',
        TrxType: 'Sale',
        Amount: payment.amount.toString(),
        Itbis: itbisValue,
        OrderNumber: orderNumber,
        CustomOrderId: payment.customOrderId || `GRD-${sessionId}`,
        DataVaultToken: '',
        SaveToDataVault: payment.saveToDataVault ? '1' : '0',
        ForceNo3DS: '',
        ThreeDSAuth: {
          TermUrl: `${config.baseUrl}/api/azul/3ds/callback?sid=${sessionId}`,
          MethodNotificationUrl: `${config.baseUrl}/api/azul/3ds/method-notification?sid=${sessionId}`,
          RequestorChallengeIndicator: '01',
        },
        CardHolderInfo: payment.cardHolderInfo ? {
          Name: payment.cardHolderInfo.name,
          Email: payment.cardHolderInfo.email || '',
          PhoneHome: payment.cardHolderInfo.phoneHome || '',
          PhoneMobile: payment.cardHolderInfo.phoneMobile || '',
          BillingAddressLine1: payment.cardHolderInfo.billingAddressLine1 || '',
          BillingAddressCity: payment.cardHolderInfo.billingAddressCity || '',
          BillingAddressCountry: payment.cardHolderInfo.billingAddressCountry || 'DO',
          BillingAddressZip: payment.cardHolderInfo.billingAddressZip || '',
        } : undefined,
        BrowserInfo: {
          AcceptHeader: browserInfo.acceptHeader,
          IPAddress: browserInfo.ipAddress,
          Language: browserInfo.language,
          ColorDepth: browserInfo.colorDepth.toString(),
          ScreenWidth: browserInfo.screenWidth.toString(),
          ScreenHeight: browserInfo.screenHeight.toString(),
          TimeZone: browserInfo.timeZone,
          UserAgent: browserInfo.userAgent,
          JavaScriptEnabled: browserInfo.javaScriptEnabled,
        },
      };

      const response = await this.make3DSRequest(apiUrl, requestData);

      if (response.IsoCode === '3D2METHOD') {
        return {
          success: true,
          sessionId,
          azulOrderId: response.AzulOrderId,
          isoCode: response.IsoCode,
          responseMessage: response.ResponseMessage,
          flowType: '3D2METHOD',
          methodForm: response.ThreeDSMethod?.MethodForm,
        };
      }

      if (response.IsoCode === '3D') {
        return {
          success: true,
          sessionId,
          azulOrderId: response.AzulOrderId,
          isoCode: response.IsoCode,
          responseMessage: response.ResponseMessage,
          flowType: '3D',
          challengeData: {
            redirectPostUrl: response.ThreeDSChallenge?.RedirectPostUrl,
            creq: response.ThreeDSChallenge?.CReq,
            md: response.ThreeDSChallenge?.MD,
          },
        };
      }

      if (response.IsoCode === '00') {
        return {
          success: true,
          sessionId,
          azulOrderId: response.AzulOrderId,
          isoCode: response.IsoCode,
          responseMessage: response.ResponseMessage,
          flowType: 'APPROVED',
          authorizationCode: response.AuthorizationCode,
        };
      }

      return {
        success: false,
        sessionId,
        azulOrderId: response.AzulOrderId,
        isoCode: response.IsoCode || 'Error',
        responseMessage: response.ResponseMessage || 'Error desconocido',
        flowType: 'DECLINED',
        errorDescription: response.ErrorDescription,
      };
    } catch (error) {
      logSystem.error('Azul initiate3DSPayment error', error);
      return {
        success: false,
        sessionId,
        isoCode: '96',
        responseMessage: 'Error del sistema al iniciar pago 3DS',
        flowType: 'ERROR',
        errorDescription: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Process 3DS Method notification and continue authentication
   */
  static async processThreeDSMethod(
    azulOrderId: string,
    status: 'RECEIVED' | 'NOT_RECEIVED'
  ): Promise<Initiate3DSPaymentResult & { sessionId?: string }> {
    const config = getAzulConfig();
    const apiUrl = `${getApiUrl()}?processthreedsmethod`;

    try {
      const requestData = {
        AzulOrderId: azulOrderId,
        MethodNotificationStatus: status,
      };

      const response = await this.make3DSRequest(apiUrl, requestData);

      if (response.IsoCode === '00') {
        return {
          success: true,
          sessionId: '',
          azulOrderId: response.AzulOrderId,
          isoCode: response.IsoCode,
          responseMessage: response.ResponseMessage,
          flowType: 'APPROVED',
          authorizationCode: response.AuthorizationCode,
        };
      }

      if (response.IsoCode === '3D') {
        return {
          success: true,
          sessionId: '',
          azulOrderId: response.AzulOrderId,
          isoCode: response.IsoCode,
          responseMessage: response.ResponseMessage,
          flowType: '3D',
          challengeData: {
            redirectPostUrl: response.ThreeDSChallenge?.RedirectPostUrl,
            creq: response.ThreeDSChallenge?.CReq,
            md: response.ThreeDSChallenge?.MD,
          },
        };
      }

      return {
        success: false,
        sessionId: '',
        azulOrderId: response.AzulOrderId,
        isoCode: response.IsoCode || 'Error',
        responseMessage: response.ResponseMessage || 'Error desconocido',
        flowType: 'DECLINED',
        errorDescription: response.ErrorDescription,
      };
    } catch (error) {
      logSystem.error('Azul processThreeDSMethod error', error);
      return {
        success: false,
        sessionId: '',
        isoCode: '96',
        responseMessage: 'Error al procesar 3DS Method',
        flowType: 'ERROR',
        errorDescription: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Process 3DS Challenge result
   */
  static async processThreeDSChallenge(
    azulOrderId: string,
    cres?: string
  ): Promise<AzulResponse> {
    const apiUrl = `${getApiUrl()}?processthreedsChallenge`;

    try {
      const requestData: Record<string, any> = {
        AzulOrderId: azulOrderId,
      };
      
      if (cres) {
        requestData.CRes = cres;
      }

      const response = await this.make3DSRequest(apiUrl, requestData);
      return this.parseResponse(response);
    } catch (error) {
      logSystem.error('Azul processThreeDSChallenge error', error);
      return {
        success: false,
        isoCode: '96',
        responseMessage: 'Error al procesar desafio 3DS',
      };
    }
  }

  /**
   * Get human-readable error message for ISO code
   */
  static getErrorMessage(isoCode: string): string {
    return ISO_CODES[isoCode] || 'Error desconocido';
  }
}

export default AzulPaymentService;
