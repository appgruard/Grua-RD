const https = require('https');
const fs = require('fs');
const readline = require('readline');

const AZUL_TEST_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';
const AZUL_3DS_METHOD_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx?processthreedsmethod';
const AZUL_3DS_CHALLENGE_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx?processthreedschallenge';

const CERT_PATHS = {
  cert: process.env.AZUL_CERT_PATH || './server/services/azul-certs/app.gruard.com.crt',
  key: process.env.AZUL_KEY_PATH || './server/services/azul-certs/app.gruard.com.key',
  ca: process.env.AZUL_CA_PATH || './server/services/azul-certs/app.gruard.com.bundle.crt',
};

const TEST_CONFIG = {
  merchantId: process.env.AZUL_MERCHANT_ID || '39038540035',
  auth1: process.env.AZUL_AUTH1 || process.env.AZUL_AUTH_KEY || '3dsecure',
  auth2: process.env.AZUL_AUTH2 || process.env.AZUL_AUTH_KEY || '3dsecure',
  channel: process.env.AZUL_CHANNEL || 'EC',
};

const CHALLENGE_CARD = {
  number: '4005520000000129',
  expiration: '202812',
  cvc: '123',
  description: 'Desafio con 3DSMethod'
};

let httpsAgent = null;

function loadCertificates() {
  console.log('\nCargando certificados mTLS...');
  
  const certExists = fs.existsSync(CERT_PATHS.cert);
  const keyExists = fs.existsSync(CERT_PATHS.key);
  
  if (!certExists || !keyExists) {
    console.error('Error: Certificados no encontrados');
    process.exit(1);
  }
  
  const agentOptions = {
    cert: fs.readFileSync(CERT_PATHS.cert),
    key: fs.readFileSync(CERT_PATHS.key),
    rejectUnauthorized: false,
  };
  
  const caExists = fs.existsSync(CERT_PATHS.ca);
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

async function makeAzulRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Auth1': TEST_CONFIG.auth1,
        'Auth2': TEST_CONFIG.auth2,
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
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function initiatePayment() {
  console.log('='.repeat(80));
  console.log('PASO 1: Iniciando pago con tarjeta de challenge');
  console.log('Tarjeta: ' + CHALLENGE_CARD.number);
  console.log('='.repeat(80));

  const transactionId = Date.now().toString();
  const orderNumber = generateOrderNumber();
  const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000';

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    CardNumber: CHALLENGE_CARD.number,
    Expiration: CHALLENGE_CARD.expiration,
    CVC: CHALLENGE_CARD.cvc,
    PosInputMode: 'E-Commerce',
    TrxType: 'Sale',
    Amount: '100000',
    Itbis: '18000',
    OrderNumber: orderNumber,
    CustomOrderId: 'GRD-' + transactionId,
    DataVaultToken: '',
    SaveToDataVault: '0',
    ForceNo3DS: '',
    ThreeDSAuth: {
      TermUrl: baseUrl + '/api/azul/3ds/callback?sid=' + transactionId,
      MethodNotificationUrl: baseUrl + '/api/azul/3ds/method-notification?sid=' + transactionId,
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

  console.log('\nEnviando solicitud inicial...');
  const response = await makeAzulRequest(AZUL_TEST_URL, request);
  
  console.log('IsoCode: ' + response.IsoCode);
  console.log('ResponseMessage: ' + response.ResponseMessage);
  console.log('AzulOrderId: ' + response.AzulOrderId);

  return response;
}

async function process3DSMethod(azulOrderId) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 2: Procesando 3DS Method');
  console.log('AzulOrderId: ' + azulOrderId);
  console.log('='.repeat(80));

  await new Promise(resolve => setTimeout(resolve, 2000));

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AzulOrderId: azulOrderId,
    MethodNotificationStatus: 'RECEIVED',
  };

  console.log('\nEnviando notificacion de 3DS Method...');
  const response = await makeAzulRequest(AZUL_3DS_METHOD_URL, request);
  
  console.log('IsoCode: ' + response.IsoCode);
  console.log('ResponseMessage: ' + response.ResponseMessage);

  return response;
}

