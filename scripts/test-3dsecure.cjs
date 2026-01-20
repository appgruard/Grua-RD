/**
 * Script de Prueba 3D Secure - Azul Payment Gateway
 * 
 * Este script prueba el flujo completo de 3D Secure 2.0 con el ambiente de pruebas de Azul.
 * Endpoint: https://pruebas.azul.com.do/webservices/JSON/Default.aspx
 * 
 * Tarjetas de Prueba:
 * - 4265880000000007 - Sin fricción con 3DSMethod
 * - 4147463011110117 - Sin fricción sin 3DSMethod
 * - 4005520000000129 - Desafío con 3DSMethod
 * - 4147463011110059 - Desafío sin 3DSMethod
 * 
 * Uso: node scripts/test-3dsecure.cjs [cardType]
 */

const AZUL_TEST_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';
const AZUL_3DS_METHOD_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx?processthreedsmethod';

// Configuración de prueba - Usa variables de entorno para credenciales
const TEST_CONFIG = {
  merchantId: process.env.AZUL_MERCHANT_ID || '',
  auth1: process.env.AZUL_AUTH1 || process.env.AZUL_AUTH_KEY || '',
  auth2: process.env.AZUL_AUTH2 || process.env.AZUL_AUTH_KEY || '',
  channel: process.env.AZUL_CHANNEL || 'EC',
};

// Validar configuración
function validateConfig() {
  const missing = [];
  if (!TEST_CONFIG.merchantId) missing.push('AZUL_MERCHANT_ID');
  if (!TEST_CONFIG.auth1) missing.push('AZUL_AUTH1 or AZUL_AUTH_KEY');
  if (!TEST_CONFIG.auth2) missing.push('AZUL_AUTH2 or AZUL_AUTH_KEY');
  
  if (missing.length > 0) {
    console.error('\n❌ Error: Faltan variables de entorno requeridas:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nConfigura las siguientes variables de entorno:');
    console.error('  export AZUL_MERCHANT_ID="tu_merchant_id"');
    console.error('  export AZUL_AUTH_KEY="tu_auth_key"  # Para Auth1 y Auth2');
    console.error('  # O individualmente:');
    console.error('  export AZUL_AUTH1="tu_auth1"');
    console.error('  export AZUL_AUTH2="tu_auth2"');
    process.exit(1);
  }
}

// Tarjetas de prueba
const TEST_CARDS = {
  frictionlessWithMethod: {
    number: '4265880000000007',
    expiration: '202812',
    cvc: '123',
    description: 'Sin fricción con 3DSMethod'
  },
  frictionlessWithoutMethod: {
    number: '4147463011110117',
    expiration: '202812',
    cvc: '123',
    description: 'Sin fricción sin 3DSMethod'
  },
  challengeWithMethod: {
    number: '4005520000000129',
    expiration: '202812',
    cvc: '123',
    description: 'Desafío con 3DSMethod'
  },
  challengeWithoutMethod: {
    number: '4147463011110059',
    expiration: '202812',
    cvc: '123',
    description: 'Desafío sin 3DSMethod'
  }
};

// Generar OrderNumber numérico (YYYYMMDDHHMMSS + 4 dígitos aleatorios)
function generateOrderNumber() {
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return timestamp + random.toString();
}

// Generar ID único para la transacción
function generateTransactionId() {
  return Date.now().toString();
}

