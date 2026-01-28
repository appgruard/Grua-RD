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
  console.log('PASO 2: Inicio del proceso de autenticación 3DS (Solicitud a Azul)');
  console.log('Tarjeta: ' + card.description);
  console.log('='.repeat(80));

  const orderNumber = generateOrderNumber();
  
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
      TermUrl: 'https://www.google.com',
      MethodNotificationUrl: 'https://www.google.com',
      RequestorChallengeIndicator: '01',
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
      AcceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
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

async function step2_SubmitMethodForm(threeDSMethodData) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 4: Envío de detalles del ambiente del tarjetahabiente (MethodForm)');
  
  // Extraer URL del formulario si viene en ThreeDSMethod.MethodForm
  let methodUrl = threeDSMethodData?.ThreeDSMethodUrl;
  
  if (!methodUrl && threeDSMethodData?.MethodForm) {
    const match = threeDSMethodData.MethodForm.match(/action=["']([^"']+)["']/);
    if (match) methodUrl = match[1];
  }

  if (!methodUrl) {
    console.log('ADVERTENCIA: URL de 3DS Method no encontrada.');
    console.log('Contenido recibido:', JSON.stringify(threeDSMethodData, null, 2));
    console.log('Continuando simulacion...');
  } else {
    console.log('URL detectada: ' + methodUrl);
  }
  
  console.log('='.repeat(80));
  
  // En un entorno real, esto sería un post manual desde el navegador del cliente
  console.log('Simulando envío de ThreeDSMethodData al ACS del emisor...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Respuesta del ACS recibida en MethodNotificationUrl.');
  return { status: 'RECEIVED' };
}

async function step3_ContinueAuthentication(azulOrderId, status) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 5-6: Continuar proceso de autenticación 3DS (MethodNotificationStatus)');
  console.log('='.repeat(80));

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AzulOrderId: azulOrderId,
    MethodNotificationStatus: status,
  };

  return await makeRequest(AZUL_3DS_METHOD_URL, request, TEST_CONFIG.auth1, TEST_CONFIG.auth2);
}

async function step4_ProcessThreeDSChallenge(azulOrderId, cres) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 8-9: Finalización (ProcessThreeDSChallenge)');
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
    console.log('\n' + '='.repeat(80));
    console.log('PASO 1: El cliente somete detalles al Comercio');
    console.log('='.repeat(80));

    const step1Response = await step1_InitialPaymentRequest(card, transactionId);
    
    // Paso 3 (Respuesta)
    if (step1Response.IsoCode === '00') {
      console.log('\n[Paso 9] FINALIZADO: Pago completado (Sin fricción)');
      return step1Response;
    }

    if (step1Response.IsoCode === '3D2METHOD') {
      console.log('\n[Paso 3] Azul respondió con 3D2METHOD');
      
      // Paso 4
      // Azul entrega ThreeDSMethod.MethodForm en lugar de ThreeDSMethodData directo
      const methodData = step1Response.ThreeDSMethodData || 
                         step1Response.threeDSMethodData || 
                         step1Response.ThreeDSMethod;
      await step2_SubmitMethodForm(methodData);
      
      // Paso 5
      const step3Response = await step3_ContinueAuthentication(step1Response.AzulOrderId, 'RECEIVED');
      
      // Paso 6 (Respuesta)
      if (step3Response.IsoCode === '00') {
        console.log('\n[Paso 9] FINALIZADO: Pago completado (Post-Method)');
        return step3Response;
      }
      
      if (step3Response.IsoCode === '3D') {
        console.log('\n[Paso 6] Azul indica que requiere DESAFÍO');
        const challengeData = step3Response.ThreeDSChallenge;
        if (challengeData && challengeData.RedirectPostUrl && challengeData.CReq) {
          console.log('\n' + '='.repeat(80));
          console.log('PASO 7: Desafío 3DS (Inicio del desafío)');
          console.log('1. Abre scripts/3ds-helper.html en tu navegador.');
          console.log('\n   URL: ' + challengeData.RedirectPostUrl);
          console.log('\n   CReq: ' + challengeData.CReq);
          console.log('='.repeat(80));
          
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const cres = await new Promise(resolve => {
            readline.question('\n[?] Ingresa el CRes obtenido tras el desafío: ', (input) => {
              readline.close();
              resolve(input.trim().replace(/^["']|["']$/g, ''));
            });
          });

          if (cres) {
            // Paso 8 & 9
            return await step4_ProcessThreeDSChallenge(step1Response.AzulOrderId, cres);
          }
        }
      }
      return step3Response;
    }

    if (step1Response.IsoCode === '3D') {
      console.log('\n[Paso 3] Azul respondió indicando DESAFÍO directo');
      const challengeData = step1Response.ThreeDSChallenge;
      if (challengeData && challengeData.RedirectPostUrl && challengeData.CReq) {
        console.log('\n' + '='.repeat(80));
        console.log('PASO 7: Desafío 3DS');
        console.log('\n   URL: ' + challengeData.RedirectPostUrl);
        console.log('\n   CReq: ' + challengeData.CReq);
        console.log('='.repeat(80));

        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const cres = await new Promise(resolve => {
          readline.question('\n[?] Ingresa el CRes obtenido tras el desafío: ', (input) => {
            readline.close();
            resolve(input.trim().replace(/^["']|["']$/g, ''));
          });
        });

        if (cres) {
          // Paso 8 & 9
          return await step4_ProcessThreeDSChallenge(step1Response.AzulOrderId, cres);
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
