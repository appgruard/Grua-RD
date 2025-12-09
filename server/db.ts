// Disable SSL certificate validation for self-signed certificates
// This must be set before importing any database modules
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import * as schemaExtensions from "./schema-extensions";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Merge core schema with server-side extensions
const fullSchema = { ...schema, ...schemaExtensions };

// Check if connecting to Neon serverless (includes @neon in host) or direct connection (pooler)
// Neon serverless URLs typically have @db.xxxx.us-east-1 patterns
// Neon pooler URLs have @xxxx-pooler.us-east-1 patterns
const isNeonServerless = process.env.DATABASE_URL.includes('@db.') && process.env.DATABASE_URL.includes('neon.tech');

// SSL configuration for self-signed certificates
const sslConfig = { rejectUnauthorized: false };

// For direct PostgreSQL connections, use pg driver
// For Neon serverless, use the serverless driver with WebSocket
export const pool = isNeonServerless
  ? new NeonPool({ connectionString: process.env.DATABASE_URL, ssl: sslConfig })
  : new PgPool({ connectionString: process.env.DATABASE_URL, ssl: sslConfig });

export const db = isNeonServerless
  ? drizzleNeon({ client: pool as NeonPool, schema: fullSchema })
  : drizzlePg({ client: pool as PgPool, schema: fullSchema });

export async function initializeTicketTables(): Promise<void> {
  let client;
  try {
    client = await pool.connect();
  } catch (connectionError: any) {
    let errorMessage = 'Unknown connection error';
    if (connectionError instanceof Error) {
      errorMessage = `${connectionError.name}: ${connectionError.message}`;
      if ('code' in connectionError) {
        errorMessage += ` (code: ${connectionError.code})`;
      }
    } else if (typeof connectionError === 'object' && connectionError !== null) {
      // Check for ErrorEvent from WebSocket
      if ('message' in connectionError) {
        errorMessage = connectionError.message;
      }
      if ('error' in connectionError && connectionError.error instanceof Error) {
        errorMessage = `${connectionError.error.name}: ${connectionError.error.message}`;
        if ('code' in connectionError.error) {
          errorMessage += ` (code: ${(connectionError.error as any).code})`;
        }
      }
      // Try to get all enumerable and non-enumerable properties
      const allProps = Object.getOwnPropertyNames(connectionError);
      if (allProps.length > 0) {
        const propsObj: Record<string, any> = {};
        for (const prop of allProps) {
          try {
            propsObj[prop] = connectionError[prop];
          } catch { /* ignore */ }
        }
        errorMessage += ` Properties: ${JSON.stringify(propsObj, null, 2)}`;
      }
    } else {
      errorMessage = String(connectionError);
    }
    console.error("Failed to connect to database for ticket tables:", errorMessage);
    throw connectionError;
  }
  try {
    await (client as any).query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_categoria" AS ENUM (
          'problema_tecnico', 'consulta_servicio', 'queja', 'sugerencia', 'problema_pago', 'otro'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    
    await (client as any).query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_prioridad" AS ENUM ('baja', 'media', 'alta', 'urgente');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    
    await (client as any).query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_estado" AS ENUM ('abierto', 'en_proceso', 'resuelto', 'cerrado');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    
    await (client as any).query(`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "usuario_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "categoria" ticket_categoria NOT NULL,
        "prioridad" ticket_prioridad NOT NULL DEFAULT 'media',
        "estado" ticket_estado NOT NULL DEFAULT 'abierto',
        "titulo" text NOT NULL,
        "descripcion" text NOT NULL,
        "servicio_relacionado_id" varchar REFERENCES "servicios"("id") ON DELETE SET NULL,
        "asignado_a" varchar REFERENCES "users"("id") ON DELETE SET NULL,
        "resuelto_at" timestamp,
        "cerrado_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    await (client as any).query(`
      CREATE TABLE IF NOT EXISTS "mensajes_ticket" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" varchar NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
        "usuario_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "mensaje" text NOT NULL,
        "es_staff" boolean DEFAULT false NOT NULL,
        "leido" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "tickets_usuario_id_idx" ON "tickets"("usuario_id");`);
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "tickets_estado_idx" ON "tickets"("estado");`);
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "tickets_prioridad_idx" ON "tickets"("prioridad");`);
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "tickets_categoria_idx" ON "tickets"("categoria");`);
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "tickets_asignado_a_idx" ON "tickets"("asignado_a");`);
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "tickets_created_at_idx" ON "tickets"("created_at" DESC);`);
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "mensajes_ticket_ticket_id_idx" ON "mensajes_ticket"("ticket_id");`);
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "mensajes_ticket_usuario_id_idx" ON "mensajes_ticket"("usuario_id");`);
    await (client as any).query(`CREATE INDEX IF NOT EXISTS "mensajes_ticket_created_at_idx" ON "mensajes_ticket"("created_at" DESC);`);
    
    console.log("Ticket tables initialized successfully");
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : String(error);
    console.error("Error initializing ticket tables:", errorMessage);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}
