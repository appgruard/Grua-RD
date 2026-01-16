const https = require('https');
const fs = require('fs');

/**
 * SCRIPT DE PRUEBA COMPLETO PARA AZUL API
 * Validado contra documentación oficial: Integración vía API + 3D Secure
 * 
 * Ejecutar en VPS: node test-azul-completo.cjs
 */

// === CONFIGURACIÓN ===
const CONFIG = {
  certPath: '/opt/certificados/gruard/app.gruard.com.bundle.crt',
  keyPath: '/opt/certificados/gruard/app.gruard.com.key',
  merchantId: '39038540035',
  hostname: 'pagos.azul.com.do',
  endpoint: '/webservices/JSON/Default.aspx',
  authKey: 'splitit', // Puede ser 'splitit' o '3dsecure' según configuración
};

// Tarjetas de prueba según documentación Azul
const TEST_CARDS = {
  visa: { number: '4012000033330026', exp: '203412', cvc: '123', desc: 'Visa Prueba' },
  mastercard: { number: '5424180279791732', exp: '203412', cvc: '123', desc: 'Mastercard Prueba' },
  discover: { number: '6011000990099818', exp: '203412', cvc: '123', desc: 'Discover Prueba' },
  // Tarjetas 3DS
  frictionless3DS: { number: '4761120010000492', exp: '203412', cvc: '123', desc: '3DS Frictionless con Method' },
  challenge3DS: { number: '4005520000000129', exp: '203412', cvc: '123', desc: '3DS Challenge (límite 100)' },
};

// === VALIDACIÓN DE CERTIFICADOS ===
function validateCerts() {
  console.log('\n=== 1. VALIDACIÓN DE CERTIFICADOS ===');
  
  if (!fs.existsSync(CONFIG.certPath)) {
    console.error('❌ Certificado no encontrado:', CONFIG.certPath);
    console.log('   Ejecuta primero: node create-bundle.cjs');
    return false;
  }
  
  if (!fs.existsSync(CONFIG.keyPath)) {
    console.error('❌ Llave privada no encontrada:', CONFIG.keyPath);
    return false;
  }
  
  const certContent = fs.readFileSync(CONFIG.certPath, 'utf8');
  const certCount = (certContent.match(/-----BEGIN CERTIFICATE-----/g) || []).length;
  
  console.log('✅ Certificado encontrado:', CONFIG.certPath);
  console.log('✅ Llave privada encontrada:', CONFIG.keyPath);
  console.log(`✅ Certificados en bundle: ${certCount}`);
  
  return true;
}

// === CREAR HTTPS AGENT ===
function createAgent() {
  return new https.Agent({
    cert: fs.readFileSync(CONFIG.certPath),
    key: fs.readFileSync(CONFIG.keyPath),
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  });
}

// === HACER REQUEST A AZUL ===
async function makeRequest(payload, description) {
  return new Promise((resolve) => {
    const jsonPayload = JSON.stringify(payload);
    
    const options = {
      hostname: CONFIG.hostname,
      path: CONFIG.endpoint,
      method: 'POST',
      agent: createAgent(),
      headers: {
        'Content-Type': 'application/json',
        'Auth1': CONFIG.authKey,
        'Auth2': CONFIG.authKey,
        'Content-Length': Buffer.byteLength(jsonPayload),
        'User-Agent': 'GruaRD-App/1.0',
        'Host': CONFIG.hostname
      }
    };

    console.log(`\n--- ${description} ---`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('HTTP Status:', res.statusCode);
        try {
          const json = JSON.parse(body);
          console.log('Response:', JSON.stringify(json, null, 2));
          resolve({ success: true, data: json, status: res.statusCode });
        } catch (e) {
          console.log('Response RAW:', body);
          resolve({ success: false, error: body, status: res.statusCode });
        }
      });
    });

    req.on('error', (err) => {
      console.error('ERROR:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.write(jsonPayload);
    req.end();
  });
}

// === PRUEBAS DE TRANSACCIONES ===

