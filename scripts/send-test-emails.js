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
var email_service_1 = require("../server/email-service");
function delay(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function sendTestEmails() {
    return __awaiter(this, void 0, void 0, function () {
        var email, emailService, isConfigured, mockTicket, templates, results, i, template, error_1, successCount, failedCount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    email = 'admin@fourone.com.do';
                    console.log("Enviando correos de prueba a: ".concat(email, "\n"));
                    return [4 /*yield*/, (0, email_service_1.getEmailService)()];
                case 1:
                    emailService = _a.sent();
                    return [4 /*yield*/, emailService.isConfigured()];
                case 2:
                    isConfigured = _a.sent();
                    if (!isConfigured) {
                        console.error('Servicio de email no configurado. Verifique RESEND_API_KEY');
                        process.exit(1);
                    }
                    console.log('Servicio de email configurado\n');
                    mockTicket = {
                        id: 'TKT-12345',
                        titulo: 'Prueba de Soporte',
                        descripcion: 'Este es un ticket de prueba para verificar el sistema de correos.',
                        categoria: 'technical',
                        prioridad: 'high',
                        estado: 'open'
                    };
                    templates = [
                        {
                            name: 'OTP/Verificacion',
                            send: function () { return emailService.sendOTPEmail(email, '123456', 'Usuario de Prueba'); }
                        },
                        {
                            name: 'Bienvenida General',
                            send: function () { return emailService.sendWelcomeEmail(email, 'Usuario de Prueba'); }
                        },
                        {
                            name: 'Bienvenida Cliente',
                            send: function () { return emailService.sendClientWelcomeEmail(email, 'Cliente de Prueba'); }
                        },
                        {
                            name: 'Bienvenida Operador',
                            send: function () { return emailService.sendOperatorWelcomeEmail(email, 'Operador de Prueba'); }
                        },
                        {
                            name: 'Notificacion de Servicio',
                            send: function () { return emailService.sendServiceNotification(email, 'Servicio Completado', 'Su servicio de grua ha sido completado exitosamente. Gracias por confiar en Grua RD.'); }
                        },
                        {
                            name: 'Restablecer Contrasena',
                            send: function () { return emailService.sendPasswordResetEmail(email, 'https://gruard.com/reset-password?token=test-token-12345', 'Usuario de Prueba'); }
                        },
                        {
                            name: 'Documento Aprobado',
                            send: function () { return emailService.sendDocumentApprovalEmail(email, 'Licencia de Conducir', true); }
                        },
                        {
                            name: 'Documento Rechazado',
                            send: function () { return emailService.sendDocumentApprovalEmail(email, 'Seguro del Vehiculo', false, 'El documento esta vencido o ilegible'); }
                        },
                        {
                            name: 'Ticket Creado',
                            send: function () { return emailService.sendTicketCreatedEmail(email, 'Usuario de Prueba', mockTicket); }
                        },
                        {
                            name: 'Ticket Estado Cambiado',
                            send: function () { return emailService.sendTicketStatusChangedEmail(email, 'Usuario de Prueba', mockTicket, 'open', 'in_progress'); }
                        },
                        {
                            name: 'Respuesta de Soporte',
                            send: function () { return emailService.sendTicketSupportResponseEmail(email, 'Usuario de Prueba', mockTicket, 'Gracias por contactarnos. Hemos recibido su solicitud y estamos trabajando en ella. Le responderemos pronto.'); }
                        },
                        {
                            name: 'Socio Creado',
                            send: function () { return emailService.sendSocioCreatedEmail(email, 'Socio de Prueba', 'TempPass123!', '15%'); }
                        },
                        {
                            name: 'Socio Primer Login',
                            send: function () { return emailService.sendSocioFirstLoginEmail(email, 'Socio de Prueba'); }
                        },
                        {
                            name: 'Admin Creado',
                            send: function () { return emailService.sendAdminCreatedEmail(email, 'Admin de Prueba', 'AdminPass456!', ['dashboard', 'usuarios', 'reportes', 'configuracion']); }
                        }
                    ];
                    results = [];
                    i = 0;
                    _a.label = 3;
                case 3:
                    if (!(i < templates.length)) return [3 /*break*/, 10];
                    template = templates[i];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 8, , 9]);
                    console.log("Enviando (".concat(i + 1, "/").concat(templates.length, "): ").concat(template.name, "..."));
                    return [4 /*yield*/, template.send()];
                case 5:
                    _a.sent();
                    results.push({ name: template.name, success: true });
                    console.log("   OK - ".concat(template.name, " - Enviado"));
                    if (!(i < templates.length - 1)) return [3 /*break*/, 7];
                    return [4 /*yield*/, delay(600)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    results.push({ name: template.name, success: false, error: error_1.message });
                    console.log("   ERROR - ".concat(template.name, ": ").concat(error_1.message));
                    return [3 /*break*/, 9];
                case 9:
                    i++;
                    return [3 /*break*/, 3];
                case 10:
                    console.log('\n=== RESUMEN ===');
                    successCount = results.filter(function (r) { return r.success; }).length;
                    failedCount = results.filter(function (r) { return !r.success; }).length;
                    console.log("Enviados: ".concat(successCount));
                    console.log("Fallidos: ".concat(failedCount));
                    console.log("Total: ".concat(results.length));
                    if (failedCount > 0) {
                        console.log('\nCorreos fallidos:');
                        results.filter(function (r) { return !r.success; }).forEach(function (r) {
                            console.log("  - ".concat(r.name, ": ").concat(r.error));
                        });
                    }
                    console.log('\nRevisa tu bandeja de entrada en:', email);
                    return [2 /*return*/];
            }
        });
    });
}
sendTestEmails().catch(console.error);
