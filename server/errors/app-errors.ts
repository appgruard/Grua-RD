/**
 * Application Error Classes
 * Custom error types with classification metadata for automatic ticketing
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorSource = 'database' | 'external_api' | 'internal_service' | 'authentication' | 'payment' | 'file_storage' | 'websocket' | 'email' | 'sms' | 'unknown';
export type ErrorType = 'connection_error' | 'timeout_error' | 'validation_error' | 'permission_error' | 'not_found_error' | 'rate_limit_error' | 'configuration_error' | 'integration_error' | 'system_error' | 'unknown_error';

export interface ErrorMetadata {
  errorType: ErrorType;
  errorSource: ErrorSource;
  severity: ErrorSeverity;
  isUserError: boolean;
  shouldCreateTicket: boolean;
  userMessage: string;
}

/**
 * Base application error with classification metadata
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorType: ErrorType;
  public readonly errorSource: ErrorSource;
  public readonly severity: ErrorSeverity;
  public readonly isUserError: boolean;
  public readonly shouldCreateTicket: boolean;
  public readonly userMessage: string;
  public readonly metadata?: Record<string, any>;
  public readonly originalError?: Error;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      errorType?: ErrorType;
      errorSource?: ErrorSource;
      severity?: ErrorSeverity;
      isUserError?: boolean;
      shouldCreateTicket?: boolean;
      userMessage?: string;
      metadata?: Record<string, any>;
      originalError?: Error;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.errorType = options.errorType ?? 'unknown_error';
    this.errorSource = options.errorSource ?? 'unknown';
    this.severity = options.severity ?? 'medium';
    this.isUserError = options.isUserError ?? false;
    this.shouldCreateTicket = options.shouldCreateTicket ?? !options.isUserError;
    this.userMessage = options.userMessage ?? 'Ha ocurrido un error. Por favor, intenta de nuevo.';
    this.metadata = options.metadata;
    this.originalError = options.originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============ User Errors (no ticket creation) ============

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, {
      statusCode: 400,
      errorType: 'validation_error',
      errorSource: 'internal_service',
      severity: 'low',
      isUserError: true,
      shouldCreateTicket: false,
      userMessage: message,
      metadata: field ? { field } : undefined,
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, {
      statusCode: 401,
      errorType: 'permission_error',
      errorSource: 'authentication',
      severity: 'low',
      isUserError: true,
      shouldCreateTicket: false,
      userMessage: message,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado') {
    super(message, {
      statusCode: 403,
      errorType: 'permission_error',
      errorSource: 'authentication',
      severity: 'low',
      isUserError: true,
      shouldCreateTicket: false,
      userMessage: message,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} no encontrado`, {
      statusCode: 404,
      errorType: 'not_found_error',
      errorSource: 'internal_service',
      severity: 'low',
      isUserError: true,
      shouldCreateTicket: false,
      userMessage: `${resource} no encontrado`,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, {
      statusCode: 409,
      errorType: 'validation_error',
      errorSource: 'internal_service',
      severity: 'low',
      isUserError: true,
      shouldCreateTicket: false,
      userMessage: message,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas solicitudes. Intenta de nuevo más tarde.') {
    super(message, {
      statusCode: 429,
      errorType: 'rate_limit_error',
      errorSource: 'internal_service',
      severity: 'low',
      isUserError: true,
      shouldCreateTicket: false,
      userMessage: message,
    });
  }
}

// ============ System Errors (create tickets) ============

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, {
      statusCode: 500,
      errorType: 'connection_error',
      errorSource: 'database',
      severity: 'high',
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: 'Error de conexión con la base de datos. Estamos trabajando en solucionarlo.',
      originalError,
    });
  }
}

export class ExternalApiError extends AppError {
  constructor(service: string, message: string, originalError?: Error, severity: ErrorSeverity = 'medium') {
    super(`Error en servicio externo ${service}: ${message}`, {
      statusCode: 502,
      errorType: 'integration_error',
      errorSource: 'external_api',
      severity,
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: `Error al conectar con ${service}. Por favor, intenta de nuevo.`,
      metadata: { service },
      originalError,
    });
  }
}

export class PaymentError extends AppError {
  constructor(message: string, originalError?: Error, isUserError: boolean = false) {
    super(message, {
      statusCode: isUserError ? 400 : 500,
      errorType: isUserError ? 'validation_error' : 'integration_error',
      errorSource: 'payment',
      severity: isUserError ? 'low' : 'critical',
      isUserError,
      shouldCreateTicket: !isUserError,
      userMessage: isUserError ? message : 'Error procesando el pago. Nuestro equipo ha sido notificado.',
      originalError,
    });
  }
}

export class FileStorageError extends AppError {
  constructor(operation: string, message: string, originalError?: Error) {
    super(`Error de almacenamiento (${operation}): ${message}`, {
      statusCode: 500,
      errorType: 'system_error',
      errorSource: 'file_storage',
      severity: 'high',
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: 'Error al procesar el archivo. Por favor, intenta de nuevo.',
      metadata: { operation },
      originalError,
    });
  }
}

export class EmailServiceError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, {
      statusCode: 500,
      errorType: 'integration_error',
      errorSource: 'email',
      severity: 'medium',
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: 'Error al enviar el correo. Lo intentaremos de nuevo.',
      originalError,
    });
  }
}

export class SMSServiceError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, {
      statusCode: 500,
      errorType: 'integration_error',
      errorSource: 'sms',
      severity: 'medium',
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: 'Error al enviar el SMS. Lo intentaremos de nuevo.',
      originalError,
    });
  }
}

export class WebSocketError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, {
      statusCode: 500,
      errorType: 'connection_error',
      errorSource: 'websocket',
      severity: 'high',
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: 'Error de conexión en tiempo real.',
      originalError,
    });
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, {
      statusCode: 500,
      errorType: 'configuration_error',
      errorSource: 'internal_service',
      severity: 'critical',
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: 'Error de configuración del sistema. Nuestro equipo ha sido notificado.',
    });
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number, originalError?: Error) {
    super(`Timeout en operación ${operation} después de ${timeoutMs}ms`, {
      statusCode: 504,
      errorType: 'timeout_error',
      errorSource: 'internal_service',
      severity: 'high',
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: 'La operación tardó demasiado. Por favor, intenta de nuevo.',
      metadata: { operation, timeoutMs },
      originalError,
    });
  }
}

export class InternalError extends AppError {
  constructor(message: string, originalError?: Error, severity: ErrorSeverity = 'high') {
    super(message, {
      statusCode: 500,
      errorType: 'system_error',
      errorSource: 'internal_service',
      severity,
      isUserError: false,
      shouldCreateTicket: true,
      userMessage: 'Error interno del servidor. Nuestro equipo ha sido notificado.',
      originalError,
    });
  }
}

/**
 * Helper to wrap unknown errors as AppError
 */
export function wrapError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new InternalError(
      context ? `${context}: ${error.message}` : error.message,
      error
    );
  }
  
  return new InternalError(
    context ? `${context}: ${String(error)}` : String(error)
  );
}

/**
 * Helper to determine if an error should create a ticket
 */
export function shouldCreateTicketForError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.shouldCreateTicket;
  }
  return true; // Unknown errors should create tickets
}

/**
 * Get user-friendly message from any error
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  return 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.';
}
