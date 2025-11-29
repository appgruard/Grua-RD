import { logger } from "../logger";

const VERIFIK_API_KEY = process.env.VERIFIK_API_KEY;
const VERIFIK_BASE_URL = "https://api.verifik.co/v2";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getNameTokens(text: string): string[] {
  return normalizeText(text).split(" ").filter(t => t.length > 0);
}

export function compareNames(
  registeredNombre: string,
  registeredApellido: string,
  documentNombre: string,
  documentApellido: string
): { match: boolean; similarity: number; details: string } {
  const regFirstTokens = getNameTokens(registeredNombre);
  const regLastTokens = getNameTokens(registeredApellido);
  const docFirstTokens = getNameTokens(documentNombre);
  const docLastTokens = getNameTokens(documentApellido);
  
  const regFullTokens = [...regFirstTokens, ...regLastTokens];
  const docFullTokens = [...docFirstTokens, ...docLastTokens];
  
  if (regFullTokens.length === 0 || docFullTokens.length === 0) {
    return { match: false, similarity: 0, details: "No se pudieron extraer nombres para comparar" };
  }
  
  let matchedTokens = 0;
  const totalTokens = Math.max(regFullTokens.length, docFullTokens.length);
  
  for (const regToken of regFullTokens) {
    if (docFullTokens.some(docToken => 
      docToken === regToken || 
      docToken.includes(regToken) || 
      regToken.includes(docToken)
    )) {
      matchedTokens++;
    }
  }
  
  const similarity = matchedTokens / totalTokens;
  
  const firstNameMatch = regFirstTokens.some(rt => 
    docFirstTokens.some(dt => dt === rt || dt.includes(rt) || rt.includes(dt))
  );
  
  const lastNameMatch = regLastTokens.some(rt => 
    docLastTokens.some(dt => dt === rt || dt.includes(rt) || rt.includes(dt))
  );
  
  const match = similarity >= 0.5 && (firstNameMatch || lastNameMatch);
  
  let details = "";
  if (!match) {
    details = `El nombre registrado "${registeredNombre} ${registeredApellido}" no coincide con el nombre en la cédula "${documentNombre} ${documentApellido}"`;
  }
  
  return { match, similarity, details };
}

interface VerifikOCRExtraction {
  documentType?: string;
  country?: string;
  category?: string;
  confidenceScore?: number;
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  nationality?: string;
  gender?: string;
  stateCivil?: string;
  occupation?: string;
  expirationDate?: string;
  [key: string]: any;
}

interface VerifikOCRResponse {
  _id?: string;
  country?: string;
  documentCategory?: string;
  documentNumber?: string;
  documentType?: string;
  firstNameMatchPercentage?: number;
  fullNameMatchPercentage?: number;
  lastNameMatchPercentage?: number;
  namesMatch?: boolean;
  gender?: string;
  imageValidated?: boolean;
  infoValidationSupported?: boolean;
  inputMethod?: string;
  nationality?: string;
  OCRExtraction?: VerifikOCRExtraction;
  requiresBackSide?: boolean;
  scoreValidated?: boolean;
  status?: string;
  type?: string;
  url?: string;
  validationMethod?: string;
  updatedAt?: string;
  createdAt?: string;
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
  confidenceScore?: number;
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
        'Authorization': `Bearer ${apiKey}`
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

    const rawResponse = await response.json();
    
    // Log the raw response structure to understand the API format
    logger.info("Verifik OCR raw response structure", { 
      topLevelKeys: Object.keys(rawResponse),
      hasDataWrapper: !!rawResponse.data,
      hasOCRExtraction: !!rawResponse.OCRExtraction,
      hasDataOCRExtraction: !!rawResponse.data?.OCRExtraction
    });
    
    // Handle both wrapped and unwrapped response formats
    const data: VerifikOCRResponse = rawResponse.data || rawResponse;
    
    const ocrData = data.OCRExtraction;
    const confidenceScore = ocrData?.confidenceScore ?? 0;
    
    logger.info("Verifik OCR response received", { 
      hasOCRData: !!ocrData,
      documentType: ocrData?.documentType || data.documentType,
      firstName: ocrData?.firstName,
      lastName: ocrData?.lastName,
      documentNumber: ocrData?.documentNumber || data.documentNumber,
      confidenceScore: confidenceScore
    });

    if (!ocrData && !data.documentNumber) {
      return {
        success: false,
        error: "No se pudo extraer información del documento"
      };
    }

    if (confidenceScore < 0.6) {
      logger.warn("Low confidence score in OCR scan", { confidenceScore });
      return {
        success: false,
        error: `La calidad del escaneo es muy baja (${Math.round(confidenceScore * 100)}%). Por favor, toma una foto más clara de tu cédula con buena iluminación.`
      };
    }

    const rawCedula = ocrData?.documentNumber || data.documentNumber || '';
    const cedula = rawCedula.replace(/[\s-]/g, '');
    
    if (!cedula || cedula.length !== 11) {
      return {
        success: false,
        error: "No se pudo detectar un número de cédula válido en la imagen"
      };
    }

    const firstName = ocrData?.firstName ? ocrData.firstName.trim() : '';
    const lastName = ocrData?.lastName ? ocrData.lastName.trim() : '';

    let nombre = firstName;
    let apellido = lastName;

    return {
      success: true,
      cedula: cedula,
      nombre: nombre,
      apellido: apellido,
      fechaNacimiento: ocrData?.dateOfBirth,
      confidenceScore: confidenceScore,
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
        'Authorization': `Bearer ${apiKey}`
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
  confidenceScore?: number;
  error?: string;
}> {
  const scanResult = await scanCedulaOCR(imageBase64);
  
  if (!scanResult.success || !scanResult.cedula) {
    return {
      success: false,
      verified: false,
      confidenceScore: scanResult.confidenceScore,
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
      confidenceScore: scanResult.confidenceScore,
      error: verifyResult.error
    };
  }

  return {
    success: true,
    cedula: scanResult.cedula,
    nombre: verifyResult.nombre || scanResult.nombre,
    apellido: verifyResult.apellido || scanResult.apellido,
    verified: verifyResult.verified,
    confidenceScore: scanResult.confidenceScore,
    error: verifyResult.verified ? undefined : "La cédula no pudo ser verificada en los registros oficiales"
  };
}