// Función para hacer peticiones HTTP POST
async function makeRequest(url, data, auth1, auth2) {
  console.log('\n📤 Enviando petición a:', url);
  console.log('📋 Datos:', JSON.stringify(data, null, 2));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Auth1': auth1,
      'Auth2': auth2,
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  console.log('\n📥 Respuesta raw:', text);
  
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// PASO 1: Solicitud inicial de pago con 3D Secure
async function step1_InitialPaymentRequest(card, transactionId) {
  console.log('\n' + '='.repeat(80));
  console.log('🔐 PASO 1: Solicitud inicial de pago con 3D Secure');
  console.log(`📇 Tarjeta: ${card.description} (${card.number})`);
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
    Amount: '100000', // RD$1,000.00
    Itbis: '18000',   // 18% ITBIS
    OrderNumber: orderNumber,
    CustomOrderId: `GRD-${transactionId}`,
    DataVaultToken: '',
    SaveToDataVault: '0',
    ForceNo3DS: '',
    ThreeDSAuth: {
      TermUrl: `${baseUrl}/api/azul/3ds/callback?sid=${transactionId}`,
      MethodNotificationUrl: `${baseUrl}/api/azul/3ds/method-notification?sid=${transactionId}`,
      RequestorChallengeIndicator: '01', // Sin preferencia
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
      AcceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      IPAddress: '200.88.232.119',
      Language: 'es-DO',
      ColorDepth: '24',
      ScreenWidth: '1920',
      ScreenHeight: '1080',
      TimeZone: '240',
      UserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      JavaScriptEnabled: 'true',
    },
  };

  const response = await makeRequest(
    AZUL_TEST_URL,
    request,
    TEST_CONFIG.auth1,
    TEST_CONFIG.auth2
  );

  console.log('\n📊 Respuesta procesada:');
  console.log('  IsoCode:', response.IsoCode);
  console.log('  ResponseMessage:', response.ResponseMessage);
  console.log('  AZULOrderId:', response.AZULOrderId);

  if (response.IsoCode === '3D2METHOD') {
    console.log('\n✅ Se requiere 3DS Method - Flujo con recolección de datos del navegador');
    console.log('  MethodForm disponible:', !!response.ThreeDSMethod?.MethodForm);
  } else if (response.IsoCode === '3D') {
    console.log('\n✅ Se requiere desafío 3D Secure');
    console.log('  RedirectPostUrl:', response.ThreeDSChallenge?.RedirectPostUrl);
    console.log('  CReq disponible:', !!response.ThreeDSChallenge?.CReq);
  } else if (response.IsoCode === '00') {
    console.log('\n✅ Transacción aprobada sin fricción!');
    console.log('  AuthorizationCode:', response.AuthorizationCode);
  } else {
    console.log('\n❌ Respuesta inesperada:', response.IsoCode);
  }

  return response;
}

// PASO 2: Procesar resultado del 3DS Method
async function step2_ProcessThreeDSMethod(azulOrderId, status) {
  console.log('\n' + '='.repeat(80));
  console.log('🔐 PASO 2: Procesar resultado del 3DS Method');
  console.log(`📋 AZULOrderId: ${azulOrderId}`);
  console.log(`📋 Status: ${status}`);
  console.log('='.repeat(80));

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AZULOrderId: azulOrderId,
    MethodNotificationStatus: status,
  };

  const response = await makeRequest(
    AZUL_3DS_METHOD_URL,
    request,
    TEST_CONFIG.auth1,
    TEST_CONFIG.auth2
  );

  console.log('\n📊 Respuesta procesada:');
  console.log('  IsoCode:', response.IsoCode);
  console.log('  ResponseMessage:', response.ResponseMessage);

  if (response.IsoCode === '00') {
    console.log('\n✅ Transacción aprobada (sin fricción)!');
    console.log('  AuthorizationCode:', response.AuthorizationCode);
  } else if (response.IsoCode === '3D') {
    console.log('\n⚠️ Se requiere desafío 3D Secure');
    console.log('  RedirectPostUrl:', response.ThreeDSChallenge?.RedirectPostUrl);
  }

  return response;
}

// PASO 3: Procesar resultado del desafío 3D Secure
async function step3_ProcessChallengeResult(azulOrderId, cRes) {
  console.log('\n' + '='.repeat(80));
  console.log('🔐 PASO 3: Procesar resultado del desafío');
  console.log(`📋 AZULOrderId: ${azulOrderId}`);
  console.log('='.repeat(80));

  const request = {
    Channel: TEST_CONFIG.channel,
    Store: TEST_CONFIG.merchantId,
    AZULOrderId: azulOrderId,
    CRes: cRes,
  };

  const response = await makeRequest(
    AZUL_TEST_URL,
    request,
    TEST_CONFIG.auth1,
    TEST_CONFIG.auth2
  );

  console.log('\n📊 Respuesta procesada:');
  console.log('  IsoCode:', response.IsoCode);
  console.log('  ResponseMessage:', response.ResponseMessage);

  if (response.IsoCode === '00') {
    console.log('\n✅ Transacción aprobada después del desafío!');
    console.log('  AuthorizationCode:', response.AuthorizationCode);
  }

  return response;
}