// 1. SALE - Venta directa (según documentación página 4-5)
async function testSale(card) {
  const orderId = `GRUA-SALE-${Date.now()}`;
  const payload = {
    Channel: 'EC',
    Store: CONFIG.merchantId,
    CardNumber: card.number,
    Expiration: card.exp,
    CVC: card.cvc,
    PosInputMode: 'E-Commerce',
    TrxType: 'Sale',
    Amount: '10000', // RD$100.00 en centavos
    Itbis: '1800',   // RD$18.00 ITBIS
    CurrencyPosCode: '$',
    Payments: '1',
    Plan: '0',
    AcquirerRefData: '1',
    CustomerServicePhone: '8293519324',
    OrderNumber: orderId,
    CustomOrderId: orderId,
    ECommerceUrl: 'https://app.gruard.com',
    DataVaultToken: '',
    SaveToDataVault: '0',
    ForceNo3DS: '1',
  };
  
  return makeRequest(payload, `SALE con ${card.desc}`);
}

// 2. HOLD - Retención/Pre-autorización (según documentación página 6-7)
async function testHold(card) {
  const orderId = `GRUA-HOLD-${Date.now()}`;
  const payload = {
    Channel: 'EC',
    Store: CONFIG.merchantId,
    CardNumber: card.number,
    Expiration: card.exp,
    CVC: card.cvc,
    PosInputMode: 'E-Commerce',
    TrxType: 'Hold',
    Amount: '15000', // RD$150.00
    Itbis: '2700',
    CurrencyPosCode: '$',
    Payments: '1',
    Plan: '0',
    AcquirerRefData: '1',
    CustomerServicePhone: '8293519324',
    OrderNumber: orderId,
    CustomOrderId: orderId,
    ECommerceUrl: 'https://app.gruard.com',
    DataVaultToken: '',
    SaveToDataVault: '0',
    ForceNo3DS: '1',
  };
  
  return makeRequest(payload, `HOLD con ${card.desc}`);
}

// 3. POST - Captura de Hold (según documentación página 8)
async function testPost(azulOrderId) {
  const payload = {
    Channel: 'EC',
    Store: CONFIG.merchantId,
    AzulOrderId: azulOrderId,
    Amount: '15000',
    Itbis: '2700',
  };
  
  return makeRequest(payload, `POST (Captura) para AzulOrderId: ${azulOrderId}`);
}

// 4. REFUND - Reembolso (según documentación página 9)
async function testRefund(azulOrderId, originalDate) {
  const orderId = `GRUA-REFUND-${Date.now()}`;
  const payload = {
    Channel: 'EC',
    Store: CONFIG.merchantId,
    PosInputMode: 'E-Commerce',
    TrxType: 'Refund',
    Amount: '5000', // Reembolso parcial RD$50.00
    Itbis: '900',
    CurrencyPosCode: '$',
    Payments: '1',
    Plan: '0',
    OriginalDate: originalDate, // Formato YYYYMMDD
    AcquirerRefData: '',
    RRN: null,
    AzulOrderId: azulOrderId,
    CustomerServicePhone: '8293519324',
    OrderNumber: '',
    CustomOrderId: orderId,
    ECommerceUrl: 'https://app.gruard.com',
    DataVaultToken: '',
    ForceNo3DS: '1',
    SaveToDataVault: '0',
  };
  
  return makeRequest(payload, `REFUND para AzulOrderId: ${azulOrderId}`);
}

// 5. VOID - Anular transacción (según documentación página 10)
async function testVoid(azulOrderId) {
  const payload = {
    Channel: 'EC',
    Store: CONFIG.merchantId,
    AzulOrderId: azulOrderId,
  };
  
  return makeRequest(payload, `VOID para AzulOrderId: ${azulOrderId}`);
}

// 6. TOKENIZACIÓN - Guardar tarjeta en DataVault
async function testTokenize(card) {
  const orderId = `GRUA-TOKEN-${Date.now()}`;
  const payload = {
    Channel: 'EC',
    Store: CONFIG.merchantId,
    CardNumber: card.number,
    Expiration: card.exp,
    CVC: card.cvc,
    PosInputMode: 'E-Commerce',
    TrxType: 'Sale',
    Amount: '100', // Monto mínimo RD$1.00
    Itbis: '18',
    CurrencyPosCode: '$',
    Payments: '1',
    Plan: '0',
    AcquirerRefData: '1',
    CustomerServicePhone: '8293519324',
    OrderNumber: orderId,
    CustomOrderId: orderId,
    ECommerceUrl: 'https://app.gruard.com',
    DataVaultToken: '',
    SaveToDataVault: '1', // Guardar token
    ForceNo3DS: '1',
  };
  
  return makeRequest(payload, `TOKENIZAR ${card.desc}`);
}

