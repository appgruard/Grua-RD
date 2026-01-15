const https = require('https');
const fs = require('fs');

/**
 * SCRIPT DE PRUEBA INTEGRACIÓN AZUL mTLS - DEPURE
 * Este script intenta conectarse a Azul y muestra detalles del certificado enviado.
 */

// RUTAS PARA PRUEBA LOCAL (Ajustar según donde ejecutes el script)
const certPath = '/opt/certificados/gruard/app.gruard.com.crt';
const keyPath  = '/opt/certificados/gruard/app.gruard.com.key';
const merchantId = "39038540035";

console.log('--- VERIFICANDO ARCHIVOS ---');
[certPath, keyPath].forEach(path => {
    try {
        fs.accessSync(path, fs.constants.R_OK);
        console.log(`✅ ${path} accesible`);
    } catch (e) {
        console.error(`❌ ${path} NO ACCESIBLE:`, e.message);
    }
});

const certData = fs.readFileSync(certPath);
const keyData = fs.readFileSync(keyPath);

const agent = new https.Agent({
  cert: certData,
  key: keyData,
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
  OrderNumber: "GRUA-DEBUG-" + Date.now(),
  CustomOrderId: "GRUA-DEBUG-" + Date.now(),
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
    'User-Agent': 'NodeJS/mTLS-Debug',
    'Host': 'pagos.azul.com.do'
  }
};

console.log('\n--- INICIANDO PETICIÓN ---');
const req = https.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  
  // Información de la conexión TLS
  const socket = res.socket;
  console.log('Protocolo:', socket.getProtocol());
  console.log('Cifrado:', JSON.stringify(socket.getCipher()));
  
  const peerCert = socket.getPeerCertificate();
  console.log('Certificado del Servidor (CN):', peerCert.subject.CN);

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('RESPONSE:', data);
  });
});

req.on('error', (err) => {
  console.error('❌ ERROR:', err.stack);
});

req.write(payload);
req.end();
