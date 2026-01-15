const https = require('https');
const fs = require('fs');

/**
 * SCRIPT DE PRUEBA MASIVO - INTEGRACIÓN AZUL mTLS
 * Pruebas de tarjetas estándar y escenarios 3DS.
 */

const certPath = '/opt/certificados/gruard/app.gruard.com.crt';
const keyPath  = '/opt/certificados/gruard/app.gruard.com.key';
const merchantId = "39038540035";

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

const testScenarios = [
  // --- Tarjetas API AZUL (splitit) ---
  { name: "Card 1 - Standard", number: "5424180279791732", auth: "splitit", forceNo3DS: "1" },
  { name: "Card 2 - Standard", number: "6011000990099818", auth: "splitit", forceNo3DS: "1" },
  { name: "Card 3 - Standard", number: "4260550061845872", auth: "splitit", forceNo3DS: "1" },
  { name: "Card 4 - Standard", number: "4035874000424977", auth: "splitit", forceNo3DS: "1" },
  { name: "Card 5 - Standard", number: "5426064000424979", auth: "splitit", forceNo3DS: "1" },
  { name: "Card 6 - Standard", number: "4012000033330026", auth: "splitit", forceNo3DS: "1" },
  // --- Escenarios 3DS (3dsecure) ---
  { name: "3DS - Frictionless with 3DSMethod", number: "4761120010000492", auth: "3dsecure", forceNo3DS: "0" },
  { name: "3DS - Frictionless without 3DSMethod", number: "4147463011110117", auth: "3dsecure", forceNo3DS: "0" },
  { name: "3DS - Challenge with 3DSMethod (Limit 100)", number: "4005520000000129", auth: "3dsecure", forceNo3DS: "0" }
];

async function runTest(scenario) {
  return new Promise((resolve) => {
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
      OrderNumber: "GRUA-TEST-" + Math.floor(Math.random() * 1000000),
      CustomOrderId: "GRUA-TEST-" + Math.floor(Math.random() * 1000000),
      CustomerServicePhone: "8293519324",
      CardNumber: scenario.number,
      Expiration: "203412",
      CVC: "123",
      ForceNo3DS: scenario.forceNo3DS
    });

    const options = {
      hostname: 'pagos.azul.com.do',
      path: '/WebServices/JSON/default.aspx',
      method: 'POST',
      agent: agent,
      headers: {
        'Content-Type': 'application/json',
        'Auth1': scenario.auth,
        'Auth2': scenario.auth,
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'GruaRD-App/1.0',
        'Host': 'pagos.azul.com.do'
      }
    };

    console.log(`\nTesting: ${scenario.name} (${scenario.number}) - Auth: ${scenario.auth}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const status = parsed.IsoCode === '00' ? '✅ OK' : `❌ REJECTED (${parsed.IsoCode})`;
          console.log(`Result: ${status} - Msg: ${parsed.ResponseMessage || parsed.ErrorDescription || 'No detail'}`);
          if (parsed.ThreeDSMethodURL || parsed.AcsUrl) {
            console.log(`Note: Requires 3DS Action (AcsUrl/MethodURL present)`);
          }
          resolve(parsed);
        } catch (e) {
          console.log('Result: ❌ Invalid JSON Response');
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Result: ❌ Error:', err.message);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

async function runAll() {
  console.log('--- STARTING ALL AZUL INTEGRATION SCENARIOS ---');
  for (const scenario of testScenarios) {
    await runTest(scenario);
  }
  console.log('\n--- ALL TESTS COMPLETED ---');
}

runAll();
