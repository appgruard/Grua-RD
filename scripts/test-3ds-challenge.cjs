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
  const caExists = fs.existsSync(CERT_PATHS.ca);
  
  if (!certExists || !keyExists) {
    console.error('Error: Certificados no encontrados');
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

async function httpRequest(url, method, postData = '', headers = {}, cookies = '') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'es-DO,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...headers,
    };
    
    if (method === 'POST') {
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      requestHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    
    if (cookies) {
      requestHeaders['Cookie'] = cookies;
    }
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + (urlObj.search || ''),
      method: method,
      headers: requestHeaders,
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        const setCookies = res.headers['set-cookie'] || [];
        const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
        resolve({ 
          status: res.statusCode, 
          headers: res.headers, 
          body: responseData,
          cookies: cookieStr,
          location: res.headers.location
        });
      });
    });
    
    req.on('error', reject);
    if (method === 'POST' && postData) {
      req.write(postData);
    }
    req.end();
  });
}

function extractHiddenInputs(html) {
  const inputs = {};
  const regex = /<input[^>]*>/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const inputTag = match[0];
    if (!/type\s*=\s*["']?hidden["']?/i.test(inputTag)) continue;
    
    const nameMatch = inputTag.match(/name\s*=\s*["']([^"']+)["']/i) || 
                      inputTag.match(/name\s*=\s*([^\s>]+)/i);
    const valueMatch = inputTag.match(/value\s*=\s*["']([^"']*)["']/i) ||
                       inputTag.match(/value\s*=\s*([^\s>]*)/i);
    
    if (nameMatch && nameMatch[1]) {
      inputs[nameMatch[1]] = valueMatch ? valueMatch[1] : '';
    }
  }
  
  return inputs;
}

function extractAllInputs(html) {
  const inputs = {};
  const regex = /<input[^>]*>/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const inputTag = match[0];
    
    const nameMatch = inputTag.match(/name\s*=\s*["']([^"']+)["']/i);
    const valueMatch = inputTag.match(/value\s*=\s*["']([^"']*)["']/i);
    const typeMatch = inputTag.match(/type\s*=\s*["']([^"']+)["']/i);
    
    if (nameMatch && nameMatch[1]) {
      inputs[nameMatch[1]] = {
        value: valueMatch ? valueMatch[1] : '',
        type: typeMatch ? typeMatch[1] : 'text'
      };
    }
  }
  
  return inputs;
}

function extractFormAction(html) {
  const formMatch = html.match(/<form[^>]*action\s*=\s*["']([^"']+)["'][^>]*>/i);
  return formMatch ? formMatch[1] : null;
}

