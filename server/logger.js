"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.logSystem = exports.logDocument = exports.logService = exports.logTransaction = exports.logAuth = void 0;
var winston_1 = require("winston");
var _a = winston_1.default.format, combine = _a.combine, timestamp = _a.timestamp, printf = _a.printf, colorize = _a.colorize, errors = _a.errors;
var customFormat = printf(function (_a) {
    var level = _a.level, message = _a.message, timestamp = _a.timestamp, stack = _a.stack, metadata = __rest(_a, ["level", "message", "timestamp", "stack"]);
    var msg = "".concat(timestamp, " [").concat(level, "] ").concat(message);
    if (Object.keys(metadata).length > 0) {
        msg += " ".concat(JSON.stringify(metadata));
    }
    if (stack) {
        msg += "\n".concat(stack);
    }
    return msg;
});
var logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
    transports: [
        new winston_1.default.transports.Console({
            format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), customFormat)
        }),
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5,
        })
    ],
});
exports.logger = logger;
exports.logAuth = {
    loginSuccess: function (userId, email) {
        logger.info('Login successful', { userId: userId, email: email, category: 'auth' });
    },
    loginFailed: function (email, reason) {
        logger.warn('Login failed', { email: email, reason: reason, category: 'auth' });
    },
    registerSuccess: function (userId, email, userType) {
        logger.info('Registration successful', { userId: userId, email: email, userType: userType, category: 'auth' });
    },
    registerFailed: function (email, reason) {
        logger.warn('Registration failed', { email: email, reason: reason, category: 'auth' });
    },
    otpSent: function (phone) {
        logger.info('OTP sent', { phone: phone, category: 'auth' });
    },
    otpVerified: function (phone) {
        logger.info('OTP verified', { phone: phone, category: 'auth' });
    },
    otpFailed: function (phone, attempts) {
        logger.warn('OTP verification failed', { phone: phone, attempts: attempts, category: 'auth' });
    },
    passwordReset: function (userId) {
        logger.info('Password reset', { userId: userId, category: 'auth' });
    },
    cedulaVerified: function (userId, cedula) {
        logger.info('Cedula verified', { userId: userId, cedula: cedula, category: 'auth' });
    },
    phoneVerified: function (userId, phone) {
        logger.info('Phone verified', { userId: userId, phone: phone, category: 'auth' });
    },
    verificationStep: function (userId, step, success, details) {
        var level = success ? 'info' : 'warn';
        logger[level]("Verification step: ".concat(step), {
            userId: userId,
            step: step,
            success: success,
            details: details,
            category: 'verification',
            timestamp: new Date().toISOString()
        });
    }
};
exports.logTransaction = {
    paymentStarted: function (servicioId, amount, method) {
        logger.info('Payment started', { servicioId: servicioId, amount: amount, method: method, category: 'payment' });
    },
    paymentSuccess: function (servicioId, amount, paymentIntentId) {
        logger.info('Payment successful', { servicioId: servicioId, amount: amount, paymentIntentId: paymentIntentId, category: 'payment' });
    },
    paymentFailed: function (servicioId, amount, error) {
        logger.error('Payment failed', { servicioId: servicioId, amount: amount, error: error, category: 'payment' });
    },
    commissionCreated: function (comisionId, servicioId, montoOperador, montoEmpresa) {
        logger.info('Commission created', { comisionId: comisionId, servicioId: servicioId, montoOperador: montoOperador, montoEmpresa: montoEmpresa, category: 'payment' });
    },
    receiptGenerated: function (servicioId) {
        logger.info('Receipt generated', { servicioId: servicioId, category: 'payment' });
    }
};
exports.logService = {
    created: function (servicioId, clienteId, origen, destino) {
        logger.info('Service created', { servicioId: servicioId, clienteId: clienteId, origen: origen, destino: destino, category: 'service' });
    },
    accepted: function (servicioId, conductorId) {
        logger.info('Service accepted', { servicioId: servicioId, conductorId: conductorId, category: 'service' });
    },
    started: function (servicioId) {
        logger.info('Service started', { servicioId: servicioId, category: 'service' });
    },
    completed: function (servicioId, duration) {
        logger.info('Service completed', { servicioId: servicioId, duration: duration, category: 'service' });
    },
    cancelled: function (servicioId, reason) {
        logger.warn('Service cancelled', { servicioId: servicioId, reason: reason, category: 'service' });
    },
    stateChanged: function (servicioId, from, to) {
        logger.info('Service state changed', { servicioId: servicioId, from: from, to: to, category: 'service' });
    }
};
exports.logDocument = {
    uploaded: function (documentoId, tipo, userId) {
        logger.info('Document uploaded', { documentoId: documentoId, tipo: tipo, userId: userId, category: 'document' });
    },
    uploadFailed: function (tipo, userId, error) {
        logger.error('Document upload failed', { tipo: tipo, userId: userId, error: error, category: 'document' });
    },
    downloaded: function (documentoId, userId) {
        logger.info('Document downloaded', { documentoId: documentoId, userId: userId, category: 'document' });
    },
    approved: function (documentoId, adminId) {
        logger.info('Document approved', { documentoId: documentoId, adminId: adminId, category: 'document' });
    },
    rejected: function (documentoId, adminId, motivo) {
        logger.warn('Document rejected', { documentoId: documentoId, adminId: adminId, motivo: motivo, category: 'document' });
    },
    reviewed: function (adminId, documentoId, estado) {
        logger.info('Document reviewed', { adminId: adminId, documentoId: documentoId, estado: estado, category: 'document' });
    },
    deleted: function (documentoId) {
        logger.info('Document deleted', { documentoId: documentoId, category: 'document' });
    }
};
exports.logSystem = {
    info: function (message, metadata) {
        logger.info(message, __assign(__assign({}, metadata), { category: 'system' }));
    },
    warn: function (message, metadata) {
        logger.warn(message, __assign(__assign({}, metadata), { category: 'system' }));
    },
    error: function (message, error, metadata) {
        if (error instanceof Error) {
            logger.error(message, __assign(__assign({}, metadata), { error: error.message, stack: error.stack, category: 'system' }));
        }
        else {
            logger.error(message, __assign(__assign({}, metadata), { error: error, category: 'system' }));
        }
    },
    debug: function (message, metadata) {
        logger.debug(message, __assign(__assign({}, metadata), { category: 'system' }));
    }
};
exports.default = logger;
