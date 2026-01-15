const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

/**
 * SCRIPT DE VALIDACIÓN TÉCNICA - AZUL mTLS
 * Verifica archivos, carga de certificados y handshake TLS.
 */

const certPath = '/opt/certificados/gruard/app.gruard.com.bundle.crt';
const keyPath  = '/opt/certificados/gruard/app.gruard.com.key';
const merchantId = "39038540035";

console.log('=== 1. VALIDACIÓN DE ARCHIVOS EN DISCO ===');
const files = [certPath, keyPath];
files.forEach(path => {
    try {
        const stats = fs.statSync(path);
        console.log(`✅ EXISTA: ${path} (${stats.size} bytes)`);
        const content = fs.readFileSync(path, 'utf8');
        if (content.includes('BEGIN')) {
            console.log(`   - Formato PEM detectado: OK`);
        } else {
            console.log(`   - ⚠️ FORMATO NO PEM: Posible problema de codificación.`);
        }
    } catch (e) {
        console.error(`❌ ERROR: No se puede leer ${path}:`, e.message);
    }
});

console.log('\n=== 2. VALIDACIÓN DE COINCIDENCIA (KEY/CERT) ===');
try {
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    
    // Intenta crear un agente para ver si Node acepta el par
    const agent = new https.Agent({ cert, key });
    console.log('✅ Node.js cargó el par de llaves correctamente en el Agente.');
} catch (e) {
    console.error('❌ ERROR: El par de llaves no coincide o es inválido:', e.message);
}

console.log('\n=== 3. PRUEBA DE CONEXIÓN Y HANDSHAKE ===');
const payload = JSON.stringify({
    Channel: "EC",
    Store: merchantId,
    PosInputMode: "E-Commerce",
    TrxType: "Sale",
    Amount: "100",
    CurrencyPosCode: "RD$",
    Payments: "1",
    Plan: "0",
    OrderNumber: "VAL-" + Date.now(),
    CustomOrderId: "VAL-" + Date.now(),
    CardNumber: "4012000033330026",
    Expiration: "203412",
    CVC: "123",
    ForceNo3DS: "1"
});

const agent = new https.Agent({
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
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
        'User-Agent': 'AzulValidator/1.0',
        'Host': 'pagos.azul.com.do'
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS HTTP: ${res.statusCode}`);
    
    // Información del socket para verificar mTLS
    const socket = res.socket;
    console.log('Protocolo TLS:', socket.getProtocol());
    console.log('Cifrado:', socket.getCipher().name);
    
    const localCert = socket.getCertificate();
    if (localCert && Object.keys(localCert).length > 0) {
        console.log('✅ CERTIFICADO CLIENTE ENVIADO:', localCert.subject ? localCert.subject.CN : 'Presente');
    } else {
        console.log('⚠️ ADVERTENCIA: No se detectó certificado de cliente en el socket (mTLS no activo).');
    }

    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('\n=== 4. RESPUESTA DEL SERVIDOR ===');
        console.log(body);
        try {
            const json = JSON.parse(body);
            if (json.ErrorDescription === 'INVALID_AUTH:Auth') {
                console.log('\n❌ CONCLUSIÓN: El servidor de Azul recibió la petición pero rechazó el Auth1/Auth2 o el certificado no está mapeado a tu Store en su DB.');
            }
        } catch (e) {}
    });
});

req.on('error', (e) => {
    console.error('\n❌ ERROR DE RED/TLS:', e.message);
    if (e.message.includes('CERT_PKEY_MISMATCH')) {
        console.log('   - Tu .key no corresponde a tu .crt');
    }
});

req.write(payload);
req.end();