function generateChallengeHTML(redirectPostUrl, creq, termUrl) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Secure Challenge - Test</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px; 
      margin: 40px auto; 
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-top: 0; }
    h2 { color: #555; font-size: 18px; margin-top: 0; }
    .info { background: #e3f2fd; padding: 16px; border-radius: 4px; margin: 16px 0; }
    .warning { background: #fff3e0; padding: 16px; border-radius: 4px; margin: 16px 0; }
    .success { background: #e8f5e9; padding: 16px; border-radius: 4px; margin: 16px 0; }
    pre { 
      background: #263238; 
      color: #aed581; 
      padding: 16px; 
      border-radius: 4px; 
      overflow-x: auto;
      font-size: 13px;
    }
    code { font-family: 'Monaco', 'Menlo', monospace; }
    button {
      background: #1976d2;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin: 8px 8px 8px 0;
    }
    button:hover { background: #1565c0; }
    button.secondary { background: #757575; }
    button.secondary:hover { background: #616161; }
    #challengeFrame {
      width: 100%;
      height: 500px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .step { 
      display: flex; 
      align-items: flex-start; 
      margin: 16px 0;
      padding: 16px;
      background: #fafafa;
      border-radius: 4px;
    }
    .step-number {
      background: #1976d2;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 16px;
      flex-shrink: 0;
    }
    .hidden { display: none; }
    #cresOutput {
      width: 100%;
      min-height: 100px;
      font-family: monospace;
      font-size: 12px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-top: 8px;
    }
    .label { font-weight: 600; color: #333; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Test 3D Secure Challenge</h1>
    <p>Este archivo te permite completar el challenge 3DS manualmente y obtener el CRes.</p>
  </div>

  <div class="card">
    <h2>Instrucciones</h2>
    
    <div class="step">
      <div class="step-number">1</div>
      <div>
        <p class="label">Iniciar el Challenge</p>
        <p>Haz clic en el boton para cargar el iframe del ACS. Ingresa el codigo OTP de prueba: <strong>1234</strong></p>
        <button onclick="startChallenge()">Iniciar Challenge</button>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">2</div>
      <div>
        <p class="label">Completa la autenticacion</p>
        <p>El ACS mostrara un formulario. Usa el codigo <strong>1234</strong> para aprobar.</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">3</div>
      <div>
        <p class="label">Copia el CRes</p>
        <p>Cuando el challenge termine, el CRes aparecera abajo. Copialo y pegalo en la terminal.</p>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Challenge Frame</h2>
    <div class="info">
      <strong>TermUrl:</strong> ${termUrl}<br>
      <small>El ACS redirigira aqui con el CRes cuando completes el challenge.</small>
    </div>
    
    <div id="frameContainer" class="hidden">
      <iframe id="challengeFrame" name="challengeFrame"></iframe>
    </div>
    
    <form id="challengeForm" method="POST" action="${redirectPostUrl}" target="challengeFrame" class="hidden">
      <input type="hidden" name="CReq" value="${creq}">
    </form>
  </div>

  <div class="card">
    <h2>CRes Capturado</h2>
    <div class="warning">
      <p><strong>Nota:</strong> El CRes se capturara cuando el ACS redirija al TermUrl.</p>
      <p>Si usas una URL local que no existe, abre DevTools (F12) > Network y busca la peticion al TermUrl para ver el CRes en los parametros.</p>
    </div>
    <textarea id="cresOutput" placeholder="El CRes aparecera aqui o pegalo manualmente..."></textarea>
    <br>
    <button onclick="copyCRes()">Copiar CRes</button>
    <button class="secondary" onclick="extractFromUrl()">Extraer de URL</button>
  </div>

  <div class="card">
    <h2>Datos Tecnicos</h2>
    <details>
      <summary>Ver RedirectPostUrl</summary>
      <pre>${redirectPostUrl}</pre>
    </details>
    <details>
      <summary>Ver CReq (Base64)</summary>
      <pre>${creq}</pre>
    </details>
    <details>
      <summary>Ver CReq (Decodificado)</summary>
      <pre id="creqDecoded"></pre>
    </details>
  </div>

  <script>
    // Decodificar CReq
    try {
      const decoded = atob('${creq}');
      document.getElementById('creqDecoded').textContent = decoded;
    } catch(e) {
      document.getElementById('creqDecoded').textContent = 'Error al decodificar';
    }

    function startChallenge() {
      document.getElementById('frameContainer').classList.remove('hidden');
      document.getElementById('challengeForm').submit();
    }

    function copyCRes() {
      const textarea = document.getElementById('cresOutput');
      textarea.select();
      document.execCommand('copy');
      alert('CRes copiado al portapapeles');
    }

    function extractFromUrl() {
      const url = prompt('Pega la URL completa del TermUrl con los parametros:');
      if (url) {
        try {
          const urlObj = new URL(url);
          const cres = urlObj.searchParams.get('cres') || urlObj.searchParams.get('CRes');
          if (cres) {
            document.getElementById('cresOutput').value = cres;
            alert('CRes extraido correctamente');
          } else {
            // Intentar buscar en el body si es una URL con fragmento
            const match = url.match(/[?&]c[rR]es=([^&]+)/);
            if (match) {
              document.getElementById('cresOutput').value = decodeURIComponent(match[1]);
              alert('CRes extraido correctamente');
            } else {
              alert('No se encontro CRes en la URL');
            }
          }
        } catch(e) {
          alert('URL invalida: ' + e.message);
        }
      }
    }

    // Escuchar mensajes del iframe (por si el ACS usa postMessage)
    window.addEventListener('message', function(event) {
      console.log('Mensaje recibido:', event.data);
      if (event.data && (event.data.cres || event.data.CRes)) {
        document.getElementById('cresOutput').value = event.data.cres || event.data.CRes;
      }
    });
  </script>
</body>
</html>`;
}

async function completeChallenge(azulOrderId, cres) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 4: Completando challenge con Azul');
  console.log('AzulOrderId: ' + azulOrderId);
  console.log('CRes length: ' + cres.length);
  console.log('='.repeat(80));

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AzulOrderId: azulOrderId,
    CRes: cres,
  };

  console.log('\nEnviando CRes a Azul...');
  const response = await makeAzulRequest(AZUL_3DS_CHALLENGE_URL, request);
  
  console.log('\nRespuesta:');
  console.log('  IsoCode: ' + response.IsoCode);
  console.log('  ResponseMessage: ' + response.ResponseMessage);
  console.log('  AuthorizationCode: ' + (response.AuthorizationCode || 'N/A'));
  console.log('  ErrorDescription: ' + (response.ErrorDescription || 'N/A'));

  return response;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3D SECURE CON INTERACCION MANUAL');
  console.log('='.repeat(80));
  
  loadCertificates();
  
  try {
    const step1 = await initiatePayment();
    
    if (!step1.AzulOrderId) {
      console.log('\nERROR: No se recibio AzulOrderId');
      return;
    }
    
    let challengeData = null;
    let azulOrderId = step1.AzulOrderId;
    
    if (step1.IsoCode === '3D2METHOD') {
      console.log('\n[OK] Se requiere 3DS Method');
      const step2 = await process3DSMethod(azulOrderId);
      
      if (step2.IsoCode === '3D') {
        challengeData = step2.ThreeDSChallenge;
      } else if (step2.IsoCode === '00') {
        console.log('\n*** TRANSACCION APROBADA (sin challenge) ***');
        return;
      }
    } else if (step1.IsoCode === '3D') {
      challengeData = step1.ThreeDSChallenge;
    } else if (step1.IsoCode === '00') {
      console.log('\n*** TRANSACCION APROBADA (frictionless) ***');
      return;
    }
    
    if (!challengeData || !challengeData.RedirectPostUrl || !challengeData.CReq) {
      console.log('\nERROR: No se recibio datos de challenge');
      return;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('PASO 3: Challenge Manual');
    console.log('='.repeat(80));
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000';
    const termUrl = baseUrl + '/api/azul/3ds/callback?sid=' + Date.now();
    
    // Loguear datos para depuracion manual
    console.log('\n--- DATOS DE CHALLENGE PARA COPIAR SI ES NECESARIO ---');
    console.log('RedirectPostUrl: ' + challengeData.RedirectPostUrl);
    console.log('CReq: ' + challengeData.CReq);
    console.log('------------------------------------------------------\n');
    
    const htmlContent = generateChallengeHTML(
      challengeData.RedirectPostUrl,
      challengeData.CReq,
      termUrl
    );

    console.log('\n' + '!'.repeat(80));
    console.log('¡ATENCIÓN: EL PROCESO DE CHALLENGE AHORA ES COMPLETAMENTE MANUAL!');
    console.log('!'.repeat(80));
    console.log('\nSigue estos pasos EXACTAMENTE:');
    console.log('1. Copia el siguiente valor de CReq:');
    console.log(`\n${challengeData.CReq}\n`);
    console.log('2. Abre una pestaña de incógnito en tu navegador.');
    console.log('3. Ve a la siguiente URL del ACS de Azul:');
    console.log(`\n${challengeData.RedirectPostUrl}\n`);
    console.log('4. Si es una URL de pruebas que espera un POST, usa el siguiente formulario HTML temporal:');
    
    const tempHtmlPath = '/tmp/azul-manual-form.html';
    const formHtml = `
      <form id="azulForm" method="POST" action="${challengeData.RedirectPostUrl}">
        <input type="hidden" name="creq" value="${challengeData.CReq}">
        <p>Haz clic para iniciar el desafío manual:</p>
        <button type="submit">Iniciar Desafío</button>
      </form>
    `;
    fs.writeFileSync(tempHtmlPath, formHtml);
    
    console.log(`   (Se ha creado un formulario de ayuda en: ${tempHtmlPath})`);
    console.log('5. Completa el desafío (OTP: 1234).');
    console.log('6. Serás redirigido a una URL que contiene "?cres=...".');
    console.log('7. COPIA el valor del parámetro "cres" de la barra de direcciones.');
    console.log('\n' + '-'.repeat(80));

    const cres = await prompt('\n⌨️  Pega aquí el valor de "cres" para completar la transacción (o "skip"): ');
    
    if (!cres || cres.toLowerCase() === 'skip') {
      console.log('\n*** Test terminado sin completar el challenge ***');
      console.log('El flujo hasta el challenge funciona correctamente.');
      console.log('AzulOrderId: ' + azulOrderId);
      return;
    }
    
    const finalResponse = await completeChallenge(azulOrderId, cres);
    
    if (finalResponse.IsoCode === '00') {
      console.log('\n' + '='.repeat(80));
      console.log('*** EXITO: TRANSACCION APROBADA ***');
      console.log('AuthorizationCode: ' + finalResponse.AuthorizationCode);
      console.log('='.repeat(80));
    } else {
      console.log('\n' + '='.repeat(80));
      console.log('*** RESULTADO: ' + finalResponse.ResponseMessage + ' ***');
      console.log('IsoCode: ' + finalResponse.IsoCode);
      if (finalResponse.ErrorDescription) {
        console.log('Error: ' + finalResponse.ErrorDescription);
      }
      console.log('='.repeat(80));
    }
    
  } catch (error) {
    console.error('\nError: ' + error.message);
    console.error(error.stack);
  }
}

main();
