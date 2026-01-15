const crypto = require('crypto');
// Descomenta si usas Node < 18
// const fetch = require('node-fetch');

// CONFIGURACIÓN (Actualizada con los datos proporcionados)
const CONFIG = {
  merchantId: '39038540035',
  authKey: 'splitit', // Nota: Usando 'splitit' como AuthKey para el HMAC según instrucciones
  url: 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx',
  channel: 'EC',
  posInputMode: 'E-Commerce'
};

// Tarjetas de prueba proporcionadas
const TEST_CARDS = [
  { number: '5424180279791732', type: 'Mastercard' },
  { number: '6011000990099818', type: 'Discover' },
  { number: '4260550061845872', type: 'Visa' },
  { number: '4035874000424977', type: 'Visa' },
  { number: '5426064000424979', type: 'Mastercard' },
  { number: '4012000033330026', type: 'Visa' }
];

// Tarjetas 3DS (Requieren AuthKey: '3dsecure')
const TDS_CARDS = [
  { number: '4761120010000492', desc: 'Sin fricción con 3DSMethod' },
  { number: '4147463011110117', desc: 'Sin fricción sin 3DSMethod' },
  { number: '4005520000000129', desc: 'Desafío con 3DSMethod Limite 100' }
];

async function testAzulPayment(card, is3DS = false) {
  const currentAuthKey = is3DS ? '3dsecure' : CONFIG.authKey;
  
  console.log(`\n--- Probando Tarjeta: ${card.number} (${is3DS ? '3DS: ' + card.desc : card.type}) ---`);

  const paymentRequest = {
    MerchantId: CONFIG.merchantId,
    TrxType: 'Sale',
    CardNumber: card.number,
    Expiration: '203412', // Fecha futura 12/34
    CVC: card.number.startsWith('3') ? '1234' : '123',
    Amount: '000000010000', // RD$100.00
    Itbis: '000000000000',
    CurrencyPosCode: '$',
    Channel: CONFIG.channel,
    PosInputMode: CONFIG.posInputMode,
    CustomOrderId: 'TEST-' + (is3DS ? '3DS-' : '') + Date.now(),
    OrderDescription: 'Prueba de integración Azul'
  };

  const jsonPayload = JSON.stringify(paymentRequest);

  // Generación del hash HMAC-SHA512
  const auth2Hash = crypto
    .createHmac('sha512', currentAuthKey)
    .update(jsonPayload)
    .digest('hex');

  try {
    const response = await fetch(CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth1': CONFIG.merchantId,
        'Auth2': auth2Hash
      },
      body: jsonPayload
    });

    const result = await response.json();
    
    console.log(`ISO Code: ${result.IsoCode} - ${result.ResponseMessage}`);
    if (result.AzulOrderId) console.log(`Azul Order ID: ${result.AzulOrderId}`);
    
    if (result.IsoCode === '00') {
      console.log("✅ RESULTADO: APROBADA");
    } else {
      console.log("❌ RESULTADO: DECLINADA/ERROR");
    }
  } catch (error) {
    console.error("Error en la conexión:", error.message);
  }
}

async function runTests() {
  console.log("INICIANDO PRUEBAS DE API AZUL CON DATOS REALES");
  
  // Probar la primera tarjeta normal
  await testAzulPayment(TEST_CARDS[0]);
  
  // Probar la primera tarjeta 3DS
  await testAzulPayment(TDS_CARDS[0], true);
  
  console.log("\nPruebas completadas. Puedes editar el script para probar otras tarjetas del listado.");
}

runTests();