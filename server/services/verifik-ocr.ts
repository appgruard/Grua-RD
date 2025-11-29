import { logger } from "../logger";

const VERIFIK_API_KEY = process.env.VERIFIK_API_KEY;
const VERIFIK_BASE_URL = "https://api.verifik.co/v2";

interface VerifikOCRResponse {
  data?: {
    documentType?: string;
    documentNumber?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    expirationDate?: string;
    nationality?: string;
    gender?: string;
    [key: string]: any;
  };
  signature?: {
    dateTime: string;
    message: string;
  };
  id?: string;
  error?: string;
  message?: string;
}

interface CedulaVerificationResponse {
  data?: {
    documentNumber: string;
    documentType: string;
    fullName: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  signature?: {
    dateTime: string;
    message: string;
  };
  id?: string;
  error?: string;
  message?: string;
}

interface OCRScanResult {
  success: boolean;
  cedula?: string;
  nombre?: string;
  apellido?: string;
  fechaNacimiento?: string;
  rawData?: any;
  error?: string;
}

interface CedulaVerifyResult {
  success: boolean;
  verified: boolean;
  cedula?: string;
  nombre?: string;
  apellido?: string;
  rawData?: any;
  error?: string;
}

export function isVerifikConfigured(): boolean {
  return !!VERIFIK_API_KEY;
}

export async function scanCedulaOCR(imageBase64: string): Promise<OCRScanResult> {
  if (!VERIFIK_API_KEY) {
    logger.warn("Verifik API key not configured");
    return {
      success: false,
      error: "El servicio de verificación no está configurado"
    };
  }

  const apiKey = VERIFIK_API_KEY.trim();
  logger.info("Verifik OCR scan started", { 
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, 20) + "..."
  });

  try {
    const imageData = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch(`${VERIFIK_BASE_URL}/ocr/scan-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify({
        image: imageData,
        documentType: "CIE"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Verifik OCR API error", { status: response.status, error: errorText });
      
      if (response.status === 401) {
        return {
          success: false,
          error: "Error de autenticación con el servicio de verificación"
        };
      }
      
      return {
        success: false,
        error: "Error al procesar el documento. Intenta de nuevo."
      };
    }

    const data: VerifikOCRResponse = await response.json();
    
    logger.info("Verifik OCR response received", { 
      hasData: !!data.data,
      documentType: data.data?.documentType 
    });

    if (!data.data) {
      return {
        success: false,
        error: "No se pudo extraer información del documento"
      };
    }

    const cedula = data.data.documentNumber?.replace(/[\s-]/g, '');
    
    if (!cedula || cedula.length !== 11) {
      return {
        success: false,
        error: "No se pudo detectar un número de cédula válido en la imagen"
      };
    }

    const fullName = data.data.fullName || '';
    const nameParts = fullName.split(' ');
    const firstName = data.data.firstName || nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
    const lastName = data.data.lastName || nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');

    return {
      success: true,
      cedula: cedula,
      nombre: firstName,
      apellido: lastName,
      fechaNacimiento: data.data.dateOfBirth,
      rawData: data
    };

  } catch (error: any) {
    logger.error("Error in Verifik OCR scan", error);
    return {
      success: false,
      error: "Error al conectar con el servicio de verificación"
    };
  }
}

export async function verifyCedulaWithAPI(cedulaNumber: string): Promise<CedulaVerifyResult> {
  if (!VERIFIK_API_KEY) {
    logger.warn("Verifik API key not configured");
    return {
      success: false,
      verified: false,
      error: "El servicio de verificación no está configurado"
    };
  }

  const apiKey = VERIFIK_API_KEY.trim();
  const cleanCedula = cedulaNumber.replace(/[\s-]/g, '');
  
  if (!/^\d{11}$/.test(cleanCedula)) {
    return {
      success: false,
      verified: false,
      error: "Formato de cédula inválido. Debe contener 11 dígitos."
    };
  }

  try {
    const response = await fetch(`${VERIFIK_BASE_URL}/do/cedula?documentNumber=${cleanCedula}&documentType=CIE`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Verifik Cedula API error", { status: response.status, error: errorText });
      
      if (response.status === 404) {
        return {
          success: true,
          verified: false,
          error: "Cédula no encontrada en los registros oficiales"
        };
      }
      
      if (response.status === 401) {
        return {
          success: false,
          verified: false,
          error: "Error de autenticación con el servicio de verificación"
        };
      }
      
      return {
        success: false,
        verified: false,
        error: "Error al verificar la cédula. Intenta de nuevo."
      };
    }

    const data: CedulaVerificationResponse = await response.json();
    
    logger.info("Verifik Cedula verification response", { 
      status: data.data?.status,
      hasFullName: !!data.data?.fullName
    });

    if (!data.data) {
      return {
        success: false,
        verified: false,
        error: "No se recibieron datos de verificación"
      };
    }

    const isValid = data.data.status === 'VALID' || data.data.status === 'ACTIVE';

    const fullName = data.data.fullName || '';
    const nameParts = fullName.split(' ');
    const firstName = data.data.firstName || nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
    const lastName = data.data.lastName || nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');

    return {
      success: true,
      verified: isValid,
      cedula: data.data.documentNumber,
      nombre: firstName,
      apellido: lastName,
      rawData: data
    };

  } catch (error: any) {
    logger.error("Error in Verifik Cedula verification", error);
    return {
      success: false,
      verified: false,
      error: "Error al conectar con el servicio de verificación"
    };
  }
}

export async function scanAndVerifyCedula(imageBase64: string): Promise<{
  success: boolean;
  cedula?: string;
  nombre?: string;
  apellido?: string;
  verified: boolean;
  error?: string;
}> {
  const scanResult = await scanCedulaOCR(imageBase64);
  
  if (!scanResult.success || !scanResult.cedula) {
    return {
      success: false,
      verified: false,
      error: scanResult.error || "No se pudo escanear la cédula"
    };
  }

  const verifyResult = await verifyCedulaWithAPI(scanResult.cedula);
  
  if (!verifyResult.success) {
    return {
      success: true,
      cedula: scanResult.cedula,
      nombre: scanResult.nombre,
      apellido: scanResult.apellido,
      verified: false,
      error: verifyResult.error
    };
  }

  return {
    success: true,
    cedula: scanResult.cedula,
    nombre: verifyResult.nombre || scanResult.nombre,
    apellido: verifyResult.apellido || scanResult.apellido,
    verified: verifyResult.verified,
    error: verifyResult.verified ? undefined : "La cédula no pudo ser verificada en los registros oficiales"
  };
}
