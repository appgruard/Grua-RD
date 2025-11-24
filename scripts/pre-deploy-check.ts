#!/usr/bin/env tsx

import { Pool } from 'pg';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

const results: CheckResult[] = [];

function addResult(result: CheckResult) {
  results.push(result);
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${result.name}: ${result.message}`);
  if (result.details) {
    console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...\n');
  
  const requiredVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'VITE_GOOGLE_MAPS_API_KEY',
    'STRIPE_SECRET_KEY',
    'VITE_STRIPE_PUBLIC_KEY',
    'VITE_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY'
  ];
  
  const optionalVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'STRIPE_WEBHOOK_SECRET',
    'ALLOWED_ORIGINS'
  ];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      if (varName === 'SESSION_SECRET' && process.env[varName] === 'gruard-secret-change-in-production') {
        addResult({
          name: `Env: ${varName}`,
          status: 'fail',
          message: 'Using default value - MUST change in production!'
        });
      } else {
        addResult({
          name: `Env: ${varName}`,
          status: 'pass',
          message: 'Set'
        });
      }
    } else {
      addResult({
        name: `Env: ${varName}`,
        status: 'fail',
        message: 'Not set - REQUIRED'
      });
    }
  }

  for (const varName of optionalVars) {
    if (process.env[varName]) {
      addResult({
        name: `Env: ${varName}`,
        status: 'pass',
        message: 'Set (optional)'
      });
    } else {
      addResult({
        name: `Env: ${varName}`,
        status: 'warn',
        message: 'Not set (optional, may use fallback)'
      });
    }
  }

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    addResult({
      name: 'Env: NODE_ENV',
      status: 'warn',
      message: `Set to "${process.env.NODE_ENV}" - recommend "production" or "development"`
    });
  } else {
    addResult({
      name: 'Env: NODE_ENV',
      status: 'pass',
      message: process.env.NODE_ENV || 'development (default)'
    });
  }
}

async function checkDatabaseConnection() {
  console.log('\n🗄️  Checking Database Connection...\n');
  
  if (!process.env.DATABASE_URL) {
    addResult({
      name: 'Database Connection',
      status: 'fail',
      message: 'DATABASE_URL not set'
    });
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const start = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    const responseTime = Date.now() - start;
    
    addResult({
      name: 'Database Connection',
      status: 'pass',
      message: `Connected successfully (${responseTime}ms)`,
      details: {
        database: result.rows[0].db_name,
        timestamp: result.rows[0].current_time,
        responseTime: `${responseTime}ms`
      }
    });
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tableNames = tablesResult.rows.map(r => r.table_name);
    const expectedTables = [
      'users', 'conductores', 'servicios', 'tarifas', 
      'calificaciones', 'ubicaciones_tracking', 'mensajes_chat',
      'push_subscriptions', 'documentos', 'otp_tokens',
      'verification_audit', 'conductor_stripe_accounts',
      'payment_methods', 'service_receipts', 'comisiones'
    ];
    
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length === 0) {
      addResult({
        name: 'Database Schema',
        status: 'pass',
        message: `All ${expectedTables.length} tables present`,
        details: { tables: tableNames.length }
      });
    } else {
      addResult({
        name: 'Database Schema',
        status: 'fail',
        message: 'Missing tables',
        details: { missing: missingTables }
      });
    }
    
  } catch (error: any) {
    addResult({
      name: 'Database Connection',
      status: 'fail',
      message: 'Failed to connect',
      details: { error: error.message }
    });
  } finally {
    await pool.end();
  }
}

async function checkStripeConfiguration() {
  console.log('\n💳 Checking Stripe Configuration...\n');
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publicKey = process.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (!secretKey || !publicKey) {
    addResult({
      name: 'Stripe Keys',
      status: 'fail',
      message: 'Missing Stripe keys'
    });
    return;
  }
  
  const isTestMode = secretKey.startsWith('sk_test_');
  const isLiveMode = secretKey.startsWith('sk_live_');
  
  if (process.env.NODE_ENV === 'production' && isTestMode) {
    addResult({
      name: 'Stripe Mode',
      status: 'fail',
      message: 'Using TEST keys in PRODUCTION!'
    });
  } else if (isLiveMode) {
    addResult({
      name: 'Stripe Mode',
      status: 'pass',
      message: 'LIVE mode'
    });
  } else if (isTestMode) {
    addResult({
      name: 'Stripe Mode',
      status: 'pass',
      message: 'TEST mode (OK for development)'
    });
  }
  
  if (publicKey.startsWith('pk_test_') !== secretKey.startsWith('sk_test_')) {
    addResult({
      name: 'Stripe Key Mismatch',
      status: 'fail',
      message: 'Public and secret keys do not match (test vs live)'
    });
  }
}

async function checkGoogleMapsAPI() {
  console.log('\n🗺️  Checking Google Maps API...\n');
  
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    addResult({
      name: 'Google Maps API Key',
      status: 'fail',
      message: 'Not set'
    });
    return;
  }
  
  if (apiKey.startsWith('AIza')) {
    addResult({
      name: 'Google Maps API Key',
      status: 'pass',
      message: 'Valid format'
    });
  } else {
    addResult({
      name: 'Google Maps API Key',
      status: 'warn',
      message: 'Unexpected format'
    });
  }
}

async function checkWebPushConfiguration() {
  console.log('\n🔔 Checking Web Push Configuration...\n');
  
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    addResult({
      name: 'VAPID Keys',
      status: 'fail',
      message: 'Missing VAPID keys'
    });
    return;
  }
  
  if (publicKey.length > 80 && privateKey.length > 40) {
    addResult({
      name: 'VAPID Keys',
      status: 'pass',
      message: 'Valid length'
    });
  } else {
    addResult({
      name: 'VAPID Keys',
      status: 'warn',
      message: 'Unexpected length'
    });
  }
}

async function checkSecuritySettings() {
  console.log('\n🔐 Checking Security Settings...\n');
  
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    addResult({
      name: 'Session Secret',
      status: 'fail',
      message: 'Not set'
    });
  } else if (sessionSecret === 'gruard-secret-change-in-production') {
    addResult({
      name: 'Session Secret',
      status: 'fail',
      message: 'Using default value - CRITICAL SECURITY ISSUE!'
    });
  } else if (sessionSecret.length < 32) {
    addResult({
      name: 'Session Secret',
      status: 'warn',
      message: `Too short (${sessionSecret.length} chars, recommend 32+)`
    });
  } else {
    addResult({
      name: 'Session Secret',
      status: 'pass',
      message: `Strong (${sessionSecret.length} chars)`
    });
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ALLOWED_ORIGINS) {
      addResult({
        name: 'CORS Configuration',
        status: 'warn',
        message: 'ALLOWED_ORIGINS not set - will use localhost'
      });
    } else {
      const origins = process.env.ALLOWED_ORIGINS.split(',');
      const hasHttps = origins.some(o => o.startsWith('https://'));
      
      if (hasHttps) {
        addResult({
          name: 'CORS Configuration',
          status: 'pass',
          message: `Configured with ${origins.length} origin(s)`
        });
      } else {
        addResult({
          name: 'CORS Configuration',
          status: 'warn',
          message: 'No HTTPS origins configured'
        });
      }
    }
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Pre-Deployment Check Summary');
  console.log('='.repeat(60) + '\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  
  console.log(`✅ Passed:   ${passed}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`📝 Total:    ${results.length}\n`);
  
  if (failed > 0) {
    console.log('❌ DEPLOYMENT BLOCKED - Fix critical issues above\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  DEPLOYMENT ALLOWED - But please review warnings\n');
    process.exit(0);
  } else {
    console.log('✅ ALL CHECKS PASSED - Ready for deployment!\n');
    process.exit(0);
  }
}

async function main() {
  console.log('🚀 Grúa RD - Pre-Deployment Check');
  console.log('='.repeat(60));
  
  await checkEnvironmentVariables();
  await checkDatabaseConnection();
  await checkStripeConfiguration();
  await checkGoogleMapsAPI();
  await checkWebPushConfiguration();
  await checkSecuritySettings();
  
  await generateReport();
}

main().catch((error) => {
  console.error('❌ Pre-deployment check failed:', error);
  process.exit(1);
});
