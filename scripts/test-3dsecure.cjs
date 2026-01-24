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
  
  console.log('  Cert existe: ' + (certExists ? 'SI' : 'NO'));
  console.log('  Key existe: ' + (keyExists ? 'SI' : 'NO'));
  console.log('  CA existe: ' + (caExists ? 'SI' : 'NO'));
  
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
  console.log('Datos: ' + JSON.stringify(data, null, 2));
  
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
        'Auth1': auth1,
        'Auth2': auth2,
      },
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        console.log('\nRespuesta raw: ' + responseData);
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
  console.log('Tarjeta: ' + card.description + ' (' + card.number + ')');
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

  const response = await makeRequest(AZUL_TEST_URL, request, TEST_CONFIG.auth1, TEST_CONFIG.auth2);

  console.log('\nRespuesta procesada:');
  console.log('  IsoCode: ' + response.IsoCode);
  console.log('  ResponseMessage: ' + response.ResponseMessage);
  console.log('  AzulOrderId: ' + response.AzulOrderId);
  console.log('  ErrorDescription: ' + response.ErrorDescription);

  if (response.IsoCode === '3D2METHOD') {
    console.log('\n[OK] Se requiere 3DS Method');
    console.log('  MethodForm disponible: ' + !!response.ThreeDSMethod?.MethodForm);
  } else if (response.IsoCode === '3D') {
    console.log('\n[OK] Se requiere desafio 3D Secure');
    console.log('  RedirectPostUrl: ' + response.ThreeDSChallenge?.RedirectPostUrl);
  } else if (response.IsoCode === '00') {
    console.log('\n[OK] Transaccion aprobada sin friccion');
    console.log('  AuthorizationCode: ' + response.AuthorizationCode);
  } else {
    console.log('\n[ERROR] Respuesta inesperada: ' + response.IsoCode);
  }

  return response;
}

async function step2_ProcessThreeDSMethod(azulOrderId, status) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 2: Procesar resultado del 3DS Method');
  console.log('AzulOrderId: ' + azulOrderId);
  console.log('Status: ' + status);
  console.log('='.repeat(80));

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AzulOrderId: azulOrderId,
    MethodNotificationStatus: status,
  };

  const response = await makeRequest(AZUL_3DS_METHOD_URL, request, TEST_CONFIG.auth1, TEST_CONFIG.auth2);

  console.log('\nRespuesta procesada:');
  console.log('  IsoCode: ' + response.IsoCode);
  console.log('  ResponseMessage: ' + response.ResponseMessage);

  if (response.IsoCode === '00') {
    console.log('\n[OK] Transaccion aprobada (sin friccion)');
    console.log('  AuthorizationCode: ' + response.AuthorizationCode);
  } else if (response.IsoCode === '3D') {
    console.log('\n[WARN] Se requiere desafio 3D Secure');
    console.log('  RedirectPostUrl: ' + response.ThreeDSChallenge?.RedirectPostUrl);
  }

  return response;
}

async function httpPost(url, postData, headers = {}, cookies = '') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-DO,es;q=0.9,en;q=0.8',
      ...headers,
    };
    
    if (cookies) {
      requestHeaders['Cookie'] = cookies;
    }
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'POST',
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
          cookies: cookieStr
        });
      });
    });
    
    req.on('error', (error) => reject(error));
    req.write(postData);
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

function extractFormAction(html) {
  const formMatch = html.match(/<form[^>]*action\s*=\s*["']([^"']+)["'][^>]*>/i);
  return formMatch ? formMatch[1] : null;
}

