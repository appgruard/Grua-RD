import { logger } from "../logger";

const VERIFIK_BASE_URL = "https://api.verifik.co/v2";

function getVerifikApiKey(): string | undefined {
  return process.env.VERIFIK_API_KEY;
}

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
  return !!getVerifikApiKey();
}

export async function scanCedulaOCR(imageBase64: string): Promise<OCRScanResult> {
  const apiKey = getVerifikApiKey();
  if (!apiKey) {
    logger.warn("Verifik API key not configured");
    return {
      success: false,
      error: "El servicio de verificación no está configurado"
    };
  }

  const trimmedKey = apiKey.trim();
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
        'Authorization': `Bearer ${trimmedKey}`
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
      
      if (response.status === 400) {
        // Parse error message if possible
        try {
          const errorJson = JSON.parse(errorText);
          const message = errorJson.message || errorJson.error || "Imagen no válida";
          logger.error("Verifik OCR 400 error details", { message, errorJson });
          return {
            success: false,
            error: `Error con la imagen: ${message}. Asegúrate de tomar una foto clara de tu cédula.`
          };
        } catch {
          return {
            success: false,
            error: "La imagen no es válida. Por favor, toma una foto más clara de tu cédula."
          };
        }
      }
      
      if (response.status === 422) {
        return {
          success: false,
          error: "No se pudo detectar un documento en la imagen. Asegúrate de que la cédula esté visible y bien iluminada."
        };
      }
      
      if (response.status >= 500) {
        return {
          success: false,
          error: "El servicio de verificación está temporalmente no disponible. Intenta más tarde."
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
    
    // Log full OCRExtraction to debug confidenceScore
    logger.info("Verifik OCR OCRExtraction details", {
      ocrDataKeys: ocrData ? Object.keys(ocrData) : [],
      ocrConfidenceScore: ocrData?.confidenceScore,
      ocrConfidenceScoreType: typeof ocrData?.confidenceScore
    });
    
    // Check for confidenceScore - if undefined or 0, assume document was read successfully
    const rawConfidence = ocrData?.confidenceScore;
    const confidenceScore = (typeof rawConfidence === 'number' && rawConfidence > 0) 
      ? rawConfidence 
      : (ocrData?.firstName && ocrData?.lastName ? 0.8 : 0);
    
    logger.info("Verifik OCR response received", { 
      hasOCRData: !!ocrData,
      verifik_id: data._id,
      verifik_url: data.url,
      documentType: ocrData?.documentType || data.documentType,
      firstName: ocrData?.firstName,
      lastName: ocrData?.lastName,
      documentNumber: ocrData?.documentNumber || data.documentNumber,
      confidenceScore: confidenceScore,
      rawConfidenceScore: ocrData?.confidenceScore,
      status: data.status,
      validationMethod: data.validationMethod
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
  const apiKey = getVerifikApiKey();
  if (!apiKey) {
    logger.warn("Verifik API key not configured");
    return {
      success: false,
      verified: false,
      error: "El servicio de verificación no está configurado"
    };
  }

  const trimmedKey = apiKey.trim();
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
        'Authorization': `Bearer ${trimmedKey}`
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

export async function scanAndVerifyCedula(imageBase64: string, userNombre?: string, userApellido?: string): Promise<{
  success: boolean;
  cedula?: string;
  nombre?: string;
  apellido?: string;
  verified: boolean;
  confidenceScore?: number;
  nameMatch?: boolean;
  nameSimilarity?: number;
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

  // Verification is based on confidenceScore >= 0.6 (already validated in scanCedulaOCR)
  // and name matching if user name is provided
  let nameMatch = true;
  let nameSimilarity = 1;
  let nameError: string | undefined;

  if (userNombre && userApellido && scanResult.nombre && scanResult.apellido) {
    const nameComparison = compareNames(
      userNombre,
      userApellido,
      scanResult.nombre,
      scanResult.apellido
    );
    
    nameMatch = nameComparison.match;
    nameSimilarity = nameComparison.similarity;
    
    if (!nameMatch) {
      nameError = `El nombre en la cédula "${scanResult.nombre} ${scanResult.apellido}" no coincide con el nombre registrado "${userNombre} ${userApellido}"`;
    }
  }

  const isVerified = (scanResult.confidenceScore ?? 0) >= 0.6 && nameMatch;

  return {
    success: true,
    cedula: scanResult.cedula,
    nombre: scanResult.nombre,
    apellido: scanResult.apellido,
    verified: isVerified,
    confidenceScore: scanResult.confidenceScore,
    nameMatch: nameMatch,
    nameSimilarity: nameSimilarity,
    error: isVerified ? undefined : nameError
  };
}

// ==================== FACE VALIDATION (PROFILE PHOTO) ====================

interface FaceDetectionBox {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface FaceDetectionResult {
  box?: FaceDetectionBox;
  score?: number;
  confidence?: number;
  landmarks?: any;
  age?: number;
  gender?: string;
  emotion?: string;
}

interface FaceValidationResponse {
  _id?: string;
  hasFace?: boolean;
  faceCount?: number;
  faceScore?: number;
  confidenceScore?: number;
  livenessScore?: number;
  isHuman?: boolean;
  faces?: FaceDetectionResult[];
  detections?: FaceDetectionResult[];
  quality?: {
    brightness?: number;
    sharpness?: number;
    contrast?: number;
  };
  faceDetails?: {
    age?: number;
    gender?: string;
    expression?: string;
  };
  error?: string;
  message?: string;
}

export interface FaceValidationResult {
  success: boolean;
  isHumanFace: boolean;
  score: number;
  scanId?: string;
  details?: string;
  rawResponse?: any;
  error?: string;
}

const MINIMUM_VALIDATION_SCORE = 0.6;
const MINIMUM_LICENSE_FRONT_SCORE = 0.5; // Lower threshold for license front
const MINIMUM_LICENSE_BACK_SCORE = 0.5; // Lower threshold for license back (category/restrictions)

/**
 * Normalizes a cedula number by removing dashes and spaces.
 * Cedula format: 402-1534383-7 -> 40215343837
 * License format: 40215343837 (already normalized)
 */
export function normalizeCedulaNumber(cedula: string): string {
  if (!cedula) return '';
  return cedula.replace(/[-\s]/g, '').trim();
}

/**
 * Compares two cedula numbers after normalizing their formats.
 * Cedula format: 402-1534383-7
 * License format: 40215343837
 */
export function compareCedulaNumbers(cedula1: string, cedula2: string): boolean {
  const normalized1 = normalizeCedulaNumber(cedula1);
  const normalized2 = normalizeCedulaNumber(cedula2);
  return normalized1 === normalized2 && normalized1.length === 11;
}

export async function validateFacePhoto(imageBase64: string): Promise<FaceValidationResult> {
  const apiKey = getVerifikApiKey();
  if (!apiKey) {
    logger.warn("Verifik API key not configured for face validation");
    return {
      success: false,
      isHumanFace: false,
      score: 0,
      error: "El servicio de verificación no está configurado"
    };
  }

  const trimmedKey = apiKey.trim();
  logger.info("Starting Verifik face validation");

  try {
    // Remove the data URI prefix if present - API expects raw base64
    const imageData = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;

    // Add timeout to prevent hanging requests (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Use the face-recognition/search endpoint for human face detection
    let response: Response;
    try {
      response = await fetch(`${VERIFIK_BASE_URL}/face-recognition/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `JWT ${trimmedKey}`
        },
        body: JSON.stringify({
          images: [imageData],
          min_score: 0.6,
          search_mode: "FAST"
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Verifik face validation API error", { status: response.status, error: errorText });
      
      if (response.status === 401) {
        return {
          success: false,
          isHumanFace: false,
          score: 0,
          error: "Error de autenticación con el servicio de verificación"
        };
      }
      
      return {
        success: false,
        isHumanFace: false,
        score: 0,
        error: "Error al procesar la foto. Intenta de nuevo."
      };
    }

    const rawResponse = await response.json();
    
    // Check if data is an array (search results) or an object (detection response)
    const dataArray = rawResponse.data;
    const isSearchResultArray = Array.isArray(dataArray);
    
    logger.info("Verifik face validation response", { 
      rawKeys: Object.keys(rawResponse),
      isSearchResultArray,
      resultCount: isSearchResultArray ? dataArray.length : 0,
      hasSignature: !!rawResponse.signature
    });

    // If we got search results back, it means a face was detected and matched
    if (isSearchResultArray) {
      const hasResults = dataArray.length > 0;
      
      // Extract score from the first result if available
      let bestScore = 0;
      if (hasResults && dataArray[0]) {
        bestScore = dataArray[0].score ?? dataArray[0].similarity ?? dataArray[0].confidence ?? 0.85;
      }
      
      // Normalize score to 0-1 range
      const normalizedScore = bestScore > 1 ? bestScore / 100 : bestScore;
      
      // If we got search results, a face was definitely detected
      const isValidHumanFace = hasResults;
      
      return {
        success: true,
        isHumanFace: isValidHumanFace,
        score: isValidHumanFace ? (normalizedScore > 0 ? normalizedScore : 0.85) : 0,
        scanId: rawResponse.id,
        details: isValidHumanFace ? undefined : "No se detectó un rostro en la imagen",
        rawResponse: rawResponse,
        error: isValidHumanFace ? undefined : "No se detectó un rostro en la imagen"
      };
    }
    
    // Handle object response (detection/validation endpoint)
    const data: FaceValidationResponse = rawResponse.data || rawResponse;

    // Handle faces array from detection endpoint
    const facesArray = data.faces || data.detections || [];
    const detectedFaceCount = facesArray.length;
    
    // Calculate the overall score from available metrics
    let faceScore = 0;
    if (detectedFaceCount > 0 && facesArray[0]) {
      faceScore = facesArray[0].score ?? facesArray[0].confidence ?? 0;
    }
    faceScore = faceScore || (data.faceScore ?? data.confidenceScore ?? data.livenessScore ?? 0);
    
    const hasFace = data.hasFace ?? (detectedFaceCount > 0 || (data.faceCount !== undefined && data.faceCount > 0));
    const isHuman = data.isHuman ?? hasFace;
    
    // Normalize score to 0-1 range if needed
    const normalizedScore = faceScore > 1 ? faceScore / 100 : faceScore;
    
    // If a face was detected, consider it valid even if score is 0 (API might not return score for detection)
    const isValidHumanFace = hasFace && (normalizedScore >= MINIMUM_VALIDATION_SCORE || (detectedFaceCount > 0 && normalizedScore === 0));

    let details = "";
    if (!hasFace && detectedFaceCount === 0) {
      details = "No se detectó un rostro en la imagen";
    } else if (!isHuman) {
      details = "La imagen no parece ser de un rostro humano";
    } else if (normalizedScore > 0 && normalizedScore < MINIMUM_VALIDATION_SCORE) {
      details = `La calidad de la imagen es muy baja (${Math.round(normalizedScore * 100)}%). Se requiere al menos 60%.`;
    }

    return {
      success: true,
      isHumanFace: isValidHumanFace,
      score: normalizedScore > 0 ? normalizedScore : (hasFace ? 0.8 : 0),
      scanId: data._id,
      details: details || undefined,
      rawResponse: data,
      error: isValidHumanFace ? undefined : details
    };

  } catch (error: any) {
    // Handle timeout (AbortError)
    if (error?.name === 'AbortError') {
      logger.error("Verifik face validation timeout", { error: error.message });
      return {
        success: false,
        isHumanFace: false,
        score: 0,
        error: "La verificación está tardando demasiado. Intenta de nuevo."
      };
    }
    
    logger.error("Error in Verifik face validation", error);
    return {
      success: false,
      isHumanFace: false,
      score: 0,
      error: "Error al conectar con el servicio de verificación"
    };
  }
}

// ==================== LICENSE VALIDATION ====================

/**
 * Checks if the document type indicates a driver's license.
 * Handles various formats: "Driver's License", "Licencia de conducir", "DL", etc.
 */
function isDocumentTypeDriverLicense(documentType: string): boolean {
  if (!documentType) return false;
  
  const normalizedType = documentType.toLowerCase().trim();
  
  // List of valid driver's license identifiers
  const validTypes = [
    'driver',
    'license',
    'licencia',
    'conducir',
    'conduccion',
    'dl',
    'driving',
    'permiso de conducir',
    'carnet de conducir'
  ];
  
  return validTypes.some(type => normalizedType.includes(type));
}

/**
 * Parses a date string from various formats commonly found in Dominican documents.
 * Supports: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY
 */
function parseDateString(dateString: string): Date | null {
  if (!dateString) return null;
  
  const cleanDate = dateString.trim();
  
  // Try DD/MM/YYYY format (common in Dominican licenses)
  const ddmmyyyySlash = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyySlash) {
    const [, day, month, year] = ddmmyyyySlash;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Try YYYY-MM-DD format (ISO)
  const isoFormat = cleanDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoFormat) {
    const [, year, month, day] = isoFormat;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Try DD-MM-YYYY format
  const ddmmyyyyDash = cleanDate.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDash) {
    const [, day, month, year] = ddmmyyyyDash;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Try native Date parsing as fallback
  const parsed = new Date(cleanDate);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

/**
 * Calculates expiration date from issue date (Dominican licenses expire 4 years after issuance)
 */
function calculateExpirationFromIssueDate(issueDate: Date): Date {
  const expiration = new Date(issueDate);
  expiration.setFullYear(expiration.getFullYear() + 4);
  return expiration;
}

/**
 * Parses expiration date from various formats.
 * Supports: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY
 * @deprecated Use parseDateString instead
 */
function parseExpirationDate(dateString: string): Date | null {
  return parseDateString(dateString);
}

interface LicenseOCRExtraction {
  documentType?: string;
  country?: string;
  category?: string;
  licenseNumber?: string;
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  expirationDate?: string;
  issueDate?: string;
  licenseClass?: string;
  restrictions?: string;
  confidenceScore?: number;
  [key: string]: any;
}

interface LicenseValidationResponse {
  _id?: string;
  documentType?: string;
  documentCategory?: string;
  documentNumber?: string;
  imageValidated?: boolean;
  scoreValidated?: boolean;
  OCRExtraction?: LicenseOCRExtraction;
  confidenceScore?: number;
  status?: string;
  error?: string;
  message?: string;
}

export type ExpirationDateSource = 'ocr' | 'calculated_from_issue' | 'manual_required';

export interface LicenseValidationResult {
  success: boolean;
  isValidLicense: boolean;
  score: number;
  scanId?: string;
  licenseNumber?: string;
  licenseClass?: string;
  expirationDate?: string;
  issueDate?: string;
  expirationDateSource?: ExpirationDateSource;
  holderName?: string;
  details?: string;
  rawResponse?: any;
  error?: string;
}

export async function validateDriverLicense(imageBase64: string): Promise<LicenseValidationResult> {
  const apiKey = getVerifikApiKey();
  if (!apiKey) {
    logger.warn("Verifik API key not configured for license validation");
    return {
      success: false,
      isValidLicense: false,
      score: 0,
      error: "El servicio de verificación no está configurado"
    };
  }

  const trimmedKey = apiKey.trim();
  logger.info("Starting Verifik license validation");

  try {
    const imageData = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    // Use OCR scan with document type for driver's license
    const response = await fetch(`${VERIFIK_BASE_URL}/ocr/scan-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`
      },
      body: JSON.stringify({
        image: imageData,
        documentType: "DL" // Driver's License
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Verifik license validation API error", { status: response.status, error: errorText });
      
      if (response.status === 401) {
        return {
          success: false,
          isValidLicense: false,
          score: 0,
          error: "Error de autenticación con el servicio de verificación"
        };
      }
      
      return {
        success: false,
        isValidLicense: false,
        score: 0,
        error: "Error al procesar la licencia. Intenta de nuevo."
      };
    }

    const rawResponse = await response.json();
    const data: LicenseValidationResponse = rawResponse.data || rawResponse;
    const ocrData = data.OCRExtraction;

    // Extract document type for validation
    const documentType = ocrData?.documentType || data.documentType || '';
    const licenseNumber = ocrData?.licenseNumber || ocrData?.documentNumber || data.documentNumber;
    const rawExpirationDate = ocrData?.expirationDate;
    const rawIssueDate = ocrData?.issueDate;

    logger.info("Verifik license validation response", { 
      documentType: documentType,
      documentNumber: licenseNumber,
      expirationDate: rawExpirationDate,
      issueDate: rawIssueDate,
      ocrDataKeys: ocrData ? Object.keys(ocrData) : [],
      rawOcrData: ocrData
    });

    // Validate that the document is a driver's license by checking documentType
    const isDriverLicense = isDocumentTypeDriverLicense(documentType);
    
    if (!isDriverLicense) {
      logger.warn("Document is not a driver's license", { documentType });
      return {
        success: false,
        isValidLicense: false,
        score: 0,
        licenseNumber: licenseNumber,
        error: "El documento no parece ser una licencia de conducir. Por favor, sube una imagen de tu licencia de conducir."
      };
    }

    // Check if license number was extracted (11-digit cedula number)
    if (!licenseNumber) {
      return {
        success: false,
        isValidLicense: false,
        score: 0,
        error: "No se pudo detectar el número de cédula en la licencia. Por favor, toma una foto más clara."
      };
    }

    // Validate license number format (should be 11 digits like cedula)
    const cleanLicenseNumber = licenseNumber.replace(/[-\s]/g, '');
    if (cleanLicenseNumber.length !== 11 || !/^\d{11}$/.test(cleanLicenseNumber)) {
      logger.warn("Invalid license number format", { licenseNumber, cleanLicenseNumber });
      return {
        success: false,
        isValidLicense: false,
        score: 0,
        licenseNumber: licenseNumber,
        error: "El número de cédula en la licencia no tiene un formato válido."
      };
    }

    // Try to determine expiration date from multiple sources
    let finalExpirationDate: string | undefined;
    let parsedExpirationDate: Date | null = null;
    let expirationDateSource: ExpirationDateSource = 'manual_required';
    let isExpired = false;
    
    // First, try to parse the expiration date directly from OCR
    if (rawExpirationDate) {
      parsedExpirationDate = parseDateString(rawExpirationDate);
      if (parsedExpirationDate) {
        finalExpirationDate = rawExpirationDate;
        expirationDateSource = 'ocr';
        logger.info("Expiration date extracted from OCR", { rawExpirationDate, parsed: parsedExpirationDate });
      } else {
        logger.warn("Could not parse expiration date from OCR", { rawExpirationDate });
      }
    }
    
    // If expiration date not available, try to calculate from issue date (+4 years)
    if (!parsedExpirationDate && rawIssueDate) {
      const parsedIssueDate = parseDateString(rawIssueDate);
      if (parsedIssueDate) {
        parsedExpirationDate = calculateExpirationFromIssueDate(parsedIssueDate);
        // Format as DD/MM/YYYY for consistency
        const day = parsedExpirationDate.getDate().toString().padStart(2, '0');
        const month = (parsedExpirationDate.getMonth() + 1).toString().padStart(2, '0');
        const year = parsedExpirationDate.getFullYear();
        finalExpirationDate = `${day}/${month}/${year}`;
        expirationDateSource = 'calculated_from_issue';
        logger.info("Expiration date calculated from issue date", { 
          issueDate: rawIssueDate, 
          calculatedExpiration: finalExpirationDate 
        });
      }
    }
    
    // Check if license is expired (only if we have a valid expiration date)
    if (parsedExpirationDate) {
      isExpired = parsedExpirationDate < new Date();
      if (isExpired) {
        logger.warn("License is expired", { expirationDate: finalExpirationDate, parsedDate: parsedExpirationDate });
        return {
          success: false,
          isValidLicense: false,
          score: 0,
          licenseNumber: cleanLicenseNumber,
          expirationDate: finalExpirationDate,
          issueDate: rawIssueDate,
          expirationDateSource,
          error: `La licencia está vencida (${finalExpirationDate}). Debe renovar su licencia antes de registrarse.`
        };
      }
    }
    
    // Log if expiration date could not be determined
    if (expirationDateSource === 'manual_required') {
      logger.warn("Expiration date could not be determined - manual entry required", { 
        rawExpirationDate,
        rawIssueDate,
        licenseNumber: cleanLicenseNumber
      });
    }

    // Calculate confidence score - if we got valid license data, consider it successful
    const rawConfidence = ocrData?.confidenceScore ?? data.confidenceScore ?? 0;
    const confidenceScore = (typeof rawConfidence === 'number' && rawConfidence > 0)
      ? (rawConfidence > 1 ? rawConfidence / 100 : rawConfidence)
      : 0.8; // Default to 0.8 if we successfully extracted required data

    const holderName = ocrData?.fullName || (ocrData?.firstName && ocrData?.lastName 
      ? `${ocrData.firstName} ${ocrData.lastName}`.trim() 
      : undefined);

    return {
      success: true,
      isValidLicense: true,
      score: confidenceScore,
      scanId: data._id,
      licenseNumber: cleanLicenseNumber,
      licenseClass: ocrData?.licenseClass || ocrData?.category,
      expirationDate: finalExpirationDate,
      issueDate: rawIssueDate,
      expirationDateSource,
      holderName: holderName,
      details: undefined,
      rawResponse: data,
      error: undefined
    };

  } catch (error: any) {
    logger.error("Error in Verifik license validation", error);
    return {
      success: false,
      isValidLicense: false,
      score: 0,
      error: "Error al conectar con el servicio de verificación"
    };
  }
}

// ==================== SCAN AND VERIFY LICENSE WITH NAME COMPARISON ====================

export interface ScanAndVerifyLicenseResult {
  success: boolean;
  licenseNumber?: string;
  nombre?: string;
  apellido?: string;
  expirationDate?: string;
  issueDate?: string;
  expirationDateSource?: ExpirationDateSource;
  licenseClass?: string;
  verified: boolean;
  confidenceScore?: number;
  nameMatch?: boolean;
  nameSimilarity?: number;
  cedulaMatch?: boolean;
  error?: string;
}

export async function scanAndVerifyLicense(
  imageBase64: string, 
  userNombre?: string, 
  userApellido?: string,
  userCedula?: string
): Promise<ScanAndVerifyLicenseResult> {
  const scanResult = await validateDriverLicense(imageBase64);
  
  if (!scanResult.success || !scanResult.licenseNumber) {
    return {
      success: false,
      verified: false,
      confidenceScore: scanResult.score,
      error: scanResult.error || "No se pudo escanear la licencia"
    };
  }

  // Check if score meets minimum requirement (using lower threshold 0.5)
  if (scanResult.score < MINIMUM_LICENSE_FRONT_SCORE) {
    return {
      success: false,
      verified: false,
      confidenceScore: scanResult.score,
      error: `La calidad del escaneo es muy baja (${Math.round(scanResult.score * 100)}%). Se requiere al menos 50%.`
    };
  }

  // Extract name from OCR result
  let extractedNombre = '';
  let extractedApellido = '';
  
  if (scanResult.holderName) {
    const nameParts = scanResult.holderName.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      // Typically firstName lastName format
      extractedNombre = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
      extractedApellido = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');
    } else if (nameParts.length === 1) {
      extractedNombre = nameParts[0];
    }
  }

  // Name comparison if user name is provided
  let nameMatch = true;
  let nameSimilarity = 1;
  let nameError: string | undefined;

  if (userNombre && userApellido && (extractedNombre || extractedApellido)) {
    const nameComparison = compareNames(
      userNombre,
      userApellido,
      extractedNombre,
      extractedApellido
    );
    
    nameMatch = nameComparison.match;
    nameSimilarity = nameComparison.similarity;
    
    if (!nameMatch) {
      nameError = `El nombre en la licencia "${extractedNombre} ${extractedApellido}" no coincide con el nombre registrado "${userNombre} ${userApellido}"`;
    }
  } else if (userNombre && userApellido && !scanResult.holderName) {
    // Could not extract name from license - still valid but can't verify name match
    logger.warn("Could not extract name from license for comparison", {
      hasHolderName: !!scanResult.holderName
    });
    // We'll consider this as a match if we can't extract the name, 
    // since the license was validated with good score
    nameMatch = true;
    nameSimilarity = 0;
  }

  // Cedula comparison: the license number IS the cedula number (without dashes)
  // Cedula format: 402-1534383-7 -> License format: 40215343837
  let cedulaMatch = true;
  let cedulaError: string | undefined;

  if (userCedula && scanResult.licenseNumber) {
    cedulaMatch = compareCedulaNumbers(userCedula, scanResult.licenseNumber);
    
    if (!cedulaMatch) {
      const normalizedUserCedula = normalizeCedulaNumber(userCedula);
      const normalizedLicenseNumber = normalizeCedulaNumber(scanResult.licenseNumber);
      
      logger.warn("Cedula mismatch during license verification", {
        userCedula: normalizedUserCedula,
        licenseNumber: normalizedLicenseNumber
      });
      
      cedulaError = `El número de cédula en la licencia (${normalizedLicenseNumber}) no coincide con la cédula verificada (${normalizedUserCedula})`;
    }
  }

  const isVerified = scanResult.score >= MINIMUM_LICENSE_FRONT_SCORE && nameMatch && cedulaMatch;
  
  // Determine the error message to return
  let finalError: string | undefined;
  if (!isVerified) {
    if (!cedulaMatch && cedulaError) {
      finalError = cedulaError;
    } else if (!nameMatch && nameError) {
      finalError = nameError;
    }
  }

  return {
    success: true,
    licenseNumber: scanResult.licenseNumber,
    nombre: extractedNombre || undefined,
    apellido: extractedApellido || undefined,
    expirationDate: scanResult.expirationDate,
    issueDate: scanResult.issueDate,
    expirationDateSource: scanResult.expirationDateSource,
    licenseClass: scanResult.licenseClass,
    verified: isVerified,
    confidenceScore: scanResult.score,
    nameMatch: nameMatch,
    nameSimilarity: nameSimilarity,
    cedulaMatch: cedulaMatch,
    error: finalError
  };
}

// ==================== LICENSE BACK VALIDATION (CATEGORY & RESTRICTIONS) ====================

export interface LicenseBackValidationResult {
  success: boolean;
  isValid: boolean;
  score: number;
  scanId?: string;
  category?: string;
  restrictions?: string;
  expirationDate?: string;
  details?: string;
  rawResponse?: any;
  error?: string;
}

export async function validateDriverLicenseBack(imageBase64: string): Promise<LicenseBackValidationResult> {
  const apiKey = getVerifikApiKey();
  if (!apiKey) {
    logger.warn("Verifik API key not configured for license back validation");
    return {
      success: false,
      isValid: false,
      score: 0,
      error: "El servicio de verificación no está configurado"
    };
  }

  const trimmedKey = apiKey.trim();
  logger.info("Starting Verifik license back validation");

  try {
    const imageData = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch(`${VERIFIK_BASE_URL}/ocr/scan-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`
      },
      body: JSON.stringify({
        image: imageData,
        documentType: "DL"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Verifik license back validation API error", { status: response.status, error: errorText });
      
      if (response.status === 401) {
        return {
          success: false,
          isValid: false,
          score: 0,
          error: "Error de autenticación con el servicio de verificación"
        };
      }
      
      // Handle 409 Conflict "failed_to_read" - API couldn't read OCR but image may still be valid
      // Accept the license back with a default score ONLY for the specific "failed_to_read" message
      if (response.status === 409) {
        try {
          const errorData = JSON.parse(errorText);
          // Only accept if the specific message is "failed_to_read" - other 409 errors should fail
          if (errorData.message === 'failed_to_read') {
            logger.warn("Verifik license back OCR failed_to_read - accepting with default score", { 
              status: response.status,
              errorData 
            });
            // Return as valid with minimum acceptable score - the front license already validated identity
            return {
              success: true,
              isValid: true,
              score: MINIMUM_LICENSE_BACK_SCORE,
              details: "Licencia trasera aceptada (OCR limitado)",
              error: undefined
            };
          } else {
            // Log unexpected 409 error for debugging
            logger.error("Verifik license back 409 error with unexpected message", { 
              status: response.status,
              message: errorData.message,
              code: errorData.code,
              errorData 
            });
          }
        } catch (parseError) {
          // Log parse error for debugging
          logger.error("Verifik license back 409 error - failed to parse response", { 
            status: response.status,
            errorText,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
          });
        }
      }
      
      return {
        success: false,
        isValid: false,
        score: 0,
        error: "Error al procesar la licencia trasera. Intenta de nuevo."
      };
    }

    const rawResponse = await response.json();
    const data: LicenseValidationResponse = rawResponse.data || rawResponse;
    const ocrData = data.OCRExtraction;

    logger.info("Verifik license back validation response", { 
      documentType: ocrData?.documentType || data.documentType,
      category: ocrData?.category || ocrData?.licenseClass,
      restrictions: ocrData?.restrictions,
      expirationDate: ocrData?.expirationDate,
      confidenceScore: ocrData?.confidenceScore || data.confidenceScore
    });

    const rawConfidence = ocrData?.confidenceScore ?? data.confidenceScore ?? 0;
    const confidenceScore = (typeof rawConfidence === 'number' && rawConfidence > 0)
      ? (rawConfidence > 1 ? rawConfidence / 100 : rawConfidence)
      : ((ocrData?.category || ocrData?.licenseClass) ? 0.8 : 0);

    const category = ocrData?.category || ocrData?.licenseClass || '';
    const restrictions = ocrData?.restrictions || '';
    const expirationDate = ocrData?.expirationDate || '';

    const normalizedCategory = normalizeCategory(category);
    
    // Use lower threshold for license back (0.5) since front license already validated identity
    const isValid = confidenceScore >= MINIMUM_LICENSE_BACK_SCORE;

    let details = "";
    if (!isValid) {
      if (confidenceScore < MINIMUM_LICENSE_BACK_SCORE && confidenceScore > 0) {
        details = `La calidad del escaneo es muy baja (${Math.round(confidenceScore * 100)}%). Se requiere al menos 50%.`;
      } else {
        details = "No se pudo extraer información de la parte trasera de la licencia";
      }
    }

    return {
      success: true,
      isValid: isValid,
      score: confidenceScore,
      scanId: data._id,
      category: normalizedCategory || undefined,
      restrictions: restrictions || undefined,
      expirationDate: expirationDate || undefined,
      details: details || undefined,
      rawResponse: data,
      error: isValid ? undefined : details
    };

  } catch (error: any) {
    logger.error("Error in Verifik license back validation", error);
    return {
      success: false,
      isValid: false,
      score: 0,
      error: "Error al conectar con el servicio de verificación"
    };
  }
}

function normalizeCategory(category: string): string {
  if (!category) return '';
  
  const upperCategory = category.toUpperCase().trim();
  
  const validCategories = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const valid of validCategories) {
    if (upperCategory.includes(valid)) {
      const matches = upperCategory.match(/[A-F]/g);
      if (matches) {
        return matches.join(', ');
      }
    }
  }
  
  return upperCategory;
}

// ==================== UNIFIED DOCUMENT VALIDATION ====================

export type ValidationType = 'face' | 'license' | 'license_back' | 'cedula';

export interface UnifiedValidationResult {
  success: boolean;
  isValid: boolean;
  score: number;
  validationType: ValidationType;
  scanId?: string;
  details?: string;
  rawResponse?: any;
  error?: string;
}

export async function validateDocument(
  imageBase64: string, 
  validationType: ValidationType
): Promise<UnifiedValidationResult> {
  switch (validationType) {
    case 'face': {
      const result = await validateFacePhoto(imageBase64);
      return {
        success: result.success,
        isValid: result.isHumanFace,
        score: result.score,
        validationType: 'face',
        scanId: result.scanId,
        details: result.details,
        rawResponse: result.rawResponse,
        error: result.error
      };
    }
    case 'license': {
      const result = await validateDriverLicense(imageBase64);
      return {
        success: result.success,
        isValid: result.isValidLicense,
        score: result.score,
        validationType: 'license',
        scanId: result.scanId,
        details: result.details,
        rawResponse: result.rawResponse,
        error: result.error
      };
    }
    case 'license_back': {
      const result = await validateDriverLicenseBack(imageBase64);
      return {
        success: result.success,
        isValid: result.isValid,
        score: result.score,
        validationType: 'license_back',
        scanId: result.scanId,
        details: result.details,
        rawResponse: result.rawResponse,
        error: result.error
      };
    }
    case 'cedula': {
      const result = await scanCedulaOCR(imageBase64);
      return {
        success: result.success,
        isValid: (result.confidenceScore ?? 0) >= MINIMUM_VALIDATION_SCORE,
        score: result.confidenceScore ?? 0,
        validationType: 'cedula',
        details: result.error,
        rawResponse: result.rawData,
        error: result.error
      };
    }
    default:
      return {
        success: false,
        isValid: false,
        score: 0,
        validationType,
        error: `Tipo de validación no soportado: ${validationType}`
      };
  }
}
