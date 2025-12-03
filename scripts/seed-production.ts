#!/usr/bin/env tsx
/**
 * Grúa RD - Script de Seed Data para Producción
 * 
 * Este script inicializa los datos básicos necesarios para arrancar
 * el sistema en un ambiente de producción nuevo.
 * 
 * Uso: tsx scripts/seed-production.ts
 * 
 * ⚠️ ADVERTENCIA: Solo ejecutar en bases de datos vacías o nuevas.
 * El script verificará si ya existen datos antes de crear.
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gruard.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'GruaRD2025!';

interface SeedResult {
  entity: string;
  action: 'created' | 'skipped' | 'error';
  message: string;
  details?: any;
}

const results: SeedResult[] = [];

function addResult(result: SeedResult) {
  results.push(result);
  const icon = result.action === 'created' ? '✅' : result.action === 'skipped' ? '⏭️' : '❌';
  console.log(`${icon} ${result.entity}: ${result.message}`);
  if (result.details) {
    console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
  }
}

async function seedAdminUser(pool: Pool) {
  console.log('\n👤 Seeding Admin User...\n');
  
  try {
    // Check if admin exists
    const existingAdmin = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [ADMIN_EMAIL]
    );
    
    if (existingAdmin.rows.length > 0) {
      addResult({
        entity: 'Admin User',
        action: 'skipped',
        message: `Admin already exists: ${ADMIN_EMAIL}`,
        details: { id: existingAdmin.rows[0].id }
      });
      return;
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const adminId = randomUUID();
    
    await pool.query(
      `INSERT INTO users (id, email, password, nombre, apellido, user_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [adminId, ADMIN_EMAIL, hashedPassword, 'Administrador', 'Sistema', 'admin']
    );
    
    addResult({
      entity: 'Admin User',
      action: 'created',
      message: `Admin created: ${ADMIN_EMAIL}`,
      details: { id: adminId, email: ADMIN_EMAIL }
    });
    
  } catch (error: any) {
    addResult({
      entity: 'Admin User',
      action: 'error',
      message: `Failed to create admin: ${error.message}`
    });
  }
}

async function seedDefaultTariffs(pool: Pool) {
  console.log('\n💰 Seeding Default Tariffs...\n');
  
  try {
    // Check if tariffs exist
    const existingTariffs = await pool.query("SELECT COUNT(*) FROM tarifas");
    
    if (parseInt(existingTariffs.rows[0].count) > 0) {
      addResult({
        entity: 'Tariffs',
        action: 'skipped',
        message: `${existingTariffs.rows[0].count} tariffs already exist`
      });
      return;
    }
    
    // Default tariffs for Dominican Republic
    const tariffs = [
      {
        id: randomUUID(),
        nombre: 'Tarifa Estándar - Santo Domingo',
        precioBase: 150.00,
        tarifaPorKm: 25.00,
        tarifaNocturnaMultiplicador: 1.5,
        horaInicioNocturna: '20:00',
        horaFinNocturna: '06:00',
        zona: 'Santo Domingo',
        activo: true
      },
      {
        id: randomUUID(),
        nombre: 'Tarifa Premium - Zona Este',
        precioBase: 200.00,
        tarifaPorKm: 30.00,
        tarifaNocturnaMultiplicador: 1.5,
        horaInicioNocturna: '20:00',
        horaFinNocturna: '06:00',
        zona: 'Zona Este',
        activo: true
      },
      {
        id: randomUUID(),
        nombre: 'Tarifa Carretera',
        precioBase: 300.00,
        tarifaPorKm: 20.00,
        tarifaNocturnaMultiplicador: 1.75,
        horaInicioNocturna: '19:00',
        horaFinNocturna: '07:00',
        zona: 'Carretera',
        activo: true
      }
    ];
    
    for (const tariff of tariffs) {
      await pool.query(
        `INSERT INTO tarifas (id, nombre, precio_base, tarifa_por_km, tarifa_nocturna_multiplicador, 
         hora_inicio_nocturna, hora_fin_nocturna, zona, activo, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          tariff.id, tariff.nombre, tariff.precioBase, tariff.tarifaPorKm,
          tariff.tarifaNocturnaMultiplicador, tariff.horaInicioNocturna,
          tariff.horaFinNocturna, tariff.zona, tariff.activo
        ]
      );
    }
    
    addResult({
      entity: 'Tariffs',
      action: 'created',
      message: `Created ${tariffs.length} default tariffs`,
      details: tariffs.map(t => ({ nombre: t.nombre, zona: t.zona }))
    });
    
  } catch (error: any) {
    addResult({
      entity: 'Tariffs',
      action: 'error',
      message: `Failed to create tariffs: ${error.message}`
    });
  }
}

async function seedDefaultInsurers(pool: Pool) {
  console.log('\n🏢 Seeding Default Insurance Companies...\n');
  
  try {
    // Check if aseguradoras exist
    const existingAseguradoras = await pool.query(
      "SELECT COUNT(*) FROM users WHERE user_type = 'aseguradora'"
    );
    
    if (parseInt(existingAseguradoras.rows[0].count) > 0) {
      addResult({
        entity: 'Insurance Companies',
        action: 'skipped',
        message: `${existingAseguradoras.rows[0].count} insurance companies already exist`
      });
      return;
    }
    
    // Major Dominican insurance companies
    const insurers = [
      {
        email: 'servicios@segurosreservas.com',
        nombreEmpresa: 'Seguros Reservas',
        rnc: '101001451'
      },
      {
        email: 'gruas@universalseguros.com.do',
        nombreEmpresa: 'Universal de Seguros',
        rnc: '101103418'
      },
      {
        email: 'asistencia@mapfrebhd.com.do',
        nombreEmpresa: 'Mapfre BHD Seguros',
        rnc: '101502119'
      }
    ];
    
    for (const insurer of insurers) {
      const userId = randomUUID();
      const hashedPassword = await bcrypt.hash('ChangeMe123!', 10);
      
      await pool.query(
        `INSERT INTO users (id, email, password, nombre, user_type, created_at, nombre_empresa, rnc, aseguradora_activo)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, true)`,
        [userId, insurer.email, hashedPassword, insurer.nombreEmpresa, 'aseguradora', 
         insurer.nombreEmpresa, insurer.rnc]
      );
    }
    
    addResult({
      entity: 'Insurance Companies',
      action: 'created',
      message: `Created ${insurers.length} insurance company placeholders`,
      details: insurers.map(i => ({ nombre: i.nombreEmpresa, rnc: i.rnc }))
    });
    
    console.log('\n   ⚠️ NOTE: Insurance companies created with temporary password "ChangeMe123!"');
    console.log('   They must change their password on first login.\n');
    
  } catch (error: any) {
    addResult({
      entity: 'Insurance Companies',
      action: 'error',
      message: `Failed to create insurers: ${error.message}`
    });
  }
}

async function verifyDatabaseSchema(pool: Pool) {
  console.log('\n📋 Verifying Database Schema...\n');
  
  try {
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tableNames = tablesResult.rows.map(r => r.table_name);
    const requiredTables = [
      'users', 'conductores', 'servicios', 'tarifas', 'calificaciones',
      'mensajes_chat', 'push_subscriptions', 'documentos', 'otp_tokens',
      'comisiones', 'tickets', 'mensajes_ticket', 'socios', 'distribuciones_socios'
    ];
    
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length === 0) {
      addResult({
        entity: 'Database Schema',
        action: 'created',
        message: `All ${requiredTables.length} required tables present`,
        details: { totalTables: tableNames.length }
      });
    } else {
      addResult({
        entity: 'Database Schema',
        action: 'error',
        message: `Missing ${missingTables.length} tables`,
        details: { missing: missingTables }
      });
    }
    
  } catch (error: any) {
    addResult({
      entity: 'Database Schema',
      action: 'error',
      message: `Failed to verify schema: ${error.message}`
    });
  }
}

async function generateSummaryReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Seed Data Summary');
  console.log('='.repeat(60) + '\n');
  
  const created = results.filter(r => r.action === 'created').length;
  const skipped = results.filter(r => r.action === 'skipped').length;
  const errors = results.filter(r => r.action === 'error').length;
  
  console.log(`✅ Created:  ${created}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log(`📝 Total:    ${results.length}\n`);
  
  if (errors > 0) {
    console.log('❌ SEED INCOMPLETE - Some operations failed\n');
    console.log('Failed operations:');
    results.filter(r => r.action === 'error').forEach(r => {
      console.log(`  - ${r.entity}: ${r.message}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ SEED COMPLETED SUCCESSFULLY\n');
    
    console.log('📝 Next Steps:');
    console.log('  1. Change the admin password after first login');
    console.log('  2. Configure insurance company passwords');
    console.log('  3. Review and adjust tariffs as needed');
    console.log('  4. Set up webhooks in dLocal Dashboard');
    console.log('  5. Configure VAPID keys for push notifications\n');
    
    process.exit(0);
  }
}

async function main() {
  console.log('🌱 Grúa RD - Production Seed Data');
  console.log('='.repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Admin Email: ${ADMIN_EMAIL}`);
  console.log('='.repeat(60));
  
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ ERROR: DATABASE_URL not set');
    console.error('Please set the DATABASE_URL environment variable\n');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Verify connection
    await pool.query('SELECT NOW()');
    console.log('\n✅ Database connection established\n');
    
    // Run seed operations
    await verifyDatabaseSchema(pool);
    await seedAdminUser(pool);
    await seedDefaultTariffs(pool);
    await seedDefaultInsurers(pool);
    
    // Generate report
    await generateSummaryReport();
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});