async function simulateACSChallenge(redirectPostUrl, creq) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 3a: Simulando interaccion del usuario con el ACS');
  console.log('RedirectPostUrl: ' + redirectPostUrl);
  console.log('CReq (primeros 80 chars): ' + (creq ? creq.substring(0, 80) + '...' : 'N/A'));
  console.log('='.repeat(80));

  let sessionCookies = '';

  try {
    console.log('\n[1/4] Enviando CReq al ACS...');
    const step1 = await httpPost(redirectPostUrl, 'creq=' + encodeURIComponent(creq), {}, sessionCookies);
    console.log('Status: ' + step1.status);
    
    if (step1.cookies) {
      sessionCookies = step1.cookies;
      console.log('Cookies de sesion capturadas: ' + sessionCookies.substring(0, 50) + '...');
    }
    
    let cres = extractCRes(step1.body);
    if (cres) {
      console.log('CRes obtenido directamente: ' + cres.substring(0, 50) + '...');
      return cres;
    }
    
    let authUrl = extractFormAction(step1.body);
    if (!authUrl) {
      console.log('No se encontro formulario de autenticacion');
      console.log('Respuesta (primeros 500 chars): ' + step1.body.substring(0, 500));
      return null;
    }
    
    if (!authUrl.startsWith('http')) {
      const urlObj = new URL(redirectPostUrl);
      authUrl = urlObj.origin + (authUrl.startsWith('/') ? '' : '/') + authUrl;
    }
    console.log('Formulario de autenticacion: ' + authUrl);
    
    const hiddenInputs = extractHiddenInputs(step1.body);
    console.log('Campos ocultos encontrados: ' + Object.keys(hiddenInputs).join(', '));
    
    console.log('\n[2/4] Enviando codigo OTP de prueba (1234)...');
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(hiddenInputs)) {
      formData.append(key, value);
    }
    formData.append('otp', '1234');
    formData.append('password', '1234');
    
    const step2 = await httpPost(authUrl, formData.toString(), {}, sessionCookies);
    console.log('Status: ' + step2.status);
    
    if (step2.cookies) {
      sessionCookies = sessionCookies ? sessionCookies + '; ' + step2.cookies : step2.cookies;
    }
    
    cres = extractCRes(step2.body);
    if (cres) {
      console.log('CRes obtenido: ' + cres.substring(0, 50) + '...');
      return cres;
    }
    
    let nextUrl = extractFormAction(step2.body);
    if (nextUrl) {
      if (!nextUrl.startsWith('http')) {
        const urlObj = new URL(authUrl);
        nextUrl = urlObj.origin + (nextUrl.startsWith('/') ? '' : '/') + nextUrl;
      }
      console.log('Formulario adicional detectado: ' + nextUrl);
      
      const nextHiddenInputs = extractHiddenInputs(step2.body);
      console.log('Campos ocultos: ' + Object.keys(nextHiddenInputs).join(', '));
      
      console.log('\n[3/4] Enviando formulario intermedio...');
      const nextFormData = new URLSearchParams();
      for (const [key, value] of Object.entries(nextHiddenInputs)) {
        nextFormData.append(key, value);
      }
      
      const step3 = await httpPost(nextUrl, nextFormData.toString(), {}, sessionCookies);
      console.log('Status: ' + step3.status);
      
      if (step3.cookies) {
        sessionCookies = sessionCookies ? sessionCookies + '; ' + step3.cookies : step3.cookies;
      }
      
      cres = extractCRes(step3.body);
      if (cres) {
        console.log('CRes obtenido: ' + cres.substring(0, 50) + '...');
        return cres;
      }
      
      let finalUrl = extractFormAction(step3.body);
      if (finalUrl) {
        if (!finalUrl.startsWith('http')) {
          const urlObj = new URL(nextUrl);
          finalUrl = urlObj.origin + (finalUrl.startsWith('/') ? '' : '/') + finalUrl;
        }
        
        const finalHiddenInputs = extractHiddenInputs(step3.body);
        console.log('\n[4/4] Enviando formulario final...');
        console.log('URL: ' + finalUrl);
        console.log('Campos: ' + Object.keys(finalHiddenInputs).join(', '));
        
        const finalFormData = new URLSearchParams();
        for (const [key, value] of Object.entries(finalHiddenInputs)) {
          finalFormData.append(key, value);
        }
        
        const step4 = await httpPost(finalUrl, finalFormData.toString(), {}, sessionCookies);
        console.log('Status: ' + step4.status);
        
        cres = extractCRes(step4.body);
        if (cres) {
          console.log('CRes obtenido: ' + cres.substring(0, 50) + '...');
          return cres;
        }
        
        console.log('\nNo se pudo obtener CRes automaticamente.');
        console.log('Respuesta final (primeros 800 chars):');
        console.log(step4.body.substring(0, 800));
        return null;
      }
      
      console.log('\nNo se pudo obtener CRes automaticamente.');
      console.log('Respuesta (primeros 800 chars):');
      console.log(step3.body.substring(0, 800));
      return null;
    }
    
    console.log('\nNo se pudo obtener CRes automaticamente.');
    console.log('Respuesta (primeros 800 chars):');
    console.log(step2.body.substring(0, 800));
    return null;
    
  } catch (error) {
    console.error('Error durante simulacion ACS: ' + error.message);
    return null;
  }
}

