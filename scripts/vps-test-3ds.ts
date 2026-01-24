
import axios from 'axios';
import https from 'https';
import fs from 'fs';

/**
 * Script de Prueba 3D Secure para VPS Externo
 * Tarjeta: 4005520000000129 (Desafío con 3DSMethod)
 */

const CONFIG = {
  merchantId: process.env.AZUL_MERCHANT_ID || '39038540035',
  auth1: process.env.AZUL_AUTH1 || 'splitit',
  auth2: process.env.AZUL_AUTH2 || 'splitit',
  azulUrl: 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx',
  certPath: 'opt/certificados/azul-certs/app.gruard.com.crt',
  keyPath: 'opt/certificados/gruard/app.gruard.com.key',
  caPath: 'opt/certificados/gruard/app.gruard.com.bundle.crt'
};

function getHttpsAgent() {
  if (fs.existsSync(CONFIG.certPath) && fs.existsSync(CONFIG.keyPath)) {
    const agentOptions: any = {
      cert: fs.readFileSync(CONFIG.certPath),
      key: fs.readFileSync(CONFIG.keyPath),
      rejectUnauthorized: false
    };
    if (fs.existsSync(CONFIG.caPath)) {
      agentOptions.ca = fs.readFileSync(CONFIG.caPath);
    }
    return new https.Agent(agentOptions);
  }
  return undefined;
}

async function getVpsIp() {
  try {
    const res = await axios.get('https://api.ipify.org?format=json');
    return res.data.ip;
  } catch (e) {
    return '127.0.0.1';
  }
}

async function runChallengeTest() {
  const vpsIp = await getVpsIp();
  const orderNumber = `VPS${Date.now().toString().slice(-8)}`;
  const agent = getHttpsAgent();
  
  console.log(`🚀 Iniciando Test 3DS en VPS (IP: ${vpsIp})`);
  console.log(`📦 OrderNumber: ${orderNumber}`);
  console.log(`📜 Certificados: ${agent ? 'Cargados' : 'No encontrados (usando agente por defecto)'}`);

  const payload = {
    Channel: 'EC',
    Store: CONFIG.merchantId,
    CardNumber: '4005520000000129',
    Expiration: '202812',
    CVC: '123',
    PosInputMode: 'E-Commerce',
    TrxType: 'Sale',
    Amount: '10000', // RD$100.00
    Itbis: '1800',
    OrderNumber: orderNumber,
    CustomOrderId: `TEST-VPS-${orderNumber}`,
    ThreeDSAuth: {
      TermUrl: `http://${vpsIp}:5000/callback`, 
      MethodNotificationUrl: `http://${vpsIp}:5000/method`,
      RequestorChallengeIndicator: '04' // Forzar desafío
    },
    BrowserInfo: {
      AcceptHeader: 'text/html,application/xhtml+xml',
      IPAddress: vpsIp,
      JavaScriptEnabled: 'true',
      UserAgent: 'VPS-Test-Agent/1.0',
      ColorDepth: '24',
      ScreenWidth: '1920',
      ScreenHeight: '1080',
      TimeZone: '240'
    }
  };

  try {
    const response = await axios.post(CONFIG.azulUrl, payload, {
      headers: {
        'Auth1': CONFIG.auth1,
        'Auth2': CONFIG.auth2,
        'Content-Type': 'application/json'
      },
      httpsAgent: agent
    });

    console.log('\n✅ Respuesta de Azul:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.IsoCode === '3D2METHOD' || response.data.IsoCode === '3D') {
      console.log('\n⚠️ DESAFÍO DETECTADO CORRECTAMENTE');
      console.log('URL de Redirección:', response.data.ThreeDSChallenge?.RedirectPostUrl);
    } else {
      console.log('\nℹ️ La transacción se procesó con otro código:', response.data.IsoCode);
    }
  } catch (error: any) {
    console.error('\n❌ Error en la petición:', error.response?.data || error.message);
  }
}

runChallengeTest();