function extractCRes(html) {
  const patterns = [
    /name\s*=\s*["']?cres["']?[^>]*value\s*=\s*["']([^"']+)["']/i,
    /value\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']?cres["']?/i,
    /<input[^>]*name\s*=\s*["']cres["'][^>]*value\s*=\s*["']([^"']+)["']/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

function mergeCookies(existing, newCookies) {
  if (!newCookies) return existing;
  if (!existing) return newCookies;
  
  const cookieMap = {};
  existing.split('; ').forEach(c => {
    const [key, ...rest] = c.split('=');
    if (key) cookieMap[key] = rest.join('=');
  });
  newCookies.split('; ').forEach(c => {
    const [key, ...rest] = c.split('=');
    if (key) cookieMap[key] = rest.join('=');
  });
  
  return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function initiatePayment() {
  console.log('='.repeat(80));
  console.log('PASO 1: Iniciando pago con tarjeta de challenge');
  console.log('Tarjeta: ' + CHALLENGE_CARD.number);
  console.log('='.repeat(80));

  const transactionId = Date.now().toString();
  const orderNumber = generateOrderNumber();
  const baseUrl = process.env.APP_BASE_URL || 'https://app.gruard.com';

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

async function simulateACSInteraction(redirectPostUrl, creq) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 3: Simulando interaccion con ACS');
  console.log('='.repeat(80));
  console.log('\nRedirectPostUrl: ' + redirectPostUrl);
  console.log('CReq length: ' + (creq ? creq.length : 0));

  let sessionCookies = '';
  const maxSteps = 6;
  let currentUrl = redirectPostUrl;
  let currentBody = 'creq=' + encodeURIComponent(creq);
  
  for (let step = 1; step <= maxSteps; step++) {
    console.log('\n--- Paso ' + step + '/' + maxSteps + ' ---');
    console.log('URL: ' + currentUrl);
    
    const response = await httpRequest(currentUrl, 'POST', currentBody, {}, sessionCookies);
    console.log('Status: ' + response.status);
    
    if (response.cookies) {
      sessionCookies = mergeCookies(sessionCookies, response.cookies);
      console.log('Cookies actualizadas');
    }
    
    const cres = extractCRes(response.body);
    if (cres) {
      console.log('\n*** CRes encontrado! ***');
      console.log('CRes (primeros 60 chars): ' + cres.substring(0, 60) + '...');
      return cres;
    }
    
    const formAction = extractFormAction(response.body);
    if (!formAction) {
      console.log('\nNo se encontro formulario siguiente.');
      console.log('\n--- Contenido HTML (primeros 1500 chars) ---');
      console.log(response.body.substring(0, 1500));
      
      const allInputs = extractAllInputs(response.body);
      console.log('\n--- Todos los inputs encontrados ---');
      Object.entries(allInputs).forEach(([name, info]) => {
        console.log('  ' + name + ' (' + info.type + '): ' + (info.value ? info.value.substring(0, 30) + '...' : '[vacio]'));
      });
      
      return null;
    }
    
    let nextUrl = formAction;
    if (!nextUrl.startsWith('http')) {
      const urlObj = new URL(currentUrl);
      nextUrl = urlObj.origin + (formAction.startsWith('/') ? '' : '/') + formAction;
    }
    
    const hiddenInputs = extractHiddenInputs(response.body);
    const allInputs = extractAllInputs(response.body);
    
    console.log('Form action: ' + formAction);
    console.log('Hidden inputs: ' + Object.keys(hiddenInputs).join(', '));
    console.log('All inputs: ' + Object.keys(allInputs).join(', '));
    
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(hiddenInputs)) {
      formData.append(key, value);
    }
    
    const needsOTP = Object.keys(allInputs).some(name => 
      /otp|password|pin|code|passcode/i.test(name) && allInputs[name].type !== 'hidden'
    );
    
    if (needsOTP) {
      console.log('Detectado campo OTP - enviando 1234');
      for (const name of Object.keys(allInputs)) {
        if (/otp|password|pin|code|passcode/i.test(name) && allInputs[name].type !== 'hidden') {
          formData.append(name, '1234');
        }
      }
    }
    
    currentUrl = nextUrl;
    currentBody = formData.toString();
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\nSe alcanzo el maximo de pasos sin obtener CRes');
  return null;
}

async function completeChallenge(azulOrderId, cres) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 4: Completando challenge con Azul');
  console.log('AzulOrderId: ' + azulOrderId);
  console.log('CRes: ' + (cres ? cres.substring(0, 50) + '...' : 'N/A'));
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
  console.log('TEST DE CHALLENGE 3D SECURE - AZUL');
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
      console.log('Challenge data:', JSON.stringify(challengeData, null, 2));
      return;
    }
    
    console.log('\n[INFO] Challenge requerido');
    console.log('  RedirectPostUrl: ' + challengeData.RedirectPostUrl);
    console.log('  CReq disponible: SI');
    
    const cres = await simulateACSInteraction(challengeData.RedirectPostUrl, challengeData.CReq);
    
    if (cres) {
      const finalResponse = await completeChallenge(azulOrderId, cres);
      
      if (finalResponse.IsoCode === '00') {
        console.log('\n' + '='.repeat(80));
        console.log('*** EXITO: TRANSACCION APROBADA ***');
        console.log('AuthorizationCode: ' + finalResponse.AuthorizationCode);
        console.log('='.repeat(80));
      } else {
        console.log('\n' + '='.repeat(80));
        console.log('*** ERROR: TRANSACCION NO APROBADA ***');
        console.log('IsoCode: ' + finalResponse.IsoCode);
        console.log('='.repeat(80));
      }
    } else {
      console.log('\n' + '='.repeat(80));
      console.log('*** No se pudo completar el challenge automaticamente ***');
      console.log('El ACS de pruebas puede requerir interaccion manual del navegador.');
      console.log('='.repeat(80));
    }
    
  } catch (error) {
    console.error('\nError: ' + error.message);
    console.error(error.stack);
  }
}

main();