// 7. PAGO CON TOKEN
async function testPaymentWithToken(token) {
  const orderId = `GRUA-TOKENPAY-${Date.now()}`;
  const payload = {
    Channel: 'EC',
    Store: CONFIG.merchantId,
    PosInputMode: 'E-Commerce',
    TrxType: 'Sale',
    Amount: '5000',
    Itbis: '900',
    CurrencyPosCode: '$',
    Payments: '1',
    Plan: '0',
    AcquirerRefData: '1',
    CustomerServicePhone: '8293519324',
    OrderNumber: orderId,
    CustomOrderId: orderId,
    ECommerceUrl: 'https://app.gruard.com',
    DataVaultToken: token,
    SaveToDataVault: '0',
    ForceNo3DS: '1',
  };
  
  return makeRequest(payload, `PAGO CON TOKEN: ${token.substring(0, 10)}...`);
}

// === EJECUTAR PRUEBAS ===
async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   SCRIPT DE PRUEBA AZUL API - GRÚA RD                        ║');
  console.log('║   Validado contra documentación oficial                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('Fecha:', new Date().toISOString());
  console.log('Merchant ID:', CONFIG.merchantId);
  console.log('Auth Headers:', CONFIG.authKey);
  
  // Validar certificados
  if (!validateCerts()) {
    console.log('\n❌ PRUEBAS CANCELADAS: Problemas con certificados');
    return;
  }

  const results = {
    sale: null,
    hold: null,
    post: null,
    tokenize: null,
    tokenPayment: null,
  };

  // Prueba SALE
  console.log('\n\n=== 2. PRUEBA SALE (Venta Directa) ===');
  results.sale = await testSale(TEST_CARDS.visa);

  // Prueba HOLD
  console.log('\n\n=== 3. PRUEBA HOLD (Pre-autorización) ===');
  results.hold = await testHold(TEST_CARDS.visa);
  
  // Si HOLD fue exitoso, probar POST
  if (results.hold?.data?.IsoCode === '00' && results.hold?.data?.AzulOrderId) {
    console.log('\n\n=== 4. PRUEBA POST (Captura de Hold) ===');
    results.post = await testPost(results.hold.data.AzulOrderId);
  }

  // Prueba TOKENIZACIÓN
  console.log('\n\n=== 5. PRUEBA TOKENIZACIÓN ===');
  results.tokenize = await testTokenize(TEST_CARDS.mastercard);
  
  // Si tokenización fue exitosa, probar pago con token
  if (results.tokenize?.data?.DataVaultToken) {
    console.log('\n\n=== 6. PRUEBA PAGO CON TOKEN ===');
    results.tokenPayment = await testPaymentWithToken(results.tokenize.data.DataVaultToken);
  }

  // Resumen
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     RESUMEN DE PRUEBAS                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  const printResult = (name, result) => {
    if (!result) {
      console.log(`${name}: ⏭️  OMITIDO`);
      return;
    }
    if (result.data?.IsoCode === '00') {
      console.log(`${name}: ✅ APROBADA (${result.data.AuthorizationCode || 'N/A'})`);
    } else if (result.data?.ErrorDescription?.includes('INVALID_AUTH')) {
      console.log(`${name}: ⚠️  INVALID_AUTH - Certificado no vinculado a Merchant ID`);
    } else {
      console.log(`${name}: ❌ ${result.data?.ErrorDescription || result.data?.ResponseMessage || 'Error desconocido'}`);
    }
  };

  printResult('SALE', results.sale);
  printResult('HOLD', results.hold);
  printResult('POST', results.post);
  printResult('TOKENIZE', results.tokenize);
  printResult('TOKEN PAYMENT', results.tokenPayment);

  // Diagnóstico final
  console.log('\n\n=== DIAGNÓSTICO ===');
  if (results.sale?.data?.ErrorDescription?.includes('INVALID_AUTH')) {
    console.log('🔴 PROBLEMA: El certificado NO está vinculado al Merchant ID en Azul.');
    console.log('   ACCIÓN: Contactar a soporte de Azul para vincular:');
    console.log(`   - Certificado: app.gruard.com`);
    console.log(`   - Merchant ID: ${CONFIG.merchantId}`);
  } else if (results.sale?.data?.IsoCode === '00') {
    console.log('🟢 ¡INTEGRACIÓN FUNCIONANDO CORRECTAMENTE!');
  }
}

// Ejecutar
runTests().catch(console.error);
