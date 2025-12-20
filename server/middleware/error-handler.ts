import { Request, Response, NextFunction } from 'express';
import { AppError, wrapError, getUserMessage } from '../errors/app-errors';
import { systemErrorService } from '../services/system-error-service';
import { logSystem } from '../logger';

/**
 * Global error handling middleware for Express
 * Classifies errors, tracks system errors, and returns appropriate responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const appError = wrapError(err);
  
  const userId = (req.user as any)?.id;
  const context = {
    route: req.path,
    method: req.method,
    userId,
    metadata: {
      query: req.query,
      params: req.params,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    },
  };

  logSystem.error(`Request error: ${appError.message}`, appError.originalError || appError, {
    statusCode: appError.statusCode,
    errorType: appError.errorType,
    errorSource: appError.errorSource,
    severity: appError.severity,
    isUserError: appError.isUserError,
    ...context,
  });

  if (appError.shouldCreateTicket && !appError.isUserError) {
    systemErrorService.trackError(
      {
        errorType: appError.errorType,
        errorSource: appError.errorSource,
        severity: appError.severity,
        message: appError.message,
        stackTrace: appError.stack,
      },
      context
    ).catch(trackErr => {
      logSystem.error('Failed to track system error', trackErr);
    });
  }

  const response: {
    success: false;
    message: string;
    error?: {
      type: string;
      details?: Record<string, any>;
    };
  } = {
    success: false,
    message: appError.userMessage,
  };

  if (process.env.NODE_ENV !== 'production' || appError.isUserError) {
    response.error = {
      type: appError.errorType,
      ...(appError.metadata && { details: appError.metadata }),
    };
  }

  res.status(appError.statusCode).json(response);
}

/**
 * Async route handler wrapper that catches errors and passes to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: 'Recurso no encontrado',
    error: {
      type: 'not_found_error',
      path: req.path,
    },
  });
}
