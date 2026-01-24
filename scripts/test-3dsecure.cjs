const https = require('https');
const fs = require('fs');

const AZUL_TEST_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';
const AZUL_3DS_METHOD_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx?processthreedsmethod';
const AZUL_3DS_CHALLENGE_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx?processthreedschallenge';

const CERT_PATHS = {
  cert: process.env.AZUL_CERT_PATH || '/opt/certificados/gruard/app.gruard.com.crt',
  key: process.env.AZUL_KEY_PATH || '/opt/certificados/gruard/app.gruard.com.key',
  ca: process.env.AZUL_CA_PATH || '/opt/certificados/gruard/app.gruard.com.bundle.crt',
};

const TEST_CONFIG = {
  merchantId: process.env.AZUL_MERCHANT_ID || '39038540035',
  auth1: process.env.AZUL_AUTH1 || process.env.AZUL_AUTH_KEY || '3dsecure',
  auth2: process.env.AZUL_AUTH2 || process.env.AZUL_AUTH_KEY || '3dsecure',
  channel: process.env.AZUL_CHANNEL || 'EC',
};

const TEST_CARDS = {
  frictionlessWithMethod: {
    number: '4265880000000007',
    expiration: '202812',
    cvc: '123',
    description: 'Sin friccion con 3DSMethod'
  },
  frictionlessWithoutMethod: {
    number: '4147463011110117',
    expiration: '202812',
    cvc: '123',
    description: 'Sin friccion sin 3DSMethod'
  },
  challengeWithMethod: {
    number: '4005520000000129',
    expiration: '202812',
    cvc: '123',
    description: 'Desafio con 3DSMethod'
  },
  challengeWithoutMethod: {
    number: '4147463011110059',
    expiration: '202812',
    cvc: '123',
    description: 'Desafio sin 3DSMethod'
  }
};

let httpsAgent = null;

function loadCertificates() {
  console.log('\nCargando certificados mTLS...');
  console.log('  Cert: ' + CERT_PATHS.cert);
  console.log('  Key: ' + CERT_PATHS.key);
  console.log('  CA: ' + CERT_PATHS.ca);
  
  const certExists = fs.existsSync(CERT_PATHS.cert);
  const keyExists = fs.existsSync(CERT_PATHS.key);
  const caExists = fs.existsSync(CERT_PATHS.ca);
  
  if (!certExists || !keyExists) {
    console.error('\nError: Certificados no encontrados');
    process.exit(1);
  }
  
  const agentOptions = {
    cert: fs.readFileSync(CERT_PATHS.cert),
    key: fs.readFileSync(CERT_PATHS.key),
    rejectUnauthorized: false,
  };
  
  if (caExists) {
    agentOptions.ca = fs.readFileSync(CERT_PATHS.ca);
  }
  
  httpsAgent = new https.Agent(agentOptions);
  console.log('Certificados cargados correctamente\n');
}

function generateOrderNumber() {
  const now = Date.now();
  const timestamp = (now % 100000000000).toString().padStart(11, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return timestamp + random.toString();
}

function generateTransactionId() {
  return Date.now().toString();
}

async function makeRequest(url, data, auth1, auth2) {
  console.log('\nEnviando peticion a: ' + url);
  const logData = { ...data };
  if (logData.CardNumber) logData.CardNumber = logData.CardNumber.substring(0, 6) + '******';
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Auth1': auth1,
        'Auth2': auth2,
      },
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve({ raw: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('\nError en la peticion: ' + error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function step1_InitialPaymentRequest(card, transactionId) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 1: Solicitud inicial de pago con 3D Secure');
  console.log('Tarjeta: ' + card.description);
  console.log('='.repeat(80));

  const orderNumber = generateOrderNumber();
  const baseUrl = process.env.APP_BASE_URL || 'https://app.gruard.com';

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    CardNumber: card.number,
    Expiration: card.expiration,
    CVC: card.cvc,
    PosInputMode: 'E-Commerce',
    TrxType: 'Sale',
    Amount: '100',
    Itbis: '18',
    OrderNumber: orderNumber,
    CustomOrderId: 'GRD-' + transactionId,
    ThreeDSAuth: {
      TermUrl: 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx?3ds-callback',
      MethodNotificationUrl: 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx?3ds-method',
      RequestorChallengeIndicator: '04',
    },
    CardHolderInfo: {
      Name: 'Juan Perez Prueba',
      Email: 'test@gruard.com',
      PhoneHome: '8095551234',
      PhoneMobile: '8295551234',
      BillingAddressLine1: 'Calle Principal #123',
      BillingAddressCity: 'Santo Domingo',
      BillingAddressCountry: 'DO',
      BillingAddressZip: '10101',
    },
    BrowserInfo: {
      AcceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      IPAddress: '200.88.232.119',
      Language: 'es-DO',
      ColorDepth: '24',
      ScreenWidth: '1920',
      ScreenHeight: '1080',
      TimeZone: '240',
      UserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      JavaScriptEnabled: 'true',
    },
  };

  return await makeRequest(AZUL_TEST_URL, request, TEST_CONFIG.auth1, TEST_CONFIG.auth2);
}

async function step2_ProcessThreeDSMethod(azulOrderId, status) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 2: Procesar resultado del 3DS Method');
  console.log('='.repeat(80));

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AzulOrderId: azulOrderId,
    MethodNotificationStatus: status,
  };

  return await makeRequest(AZUL_3DS_METHOD_URL, request, TEST_CONFIG.auth1, TEST_CONFIG.auth2);
}

