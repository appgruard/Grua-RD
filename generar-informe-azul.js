const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

/**
 * GENERADOR DE INFORME TÉCNICO PARA AZUL
 * Este script genera un reporte completo para enviar a soporte técnico de Azul.
 */

const certPath = '/opt/certificados/gruard/app.gruard.com.bundle.crt';
const keyPath  = '/opt/certificados/gruard/app.gruard.com.key';
const merchantId = "39038540035";

const report = [];

function log(msg) {
    console.log(msg);
    report.push(msg);
}

log('================================================================================');
log('         INFORME TÉCNICO DE INTEGRACIÓN AZUL - GRÚA RD');
log('         Fecha: ' + new Date().toISOString());
log('================================================================================');

log('\n--- 1. INFORMACIÓN DEL COMERCIO ---');
log('Merchant ID (Store): ' + merchantId);
log('Dominio del Certificado: app.gruard.com');

log('\n--- 2. VALIDACIÓN DE ARCHIVOS DE CERTIFICADO ---');
try {
    const certStats = fs.statSync(certPath);
    const keyStats = fs.statSync(keyPath);
    log(`Certificado Bundle: ${certPath} (${certStats.size} bytes) ✓`);
    log(`Llave Privada: ${keyPath} (${keyStats.size} bytes) ✓`);
    
    const certContent = fs.readFileSync(certPath, 'utf8');
    const certCount = (certContent.match(/-----BEGIN CERTIFICATE-----/g) || []).length;
    log(`Certificados en el Bundle: ${certCount} (debe ser 2 o más para cadena completa)`);
} catch (e) {
    log('ERROR leyendo archivos: ' + e.message);
}

log('\n--- 3. VALIDACIÓN DE PAR DE LLAVES ---');
try {
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    new https.Agent({ cert, key });
    log('Par de llaves (cert/key) válido y compatible ✓');
} catch (e) {
    log('ERROR: Par de llaves incompatible - ' + e.message);
}

log('\n--- 4. PRUEBA DE CONEXIÓN mTLS ---');

const agent = new https.Agent({
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
});

const payload = JSON.stringify({
    Channel: "EC",
    Store: merchantId,
    PosInputMode: "E-Commerce",
    TrxType: "Sale",
    Amount: "100",
    Itbis: "18",
    CurrencyPosCode: "RD$",
    Payments: "1",
    Plan: "0",
    OrderNumber: "REPORT-" + Date.now(),
    CustomOrderId: "REPORT-" + Date.now(),
    CustomerServicePhone: "8293519324",
    CardNumber: "4012000033330026",
    Expiration: "203412",
    CVC: "123",
    ForceNo3DS: "1"
});

const options = {
    hostname: 'pagos.azul.com.do',
    path: '/WebServices/JSON/default.aspx',
    method: 'POST',
    agent: agent,
    headers: {
        'Content-Type': 'application/json',
        'Auth1': 'splitit',
        'Auth2': 'splitit',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'GruaRD-App/1.0',
        'Host': 'pagos.azul.com.do'
    }
};

const req = https.request(options, (res) => {
    log('Código HTTP: ' + res.statusCode);
    
    const socket = res.socket;
    log('Protocolo TLS Negociado: ' + socket.getProtocol());
    log('Suite de Cifrado: ' + socket.getCipher().name);
    
    const localCert = socket.getCertificate();
    if (localCert && localCert.subject) {
        log('Certificado Cliente Enviado (CN): ' + localCert.subject.CN + ' ✓');
    }
    
    const peerCert = socket.getPeerCertificate();
    if (peerCert && peerCert.subject) {
        log('Certificado Servidor Azul (CN): ' + peerCert.subject.CN);
    }

    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        log('\n--- 5. RESPUESTA DEL SERVIDOR AZUL ---');
        try {
            const json = JSON.parse(body);
            log('DateTime: ' + json.DateTime);
            log('ResponseCode: ' + json.ResponseCode);
            log('ErrorDescription: ' + json.ErrorDescription);
            
            log('\n--- 6. DIAGNÓSTICO ---');
            if (json.ErrorDescription === 'INVALID_AUTH:Auth') {
                log('PROBLEMA IDENTIFICADO: El servidor de Azul recibe correctamente la');
                log('conexión mTLS y el certificado, pero responde con INVALID_AUTH.');
                log('');
                log('CAUSA PROBABLE: El certificado "app.gruard.com" no está vinculado');
                log('al Merchant ID "' + merchantId + '" en la base de datos de Azul.');
                log('');
                log('ACCIÓN REQUERIDA: Solicitar a Azul que vincule el certificado');
                log('app.gruard.com con el Store/Merchant ID ' + merchantId);
            }
        } catch (e) {
            log('Respuesta RAW: ' + body);
        }
        
        log('\n================================================================================');
        log('                    FIN DEL INFORME TÉCNICO');
        log('================================================================================');
        
        // Guardar informe en archivo
        const reportPath = '/tmp/informe-azul-gruard.txt';
        fs.writeFileSync(reportPath, report.join('\n'));
        console.log('\n📄 Informe guardado en: ' + reportPath);
    });
});

req.on('error', (e) => {
    log('ERROR DE CONEXIÓN: ' + e.message);
});

req.write(payload);
req.end();
