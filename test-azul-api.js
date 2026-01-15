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
  rejectUnauthorized: true
});

const payload = JSON.stringify({
  Channel: "EC",
  Store: "39038540035",
  PosInputMode: "E-Commerce",
  TrxType: "Sale",
  Amount: "10000",
  Itbis: "1800",
  CurrencyPosCode: "RD$",
  Payments: "1",
  Plan: "0",
  OrderNumber: "DEV-" + Date.now(),
  CustomOrderId: "DEV-" + Date.now(),
  CustomerServicePhone: "8091112222",
  CardNumber: "4111111111111111",
  Expiration: "203412",
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
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('--- Enviando petición con Auth1/Auth2: splitit ---');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', data);
  });
});

req.on('error', (err) => {
  console.error('ERROR:', err);
});

req.write(payload);
req.end();
