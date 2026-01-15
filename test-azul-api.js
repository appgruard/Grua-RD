const https = require('https');
const fs = require('fs');

// CONFIGURACIÓN DE RUTAS DE CERTIFICADOS
const certPath = process.env.AZUL_CERT_PATH || '/opt/certificados/gruard/app.gruard.com.crt';
const keyPath  = process.env.AZUL_KEY_PATH || '/opt/certificados/gruard/app.gruard.com.key';

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('❌ ERROR: No se encontraron los certificados.');
  process.exit(1);
}

const agent = new https.Agent({
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath),
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2'
});

// Prueba con monto mínimo y datos válidos de prueba
const payload = JSON.stringify({
  Channel: "EC",
  Store: "39038540035",
  PosInputMode: "E-Commerce",
  TrxType: "Sale",
  Amount: "100", // RD$ 1.00
  Itbis: "18",
  CurrencyPosCode: "RD$",
  Payments: "1",
  Plan: "0",
  OrderNumber: "GRUA-" + Date.now(),
  CustomOrderId: "GRUA-" + Date.now(),
  CustomerServicePhone: "8293519324",
  CardNumber: "4111111111111111",
  Expiration: "203012",
  CVC: "123"
});

const options = {
  hostname: 'pagos.azul.com.do',
  path: '/WebServices/JSON/default.aspx',
  method: 'POST',
  agent,
  headers: {
    'Content-Type': 'application/json',
    'Auth1': 'splitit',
    'Auth2': 'splitit',
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent': 'GruaRD-App/1.0',
    'Host': 'pagos.azul.com.do'
  }
};

console.log('--- Probando Conexión Azul mTLS ---');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('RESPONSE:', JSON.stringify(parsed, null, 2));
      if (parsed.IsoCode === '00') {
        console.log('✅ EXITO: Conexión y Autenticación Correcta');
      } else {
        console.log('❌ ERROR AZUL:', parsed.ErrorDescription || parsed.ResponseMessage);
      }
    } catch (e) {
      console.log('RESPONSE RAW:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ ERROR DE RED:', err.message);
});

req.write(payload);
req.end();
