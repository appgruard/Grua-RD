const https = require('https');
const fs = require('fs');

/**
 * SCRIPT DE PRUEBA INTEGRACIÓN AZUL CON CERTIFICADOS DIGITALES (mTLS)
 * 
 * Este script utiliza autenticación mutua (mTLS) mediante certificados
 * y headers estáticos Auth1/Auth2 según requerimientos de Azul.
 */

// --- CONFIGURACIÓN DE RUTAS ---
// Asegúrate de que estas rutas sean correctas en tu servidor
const certPath = '/opt/certificados/gruard/app.gruard.com.crt';
const keyPath  = '/opt/certificados/gruard/app.gruard.com.key';
const merchantId = "39038540035"; // Tu Merchant ID

// --- VALIDACIÓN DE ARCHIVOS ---
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('❌ ERROR: No se encontraron los certificados en las rutas especificadas.');
  console.log('Ruta CRT:', certPath);
  console.log('Ruta KEY:', keyPath);
  process.exit(1);
}

// --- CONFIGURACIÓN DEL CLIENTE HTTPS (mTLS) ---
const agent = new https.Agent({
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath),
  rejectUnauthorized: true, // Validar certificado del servidor de Azul
  minVersion: 'TLSv1.2'     // Requerido por Azul
});

// --- PAYLOAD DE LA TRANSACCIÓN ---
const payload = JSON.stringify({
  Channel: "EC",
  Store: merchantId,
  PosInputMode: "E-Commerce",
  TrxType: "Sale",
  Amount: "100", // RD$ 1.00 (monto mínimo para prueba)
  Itbis: "18",   // ITBIS proporcional
  CurrencyPosCode: "RD$",
  Payments: "1",
  Plan: "0",
  OrderNumber: "GRUA-" + Date.now(),
  CustomOrderId: "GRUA-" + Date.now(),
  CustomerServicePhone: "8293519324",
  CardNumber: "4111111111111111", // Tarjeta de prueba Visa
  Expiration: "203012",           // Fecha futura válida
  CVC: "123",
  ForceNo3DS: "1"                 // Importante para mTLS/Server-to-Server
});

// --- OPCIONES DE LA PETICIÓN ---
const options = {
  hostname: 'pagos.azul.com.do',
  path: '/WebServices/JSON/default.aspx',
  method: 'POST',
  agent: agent,
  headers: {
    'Content-Type': 'application/json',
    'Auth1': 'splitit', // Header estático requerido para certificados
    'Auth2': 'splitit', // Header estático requerido para certificados
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent': 'GruaRD-App/1.0',
    'Host': 'pagos.azul.com.do'
  }
};

console.log('--- INICIANDO PRUEBA AZUL mTLS ---');
console.log('Merchant ID:', merchantId);
console.log('Endpoint:', options.hostname);

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
        console.log('\n✅ ¡ÉXITO! Conexión, Autenticación y Transacción aprobadas.');
      } else {
        console.log('\n❌ TRANSACCIÓN RECHAZADA');
        console.log('Código ISO:', parsed.IsoCode);
        console.log('Descripción:', parsed.ErrorDescription || parsed.ResponseMessage);
      }
    } catch (e) {
      console.log('--- RESPUESTA RAW (No JSON) ---');
      console.log(data);
    }
  });
});

req.on('error', (err) => {
  console.error('\n❌ ERROR DE CONEXIÓN:');
  console.error(err.message);
});

// Enviar el payload
req.write(payload);
req.end();