// Ejecutar prueba completa
async function runFullTest(cardKey) {
  const card = TEST_CARDS[cardKey];
  const transactionId = generateTransactionId();
  
  console.log('\n' + '🚀'.repeat(40));
  console.log('INICIANDO PRUEBA 3D SECURE');
  console.log(`Tarjeta: ${card.description}`);
  console.log(`Transaction ID: ${transactionId}`);
  console.log('🚀'.repeat(40));

  try {
    // Paso 1: Solicitud inicial
    const step1Response = await step1_InitialPaymentRequest(card, transactionId);
    
    if (!step1Response.AZULOrderId) {
      console.log('\n❌ Error: No se recibió AZULOrderId');
      return step1Response;
    }

    // Si IsoCode es 00, la transacción fue aprobada directamente
    if (step1Response.IsoCode === '00') {
      console.log('\n🎉 TRANSACCIÓN COMPLETADA EXITOSAMENTE (Sin fricción)');
      return step1Response;
    }

    // Si IsoCode es 3D2METHOD, necesitamos procesar el Method
    if (step1Response.IsoCode === '3D2METHOD') {
      console.log('\n⏳ Simulando espera de notificación del 3DS Method...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Paso 2: Procesar 3DS Method (simulamos que recibimos la notificación)
      const step2Response = await step2_ProcessThreeDSMethod(
        step1Response.AZULOrderId,
        'RECEIVED'
      );
      
      // Si la transacción fue aprobada
      if (step2Response.IsoCode === '00') {
        console.log('\n🎉 TRANSACCIÓN COMPLETADA EXITOSAMENTE (Después de 3DS Method)');
        return step2Response;
      }
      
      // Si se requiere desafío
      if (step2Response.IsoCode === '3D' && step2Response.ThreeDSChallenge) {
        console.log('\n⚠️ Se requiere desafío del usuario');
        console.log('En producción, el usuario sería redirigido a:', step2Response.ThreeDSChallenge.RedirectPostUrl);
        console.log('CReq:', step2Response.ThreeDSChallenge.CReq?.substring(0, 50) + '...');
        
        console.log('\n📝 NOTA: Para completar el desafío en ambiente de pruebas:');
        console.log('1. Renderizar un formulario que haga POST al RedirectPostUrl con el CReq');
        console.log('2. El usuario completa el desafío');
        console.log('3. El ACS hace POST a TermUrl con el cRes');
        console.log('4. Llamar step3_ProcessChallengeResult con el cRes recibido');
        
        return step2Response;
      }
      
      return step2Response;
    }

    // Si IsoCode es 3D directamente (sin Method)
    if (step1Response.IsoCode === '3D' && step1Response.ThreeDSChallenge) {
      console.log('\n⚠️ Se requiere desafío del usuario (sin 3DS Method)');
      console.log('RedirectPostUrl:', step1Response.ThreeDSChallenge.RedirectPostUrl);
      return step1Response;
    }

    return step1Response;
  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
    throw error;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  const results = {};
  const cardKeys = Object.keys(TEST_CARDS);
  
  console.log('\n' + '🧪'.repeat(40));
  console.log('EJECUTANDO TODAS LAS PRUEBAS');
  console.log(`Total de tarjetas: ${cardKeys.length}`);
  console.log('🧪'.repeat(40));
  
  for (const cardKey of cardKeys) {
    console.log('\n\n' + '▓'.repeat(80));
    console.log(`PRUEBA ${cardKeys.indexOf(cardKey) + 1}/${cardKeys.length}: ${cardKey}`);
    console.log('▓'.repeat(80));
    
    try {
      const result = await runFullTest(cardKey);
      results[cardKey] = {
        success: result.IsoCode === '00' || result.IsoCode === '3D' || result.IsoCode === '3D2METHOD',
        isoCode: result.IsoCode,
        responseMessage: result.ResponseMessage,
        authorizationCode: result.AuthorizationCode || null,
        azulOrderId: result.AZULOrderId,
      };
    } catch (error) {
      results[cardKey] = {
        success: false,
        error: error.message,
      };
    }
    
    // Esperar entre pruebas para no saturar el servidor
    console.log('\n⏳ Esperando 3 segundos antes de la siguiente prueba...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  return results;
}

// Mostrar resumen de resultados
function showSummary(results) {
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RESUMEN DE RESULTADOS');
  console.log('═'.repeat(80));
  
  const successful = Object.values(results).filter(r => r.success).length;
  const failed = Object.values(results).filter(r => !r.success).length;
  
  console.log(`\n✅ Exitosas: ${successful}`);
  console.log(`❌ Fallidas: ${failed}`);
  console.log(`📈 Total: ${Object.keys(results).length}`);
  
  console.log('\n' + '-'.repeat(80));
  console.log('Detalle por tarjeta:');
  console.log('-'.repeat(80));
  
  Object.entries(results).forEach(([cardKey, result]) => {
    const card = TEST_CARDS[cardKey];
    const status = result.success ? '✅' : '❌';
    console.log(`\n${status} ${card.description} (${card.number})`);
    console.log(`   IsoCode: ${result.isoCode || 'N/A'}`);
    console.log(`   ResponseMessage: ${result.responseMessage || result.error || 'N/A'}`);
    if (result.authorizationCode) {
      console.log(`   AuthorizationCode: ${result.authorizationCode}`);
    }
    if (result.azulOrderId) {
      console.log(`   AZULOrderId: ${result.azulOrderId}`);
    }
  });
  
  console.log('\n' + '═'.repeat(80));
}

// Menú de pruebas
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          SCRIPT DE PRUEBA 3D SECURE - AZUL PAYMENT GATEWAY                     ║');
  console.log('║          Ambiente: pruebas.azul.com.do                                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  
  // Validar configuración antes de continuar
  validateConfig();
  
  console.log('\n📋 Configuración actual:');
  console.log(`  Merchant ID: ${TEST_CONFIG.merchantId}`);
  console.log(`  Auth: ${TEST_CONFIG.auth1.substring(0, 4)}***`);
  console.log(`  Channel: ${TEST_CONFIG.channel}`);
  
  console.log('\n📇 Tarjetas de prueba disponibles:');
  Object.entries(TEST_CARDS).forEach(([key, card]) => {
    console.log(`  ${key}: ${card.number} - ${card.description}`);
  });

  const testCard = process.argv[2];
  
  // Si se pasa "all" o no se pasa argumento, ejecutar todas las pruebas
  if (!testCard || testCard === 'all') {
    console.log('\n🔄 Ejecutando TODAS las pruebas...');
    const results = await runAllTests();
    showSummary(results);
  } else if (TEST_CARDS[testCard]) {
    await runFullTest(testCard);
  } else {
    console.log('\n⚠️ Tarjeta no válida. Opciones:');
    console.log('  - node scripts/test-3dsecure.cjs          (ejecutar todas)');
    console.log('  - node scripts/test-3dsecure.cjs all      (ejecutar todas)');
    Object.keys(TEST_CARDS).forEach(key => {
      console.log(`  - node scripts/test-3dsecure.cjs ${key}`);
    });
    process.exit(1);
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('PRUEBAS FINALIZADAS');
  console.log('═'.repeat(80));
}

// Exportar funciones para uso en otros módulos
module.exports = {
  step1_InitialPaymentRequest,
  step2_ProcessThreeDSMethod,
  step3_ProcessChallengeResult,
  runFullTest,
  TEST_CARDS,
  TEST_CONFIG,
};

// Ejecutar si es el script principal
main().catch(console.error);
