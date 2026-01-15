const https = require('https');
const fs = require('fs');

// CONFIGURACIÓN DE RUTAS DE CERTIFICADOS (Ajustar según entorno)
const certPath = process.env.AZUL_CERT_PATH || '/opt/certificados/gruard/app.gruard.com.crt';
const keyPath  = process.env.AZUL_KEY_PATH || '/opt/certificados/gruard/app.gruard.com.key';

// Verificar existencia de certificados antes de iniciar
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('❌ ERROR: No se encontraron los certificados en las rutas especificadas.');
  console.error(`Buscando en:\nCert: ${certPath}\nKey: ${keyPath}`);
  process.exit(1);
}

// HTTPS Agent con certificado digital
const agent = new https.Agent({
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath),
  rejectUnauthorized: true
});

const CONFIG = {
  merchantId: '39038540035',
  hostname: 'pagos.azul.com.do', // Producción/Sandbox URL según corresponda
  path: '/WebServices/JSON/default.aspx'
};

async function testAzulPayment() {
  console.log("--- Iniciando Prueba de Pago Azul (Certificados Digitales) ---");

  const payload = JSON.stringify({
    Channel: "EC",
    Store: CONFIG.merchantId,
    PosInputMode: "E-Commerce",
    TrxType: "Sale",
    Amount: "10000",          // RD$100.00
    Itbis: "1800",            // RD$18.00
    CurrencyPosCode: "RD$",
    Payments: "1",
    Plan: "0",
    OrderNumber: "DEV-" + Date.now(),
    CustomOrderId: "DEV-" + Date.now(),
    CustomerServicePhone: "8091112222",
    CardNumber: "4111111111111111", // Usar tarjetas del listado
    Expiration: "203412",
    CVC: "123"
  });

  const options = {
    hostname: CONFIG.hostname,
    path: CONFIG.path,
    method: 'POST',
    agent,
    headers: {
      'Content-Type': 'application/json',
      'Auth1': 'splitit', // Credenciales fijas según instrucción de Azul
      'Auth2': 'splitit',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('RESPONSE:', data);
      try {
        const jsonResponse = JSON.parse(data);
        if (jsonResponse.IsoCode === '00') {
          console.log("✅ PAGO EXITOSO");
        } else {
          console.log("❌ PAGO RECHAZADO:", jsonResponse.ResponseMessage);
        }
      } catch (e) {
        console.log("⚠️ No se pudo parsear la respuesta JSON");
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ ERROR DE CONEXIÓN:', err);
  });

  req.write(payload);
  req.end();
}

testAzulPayment();
