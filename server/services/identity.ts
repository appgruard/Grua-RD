import { db } from "../db";
import { users } from "../../shared/schema";
import { verificationAudit } from "../schema-extensions";
import { eq } from "drizzle-orm";
import { logger } from "../logger";

/**
 * Identity Verification Service
 * Handles validation of Dominican Republic national identity cards (cédulas)
 */

interface CedulaValidationResult {
  valid: boolean;
  error?: string;
  formatted?: string;
}

/**
 * Validates Dominican Republic cédula format
 * Format: XXX-XXXXXXX-X (11 digits total)
 * Example: 001-1234567-8
 */
export function validateCedulaFormat(cedula: string): CedulaValidationResult {
  // Remove any whitespace
  const cleaned = cedula.replace(/\s/g, '');
  
  // Check if already formatted with dashes
  const withDashes = /^\d{3}-\d{7}-\d{1}$/;
  const withoutDashes = /^\d{11}$/;
  
  let digits: string;
  
  if (withDashes.test(cleaned)) {
    digits = cleaned.replace(/-/g, '');
  } else if (withoutDashes.test(cleaned)) {
    digits = cleaned;
  } else {
    return {
      valid: false,
      error: "Formato de cédula inválido. Debe contener 11 dígitos."
    };
  }
  
  // Validate checksum using Luhn algorithm (modulo 10)
  if (!validateCedulaChecksum(digits)) {
    return {
      valid: false,
      error: "Número de cédula inválido (checksum failed)."
    };
  }
  
  // Format with dashes
  const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
  
  return {
    valid: true,
    formatted
  };
}

/**
 * Validates cédula checksum using Luhn algorithm (modulo 10)
 * This is a common algorithm used for ID verification
 */
function validateCedulaChecksum(digits: string): boolean {
  if (digits.length !== 11) return false;
  
  let sum = 0;
  let alternate = false;
  
  // Process digits from right to left
  for (let i = digits.length - 2; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    alternate = !alternate;
  }
  
  const checkDigit = parseInt(digits[10], 10);
  const calculatedCheck = (10 - (sum % 10)) % 10;
  
  return checkDigit === calculatedCheck;
}

/**
 * Verifies a user's cédula and updates their verification status
 */
export async function verifyCedula(
  userId: string,
  cedula: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string; formatted?: string }> {
  try {
    // Validate format
    const validation = validateCedulaFormat(cedula);
    
    if (!validation.valid) {
      // Log failed attempt
      await db.insert(verificationAudit).values({
        userId,
        verificationType: 'cedula',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: validation.error,
      });
      
      logger.warn(`Failed cedula verification for user ${userId}: ${validation.error}`);
      
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Check if cédula is already in use by another user
    const existing = await db.query.users.findFirst({
      where: (users, { and, eq, ne }) => 
        and(
          eq(users.cedula, validation.formatted!),
          ne(users.id, userId)
        )
    });
    
    if (existing) {
      await db.insert(verificationAudit).values({
        userId,
        verificationType: 'cedula',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: "Cédula already registered to another user",
      });
      
      logger.warn(`Duplicate cedula attempt for user ${userId}`);
      
      return {
        success: false,
        error: "Esta cédula ya está registrada en el sistema."
      };
    }
    
    // Update user with verified cédula
    await db.update(users)
      .set({
        cedula: validation.formatted,
        cedulaVerificada: true
      })
      .where(eq(users.id, userId));
    
    // Log successful verification
    await db.insert(verificationAudit).values({
      userId,
      verificationType: 'cedula',
      success: true,
      ipAddress,
      userAgent,
      metadata: JSON.stringify({ cedula: validation.formatted }),
    });
    
    logger.info(`Successful cedula verification for user ${userId}`);
    
    return {
      success: true,
      formatted: validation.formatted
    };
    
  } catch (error) {
    logger.error("Error during cedula verification:", error);
    
    return {
      success: false,
      error: "Error al verificar la cédula. Por favor intente nuevamente."
    };
  }
}

/**
 * Checks if a user has completed identity verification
 */
export async function isIdentityVerified(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
    columns: {
      cedulaVerificada: true,
      telefonoVerificado: true
    }
  });
  
  return !!(user?.cedulaVerificada && user?.telefonoVerificado);
}
