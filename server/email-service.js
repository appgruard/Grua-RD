"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_ADDRESSES = void 0;
exports.getEmailService = getEmailService;
var resend_1 = require("resend");
var logger_1 = require("./logger");
// Email addresses for different purposes
exports.EMAIL_ADDRESSES = {
    verification: 'verification@gruard.com',
    support: 'support@gruard.com',
    info: 'info@gruard.com',
    operadores: 'operadores@gruard.com',
    socios: 'socios@gruard.com',
    admin: 'admin@gruard.com',
};
// Signature configurations for different departments
var SIGNATURE_CONFIG = {
    seguridad: {
        department: 'Departamento de Seguridad',
        email: exports.EMAIL_ADDRESSES.verification,
    },
    atencionCliente: {
        department: 'Departamento de Atención al Cliente',
        email: exports.EMAIL_ADDRESSES.info,
    },
    operadores: {
        department: 'Departamento de Operadores',
        email: exports.EMAIL_ADDRESSES.operadores,
    },
    servicios: {
        department: 'Departamento de Servicios',
        email: exports.EMAIL_ADDRESSES.info,
    },
    verificaciones: {
        department: 'Departamento de Verificaciones',
        email: exports.EMAIL_ADDRESSES.verification,
    },
    soporte: {
        department: 'Departamento de Soporte',
        email: exports.EMAIL_ADDRESSES.support,
    },
    inversores: {
        department: 'Departamento de Relaciones con Inversores',
        email: exports.EMAIL_ADDRESSES.socios,
    },
    administracion: {
        department: 'Departamento de Administración',
        email: exports.EMAIL_ADDRESSES.admin,
    },
};
// Generate signature HTML for emails
function generateSignatureHTML(config) {
    return "\n          <div style=\"background: #f0f4f8; border-radius: 8px; padding: 20px; margin: 30px 0 20px 0; text-align: center;\">\n            <p style=\"margin: 0 0 5px 0; font-weight: bold; color: #1e3a5f; font-size: 14px;\">Gr\u00FAa RD</p>\n            <p style=\"margin: 0 0 5px 0; color: #666; font-size: 13px;\">".concat(config.department, "</p>\n            <p style=\"margin: 0 0 5px 0; color: #666; font-size: 12px;\">").concat(config.email, "</p>\n            <p style=\"margin: 0; color: #999; font-size: 12px;\">Moca, Espaillat, Rep\u00FAblica Dominicana</p>\n          </div>");
}
// Generate footer HTML with Four One Solutions branding
function generateFooterHTML(mainFooterContent) {
    return "\n          <hr style=\"border: none; border-top: 1px solid #ddd; margin: 20px 0;\">\n          \n          <p style=\"font-size: 12px; color: #999; text-align: center;\">\n            ".concat(mainFooterContent, "\n          </p>\n          \n          <p style=\"font-size: 10px; color: #bbb; text-align: center; margin-top: 15px;\">\n            con la tecnolog\u00EDa de Four One Solutions\n          </p>");
}
function getResendCredentials() {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, fromEmail;
        return __generator(this, function (_a) {
            try {
                apiKey = process.env.RESEND_API_KEY;
                fromEmail = process.env.RESEND_FROM_EMAIL;
                if (!apiKey) {
                    logger_1.logger.warn('RESEND_API_KEY not configured');
                    return [2 /*return*/, null];
                }
                return [2 /*return*/, {
                        apiKey: apiKey,
                        fromEmail: fromEmail || 'noreply@gruard.com'
                    }];
            }
            catch (error) {
                logger_1.logger.error('Failed to get Resend credentials:', error);
                return [2 /*return*/, null];
            }
            return [2 /*return*/];
        });
    });
}
function getResendClient(customFromEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var credentials;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getResendCredentials()];
                case 1:
                    credentials = _a.sent();
                    if (!credentials) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, {
                            client: new resend_1.Resend(credentials.apiKey),
                            fromEmail: customFromEmail || credentials.fromEmail
                        }];
            }
        });
    });
}
var ResendEmailService = /** @class */ (function () {
    function ResendEmailService() {
    }
    ResendEmailService.prototype.isConfigured = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resend;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getResendClient()];
                    case 1:
                        resend = _a.sent();
                        return [2 /*return*/, resend !== null];
                }
            });
        });
    };
    ResendEmailService.prototype.sendEmail = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, _a, data, error, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient()];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send email');
                            return [2 /*return*/, false];
                        }
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: resend.fromEmail,
                                to: Array.isArray(options.to) ? options.to : [options.to],
                                subject: options.subject,
                                html: options.html,
                                text: options.text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_1 = _b.sent();
                        logger_1.logger.error('Error sending email:', error_1);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendOTPEmail = function (email, code, userName) {
        return __awaiter(this, void 0, void 0, function () {
            var greeting, resend, html, text, _a, data, error, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        greeting = userName ? "Hola ".concat(userName) : 'Hola';
                        return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.verification)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send OTP email');
                            return [2 /*return*/, false];
                        }
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">Gr\u00FAa RD</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0;\">C\u00F3digo de Verificaci\u00F3n</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">".concat(greeting, ",</p>\n          \n          <p style=\"font-size: 16px;\">Tu c\u00F3digo de verificaci\u00F3n es:</p>\n          \n          <div style=\"background: white; border: 2px solid #1e3a5f; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;\">\n            <span style=\"font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;\">").concat(code, "</span>\n          </div>\n          \n          <p style=\"font-size: 14px; color: #666;\">\n            Este c\u00F3digo es v\u00E1lido por <strong>10 minutos</strong>. No compartas este c\u00F3digo con nadie.\n          </p>\n          \n          <p style=\"font-size: 14px; color: #666;\">\n            Si no solicitaste este c\u00F3digo, puedes ignorar este correo.\n          </p>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.seguridad), "\n          \n          ").concat(generateFooterHTML('Este es un correo automático de Grúa RD. Por favor no respondas a este mensaje.'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "".concat(greeting, ",\n\nTu c\u00F3digo de verificaci\u00F3n Gr\u00FAa RD es: ").concat(code, "\n\nEste c\u00F3digo es v\u00E1lido por 10 minutos.\n\nSi no solicitaste este c\u00F3digo, puedes ignorar este correo.\n\n---\nGr\u00FAa RD\nDepartamento de Seguridad\nverification@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Verificaci\u00F3n <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: "Tu c\u00F3digo de verificaci\u00F3n Gr\u00FAa RD: ".concat(code),
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send OTP email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("OTP email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_2 = _b.sent();
                        logger_1.logger.error('Error sending OTP email:', error_2);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendWelcomeEmail = function (email, userName) {
        return __awaiter(this, void 0, void 0, function () {
            var html, text;
            return __generator(this, function (_a) {
                html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">\u00A1Bienvenido a Gr\u00FAa RD!</h1>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Hola ".concat(userName, ",</p>\n          \n          <p style=\"font-size: 16px;\">\n            \u00A1Gracias por registrarte en Gr\u00FAa RD! Estamos emocionados de tenerte con nosotros.\n          </p>\n          \n          <p style=\"font-size: 16px;\">\n            Con Gr\u00FAa RD puedes:\n          </p>\n          \n          <ul style=\"font-size: 14px; color: #555;\">\n            <li>Solicitar servicios de gr\u00FAa en tiempo real</li>\n            <li>Seguir la ubicaci\u00F3n de tu gr\u00FAa en vivo</li>\n            <li>Comunicarte directamente con el conductor</li>\n            <li>Pagar de forma segura</li>\n          </ul>\n          \n          <div style=\"text-align: center; margin: 30px 0;\">\n            <a href=\"https://gruard.com\" style=\"background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;\">Comenzar</a>\n          </div>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.atencionCliente), "\n          \n          ").concat(generateFooterHTML('¿Tienes preguntas? Contáctanos en info@gruard.com'), "\n        </div>\n      </body>\n      </html>\n    ");
                text = "Hola ".concat(userName, ",\n\n\u00A1Bienvenido a Gr\u00FAa RD!\n\nGracias por registrarte. Ahora puedes solicitar servicios de gr\u00FAa en tiempo real, seguir la ubicaci\u00F3n de tu gr\u00FAa, y m\u00E1s.\n\nSi tienes preguntas, cont\u00E1ctanos en info@gruard.com\n\n---\nGr\u00FAa RD\nDepartamento de Atenci\u00F3n al Cliente\ninfo@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                return [2 /*return*/, this.sendEmail({
                        to: email,
                        subject: '¡Bienvenido a Grúa RD!',
                        html: html,
                        text: text,
                    })];
            });
        });
    };
    ResendEmailService.prototype.sendClientWelcomeEmail = function (email, userName) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, html, text, _a, data, error, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.info)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send client welcome email');
                            return [2 /*return*/, false];
                        }
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 28px;\">Bienvenido a Gr\u00FAa RD</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0; font-size: 16px;\">Tu servicio de gruas de confianza</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Hola ".concat(userName, ",</p>\n          \n          <p style=\"font-size: 16px;\">\n            Gracias por registrarte en Gr\u00FAa RD. Estamos comprometidos a brindarte el mejor servicio de asistencia vial en Republica Dominicana.\n          </p>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <h3 style=\"color: #1e3a5f; margin: 0 0 15px 0;\">Como solicitar un servicio:</h3>\n            <ol style=\"margin: 0; padding-left: 20px; color: #555;\">\n              <li style=\"margin-bottom: 8px;\">Ingresa a tu cuenta en Gr\u00FAa RD</li>\n              <li style=\"margin-bottom: 8px;\">Indica tu ubicacion actual</li>\n              <li style=\"margin-bottom: 8px;\">Selecciona el tipo de servicio que necesitas</li>\n              <li style=\"margin-bottom: 8px;\">Confirma y espera a tu operador</li>\n            </ol>\n          </div>\n          \n          <div style=\"background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #1e3a5f; margin: 0 0 10px 0;\">Metodos de pago disponibles:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #555;\">\n              Efectivo, Tarjeta de credito/debito, Transferencia bancaria\n            </p>\n          </div>\n          \n          <div style=\"background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #856404; margin: 0 0 10px 0;\">Linea de emergencias 24/7:</h4>\n            <p style=\"margin: 0; font-size: 18px; font-weight: bold; color: #1e3a5f;\">\n              +1 (809) 555-GRUA\n            </p>\n          </div>\n          \n          <div style=\"text-align: center; margin: 30px 0;\">\n            <a href=\"https://gruard.com\" style=\"background: #1e3a5f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;\">Ir a Gr\u00FAa RD</a>\n          </div>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.atencionCliente), "\n          \n          ").concat(generateFooterHTML('Grúa RD - Tu servicio de gruas de confianza'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Hola ".concat(userName, ",\n\nGracias por registrarte en Gr\u00FAa RD. Estamos comprometidos a brindarte el mejor servicio de asistencia vial.\n\nComo solicitar un servicio:\n1. Ingresa a tu cuenta en Gr\u00FAa RD\n2. Indica tu ubicacion actual\n3. Selecciona el tipo de servicio\n4. Confirma y espera a tu operador\n\nMetodos de pago: Efectivo, Tarjeta, Transferencia\n\nLinea de emergencias 24/7: +1 (809) 555-GRUA\n\n---\nGr\u00FAa RD\nDepartamento de Atenci\u00F3n al Cliente\ninfo@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: 'Bienvenido a Grúa RD - Tu servicio de gruas de confianza',
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send client welcome email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Client welcome email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_3 = _b.sent();
                        logger_1.logger.error('Error sending client welcome email:', error_3);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendOperatorWelcomeEmail = function (email, userName) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, html, text, _a, data, error, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.info)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send operator welcome email');
                            return [2 /*return*/, false];
                        }
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 28px;\">Bienvenido al Equipo Gr\u00FAa RD</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0; font-size: 16px;\">Gracias por unirte como operador</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Hola ".concat(userName, ",</p>\n          \n          <p style=\"font-size: 16px;\">\n            Gracias por registrarte como operador en Gr\u00FAa RD. Estamos emocionados de tenerte en nuestro equipo de profesionales.\n          </p>\n          \n          <div style=\"background: #d4edda; border-left: 4px solid #28a745; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #155724; margin: 0 0 10px 0;\">Proximos pasos:</h4>\n            <ol style=\"margin: 0; padding-left: 20px; color: #155724;\">\n              <li style=\"margin-bottom: 8px;\">Completa la verificacion de tus documentos</li>\n              <li style=\"margin-bottom: 8px;\">Espera la aprobacion de nuestro equipo</li>\n              <li style=\"margin-bottom: 8px;\">Configura tu perfil y disponibilidad</li>\n              <li style=\"margin-bottom: 8px;\">Comienza a recibir solicitudes de servicio</li>\n            </ol>\n          </div>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <h3 style=\"color: #1e3a5f; margin: 0 0 15px 0;\">Beneficios de ser operador Gr\u00FAa RD:</h3>\n            <ul style=\"margin: 0; padding-left: 20px; color: #555;\">\n              <li style=\"margin-bottom: 8px;\"><strong>80% de comision</strong> - Tu te quedas con el 80% de cada servicio</li>\n              <li style=\"margin-bottom: 8px;\"><strong>Flexibilidad total</strong> - Trabaja cuando quieras</li>\n              <li style=\"margin-bottom: 8px;\"><strong>Pagos semanales</strong> - Recibe tus ganancias puntualmente</li>\n              <li style=\"margin-bottom: 8px;\"><strong>Soporte 24/7</strong> - Siempre estamos para ayudarte</li>\n              <li style=\"margin-bottom: 8px;\"><strong>Sin costos ocultos</strong> - Transparencia total</li>\n            </ul>\n          </div>\n          \n          <div style=\"background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #1e3a5f; margin: 0 0 10px 0;\">Tips para maximizar tus ingresos:</h4>\n            <ul style=\"margin: 0; padding-left: 20px; color: #555; font-size: 14px;\">\n              <li style=\"margin-bottom: 6px;\">Mantente disponible en horas pico (7-9am, 5-8pm)</li>\n              <li style=\"margin-bottom: 6px;\">Responde rapidamente a las solicitudes</li>\n              <li style=\"margin-bottom: 6px;\">Ofrece un servicio profesional y amable</li>\n              <li style=\"margin-bottom: 6px;\">Mantiene tu equipo en optimas condiciones</li>\n            </ul>\n          </div>\n          \n          <div style=\"background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #721c24; margin: 0 0 10px 0;\">Importante:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #721c24;\">\n              Debes completar la verificacion de documentos antes de poder recibir solicitudes. \n              Esto incluye: licencia de conducir, seguro del vehiculo y documentos de la grua.\n            </p>\n          </div>\n          \n          <div style=\"text-align: center; margin: 30px 0;\">\n            <a href=\"https://gruard.com\" style=\"background: #28a745; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;\">Completar Verificacion</a>\n          </div>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.operadores), "\n          \n          ").concat(generateFooterHTML('Grúa RD - Juntos hacemos la diferencia'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Hola ".concat(userName, ",\n\nGracias por registrarte como operador en Gr\u00FAa RD. Estamos emocionados de tenerte en nuestro equipo.\n\nProximos pasos:\n1. Completa la verificacion de tus documentos\n2. Espera la aprobacion de nuestro equipo\n3. Configura tu perfil y disponibilidad\n4. Comienza a recibir solicitudes\n\nBeneficios:\n- 80% de comision por servicio\n- Flexibilidad total\n- Pagos semanales\n- Soporte 24/7\n\nImportante: Debes completar la verificacion de documentos antes de poder recibir solicitudes.\n\n---\nGr\u00FAa RD\nDepartamento de Operadores\noperadores@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: 'Bienvenido al Equipo Grúa RD - Proximos pasos',
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send operator welcome email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Operator welcome email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_4 = _b.sent();
                        logger_1.logger.error('Error sending operator welcome email:', error_4);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendServiceNotification = function (email, subject, message) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, html, text, _a, data, error, error_5;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.info)];
                    case 1:
                        resend = _b.sent();
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">Gr\u00FAa RD</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0;\">Notificaci\u00F3n de Servicio</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">".concat(message, "</p>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.servicios), "\n          \n          ").concat(generateFooterHTML('Este es un correo automático de Grúa RD.'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "".concat(message, "\n\n---\nGr\u00FAa RD\nDepartamento de Servicios\ninfo@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        if (!resend) {
                            return [2 /*return*/, this.sendEmail({
                                    to: email,
                                    subject: "Gr\u00FAa RD: ".concat(subject),
                                    html: html,
                                    text: text,
                                })];
                        }
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Servicios <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: "Gr\u00FAa RD: ".concat(subject),
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send service notification:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Service notification sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_5 = _b.sent();
                        logger_1.logger.error('Error sending service notification:', error_5);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendPasswordResetEmail = function (email, resetLink, userName) {
        return __awaiter(this, void 0, void 0, function () {
            var greeting, html, text, resend, _a, data, error, error_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        greeting = userName ? "Hola ".concat(userName) : 'Hola';
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">Gr\u00FAa RD</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0;\">Restablecer Contrase\u00F1a</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">".concat(greeting, ",</p>\n          \n          <p style=\"font-size: 16px;\">\n            Recibimos una solicitud para restablecer la contrase\u00F1a de tu cuenta Gr\u00FAa RD.\n          </p>\n          \n          <div style=\"text-align: center; margin: 30px 0;\">\n            <a href=\"").concat(resetLink, "\" style=\"background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;\">Restablecer Contrase\u00F1a</a>\n          </div>\n          \n          <p style=\"font-size: 14px; color: #666;\">\n            Este enlace expirar\u00E1 en <strong>1 hora</strong>.\n          </p>\n          \n          <p style=\"font-size: 14px; color: #666;\">\n            Si no solicitaste restablecer tu contrase\u00F1a, puedes ignorar este correo. Tu contrase\u00F1a actual permanecer\u00E1 sin cambios.\n          </p>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.seguridad), "\n          \n          ").concat(generateFooterHTML('Este es un correo automático de Grúa RD. Por favor no respondas a este mensaje.'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "".concat(greeting, ",\n\nRecibimos una solicitud para restablecer tu contrase\u00F1a Gr\u00FAa RD.\n\nHaz clic en el siguiente enlace para restablecer tu contrase\u00F1a:\n").concat(resetLink, "\n\nEste enlace expirar\u00E1 en 1 hora.\n\nSi no solicitaste esto, ignora este correo.\n\n---\nGr\u00FAa RD\nDepartamento de Seguridad\nverification@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.verification)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            return [2 /*return*/, this.sendEmail({
                                    to: email,
                                    subject: 'Restablecer tu contraseña de Grúa RD',
                                    html: html,
                                    text: text,
                                })];
                        }
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Seguridad <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: 'Restablecer tu contraseña de Grúa RD',
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send password reset email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Password reset email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_6 = _b.sent();
                        logger_1.logger.error('Error sending password reset email:', error_6);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendDocumentApprovalEmail = function (email, documentType, approved, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var status, statusColor, html, text, resend, _a, data, error, error_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        status = approved ? 'aprobado' : 'rechazado';
                        statusColor = approved ? '#28a745' : '#dc3545';
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">Gr\u00FAa RD</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0;\">Actualizaci\u00F3n de Documento</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Tu documento <strong>".concat(documentType, "</strong> ha sido:</p>\n          \n          <div style=\"background: white; border-left: 4px solid ").concat(statusColor, "; padding: 15px 20px; margin: 20px 0;\">\n            <span style=\"font-size: 18px; font-weight: bold; color: ").concat(statusColor, "; text-transform: uppercase;\">").concat(status, "</span>\n          </div>\n          \n          ").concat(reason ? "\n          <p style=\"font-size: 14px; color: #666;\">\n            <strong>Motivo:</strong> ".concat(reason, "\n          </p>\n          ") : '', "\n          \n          ").concat(!approved ? "\n          <p style=\"font-size: 14px; color: #666;\">\n            Por favor, sube un nuevo documento que cumpla con los requisitos.\n          </p>\n          " : '', "\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.verificaciones), "\n          \n          ").concat(generateFooterHTML('Este es un correo automático de Grúa RD.'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Tu documento ".concat(documentType, " ha sido ").concat(status, ".").concat(reason ? "\n\nMotivo: ".concat(reason) : '').concat(!approved ? '\n\nPor favor, sube un nuevo documento que cumpla con los requisitos.' : '', "\n\n---\nGr\u00FAa RD\nDepartamento de Verificaciones\nverification@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.verification)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            return [2 /*return*/, this.sendEmail({
                                    to: email,
                                    subject: "Gr\u00FAa RD: Tu documento ha sido ".concat(status),
                                    html: html,
                                    text: text,
                                })];
                        }
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Verificaciones <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: "Gr\u00FAa RD: Tu documento ha sido ".concat(status),
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send document approval email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Document approval email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_7 = _b.sent();
                        logger_1.logger.error('Error sending document approval email:', error_7);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendTicketCreatedEmail = function (email, userName, ticket) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, prioridadTexto, categoriaTexto, html, text, _a, data, error, error_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.support)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send ticket created email');
                            return [2 /*return*/, false];
                        }
                        prioridadTexto = {
                            'baja': '48-72 horas',
                            'media': '24-48 horas',
                            'alta': '12-24 horas',
                            'urgente': '2-6 horas'
                        };
                        categoriaTexto = {
                            'problema_tecnico': 'Problema Tecnico',
                            'consulta_servicio': 'Consulta de Servicio',
                            'queja': 'Queja',
                            'sugerencia': 'Sugerencia',
                            'problema_pago': 'Problema de Pago',
                            'otro': 'Otro'
                        };
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">Gr\u00FAa RD Soporte</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0;\">Ticket Creado</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Hola ".concat(userName, ",</p>\n          \n          <p style=\"font-size: 16px;\">Tu ticket de soporte ha sido creado exitosamente.</p>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <p style=\"margin: 5px 0;\"><strong>Numero de Ticket:</strong> #").concat(ticket.id.slice(-8).toUpperCase(), "</p>\n            <p style=\"margin: 5px 0;\"><strong>Titulo:</strong> ").concat(ticket.titulo, "</p>\n            <p style=\"margin: 5px 0;\"><strong>Categoria:</strong> ").concat(categoriaTexto[ticket.categoria] || ticket.categoria, "</p>\n            <p style=\"margin: 5px 0;\"><strong>Prioridad:</strong> ").concat(ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1), "</p>\n            <p style=\"margin: 5px 0;\"><strong>Estado:</strong> Abierto</p>\n          </div>\n          \n          <p style=\"font-size: 14px; color: #666;\">\n            <strong>Tiempo estimado de respuesta:</strong> ").concat(prioridadTexto[ticket.prioridad] || '24-48 horas', "\n          </p>\n          \n          <p style=\"font-size: 14px; color: #666;\">\n            Te notificaremos por correo cuando haya actualizaciones en tu ticket.\n          </p>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.soporte), "\n          \n          ").concat(generateFooterHTML('Grúa RD Soporte - Estamos para ayudarte'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Hola ".concat(userName, ",\n\nTu ticket de soporte ha sido creado.\n\nNumero: #").concat(ticket.id.slice(-8).toUpperCase(), "\nTitulo: ").concat(ticket.titulo, "\nCategoria: ").concat(categoriaTexto[ticket.categoria] || ticket.categoria, "\nPrioridad: ").concat(ticket.prioridad, "\n\nTiempo estimado de respuesta: ").concat(prioridadTexto[ticket.prioridad] || '24-48 horas', "\n\n---\nGr\u00FAa RD\nDepartamento de Soporte\nsupport@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Soporte <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: "Ticket #".concat(ticket.id.slice(-8).toUpperCase(), " creado - ").concat(ticket.titulo),
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send ticket created email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Ticket created email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_8 = _b.sent();
                        logger_1.logger.error('Error sending ticket created email:', error_8);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendTicketStatusChangedEmail = function (email, userName, ticket, oldStatus, newStatus) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, estadoTexto, estado, html, text, _a, data, error, error_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.support)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send ticket status email');
                            return [2 /*return*/, false];
                        }
                        estadoTexto = {
                            'abierto': { label: 'Abierto', mensaje: 'Tu ticket ha sido reabierto y sera atendido pronto.', color: '#17a2b8' },
                            'en_proceso': { label: 'En Proceso', mensaje: 'Nuestro equipo esta trabajando en tu solicitud.', color: '#ffc107' },
                            'resuelto': { label: 'Resuelto', mensaje: 'Tu ticket ha sido resuelto. Si necesitas mas ayuda, puedes responder a este ticket.', color: '#28a745' },
                            'cerrado': { label: 'Cerrado', mensaje: 'Tu ticket ha sido cerrado. Gracias por contactarnos.', color: '#6c757d' }
                        };
                        estado = estadoTexto[newStatus] || { label: newStatus, mensaje: '', color: '#666' };
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">Gr\u00FAa RD Soporte</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0;\">Actualizacion de Ticket</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Hola ".concat(userName, ",</p>\n          \n          <p style=\"font-size: 16px;\">El estado de tu ticket ha sido actualizado.</p>\n          \n          <div style=\"background: white; border-left: 4px solid ").concat(estado.color, "; padding: 15px 20px; margin: 20px 0;\">\n            <p style=\"margin: 5px 0;\"><strong>Ticket:</strong> #").concat(ticket.id.slice(-8).toUpperCase(), "</p>\n            <p style=\"margin: 5px 0;\"><strong>Titulo:</strong> ").concat(ticket.titulo, "</p>\n            <p style=\"margin: 5px 0;\"><strong>Nuevo Estado:</strong> <span style=\"color: ").concat(estado.color, "; font-weight: bold;\">").concat(estado.label, "</span></p>\n          </div>\n          \n          <p style=\"font-size: 14px; color: #666;\">").concat(estado.mensaje, "</p>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.soporte), "\n          \n          ").concat(generateFooterHTML('Grúa RD Soporte - Estamos para ayudarte'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Hola ".concat(userName, ",\n\nEl estado de tu ticket #").concat(ticket.id.slice(-8).toUpperCase(), " ha cambiado a: ").concat(estado.label, "\n\n").concat(estado.mensaje, "\n\n---\nGr\u00FAa RD\nDepartamento de Soporte\nsupport@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Soporte <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: "Ticket #".concat(ticket.id.slice(-8).toUpperCase(), " - Estado: ").concat(estado.label),
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send ticket status email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Ticket status email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_9 = _b.sent();
                        logger_1.logger.error('Error sending ticket status email:', error_9);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendTicketSupportResponseEmail = function (email, userName, ticket, mensaje) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, html, text, _a, data, error, error_10;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.support)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send ticket response email');
                            return [2 /*return*/, false];
                        }
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">Gr\u00FAa RD Soporte</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0;\">Nueva Respuesta</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Hola ".concat(userName, ",</p>\n          \n          <p style=\"font-size: 16px;\">Nuestro equipo de soporte ha respondido a tu ticket.</p>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 20px 0;\">\n            <p style=\"margin: 0 0 10px 0; font-size: 12px; color: #666;\"><strong>Ticket:</strong> #").concat(ticket.id.slice(-8).toUpperCase(), " - ").concat(ticket.titulo, "</p>\n            <hr style=\"border: none; border-top: 1px solid #eee; margin: 10px 0;\">\n            <p style=\"margin: 0; font-size: 14px; white-space: pre-wrap;\">").concat(mensaje, "</p>\n          </div>\n          \n          <p style=\"font-size: 14px; color: #666;\">\n            Puedes responder a este ticket desde tu cuenta en Gr\u00FAa RD.\n          </p>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.soporte), "\n          \n          ").concat(generateFooterHTML('Grúa RD Soporte - Estamos para ayudarte'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Hola ".concat(userName, ",\n\nNuestro equipo de soporte ha respondido a tu ticket #").concat(ticket.id.slice(-8).toUpperCase(), ".\n\nMensaje:\n").concat(mensaje, "\n\nPuedes responder desde tu cuenta en Gr\u00FAa RD.\n\n---\nGr\u00FAa RD\nDepartamento de Soporte\nsupport@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Soporte <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: "Respuesta a Ticket #".concat(ticket.id.slice(-8).toUpperCase(), " - ").concat(ticket.titulo),
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send ticket response email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Ticket response email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_10 = _b.sent();
                        logger_1.logger.error('Error sending ticket response email:', error_10);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendHighPriorityTicketNotification = function (adminEmail, ticket, userName, userEmail) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, prioridadColor, prioridadLabel, categoriaTexto, html, text, _a, data, error, error_11;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.support)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send high priority ticket notification');
                            return [2 /*return*/, false];
                        }
                        prioridadColor = ticket.prioridad === 'urgente' ? '#dc3545' : '#fd7e14';
                        prioridadLabel = ticket.prioridad === 'urgente' ? 'URGENTE' : 'ALTA';
                        categoriaTexto = {
                            'problema_tecnico': 'Problema Técnico',
                            'consulta_servicio': 'Consulta de Servicio',
                            'queja': 'Queja',
                            'sugerencia': 'Sugerencia',
                            'problema_pago': 'Problema de Pago',
                            'otro': 'Otro'
                        };
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: ".concat(prioridadColor, "; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 24px;\">\u26A0\uFE0F TICKET ").concat(prioridadLabel, "</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0;\">Requiere Atenci\u00F3n Inmediata</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px; font-weight: bold;\">Se ha creado un nuevo ticket de prioridad ").concat(prioridadLabel.toLowerCase(), ":</p>\n          \n          <div style=\"background: white; border-left: 4px solid ").concat(prioridadColor, "; padding: 20px; margin: 20px 0;\">\n            <p style=\"margin: 5px 0;\"><strong>N\u00FAmero de Ticket:</strong> #").concat(ticket.id.slice(-8).toUpperCase(), "</p>\n            <p style=\"margin: 5px 0;\"><strong>T\u00EDtulo:</strong> ").concat(ticket.titulo, "</p>\n            <p style=\"margin: 5px 0;\"><strong>Categor\u00EDa:</strong> ").concat(categoriaTexto[ticket.categoria] || ticket.categoria, "</p>\n            <p style=\"margin: 5px 0;\"><strong>Prioridad:</strong> <span style=\"color: ").concat(prioridadColor, "; font-weight: bold;\">").concat(prioridadLabel, "</span></p>\n          </div>\n          \n          <div style=\"background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;\">\n            <p style=\"margin: 0 0 10px 0; font-weight: bold;\">Informaci\u00F3n del Usuario:</p>\n            <p style=\"margin: 5px 0;\"><strong>Nombre:</strong> ").concat(userName, "</p>\n            <p style=\"margin: 5px 0;\"><strong>Email:</strong> ").concat(userEmail, "</p>\n          </div>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 20px 0;\">\n            <p style=\"margin: 0 0 10px 0; font-weight: bold;\">Descripci\u00F3n:</p>\n            <p style=\"margin: 0; white-space: pre-wrap;\">").concat(ticket.descripcion, "</p>\n          </div>\n          \n          <p style=\"font-size: 14px; color: #666; text-align: center; margin-top: 20px;\">\n            Por favor, atienda este ticket lo antes posible.\n          </p>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.soporte), "\n          \n          ").concat(generateFooterHTML('Sistema de Notificaciones - Grúa RD'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "TICKET ".concat(prioridadLabel, " REQUIERE ATENCI\u00D3N\n\nN\u00FAmero: #").concat(ticket.id.slice(-8).toUpperCase(), "\nT\u00EDtulo: ").concat(ticket.titulo, "\nCategor\u00EDa: ").concat(categoriaTexto[ticket.categoria] || ticket.categoria, "\nPrioridad: ").concat(prioridadLabel, "\n\nUsuario: ").concat(userName, " (").concat(userEmail, ")\n\nDescripci\u00F3n:\n").concat(ticket.descripcion, "\n\n---\nGr\u00FAa RD - Sistema de Soporte\nsupport@gruard.com");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Alertas <".concat(resend.fromEmail, ">"),
                                to: [adminEmail],
                                subject: "\uD83D\uDEA8 TICKET ".concat(prioridadLabel, " #").concat(ticket.id.slice(-8).toUpperCase(), " - ").concat(ticket.titulo),
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send high priority ticket notification:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("High priority ticket notification sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_11 = _b.sent();
                        logger_1.logger.error('Error sending high priority ticket notification:', error_11);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendSocioCreatedEmail = function (email, nombre, tempPassword, porcentaje) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, html, text, _a, data, error, error_12;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.socios)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send socio created email');
                            return [2 /*return*/, false];
                        }
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 28px;\">Bienvenido a Gr\u00FAa RD</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0; font-size: 16px;\">Portal de Socios e Inversores</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Estimado/a ".concat(nombre, ",</p>\n          \n          <p style=\"font-size: 16px;\">\n            Es un placer darle la bienvenida como socio inversor de Gr\u00FAa RD. Su cuenta ha sido creada exitosamente.\n          </p>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <h3 style=\"color: #1e3a5f; margin: 0 0 15px 0;\">Credenciales de Acceso:</h3>\n            <p style=\"margin: 8px 0;\"><strong>Email:</strong> ").concat(email, "</p>\n            <p style=\"margin: 8px 0;\"><strong>Contrasena temporal:</strong> <code style=\"background: #f0f0f0; padding: 4px 8px; border-radius: 4px;\">").concat(tempPassword, "</code></p>\n          </div>\n          \n          <div style=\"background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #856404; margin: 0 0 10px 0;\">Importante:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #856404;\">\n              Por seguridad, le recomendamos cambiar su contrasena en su primer inicio de sesion.\n            </p>\n          </div>\n          \n          <div style=\"background: #d4edda; border-left: 4px solid #28a745; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #155724; margin: 0 0 10px 0;\">Su Participacion:</h4>\n            <p style=\"margin: 0; font-size: 18px; font-weight: bold; color: #155724;\">\n              ").concat(porcentaje, "% de las utilidades de la empresa\n            </p>\n          </div>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <h3 style=\"color: #1e3a5f; margin: 0 0 15px 0;\">En su Dashboard podra:</h3>\n            <ul style=\"margin: 0; padding-left: 20px; color: #555;\">\n              <li style=\"margin-bottom: 8px;\">Ver el resumen de sus distribuciones</li>\n              <li style=\"margin-bottom: 8px;\">Consultar el historial de pagos</li>\n              <li style=\"margin-bottom: 8px;\">Revisar los ingresos del periodo actual</li>\n              <li style=\"margin-bottom: 8px;\">Descargar reportes financieros</li>\n            </ul>\n          </div>\n          \n          <div style=\"background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #1e3a5f; margin: 0 0 10px 0;\">Calendario de Distribuciones:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #555;\">\n              Las distribuciones se calculan mensualmente y se procesan dentro de los primeros 15 dias del mes siguiente.\n            </p>\n          </div>\n          \n          <div style=\"text-align: center; margin: 30px 0;\">\n            <a href=\"https://gruard.com\" style=\"background: #1e3a5f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;\">Acceder al Portal</a>\n          </div>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.inversores), "\n          \n          ").concat(generateFooterHTML('Grúa RD - Gracias por su confianza e inversión'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Estimado/a ".concat(nombre, ",\n\nBienvenido como socio inversor de Gr\u00FAa RD.\n\nCredenciales de acceso:\nEmail: ").concat(email, "\nContrasena temporal: ").concat(tempPassword, "\n\nSu participacion: ").concat(porcentaje, "% de las utilidades\n\nImportante: Cambie su contrasena en el primer inicio de sesion.\n\n---\nGr\u00FAa RD\nDepartamento de Relaciones con Inversores\nsocios@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Inversores <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: 'Bienvenido al Portal de Socios Grúa RD - Credenciales de Acceso',
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send socio created email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Socio created email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_12 = _b.sent();
                        logger_1.logger.error('Error sending socio created email:', error_12);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendSocioFirstLoginEmail = function (email, nombre) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, html, text, _a, data, error, error_13;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.socios)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send socio first login email');
                            return [2 /*return*/, false];
                        }
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 28px;\">Gr\u00FAa RD - Portal de Socios</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0; font-size: 16px;\">Primer Inicio de Sesion</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Estimado/a ".concat(nombre, ",</p>\n          \n          <p style=\"font-size: 16px;\">\n            Gracias por ser parte del equipo inversor de Gr\u00FAa RD. Hemos registrado su primer inicio de sesion en el portal.\n          </p>\n          \n          <div style=\"background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #856404; margin: 0 0 10px 0;\">Recordatorio de Seguridad:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #856404;\">\n              Si aun no ha cambiado su contrasena temporal, le recomendamos hacerlo desde la seccion \"Mi Perfil\" para mayor seguridad.\n            </p>\n          </div>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <h3 style=\"color: #1e3a5f; margin: 0 0 15px 0;\">Guia rapida del Dashboard:</h3>\n            <ul style=\"margin: 0; padding-left: 20px; color: #555;\">\n              <li style=\"margin-bottom: 10px;\"><strong>Resumen:</strong> Vista general de sus distribuciones y participacion</li>\n              <li style=\"margin-bottom: 10px;\"><strong>Distribuciones:</strong> Historial detallado de pagos recibidos</li>\n              <li style=\"margin-bottom: 10px;\"><strong>Reportes:</strong> Descargue informes financieros en PDF</li>\n              <li style=\"margin-bottom: 10px;\"><strong>Perfil:</strong> Actualice sus datos bancarios y contrasena</li>\n            </ul>\n          </div>\n          \n          <div style=\"background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #1e3a5f; margin: 0 0 10px 0;\">Proxima Distribucion:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #555;\">\n              Las distribuciones se calculan mensualmente. Recibira una notificacion cuando su distribucion este lista.\n            </p>\n          </div>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.inversores), "\n          \n          ").concat(generateFooterHTML('Grúa RD - Juntos construimos el futuro'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Estimado/a ".concat(nombre, ",\n\nGracias por ser parte del equipo inversor de Gr\u00FAa RD. Hemos registrado su primer inicio de sesion.\n\nRecordatorio: Si no ha cambiado su contrasena temporal, le recomendamos hacerlo por seguridad.\n\nGuia del Dashboard:\n- Resumen: Vista general de distribuciones\n- Distribuciones: Historial de pagos\n- Reportes: Informes financieros\n- Perfil: Datos bancarios y contrasena\n\n---\nGr\u00FAa RD\nDepartamento de Relaciones con Inversores\nsocios@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD Inversores <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: 'Bienvenido al Portal de Socios Grúa RD - Primer Inicio de Sesion',
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send socio first login email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Socio first login email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_13 = _b.sent();
                        logger_1.logger.error('Error sending socio first login email:', error_13);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendAdminCreatedEmail = function (email, nombre, tempPassword, permisos) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, html, text, _a, data, error, error_14;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.admin)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send admin created email');
                            return [2 /*return*/, false];
                        }
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 28px;\">Gr\u00FAa RD - Portal de Socios</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0; font-size: 16px;\">Primer Inicio de Sesion</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Estimado/a ".concat(nombre, ",</p>\n          \n          <p style=\"font-size: 16px;\">\n            Gracias por ser parte del equipo inversor de Gr\u00FAa RD. Hemos registrado su primer inicio de sesion en el portal.\n          </p>\n          \n          <div style=\"background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #856404; margin: 0 0 10px 0;\">Recordatorio de Seguridad:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #856404;\">\n              Si aun no ha cambiado su contrasena temporal, le recomendamos hacerlo desde la seccion \"Mi Perfil\" para mayor seguridad.\n            </p>\n          </div>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <h3 style=\"color: #1e3a5f; margin: 0 0 15px 0;\">Guia rapida del Dashboard:</h3>\n            <ul style=\"margin: 0; padding-left: 20px; color: #555;\">\n              <li style=\"margin-bottom: 10px;\"><strong>Resumen:</strong> Vista general de sus distribuciones y participacion</li>\n              <li style=\"margin-bottom: 10px;\"><strong>Distribuciones:</strong> Historial detallado de pagos recibidos</li>\n              <li style=\"margin-bottom: 10px;\"><strong>Reportes:</strong> Descargue informes financieros en PDF</li>\n              <li style=\"margin-bottom: 10px;\"><strong>Perfil:</strong> Actualice sus datos bancarios y contrasena</li>\n            </ul>\n          </div>\n          \n          <div style=\"background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #1e3a5f; margin: 0 0 10px 0;\">Proxima Distribucion:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #555;\">\n              Las distribuciones se calculan mensualmente. Recibira una notificacion cuando su distribucion este lista.\n            </p>\n          </div>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.inversores), "\n          \n          ").concat(generateFooterHTML('Grúa RD - Juntos construimos el futuro'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Estimado/a ".concat(nombre, ",\n\nGracias por ser parte del equipo inversor de Gr\u00FAa RD. Hemos registrado su primer inicio de sesion.\n\nRecordatorio: Si no ha cambiado su contrasena temporal, le recomendamos hacerlo por seguridad.\n\nGuia del Dashboard:\n- Resumen: Vista general de distribuciones\n- Distribuciones: Historial de pagos\n- Reportes: Informes financieros\n- Perfil: Datos bancarios y contrasena\n\n---\nGr\u00FAa RD\nDepartamento de Relaciones con Inversores\nsocios@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: 'Bienvenido al Portal de Socios Grúa RD - Primer Inicio de Sesion',
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send socio first login email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Socio first login email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_14 = _b.sent();
                        logger_1.logger.error('Error sending socio first login email:', error_14);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResendEmailService.prototype.sendAdminCreatedEmail = function (email, nombre, tempPassword, permisos) {
        return __awaiter(this, void 0, void 0, function () {
            var resend, permisosLabels, permisosFormatted, permisosList, html, text, _a, data, error, error_15;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getResendClient(exports.EMAIL_ADDRESSES.info)];
                    case 1:
                        resend = _b.sent();
                        if (!resend) {
                            logger_1.logger.error('Resend not configured, cannot send admin created email');
                            return [2 /*return*/, false];
                        }
                        permisosLabels = {
                            dashboard: "Dashboard",
                            analytics: "Analytics",
                            usuarios: "Usuarios",
                            operadores: "Conductores",
                            billeteras: "Billeteras",
                            comisiones_pago: "Comisiones de Pago",
                            servicios: "Servicios",
                            tarifas: "Tarifas",
                            monitoreo: "Monitoreo",
                            verificaciones: "Verificaciones",
                            documentos: "Documentos",
                            tickets: "Tickets Soporte",
                            socios: "Socios e Inversores",
                            aseguradoras: "Aseguradoras",
                            empresas: "Empresas",
                            configuracion: "Configuracion",
                            admin_usuarios: "Gestionar Administradores",
                        };
                        permisosFormatted = permisos.map(function (p) { return permisosLabels[p] || p; }).join(', ');
                        permisosList = permisos.map(function (p) { return "<li style=\"margin-bottom: 6px;\">".concat(permisosLabels[p] || p, "</li>"); }).join('');
                        html = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      </head>\n      <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">\n          <h1 style=\"color: white; margin: 0; font-size: 28px;\">Bienvenido a Gr\u00FAa RD</h1>\n          <p style=\"color: #ffffff; margin: 10px 0 0 0; font-size: 16px;\">Panel de Administracion</p>\n        </div>\n        \n        <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">\n          <p style=\"font-size: 16px;\">Estimado/a ".concat(nombre, ",</p>\n          \n          <p style=\"font-size: 16px;\">\n            Se le ha asignado acceso al Panel de Administracion de Gr\u00FAa RD. A continuacion encontrara sus credenciales de acceso.\n          </p>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <h3 style=\"color: #1e3a5f; margin: 0 0 15px 0;\">Credenciales de Acceso:</h3>\n            <p style=\"margin: 8px 0;\"><strong>Email:</strong> ").concat(email, "</p>\n            <p style=\"margin: 8px 0;\"><strong>Contrasena temporal:</strong> <code style=\"background: #f0f0f0; padding: 4px 8px; border-radius: 4px;\">").concat(tempPassword, "</code></p>\n          </div>\n          \n          <div style=\"background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #856404; margin: 0 0 10px 0;\">Importante - Seguridad:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #856404;\">\n              Por seguridad, le recomendamos cambiar su contrasena en su primer inicio de sesion. \n              No comparta sus credenciales con nadie.\n            </p>\n          </div>\n          \n          <div style=\"background: #d4edda; border-left: 4px solid #28a745; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #155724; margin: 0 0 10px 0;\">Permisos Asignados:</h4>\n            <ul style=\"margin: 0; padding-left: 20px; color: #155724; font-size: 14px;\">\n              ").concat(permisosList, "\n            </ul>\n          </div>\n          \n          <div style=\"background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;\">\n            <h3 style=\"color: #1e3a5f; margin: 0 0 15px 0;\">Lineamientos Internos:</h3>\n            <ul style=\"margin: 0; padding-left: 20px; color: #555;\">\n              <li style=\"margin-bottom: 8px;\">Maneje la informacion de usuarios con confidencialidad</li>\n              <li style=\"margin-bottom: 8px;\">Documente cualquier accion administrativa relevante</li>\n              <li style=\"margin-bottom: 8px;\">Reporte cualquier incidente de seguridad inmediatamente</li>\n              <li style=\"margin-bottom: 8px;\">No realice cambios sin la debida autorizacion</li>\n              <li style=\"margin-bottom: 8px;\">Cierre sesion cuando no este usando el sistema</li>\n            </ul>\n          </div>\n          \n          <div style=\"background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;\">\n            <h4 style=\"color: #1e3a5f; margin: 0 0 10px 0;\">Soporte Interno:</h4>\n            <p style=\"margin: 0; font-size: 14px; color: #555;\">\n              Si tiene alguna pregunta o necesita asistencia, contacte al administrador principal.\n            </p>\n          </div>\n          \n          <div style=\"text-align: center; margin: 30px 0;\">\n            <a href=\"https://gruard.com/admin\" style=\"background: #1e3a5f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;\">Acceder al Panel</a>\n          </div>\n          \n          ").concat(generateSignatureHTML(SIGNATURE_CONFIG.administracion), "\n          \n          ").concat(generateFooterHTML('Grúa RD - Panel de Administración'), "\n        </div>\n      </body>\n      </html>\n    ");
                        text = "Estimado/a ".concat(nombre, ",\n\nSe le ha asignado acceso al Panel de Administracion de Gr\u00FAa RD.\n\nCredenciales de acceso:\nEmail: ").concat(email, "\nContrasena temporal: ").concat(tempPassword, "\n\nPermisos asignados: ").concat(permisosFormatted, "\n\nImportante: Cambie su contrasena en el primer inicio de sesion y no comparta sus credenciales.\n\nLineamientos:\n- Maneje la informacion con confidencialidad\n- Documente acciones administrativas\n- Reporte incidentes de seguridad\n- Cierre sesion cuando no use el sistema\n\n---\nGr\u00FAa RD\nDepartamento de Administraci\u00F3n\nadmin@gruard.com\nMoca, Espaillat, Rep\u00FAblica Dominicana\n\ncon la tecnolog\u00EDa de Four One Solutions");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, resend.client.emails.send({
                                from: "Gr\u00FAa RD <".concat(resend.fromEmail, ">"),
                                to: [email],
                                subject: 'Bienvenido al Panel de Administracion Grúa RD - Credenciales de Acceso',
                                html: html,
                                text: text,
                            })];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('Failed to send admin created email:', error);
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info("Admin created email sent successfully: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, true];
                    case 4:
                        error_15 = _b.sent();
                        logger_1.logger.error('Error sending admin created email:', error_15);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return ResendEmailService;
}());
var MockEmailService = /** @class */ (function () {
    function MockEmailService() {
    }
    MockEmailService.prototype.isConfigured = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, false];
            });
        });
    };
    MockEmailService.prototype.sendEmail = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] To: ".concat(options.to, ", Subject: ").concat(options.subject));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendOTPEmail = function (email, code, userName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] OTP para ".concat(email, ": ").concat(code));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendWelcomeEmail = function (email, userName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Bienvenida para ".concat(email, " (").concat(userName, ")"));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendClientWelcomeEmail = function (email, userName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Bienvenida cliente para ".concat(email, " (").concat(userName, ")"));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendOperatorWelcomeEmail = function (email, userName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Bienvenida operador para ".concat(email, " (").concat(userName, ")"));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendServiceNotification = function (email, subject, message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Notificaci\u00F3n para ".concat(email, ": ").concat(subject));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendPasswordResetEmail = function (email, resetLink, userName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Reset password para ".concat(email, ": ").concat(resetLink));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendDocumentApprovalEmail = function (email, documentType, approved, reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Documento ".concat(documentType, " ").concat(approved ? 'aprobado' : 'rechazado', " para ").concat(email));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendTicketCreatedEmail = function (email, userName, ticket) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Ticket creado #".concat(ticket.id.slice(-8), " para ").concat(email));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendTicketStatusChangedEmail = function (email, userName, ticket, oldStatus, newStatus) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Ticket #".concat(ticket.id.slice(-8), " cambio de ").concat(oldStatus, " a ").concat(newStatus, " para ").concat(email));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendTicketSupportResponseEmail = function (email, userName, ticket, mensaje) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Respuesta a ticket #".concat(ticket.id.slice(-8), " para ").concat(email));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendHighPriorityTicketNotification = function (adminEmail, ticket, userName, userEmail) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Notificaci\u00F3n ticket URGENTE #".concat(ticket.id.slice(-8), " a admin ").concat(adminEmail, " - Usuario: ").concat(userName, " (").concat(userEmail, ")"));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendSocioCreatedEmail = function (email, nombre, tempPassword, porcentaje) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Socio creado para ".concat(email, " (").concat(nombre, ") - ").concat(porcentaje, "%"));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendSocioFirstLoginEmail = function (email, nombre) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Primer inicio sesion socio para ".concat(email, " (").concat(nombre, ")"));
                return [2 /*return*/, true];
            });
        });
    };
    MockEmailService.prototype.sendAdminCreatedEmail = function (email, nombre, tempPassword, permisos) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info("\uD83D\uDCE7 [MOCK EMAIL] Admin creado para ".concat(email, " (").concat(nombre, ") - Permisos: ").concat(permisos.join(', ')));
                return [2 /*return*/, true];
            });
        });
    };
    return MockEmailService;
}());
var emailServiceInstance = null;
function getEmailService() {
    return __awaiter(this, void 0, void 0, function () {
        var resendService, isConfigured;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!emailServiceInstance) return [3 /*break*/, 2];
                    resendService = new ResendEmailService();
                    return [4 /*yield*/, resendService.isConfigured()];
                case 1:
                    isConfigured = _a.sent();
                    if (isConfigured) {
                        logger_1.logger.info('Using Resend email service via Replit connector');
                        emailServiceInstance = resendService;
                    }
                    else {
                        logger_1.logger.info('Resend not available, using mock email service');
                        emailServiceInstance = new MockEmailService();
                    }
                    _a.label = 2;
                case 2: return [2 /*return*/, emailServiceInstance];
            }
        });
    });
}
