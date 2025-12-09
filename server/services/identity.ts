import { db } from "../db";
import { users } from "../../shared/schema";
import { eq, and, ne } from "drizzle-orm";
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
  // Remove any whitespace and dashes
  const cleaned = cedula.replace(/[\s-]/g, '');
  
  // Check if it's 11 digits
  if (!/^\d{11}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Formato de cédula inválido. Debe contener 11 dígitos."
    };
  }
  
  // Validate checksum using Dominican Republic algorithm
  if (!validateCedulaChecksum(cleaned)) {
    return {
      valid: false,
      error: "Número de cédula inválido (verificación de dígito fallida)."
    };
  }
  
  // Format with dashes: XXX-XXXXXXX-X
  const formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 10)}-${cleaned.slice(10)}`;
  
  return {
    valid: true,
    formatted
  };
}

/**
 * Validates cédula checksum using Dominican Republic algorithm
 * The check digit is at position 10 (0-indexed)
 * Algorithm: sum of (digit * weight) mod 11, then 11 - remainder
 */
function validateCedulaChecksum(digits: string): boolean {
  if (digits.length !== 11) return false;
  
  // Dominican cédula weights for first 10 digits
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  
  let sum = 0;
  
  // Process first 10 digits
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(digits[i], 10);
    let product = digit * weights[i];
    
    // If product is > 9, subtract 9
    if (product > 9) {
      product -= 9;
    }
    
    sum += product;
  }
  
  // Calculate check digit
  const remainder = sum % 11;
  const checkDigitCalculated = remainder === 0 ? 0 : 11 - remainder;
  const checkDigitProvided = parseInt(digits[10], 10);
  
  return checkDigitCalculated === checkDigitProvided;
}

/**
 * Verifies a user's cédula and updates their verification status
 * This is called after OCR scanning confirms:
 * - confidenceScore >= 0.6
 * - Name matches between document and registered user
 */
export async function verifyCedula(
  userId: string,
  cedula: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string; formatted?: string }> {
  try {
    // Clean and format the cedula (remove dashes/spaces)
    const cleaned = cedula.replace(/[\s-]/g, '');
    
    // Format with dashes: XXX-XXXXXXX-X
    const formatted = cleaned.length === 11 
      ? `${cleaned.slice(0, 3)}-${cleaned.slice(3, 10)}-${cleaned.slice(10)}`
      : cedula;
    
    // Get the current user's email to allow same cedula for same person's accounts
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true }
    });
    
    if (!currentUser) {
      return {
        success: false,
        error: "Usuario no encontrado."
      };
    }
    
    // Check if cédula is already in use by a DIFFERENT person (different email)
    // Allow same cedula for same person's multiple accounts (e.g., cliente and conductor)
    // Only allow duplicate if BOTH emails match and are non-null
    const allUsersWithCedula = await db.query.users.findMany({
      where: (users, { and, eq, ne }) => 
        and(
          eq(users.cedula, formatted),
          ne(users.id, userId)
        )
    });
    
    // Check if any of the users with this cedula have a different email
    // Null emails should not match - treat null as distinct
    const hasDuplicateFromDifferentPerson = allUsersWithCedula.some(existingUser => {
      // If either email is null/undefined, don't allow (can't verify same person)
      if (!currentUser.email || !existingUser.email) {
        return true; // Block duplicate
      }
      // Normalize emails: trim whitespace and lowercase before comparison
      // Different email = different person = block
      return existingUser.email.trim().toLowerCase() !== currentUser.email.trim().toLowerCase();
    });
    
    if (hasDuplicateFromDifferentPerson) {
      logger.warn(`Duplicate cedula attempt for user ${userId} - cedula belongs to different person`);
      
      return {
        success: false,
        error: "Esta cédula ya está registrada en el sistema."
      };
    }
    
    // Update user with verified cédula
    await db.update(users)
      .set({
        cedula: formatted,
        cedulaVerificada: true
      })
      .where(eq(users.id, userId));
    
    logger.info(`Successful cedula verification for user ${userId}`);
    
    return {
      success: true,
      formatted: formatted
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

/**
 * Gets verification history for a user
 * Note: Currently returns empty array as verification audit table is not implemented
 */
export async function getVerificationHistory(userId: string) {
  logger.info(`Verification history requested for user ${userId}`);
  return [];
}
