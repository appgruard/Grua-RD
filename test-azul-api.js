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

// --- LISTADO DE TARJETAS DE PRUEBA ---
const testCards = [
  { number: "5424000018020000", brand: "Mastercard" }, // Placeholder for 5424****1802****
  { number: "6011000000090000", brand: "Discover" },   // Placeholder for 6011****0009****
  { number: "4260000055000000", brand: "Visa" },       // Placeholder for 4260****5500****
  { number: "4035000087400000", brand: "Visa" },       // Placeholder for 4035****8740****
  { number: "5426000006400000", brand: "Mastercard" }, // Placeholder for 5426****0640****
  { number: "4012000000003333", brand: "Visa" },       // Placeholder for 4012****0000****
];

// Usamos la primera tarjeta de la lista para la prueba
const selectedId = 5; // Cambiar índice para probar otras
const cardNumber = testCards[selectedId].number;

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
  CardNumber: "4012000033330026", // Usando la tarjeta #6 completa de tu lista
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
    'Auth1': 'splitit', // Header solicitado para mTLS
    'Auth2': 'splitit', // Header solicitado para mTLS
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent': 'GruaRD-App/1.0',
    'Host': 'pagos.azul.com.do'
  }
};

console.log('--- INICIANDO PRUEBA AZUL mTLS ---');
console.log('Merchant ID:', merchantId);
console.log('Tarjeta:', "4012000033330026");
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
