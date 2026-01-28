const https = require('https');
const fs = require('fs');

/**
 * SCRIPT DE PRUEBA INTEGRACIÓN AZUL CON CERTIFICADOS DIGITALES (mTLS)
 * 
 * Este script utiliza autenticación mutua (mTLS) mediante certificados.
 */

// --- CONFIGURACIÓN DE RUTAS ---
const certPath = '/opt/certificados/gruard/app.gruard.com.crt';
const keyPath  = '/opt/certificados/gruard/app.gruard.com.key';
const merchantId = "39038540035";

// --- VALIDACIÓN DE ARCHIVOS ---
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('❌ ERROR: No se encontraron los certificados.');
  process.exit(1);
}

// --- CONFIGURACIÓN DEL CLIENTE HTTPS (mTLS) ---
const agent = new https.Agent({
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath),
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2'
});

// --- LISTADO DE TARJETAS DE PRUEBA ACTUALIZADO ---
const testCards = [
  "5424180279791732",
  "6011000990099818",
  "4260550061845872",
  "4035874000424977",
  "5426064000424979",
  "4012000033330026"
];

// Usamos la tarjeta #6 completa de tu lista por defecto
const cardNumber = testCards[5]; 

// --- PAYLOAD DE LA TRANSACCIÓN ---
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
  OrderNumber: "GRUA-" + Date.now(),
  CustomOrderId: "GRUA-" + Date.now(),
  CustomerServicePhone: "8293519324",
  CardNumber: cardNumber,
  Expiration: "203412",           // 12/34 como solicitaste
  CVC: "123",
  ForceNo3DS: "1"
});

// --- OPCIONES DE LA PETICIÓN ---
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

console.log('--- INICIANDO PRUEBA AZUL mTLS (NÚMEROS CORREGIDOS) ---');
console.log('Merchant ID:', merchantId);
console.log('Tarjeta:', cardNumber);
console.log('Expiración:', "203412");

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('--- RESPUESTA DE AZUL ---');
      console.log(JSON.stringify(parsed, null, 2));
      if (parsed.IsoCode === '00') {
        console.log('\n✅ ÉXITO: Aprobada.');
      } else {
        console.log('\n❌ RECHAZADA:', parsed.ErrorDescription || parsed.ResponseMessage);
      }
    } catch (e) {
      console.log('--- RESPUESTA RAW ---');
      console.log(data);
    }
  });
});

req.on('error', (err) => {
  console.error('\n❌ ERROR:', err.message);
});

req.write(payload);
req.end();