async function step3_ProcessThreeDSChallenge(azulOrderId, cres) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 3b: Procesar resultado del Challenge 3D Secure');
  console.log('='.repeat(80));

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AzulOrderId: azulOrderId,
    CRes: cres,
  };

  return await makeRequest(AZUL_3DS_CHALLENGE_URL, request, TEST_CONFIG.auth1, TEST_CONFIG.auth2);
}

async function runFullTest(cardKey) {
  const card = TEST_CARDS[cardKey];
  const transactionId = generateTransactionId();
  
  try {
    const step1Response = await step1_InitialPaymentRequest(card, transactionId);
    
    if (step1Response.IsoCode === '00') {
      console.log('\n[EXITO] TRANSACCION COMPLETADA (Sin friccion)');
      return step1Response;
    }

    if (step1Response.IsoCode === '3D2METHOD') {
      console.log('\nSimulando espera de notificacion del 3DS Method...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const step2Response = await step2_ProcessThreeDSMethod(step1Response.AzulOrderId, 'RECEIVED');
      
      if (step2Response.IsoCode === '00') {
        console.log('\n[EXITO] TRANSACCION COMPLETADA (Despues de 3DS Method)');
        return step2Response;
      }
      
      if (step2Response.IsoCode === '3D') {
        const challengeData = step2Response.ThreeDSChallenge;
        if (challengeData && challengeData.RedirectPostUrl && challengeData.CReq) {
          console.log('\n' + '='.repeat(80));
          console.log('PASO MANUAL REQUERIDO:');
          console.log('1. Abre scripts/3ds-helper.html en tu navegador.');
          console.log('\n   URL: ' + challengeData.RedirectPostUrl);
          console.log('\n   CReq: ' + challengeData.CReq);
          console.log('='.repeat(80));
          
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const cres = await new Promise(resolve => {
            readline.question('\n[?] Ingresa el CRes obtenido: ', (input) => {
              readline.close();
              resolve(input.trim().replace(/^["']|["']$/g, ''));
            });
          });

          if (cres) {
            return await step3_ProcessThreeDSChallenge(step1Response.AzulOrderId, cres);
          }
        }
      }
      return step2Response;
    }

    if (step1Response.IsoCode === '3D') {
      const challengeData = step1Response.ThreeDSChallenge;
      if (challengeData && challengeData.RedirectPostUrl && challengeData.CReq) {
        console.log('\n' + '='.repeat(80));
        console.log('PASO MANUAL REQUERIDO:');
        console.log('\n   URL: ' + challengeData.RedirectPostUrl);
        console.log('\n   CReq: ' + challengeData.CReq);
        console.log('='.repeat(80));

        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const cres = await new Promise(resolve => {
          readline.question('\n[?] Ingresa el CRes obtenido: ', (input) => {
            readline.close();
            resolve(input.trim().replace(/^["']|["']$/g, ''));
          });
        });

        if (cres) {
          return await step3_ProcessThreeDSChallenge(step1Response.AzulOrderId, cres);
        }
      }
      return step1Response;
    }

    return step1Response;
  } catch (error) {
    console.error('\n[ERROR]: ' + error.message);
    throw error;
  }
}

async function main() {
  loadCertificates();
  const args = process.argv.slice(2);
  const cardKey = args[0] || 'frictionlessWithMethod';
  
  if (!TEST_CARDS[cardKey]) {
    console.log('Tarjeta no valida. Opciones: ' + Object.keys(TEST_CARDS).join(', '));
    return;
  }

  try {
    const result = await runFullTest(cardKey);
    console.log('\n' + '='.repeat(80));
    console.log('RESULTADO FINAL:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(80));
  } catch (err) {
    console.error('Error fatal:', err);
  }
}

main();
