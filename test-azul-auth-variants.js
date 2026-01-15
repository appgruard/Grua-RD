const https = require('https');
const fs = require('fs');

/**
 * SCRIPT DE PRUEBA INTEGRACIÓN AZUL mTLS - MERCHANT ID DINÁMICO
 * Prueba con 'splitit' vs '3dsecure' según Merchant ID
 */

const certPath = '/opt/certificados/gruard/app.gruard.com.bundle.crt';
const keyPath  = '/opt/certificados/gruard/app.gruard.com.key';
const merchantId = "39038540035";

const agent = new https.Agent({
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath),
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2'
});

async function runTest(authKey) {
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
      'Auth1': authKey,
      'Auth2': authKey,
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': 'GruaRD-App/1.0',
      'Host': 'pagos.azul.com.do'
    }
  };

  return new Promise((resolve) => {
    console.log(`\n--- Probando con Auth1/Auth2: ${authKey} ---`);
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('RESPONSE:', data);
        resolve(data);
      });
    });
    req.on('error', (err) => {
      console.error('ERROR:', err.message);
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

async function start() {
  await runTest('splitit');
  await runTest('3dsecure');
}

start();
