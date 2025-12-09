# Plan: Configurar Session Store Persistente para CapRover

## Resumen del Problema
Las sesiones de usuario se pierden cuando el servidor de CapRover reinicia porque están almacenadas en memoria (MemoryStore por defecto de express-session).

## Cambios Propuestos

### Fase 1: Agregar Session Store con PostgreSQL

**Archivo:** `server/routes.ts`

**Cambio 1:** Importar connect-pg-simple
```typescript
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
```

**Cambio 2:** Configurar el store antes de la configuración de sesión (línea ~406)
```typescript
const isProduction = process.env.NODE_ENV === "production";

// Configurar trust proxy antes de session (requerido para CapRover)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Configurar session store persistente para producción
let sessionStore: any = undefined;
if (isProduction && process.env.DATABASE_URL) {
  const PgSession = connectPgSimple(session);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  sessionStore = new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  });
}

const sessionParser = session({
  store: sessionStore, // undefined en desarrollo usa MemoryStore
  secret: process.env.SESSION_SECRET || "gruard-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
});
```

### Fase 2: Crear Tabla de Sesiones (Opcional - se crea automáticamente)

El parámetro `createTableIfMissing: true` crea la tabla automáticamente, pero si prefieres crearla manualmente:

```sql
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "user_sessions" ("expire");
```

## Dependencias Requeridas
- `connect-pg-simple` - Ya instalado según package.json
- `pg` - Ya instalado según package.json

## Variables de Entorno Requeridas en CapRover
- `DATABASE_URL` - URL de conexión a PostgreSQL (ya debería existir)
- `SESSION_SECRET` - Secret para firmar cookies (ya existe)
- `DATABASE_SSL` - Opcional, set to 'true' si PostgreSQL requiere SSL

## Riesgos y Consideraciones
1. **Bajo riesgo:** La tabla se crea automáticamente si no existe
2. **Bajo riesgo:** En desarrollo sigue usando MemoryStore (sin cambios)
3. **Medio riesgo:** Sesiones existentes en memoria se perderán al reiniciar (comportamiento actual)
4. **Mitigación:** Los usuarios solo necesitan volver a iniciar sesión una vez

## Verificación Post-Implementación
1. Desplegar a CapRover
2. Iniciar sesión como usuario de prueba
3. Reiniciar el contenedor en CapRover
4. Verificar que la sesión persiste (no redirige a login)
5. Verificar en la base de datos que existe la tabla `user_sessions`

## Próximos Pasos
Espero tu aprobación para implementar estos cambios.