function extractCRes(html) {
  const patterns = [
    /name\s*=\s*["']?cres["']?\s+value\s*=\s*["']([^"']+)["']/i,
    /name\s*=\s*["']?CRes["']?\s+value\s*=\s*["']([^"']+)["']/i,
    /value\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']?cres["']?/i,
    /value\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']?CRes["']?/i,
    /<input[^>]*name\s*=\s*["']?cres["']?[^>]*value\s*=\s*["']([^"']+)["']/i,
    /<input[^>]*value\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']?cres["']?/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

async function step3_ProcessThreeDSChallenge(azulOrderId, cres) {
  console.log('\n' + '='.repeat(80));
  console.log('PASO 3b: Procesar resultado del Challenge 3D Secure');
  console.log('AzulOrderId: ' + azulOrderId);
  console.log('CRes: ' + (cres ? cres.substring(0, 50) + '...' : 'N/A'));
  console.log('='.repeat(80));

  if (!cres) {
    console.log('\n[ERROR] No se proporciono CRes - se requiere para completar el challenge');
    return {
      IsoCode: '',
      ResponseMessage: '',
      ErrorDescription: 'CRes es requerido para completar el challenge 3DS',
    };
  }

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AzulOrderId: azulOrderId,
    CRes: cres,
  };

  const response = await makeRequest(AZUL_3DS_CHALLENGE_URL, request, TEST_CONFIG.auth1, TEST_CONFIG.auth2);

  console.log('\nRespuesta procesada:');
  console.log('  IsoCode: ' + response.IsoCode);
  console.log('  ResponseMessage: ' + response.ResponseMessage);
  console.log('  AuthorizationCode: ' + (response.AuthorizationCode || 'N/A'));
  console.log('  ErrorDescription: ' + (response.ErrorDescription || 'N/A'));

  if (response.IsoCode === '00') {
    console.log('\n[EXITO] Transaccion aprobada despues del Challenge 3DS');
    console.log('  AuthorizationCode: ' + response.AuthorizationCode);
  } else {
    console.log('\n[ERROR] Challenge 3DS no exitoso');
    console.log('  IsoCode: ' + response.IsoCode);
  }

  return response;
}

async function runFullTest(cardKey, completeChallenge = true) {
  const card = TEST_CARDS[cardKey];
  const transactionId = generateTransactionId();
  
  console.log('\n' + '-'.repeat(80));
  console.log('INICIANDO PRUEBA: ' + card.description);
  console.log('Transaction ID: ' + transactionId);
  console.log('Completar Challenge automaticamente: ' + (completeChallenge ? 'SI' : 'NO'));
  console.log('-'.repeat(80));

  try {
    const step1Response = await step1_InitialPaymentRequest(card, transactionId);
    
    if (!step1Response.AzulOrderId) {
      console.log('\n[ERROR] No se recibio AzulOrderId');
      return step1Response;
    }

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
        console.log('\n[INFO] Se requiere desafio 3D Secure');
        const challengeData = step2Response.ThreeDSChallenge;
        if (challengeData) {
          console.log('  RedirectPostUrl: ' + challengeData.RedirectPostUrl);
          console.log('  CReq disponible: ' + (challengeData.CReq ? 'SI' : 'NO'));
        }
        
        if (completeChallenge && challengeData && challengeData.RedirectPostUrl && challengeData.CReq) {
          console.log('\nSimulando interaccion del usuario con el ACS de pruebas...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const cres = await simulateACSChallenge(challengeData.RedirectPostUrl, challengeData.CReq);
          
          if (cres) {
            console.log('\nEnviando CRes a Azul (endpoint processthreedschallenge)...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const step3Response = await step3_ProcessThreeDSChallenge(step1Response.AzulOrderId, cres);
            
            if (step3Response.IsoCode === '00') {
              console.log('\n[EXITO] TRANSACCION COMPLETADA (Despues de Challenge 3DS)');
            }
            return step3Response;
          } else {
            console.log('\n[WARN] No se pudo obtener CRes del ACS - el challenge requiere interaccion manual');
            return step2Response;
          }
        }
        
        return step2Response;
      }
      
      return step2Response;
    }

    if (step1Response.IsoCode === '3D') {
      console.log('\n[INFO] Se requiere desafio 3D Secure (sin 3DS Method)');
      const challengeData = step1Response.ThreeDSChallenge;
      if (challengeData) {
        console.log('  RedirectPostUrl: ' + challengeData.RedirectPostUrl);
        console.log('  CReq disponible: ' + (challengeData.CReq ? 'SI' : 'NO'));
      }
      
      if (completeChallenge && challengeData && challengeData.RedirectPostUrl && challengeData.CReq) {
        console.log('\nSimulando interaccion del usuario con el ACS de pruebas...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const cres = await simulateACSChallenge(challengeData.RedirectPostUrl, challengeData.CReq);
        
        if (cres) {
          console.log('\nEnviando CRes a Azul (endpoint processthreedschallenge)...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const step3Response = await step3_ProcessThreeDSChallenge(step1Response.AzulOrderId, cres);
          
          if (step3Response.IsoCode === '00') {
            console.log('\n[EXITO] TRANSACCION COMPLETADA (Despues de Challenge 3DS)');
          }
          return step3Response;
        } else {
          console.log('\n[WARN] No se pudo obtener CRes del ACS - el challenge requiere interaccion manual');
          return step1Response;
        }
      }
      
      return step1Response;
    }

    return step1Response;
  } catch (error) {
    console.error('\n[ERROR] Durante la prueba: ' + error.message);
    throw error;
  }
}

async function runAllTests() {
  const results = {};
  const cardKeys = Object.keys(TEST_CARDS);
  
  console.log('\n' + '='.repeat(80));
  console.log('EJECUTANDO TODAS LAS PRUEBAS');
  console.log('Total de tarjetas: ' + cardKeys.length);
  console.log('='.repeat(80));
  
  for (let i = 0; i < cardKeys.length; i++) {
    const cardKey = cardKeys[i];
    console.log('\n\n' + '#'.repeat(80));
    console.log('PRUEBA ' + (i + 1) + '/' + cardKeys.length + ': ' + cardKey);
    console.log('#'.repeat(80));
    
    try {
      const result = await runFullTest(cardKey);
      results[cardKey] = {
        success: result.IsoCode === '00' || result.IsoCode === '3D' || result.IsoCode === '3D2METHOD',
        isoCode: result.IsoCode,
        responseMessage: result.ResponseMessage,
        authorizationCode: result.AuthorizationCode || null,
        azulOrderId: result.AzulOrderId,
        errorDescription: result.ErrorDescription,
      };
    } catch (error) {
      results[cardKey] = {
        success: false,
        error: error.message,
      };
    }
    
    console.log('\nEsperando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  return results;
}

function showSummary(results) {
  console.log('\n\n' + '='.repeat(80));
  console.log('RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));
  
  const successful = Object.values(results).filter(r => r.success).length;
  const failed = Object.values(results).filter(r => !r.success).length;
  
  console.log('\nExitosas: ' + successful);
  console.log('Fallidas: ' + failed);
  console.log('Total: ' + Object.keys(results).length);
  
  console.log('\n' + '-'.repeat(80));
  console.log('Detalle por tarjeta:');
  console.log('-'.repeat(80));
  
  Object.entries(results).forEach(([cardKey, result]) => {
    const card = TEST_CARDS[cardKey];
    const status = result.success ? '[OK]' : '[FAIL]';
    console.log('\n' + status + ' ' + card.description + ' (' + card.number + ')');
    console.log('   IsoCode: ' + (result.isoCode || 'N/A'));
    console.log('   ResponseMessage: ' + (result.responseMessage || result.error || 'N/A'));
    if (result.errorDescription) {
      console.log('   ErrorDescription: ' + result.errorDescription);
    }
    if (result.authorizationCode) {
      console.log('   AuthorizationCode: ' + result.authorizationCode);
    }
    if (result.azulOrderId) {
      console.log('   AzulOrderId: ' + result.azulOrderId);
    }
  });
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('SCRIPT DE PRUEBA 3D SECURE - AZUL PAYMENT GATEWAY');
  console.log('Ambiente: pruebas.azul.com.do');
  console.log('='.repeat(80));
  
  loadCertificates();
  
  console.log('Configuracion:');
  console.log('  Merchant ID: ' + TEST_CONFIG.merchantId);
  console.log('  Auth: ' + TEST_CONFIG.auth1.substring(0, 4) + '***');
  console.log('  Channel: ' + TEST_CONFIG.channel);
  
  console.log('\nTarjetas de prueba:');
  Object.entries(TEST_CARDS).forEach(([key, card]) => {
    console.log('  ' + key + ': ' + card.number + ' - ' + card.description);
  });

  const testCard = process.argv[2];
  
  if (!testCard || testCard === 'all') {
    console.log('\nEjecutando TODAS las pruebas...');
    const results = await runAllTests();
    showSummary(results);
  } else if (TEST_CARDS[testCard]) {
    await runFullTest(testCard);
  } else {
    console.log('\nTarjeta no valida. Opciones:');
    console.log('  node test-3dsecure.cjs          (ejecutar todas)');
    console.log('  node test-3dsecure.cjs all      (ejecutar todas)');
    Object.keys(TEST_CARDS).forEach(key => {
      console.log('  node test-3dsecure.cjs ' + key);
    });
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('PRUEBAS FINALIZADAS');
  console.log('='.repeat(80));
}

module.exports = {
  step1_InitialPaymentRequest,
  step2_ProcessThreeDSMethod,
  step3_ProcessThreeDSChallenge,
  simulateACSChallenge,
  runFullTest,
  TEST_CARDS,
  TEST_CONFIG,
};

main().catch(console.error);
