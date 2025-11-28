import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: dbUrl });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting ticket system migration...");
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_categoria" AS ENUM (
          'problema_tecnico', 'consulta_servicio', 'queja', 'sugerencia', 'problema_pago', 'otro'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    console.log("Created ticket_categoria enum");
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_prioridad" AS ENUM ('baja', 'media', 'alta', 'urgente');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    console.log("Created ticket_prioridad enum");
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_estado" AS ENUM ('abierto', 'en_proceso', 'resuelto', 'cerrado');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    console.log("Created ticket_estado enum");
    
    await client.query(`
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
    console.log("Created tickets table");
    
    await client.query(`
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
    console.log("Created mensajes_ticket table");
    
    await client.query(`CREATE INDEX IF NOT EXISTS "tickets_usuario_id_idx" ON "tickets"("usuario_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "tickets_estado_idx" ON "tickets"("estado");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "tickets_prioridad_idx" ON "tickets"("prioridad");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "tickets_categoria_idx" ON "tickets"("categoria");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "tickets_asignado_a_idx" ON "tickets"("asignado_a");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "tickets_created_at_idx" ON "tickets"("created_at" DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS "mensajes_ticket_ticket_id_idx" ON "mensajes_ticket"("ticket_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "mensajes_ticket_usuario_id_idx" ON "mensajes_ticket"("usuario_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "mensajes_ticket_created_at_idx" ON "mensajes_ticket"("created_at" DESC);`);
    console.log("Created indexes");
    
    console.log("\n✅ Ticket system migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
