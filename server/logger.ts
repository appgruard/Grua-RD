import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        customFormat
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    })
  ],
});

export const logAuth = {
  loginSuccess: (userId: string, email: string) => {
    logger.info('Login successful', { userId, email, category: 'auth' });
  },
  loginFailed: (email: string, reason: string) => {
    logger.warn('Login failed', { email, reason, category: 'auth' });
  },
  registerSuccess: (userId: string, email: string, userType: string) => {
    logger.info('Registration successful', { userId, email, userType, category: 'auth' });
  },
  registerFailed: (email: string, reason: string) => {
    logger.warn('Registration failed', { email, reason, category: 'auth' });
  },
  otpSent: (phone: string) => {
    logger.info('OTP sent', { phone, category: 'auth' });
  },
  otpVerified: (phone: string) => {
    logger.info('OTP verified', { phone, category: 'auth' });
  },
  otpFailed: (phone: string, attempts: number) => {
    logger.warn('OTP verification failed', { phone, attempts, category: 'auth' });
  },
  passwordReset: (userId: string) => {
    logger.info('Password reset', { userId, category: 'auth' });
  }
};

export const logTransaction = {
  paymentStarted: (servicioId: string, amount: number, method: string) => {
    logger.info('Payment started', { servicioId, amount, method, category: 'payment' });
  },
  paymentSuccess: (servicioId: string, amount: number, paymentIntentId: string) => {
    logger.info('Payment successful', { servicioId, amount, paymentIntentId, category: 'payment' });
  },
  paymentFailed: (servicioId: string, amount: number, error: string) => {
    logger.error('Payment failed', { servicioId, amount, error, category: 'payment' });
  },
  commissionCreated: (comisionId: string, servicioId: string, montoOperador: number, montoEmpresa: number) => {
    logger.info('Commission created', { comisionId, servicioId, montoOperador, montoEmpresa, category: 'payment' });
  },
  receiptGenerated: (servicioId: string) => {
    logger.info('Receipt generated', { servicioId, category: 'payment' });
  }
};

export const logService = {
  created: (servicioId: string, clienteId: string, origen: string, destino: string) => {
    logger.info('Service created', { servicioId, clienteId, origen, destino, category: 'service' });
  },
  accepted: (servicioId: string, conductorId: string) => {
    logger.info('Service accepted', { servicioId, conductorId, category: 'service' });
  },
  started: (servicioId: string) => {
    logger.info('Service started', { servicioId, category: 'service' });
  },
  completed: (servicioId: string, duration: number) => {
    logger.info('Service completed', { servicioId, duration, category: 'service' });
  },
  cancelled: (servicioId: string, reason?: string) => {
    logger.warn('Service cancelled', { servicioId, reason, category: 'service' });
  },
  stateChanged: (servicioId: string, from: string, to: string) => {
    logger.info('Service state changed', { servicioId, from, to, category: 'service' });
  }
};

export const logDocument = {
  uploaded: (documentoId: string, tipo: string, userId: string) => {
    logger.info('Document uploaded', { documentoId, tipo, userId, category: 'document' });
  },
  approved: (documentoId: string, adminId: string) => {
    logger.info('Document approved', { documentoId, adminId, category: 'document' });
  },
  rejected: (documentoId: string, adminId: string, motivo: string) => {
    logger.warn('Document rejected', { documentoId, adminId, motivo, category: 'document' });
  },
  deleted: (documentoId: string) => {
    logger.info('Document deleted', { documentoId, category: 'document' });
  }
};

export const logSystem = {
  info: (message: string, metadata?: any) => {
    logger.info(message, { ...metadata, category: 'system' });
  },
  warn: (message: string, metadata?: any) => {
    logger.warn(message, { ...metadata, category: 'system' });
  },
  error: (message: string, error?: any, metadata?: any) => {
    if (error instanceof Error) {
      logger.error(message, { ...metadata, error: error.message, stack: error.stack, category: 'system' });
    } else {
      logger.error(message, { ...metadata, error, category: 'system' });
    }
  },
  debug: (message: string, metadata?: any) => {
    logger.debug(message, { ...metadata, category: 'system' });
  }
};

export default logger;
