# Scripts de Grúa RD

Documentación de todos los scripts NPM y utilidades disponibles para el desarrollo y deployment.

## 📋 Scripts NPM (package.json)

### Desarrollo

#### `npm run dev`
```bash
npm run dev
```
Inicia el servidor de desarrollo con hot reload.
- **Uso**: Desarrollo local
- **Puerto**: 5000 (configurable con `PORT`)
- **Node**: Ejecuta con `tsx` para soporte TypeScript
- **Ambiente**: `NODE_ENV=development`

---

### Build y Producción

#### `npm run build`
```bash
npm run build
```
Compila la aplicación para producción.
- **Frontend**: Vite build → `dist/public/`
- **Backend**: esbuild → `dist/index.js`
- **Optimizaciones**: Minificación, tree shaking, code splitting
- **Salida**: Archivos listos para deployment

⚠️ **Advertencia actual**: El bundle genera chunks >500KB. Ver [Optimización PWA](#optimización-pwa) para soluciones.

#### `npm start`
```bash
npm start
```
Inicia el servidor en modo producción.
- **Prerrequisito**: Ejecutar `npm run build` primero
- **Archivo**: `dist/index.js`
- **Ambiente**: `NODE_ENV=production`

---

### Validación y Testing

#### `npm run check`
```bash
npm run check
```
Ejecuta TypeScript type checking sin generar archivos.
- **Uso**: Validar tipos antes de commit/deploy
- **Comando**: `tsc --noEmit`
- **Falla**: Si hay errores de tipos

---

### Base de Datos

#### `npm run db:push`
```bash
npm run db:push
```
Aplica cambios del schema a la base de datos (Drizzle Kit).
- **Uso**: Después de modificar `shared/schema.ts`
- **Acción**: Push schema → PostgreSQL
- **Advertencia**: Puede ser destructivo, hacer backup primero

---

## 🛠️ Scripts de Utilidad

### Pre-Deployment Check

#### `scripts/pre-deploy-check.ts`
```bash
tsx scripts/pre-deploy-check.ts
```

Verifica que la aplicación esté lista para deployment.

**Checks realizados:**
- ✅ Variables de entorno requeridas
- ✅ Conexión a base de datos
- ✅ Schema de base de datos completo
- ✅ Configuración de Stripe (test vs live mode)
- ✅ Google Maps API key
- ✅ VAPID keys (Web Push)
- ✅ Seguridad (session secret, CORS)

**Salidas:**
- Exit code 0: ✅ Ready para deploy
- Exit code 1: ❌ Problemas críticos encontrados

**Cuándo usar:**
- Antes de cada deployment a producción
- Después de cambios en configuración
- En pipeline CI/CD

**Ejemplo de salida:**
```
🚀 Grúa RD - Pre-Deployment Check
============================================================

🔍 Checking Environment Variables...

✅ Env: DATABASE_URL: Set
✅ Env: SESSION_SECRET: Set
✅ Env: VITE_GOOGLE_MAPS_API_KEY: Set
...

📊 Pre-Deployment Check Summary
============================================================

✅ Passed:   18
❌ Failed:   0
⚠️  Warnings: 2
📝 Total:    20

⚠️  DEPLOYMENT ALLOWED - But please review warnings
```

---

### Build de Producción

#### `scripts/build-production.sh`
```bash
bash scripts/build-production.sh
```

Script completo de build para producción.

**Pasos:**
1. Type checking con `npm run check`
2. Build de frontend y backend con `npm run build`
3. Validación de salida

**Requiere:**
- Node.js 20+
- Todas las dependencias instaladas

---

### Validación de Variables de Entorno

#### `scripts/validate-env.sh`
```bash
bash scripts/validate-env.sh
```

Valida que todas las variables de entorno requeridas estén configuradas.

**Checks:**
- Variables requeridas (exit 1 si faltan)
- Variables opcionales (warning si faltan)

**Útil para:**
- Validación rápida local
- Scripts de inicio
- CI/CD pipelines

---

## 🧪 Testing

### Tests End-to-End (Playwright)

#### Ejecutar todos los tests
```bash
npx playwright test
```

#### Tests específicos
```bash
# Cliente
npx playwright test e2e/01-client-flow.spec.ts

# Conductor
npx playwright test e2e/02-driver-flow.spec.ts

# Admin
npx playwright test e2e/03-admin-flow.spec.ts

# Onboarding
npx playwright test e2e/06-onboarding-wizard.spec.ts

# Stripe
npx playwright test e2e/07-stripe-connect-payment-flow.spec.ts
```

#### Tests en modo UI (debug)
```bash
npx playwright test --ui
```

#### Ver reporte
```bash
npx playwright show-report
```

---

## 🚀 Workflows Recomendados

### Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Ver ENV_VARS.md

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. En otra terminal: ejecutar tests
npx playwright test --ui
```

---

### Pre-Commit

```bash
# 1. Type checking
npm run check

# 2. Ejecutar tests relevantes
npx playwright test

# 3. Commit si todo pasa
git commit -m "feat: ..."
```

---

### Deployment a Producción

```bash
# 1. Validar variables de entorno
bash scripts/validate-env.sh

# 2. Ejecutar pre-deployment check
tsx scripts/pre-deploy-check.ts

# 3. Build de producción
bash scripts/build-production.sh

# 4. (Opcional) Test de smoke
# Iniciar servidor y verificar endpoints críticos

# 5. Deploy
# (Método depende de plataforma: Replit Deploy, etc.)
```

---

## 📦 Optimización PWA

### Análisis de Bundle

```bash
# Build con análisis
npm run build

# Revisar advertencias en consola:
# "(!) Some chunks are larger than 500 kB after minification"
```

### Soluciones Futuras (Workstream D - Task 6)

1. **Code Splitting**: Lazy load de rutas
2. **Manual Chunks**: Separar vendors grandes
3. **Dynamic Imports**: Cargar componentes bajo demanda
4. **Tree Shaking**: Optimizar imports

Ver [PLAN_DESARROLLO_GRUARD.md](PLAN_DESARROLLO_GRUARD.md) para detalles.

---

## 🔍 Health Check

### Endpoint HTTP

```bash
curl http://localhost:5000/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-24T...",
  "environment": "production",
  "database": {
    "status": "healthy",
    "responseTime": 45
  },
  "objectStorage": {
    "status": "healthy",
    "responseTime": 120
  }
}
```

**Estados posibles:**
- `healthy`: Todo operando correctamente
- `degraded`: Algunas dependencias con problemas
- `unhealthy`: Fallo crítico

---

## 📚 Referencias

- [ENV_VARS.md](ENV_VARS.md) - Variables de entorno requeridas
- [PLAN_DESARROLLO_GRUARD.md](PLAN_DESARROLLO_GRUARD.md) - Plan de desarrollo completo
- [API.md](API.md) - Documentación de API endpoints
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía de deployment (próximamente)

---

**Última actualización**: Noviembre 24, 2025  
**Versión**: 1.0.0 - Workstream D
