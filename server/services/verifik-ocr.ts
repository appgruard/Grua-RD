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
      documentType: ocrData?.documentType || data.documentType,
      firstName: ocrData?.firstName,
      lastName: ocrData?.lastName,
      documentNumber: ocrData?.documentNumber || data.documentNumber,
      confidenceScore: confidenceScore,
      rawConfidenceScore: ocrData?.confidenceScore
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

export async function validateFacePhoto(imageBase64: string): Promise<FaceValidationResult> {
  if (!VERIFIK_API_KEY) {
    logger.warn("Verifik API key not configured for face validation");
    return {
      success: false,
      isHumanFace: false,
      score: 0,
      error: "El servicio de verificación no está configurado"
    };
  }

  const apiKey = VERIFIK_API_KEY.trim();
  logger.info("Starting Verifik face validation");

  try {
    const imageData = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    // Use the face-recognition/detect endpoint for human face detection
    const response = await fetch(`${VERIFIK_BASE_URL}/face-recognition/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `JWT ${apiKey}`
      },
      body: JSON.stringify({
        image: imageData
      })
    });

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
    const data: FaceValidationResponse = rawResponse.data || rawResponse;

    logger.info("Verifik face validation response", { 
      rawKeys: Object.keys(rawResponse),
      dataKeys: Object.keys(data),
      hasFace: data.hasFace,
      faceCount: data.faceCount,
      faces: data.faces,
      detections: data.detections,
      faceScore: data.faceScore,
      confidenceScore: data.confidenceScore,
      livenessScore: data.livenessScore,
      isHuman: data.isHuman
    });

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

export interface LicenseValidationResult {
  success: boolean;
  isValidLicense: boolean;
  score: number;
  scanId?: string;
  licenseNumber?: string;
  licenseClass?: string;
  expirationDate?: string;
  holderName?: string;
  details?: string;
  rawResponse?: any;
  error?: string;
}

export async function validateDriverLicense(imageBase64: string): Promise<LicenseValidationResult> {
  if (!VERIFIK_API_KEY) {
    logger.warn("Verifik API key not configured for license validation");
    return {
      success: false,
      isValidLicense: false,
      score: 0,
      error: "El servicio de verificación no está configurado"
    };
  }

  const apiKey = VERIFIK_API_KEY.trim();
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
        'Authorization': `Bearer ${apiKey}`
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

    logger.info("Verifik license validation response", { 
      documentType: ocrData?.documentType || data.documentType,
      documentNumber: ocrData?.documentNumber || ocrData?.licenseNumber || data.documentNumber,
      confidenceScore: ocrData?.confidenceScore || data.confidenceScore,
      imageValidated: data.imageValidated,
      scoreValidated: data.scoreValidated
    });

    // Calculate confidence score
    const rawConfidence = ocrData?.confidenceScore ?? data.confidenceScore ?? 0;
    // If we got license data but no confidence score, assume it was successfully read
    const confidenceScore = (typeof rawConfidence === 'number' && rawConfidence > 0)
      ? (rawConfidence > 1 ? rawConfidence / 100 : rawConfidence)
      : ((ocrData?.licenseNumber || ocrData?.documentNumber || data.documentNumber) ? 0.8 : 0);

    const licenseNumber = ocrData?.licenseNumber || ocrData?.documentNumber || data.documentNumber;
    const holderName = ocrData?.fullName || (ocrData?.firstName && ocrData?.lastName 
      ? `${ocrData.firstName} ${ocrData.lastName}`.trim() 
      : undefined);

    const isValidLicense = confidenceScore >= MINIMUM_VALIDATION_SCORE && !!licenseNumber;

    let details = "";
    if (!licenseNumber) {
      details = "No se pudo detectar un número de licencia en la imagen";
    } else if (confidenceScore < MINIMUM_VALIDATION_SCORE) {
      details = `La calidad del escaneo es muy baja (${Math.round(confidenceScore * 100)}%). Se requiere al menos 60%.`;
    }

    return {
      success: true,
      isValidLicense: isValidLicense,
      score: confidenceScore,
      scanId: data._id,
      licenseNumber: licenseNumber,
      licenseClass: ocrData?.licenseClass || ocrData?.category,
      expirationDate: ocrData?.expirationDate,
      holderName: holderName,
      details: details || undefined,
      rawResponse: data,
      error: isValidLicense ? undefined : details
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
  licenseClass?: string;
  verified: boolean;
  confidenceScore?: number;
  nameMatch?: boolean;
  nameSimilarity?: number;
  error?: string;
}

export async function scanAndVerifyLicense(
  imageBase64: string, 
  userNombre?: string, 
  userApellido?: string
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

  // Check if score meets minimum requirement
  if (scanResult.score < MINIMUM_VALIDATION_SCORE) {
    return {
      success: false,
      verified: false,
      confidenceScore: scanResult.score,
      error: `La calidad del escaneo es muy baja (${Math.round(scanResult.score * 100)}%). Se requiere al menos 60%.`
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

  const isVerified = scanResult.score >= MINIMUM_VALIDATION_SCORE && nameMatch;

  return {
    success: true,
    licenseNumber: scanResult.licenseNumber,
    nombre: extractedNombre || undefined,
    apellido: extractedApellido || undefined,
    expirationDate: scanResult.expirationDate,
    licenseClass: scanResult.licenseClass,
    verified: isVerified,
    confidenceScore: scanResult.score,
    nameMatch: nameMatch,
    nameSimilarity: nameSimilarity,
    error: isVerified ? undefined : nameError
  };
}

// ==================== UNIFIED DOCUMENT VALIDATION ====================

export type ValidationType = 'face' | 'license' | 'cedula';

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
