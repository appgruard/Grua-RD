#!/usr/bin/env tsx
/**
 * Grúa RD - Production Checklist
 * 
 * Checklist completo de verificación antes del lanzamiento a producción.
 * Este script verifica todos los aspectos críticos del sistema.
 * 
 * Uso: tsx scripts/production-checklist.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface CheckItem {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'pending';
  message: string;
  required: boolean;
  details?: any;
}

const checklist: CheckItem[] = [];

function addCheck(item: CheckItem) {
  checklist.push(item);
  const icon = item.status === 'pass' ? '✅' : 
               item.status === 'fail' ? '❌' : 
               item.status === 'warn' ? '⚠️' : '⏳';
  const req = item.required ? '(Required)' : '(Optional)';
  console.log(`  ${icon} ${item.name} ${req}`);
  console.log(`     ${item.message}`);
  if (item.details) {
    console.log(`     Details: ${JSON.stringify(item.details)}`);
  }
}

// ===== ENVIRONMENT CHECKS =====
async function checkEnvironment() {
  console.log('\n🔧 ENVIRONMENT CONFIGURATION\n');
  
  // Critical Environment Variables
  const criticalVars = [
    { name: 'DATABASE_URL', description: 'PostgreSQL connection' },
    { name: 'SESSION_SECRET', description: 'Session encryption key', minLength: 32 },
    { name: 'VITE_GOOGLE_MAPS_API_KEY', description: 'Google Maps API' },
  ];
  
  for (const v of criticalVars) {
    const value = process.env[v.name];
    if (!value) {
      addCheck({
        category: 'Environment',
        name: v.name,
        status: 'fail',
        message: `Not configured - ${v.description}`,
        required: true
      });
    } else if (v.minLength && value.length < v.minLength) {
      addCheck({
        category: 'Environment',
        name: v.name,
        status: 'warn',
        message: `Too short (${value.length} chars, need ${v.minLength}+)`,
        required: true
      });
    } else if (v.name === 'SESSION_SECRET' && value === 'gruard-secret-change-in-production') {
      addCheck({
        category: 'Environment',
        name: v.name,
        status: 'fail',
        message: 'Using default value - CHANGE IN PRODUCTION!',
        required: true
      });
    } else {
      addCheck({
        category: 'Environment',
        name: v.name,
        status: 'pass',
        message: `Configured - ${v.description}`,
        required: true
      });
    }
  }
  
  // Payment Variables (Azul)
  const paymentVars = [
    { name: 'AZUL_MERCHANT_ID', description: 'Azul Merchant ID' },
    { name: 'AZUL_AUTH_KEY', description: 'Azul Auth Key' },
  ];
  
  for (const v of paymentVars) {
    const value = process.env[v.name];
    if (!value) {
      addCheck({
        category: 'Payments',
        name: v.name,
        status: 'warn',
        message: `Not configured - ${v.description}`,
        required: false
      });
    } else {
      addCheck({
        category: 'Payments',
        name: v.name,
        status: 'pass',
        message: 'Configured',
        required: false
      });
    }
  }
  
  // SMS/OTP Variables
  const smsVars = [
    { name: 'TWILIO_ACCOUNT_SID', description: 'Twilio Account SID' },
    { name: 'TWILIO_AUTH_TOKEN', description: 'Twilio Auth Token' },
    { name: 'TWILIO_PHONE_NUMBER', description: 'Twilio Phone Number' },
  ];
  
  const allSmsConfigured = smsVars.every(v => process.env[v.name]);
  
  if (allSmsConfigured) {
    addCheck({
      category: 'SMS/OTP',
      name: 'Twilio Configuration',
      status: 'pass',
      message: 'All Twilio variables configured',
      required: false
    });
  } else {
    addCheck({
      category: 'SMS/OTP',
      name: 'Twilio Configuration',
      status: 'warn',
      message: 'Not fully configured - will use mock SMS',
      required: false
    });
  }
  
  // Push Notifications
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  
  if (vapidPublic && vapidPrivate) {
    addCheck({
      category: 'Push Notifications',
      name: 'VAPID Keys',
      status: 'pass',
      message: 'Both public and private keys configured',
      required: true
    });
  } else {
    addCheck({
      category: 'Push Notifications',
      name: 'VAPID Keys',
      status: 'fail',
      message: 'Missing VAPID keys - push notifications will not work',
      required: true
    });
  }
}

// ===== DATABASE CHECKS =====
async function checkDatabase() {
  console.log('\n🗄️  DATABASE\n');
  
  if (!process.env.DATABASE_URL) {
    addCheck({
      category: 'Database',
      name: 'Connection',
      status: 'fail',
      message: 'DATABASE_URL not configured',
      required: true
    });
    return;
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const start = Date.now();
    await pool.query('SELECT NOW()');
    const responseTime = Date.now() - start;
    
    addCheck({
      category: 'Database',
      name: 'Connection',
      status: 'pass',
      message: `Connected successfully (${responseTime}ms)`,
      required: true
    });
    
    // Check tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const requiredTables = [
      'users', 'conductores', 'servicios', 'tarifas', 'calificaciones',
      'comisiones', 'tickets', 'documentos', 'socios'
    ];
    
    const tableNames = tablesResult.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length === 0) {
      addCheck({
        category: 'Database',
        name: 'Schema',
        status: 'pass',
        message: `All ${requiredTables.length} core tables present`,
        required: true,
        details: { totalTables: tableNames.length }
      });
    } else {
      addCheck({
        category: 'Database',
        name: 'Schema',
        status: 'fail',
        message: `Missing ${missingTables.length} tables`,
        required: true,
        details: { missing: missingTables }
      });
    }
    
    // Check admin user exists
    const adminResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE user_type = 'admin'"
    );
    const adminCount = parseInt(adminResult.rows[0].count);
    
    if (adminCount > 0) {
      addCheck({
        category: 'Database',
        name: 'Admin User',
        status: 'pass',
        message: `${adminCount} admin user(s) exist`,
        required: true
      });
    } else {
      addCheck({
        category: 'Database',
        name: 'Admin User',
        status: 'fail',
        message: 'No admin users found - run seed script',
        required: true
      });
    }
    
    // Check tariffs exist
    const tariffsResult = await pool.query(
      "SELECT COUNT(*) FROM tarifas WHERE activo = true"
    );
    const tariffsCount = parseInt(tariffsResult.rows[0].count);
    
    if (tariffsCount > 0) {
      addCheck({
        category: 'Database',
        name: 'Tariffs',
        status: 'pass',
        message: `${tariffsCount} active tariff(s) configured`,
        required: true
      });
    } else {
      addCheck({
        category: 'Database',
        name: 'Tariffs',
        status: 'fail',
        message: 'No active tariffs - run seed script',
        required: true
      });
    }
    
  } catch (error: any) {
    addCheck({
      category: 'Database',
      name: 'Connection',
      status: 'fail',
      message: `Connection failed: ${error.message}`,
      required: true
    });
  } finally {
    await pool.end();
  }
}

// ===== FILE SYSTEM CHECKS =====
async function checkFileSystem() {
  console.log('\n📁 FILE SYSTEM\n');
  
  // Check critical files exist
  const criticalFiles = [
    { path: 'client/public/manifest.json', description: 'PWA Manifest' },
    { path: 'client/public/sw.js', description: 'Service Worker' },
    { path: 'client/public/favicon.png', description: 'Favicon' },
  ];
  
  for (const file of criticalFiles) {
    if (fs.existsSync(file.path)) {
      addCheck({
        category: 'Files',
        name: file.description,
        status: 'pass',
        message: `Present: ${file.path}`,
        required: true
      });
    } else {
      addCheck({
        category: 'Files',
        name: file.description,
        status: 'fail',
        message: `Missing: ${file.path}`,
        required: true
      });
    }
  }
  
  // Check logs directory
  const logsDir = 'logs';
  if (fs.existsSync(logsDir)) {
    addCheck({
      category: 'Files',
      name: 'Logs Directory',
      status: 'pass',
      message: 'Logs directory exists',
      required: false
    });
  } else {
    try {
      fs.mkdirSync(logsDir);
      addCheck({
        category: 'Files',
        name: 'Logs Directory',
        status: 'pass',
        message: 'Logs directory created',
        required: false
      });
    } catch {
      addCheck({
        category: 'Files',
        name: 'Logs Directory',
        status: 'warn',
        message: 'Could not create logs directory',
        required: false
      });
    }
  }
  
  // Check documentation
  const docs = [
    'API.md', 'DEPLOYMENT.md', 'ENV_VARS.md', 'replit.md'
  ];
  
  const presentDocs = docs.filter(d => fs.existsSync(d));
  
  addCheck({
    category: 'Documentation',
    name: 'Required Docs',
    status: presentDocs.length === docs.length ? 'pass' : 'warn',
    message: `${presentDocs.length}/${docs.length} documentation files present`,
    required: false,
    details: { present: presentDocs, missing: docs.filter(d => !fs.existsSync(d)) }
  });
}

// ===== SECURITY CHECKS =====
async function checkSecurity() {
  console.log('\n🔐 SECURITY\n');
  
  // Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    addCheck({
      category: 'Security',
      name: 'NODE_ENV',
      status: 'pass',
      message: 'Set to production',
      required: true
    });
  } else {
    addCheck({
      category: 'Security',
      name: 'NODE_ENV',
      status: 'warn',
      message: `Set to "${nodeEnv}" - should be "production"`,
      required: true
    });
  }
  
  // Check ALLOWED_ORIGINS
  const origins = process.env.ALLOWED_ORIGINS;
  if (origins) {
    const originList = origins.split(',');
    const hasHttps = originList.some(o => o.startsWith('https://'));
    addCheck({
      category: 'Security',
      name: 'CORS Origins',
      status: hasHttps ? 'pass' : 'warn',
      message: `${originList.length} origin(s) configured`,
      required: true,
      details: { hasHttps, count: originList.length }
    });
  } else {
    addCheck({
      category: 'Security',
      name: 'CORS Origins',
      status: 'warn',
      message: 'ALLOWED_ORIGINS not set - will use default',
      required: true
    });
  }
  
  // Check privacy policy exists
  if (fs.existsSync('client/src/pages/privacy-policy.tsx')) {
    addCheck({
      category: 'Compliance',
      name: 'Privacy Policy',
      status: 'pass',
      message: 'Privacy policy page exists',
      required: true
    });
  } else {
    addCheck({
      category: 'Compliance',
      name: 'Privacy Policy',
      status: 'fail',
      message: 'Privacy policy page missing',
      required: true
    });
  }
}

// ===== GENERATE REPORT =====
async function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 PRODUCTION CHECKLIST REPORT');
  console.log('='.repeat(70) + '\n');
  
  const passed = checklist.filter(c => c.status === 'pass').length;
  const failed = checklist.filter(c => c.status === 'fail').length;
  const warned = checklist.filter(c => c.status === 'warn').length;
  const pending = checklist.filter(c => c.status === 'pending').length;
  const total = checklist.length;
  
  const requiredPassed = checklist.filter(c => c.required && c.status === 'pass').length;
  const requiredTotal = checklist.filter(c => c.required).length;
  const requiredFailed = checklist.filter(c => c.required && c.status === 'fail').length;
  
  console.log('Summary:');
  console.log(`  ✅ Passed:   ${passed}/${total}`);
  console.log(`  ❌ Failed:   ${failed}/${total}`);
  console.log(`  ⚠️  Warnings: ${warned}/${total}`);
  console.log(`  ⏳ Pending:  ${pending}/${total}`);
  console.log('');
  console.log(`Required Checks: ${requiredPassed}/${requiredTotal} passed`);
  console.log('');
  
  // Group by category
  const categories = [...new Set(checklist.map(c => c.category))];
  
  console.log('By Category:');
  for (const cat of categories) {
    const catItems = checklist.filter(c => c.category === cat);
    const catPassed = catItems.filter(c => c.status === 'pass').length;
    const catFailed = catItems.filter(c => c.status === 'fail').length;
    const icon = catFailed > 0 ? '❌' : '✅';
    console.log(`  ${icon} ${cat}: ${catPassed}/${catItems.length} passed`);
  }
  
  console.log('');
  
  if (requiredFailed > 0) {
    console.log('❌ PRODUCTION NOT READY\n');
    console.log('Required items failing:');
    checklist.filter(c => c.required && c.status === 'fail').forEach(c => {
      console.log(`  - [${c.category}] ${c.name}: ${c.message}`);
    });
    console.log('');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  PRODUCTION READY WITH WARNINGS\n');
    console.log('Please review warnings above before deployment.\n');
    process.exit(0);
  } else {
    console.log('✅ PRODUCTION READY!\n');
    console.log('All required checks passed. System is ready for deployment.\n');
    process.exit(0);
  }
}

// ===== MAIN =====
async function main() {
  console.log('🚀 Grúa RD - Production Checklist');
  console.log('='.repeat(70));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log('='.repeat(70));
  
  await checkEnvironment();
  await checkDatabase();
  await checkFileSystem();
  await checkSecurity();
  
  await generateReport();
}

main().catch((error) => {
  console.error('\n❌ Checklist failed:', error.message);
  process.exit(1);
});
