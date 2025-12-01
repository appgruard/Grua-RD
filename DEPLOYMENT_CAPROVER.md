# Despliegue en CapRover - Guía Completa

Esta guía te explica cómo desplegar Grúa RD en tu VPS usando CapRover.

---

## Prerequisites

1. **Un VPS con Ubuntu/Debian** (DigitalOcean, Linode, AWS EC2, etc.)
2. **CapRover instalado** en el VPS
3. **Un dominio** (opcional pero recomendado)
4. **PostgreSQL database** (Neon, AWS RDS, o local)

---

## Paso 1: Instalar CapRover en tu VPS

En tu VPS, ejecuta:

```bash
# Instalar Docker si no lo tienes
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar CapRover
docker run -d --name caprover -p 80:80 -p 443:443 -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  caprover/caprover:latest
```

Luego accede a: `http://tu-ip-vps:3000`

---

## Paso 2: Preparar tu proyecto para CapRover

### Archivo captain-definition.json

Ya existe en tu proyecto. Verifica que esté:

```json
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile",
  "imageName": "gruard-rd",
  "containerName": "gruard-rd-app",
  "ports": ["5000:5000"]
}
```

### Dockerfile

Ya existe con todo configurado. Solo verifica que esté en la raíz del proyecto.

---

## Paso 3: Configurar Variables de Entorno

### En CapRover:

1. En el dashboard, ve a: **Apps → Crear Nueva App**
2. Nombra tu app: `gruard-rd`
3. Ve a la sección **Environment Variables**
4. Agrega TODAS las variables de `.env.example`:

```
DATABASE_URL=postgresql://...
NODE_ENV=production
ALLOWED_ORIGINS=https://tu-dominio.com
SESSION_SECRET=your_generated_secret
VAPID_PRIVATE_KEY=your_vapid_key
VITE_VAPID_PUBLIC_KEY=your_vapid_key
VITE_MAPBOX_ACCESS_TOKEN=tu_token
STRIPE_SECRET_KEY=tu_key
... (todas las demás)
```

**IMPORTANTE**: 
- No uses `VITE_` como prefijo para secretos en backend
- Solo usa `VITE_` para variables que necesita el frontend compilado
- Las demás variables de backend pueden ser normales

---

## Paso 4: Desplegar con Git

### Opción A: Deploy desde GitHub/GitLab (Recomendado)

1. En CapRover, selecciona tu app
2. Ve a: **Deployment → GitHub/GitLab Integration**
3. Conecta tu repositorio
4. Selecciona la rama (main/master)
5. **Enable Auto Deployment**

Cada push automáticamente compila y despliega.

### Opción B: Deploy manual

1. En tu máquina local:
```bash
git remote add caprover git@tu-vps:captain/apps/gruard-rd.git
git push caprover main
```

2. CapRover automáticamente:
   - Compila el Docker
   - Instala dependencias
   - Ejecuta el build
   - Inicia la app

---

## Paso 5: Configurar Dominio y SSL

1. En CapRover, selecciona tu app
2. Ve a: **HTTP Settings**
3. Agrega tu dominio: `gruard-rd.tu-dominio.com`
4. Habilita HTTPS (CapRover genera certificado Let's Encrypt automáticamente)

---

## Paso 6: Configurar Base de Datos

### Si usas Neon (Recomendado):

1. Crea una base de datos en https://neon.tech
2. Copia la cadena de conexión: `postgresql://...`
3. En CapRover, agrega como variable de entorno: `DATABASE_URL`

### Si usas PostgreSQL en el VPS:

```bash
# En tu VPS
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb gruard_db
sudo -u postgres psql -c "CREATE USER gruard WITH PASSWORD 'tu_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gruard_db TO gruard;"
```

Luego agrega la variable:
```
DATABASE_URL=postgresql://gruard:tu_password@localhost:5432/gruard_db
```

### Inicializar tablas:

```bash
# Desde tu máquina local
npx drizzle-kit push --config=drizzle.config.ts
```

---

## Paso 7: Monitoreo y Mantenimiento

### Ver logs en CapRover:

1. Selecciona tu app
2. Ve a: **Logs**
3. Verás los logs en tiempo real

### Redeploy:

```bash
git push caprover main
# O manualmente en CapRover → Deployment → Trigger Deploy
```

### Actualizar dependencias:

```bash
npm install --save nuevo-package
npm run build
git push caprover main
```

---

## Checklist Previo a Producción

- [ ] Base de datos configurada y accesible
- [ ] Todas las variables de entorno definidas
- [ ] ALLOWED_ORIGINS contiene tu dominio de producción
- [ ] VAPID keys generadas: `npx web-push generate-vapid-keys`
- [ ] Certificado SSL habilitado en CapRover
- [ ] Health check pasando (verifica logs)
- [ ] Dominio apuntando a tu VPS
- [ ] Pruebas de registro, login, y solicitudes de servicios
- [ ] WebSockets funcionando correctamente
- [ ] Notificaciones push configuradas
- [ ] Backups de base de datos configurados

---

## Solución de Problemas

### Error: "Cannot find module"
**Solución**: Asegúrate de que `npm install` se ejecutó. En CapRover, ve a **Logs** y busca errores.

### Error: "Database connection refused"
**Solución**: Verifica que DATABASE_URL es correcto y que la BD está accesible desde tu VPS.

### App se reinicia constantemente
**Solución**: Revisa los logs. Puede ser un error en las variables de entorno o falta de dependencias.

### WebSocket no funciona
**Solución**: Asegúrate que ALLOWED_ORIGINS incluye tu dominio.

---

## Estructura de Archivos Necesarios

```
gruard-rd/
├── Dockerfile                    ✅ Necesario
├── captain-definition.json       ✅ Necesario
├── package.json                  ✅ Necesario
├── package-lock.json             ✅ Necesario
├── server/                       ✅ Necesario
│   ├── index.ts
│   ├── routes.ts
│   ├── db.ts
│   └── ...
├── client/                       ✅ Necesario (para compilar)
│   └── src/
├── shared/                       ✅ Necesario (para types)
├── dist/                         Auto-generado
│   └── public/                   Frontend compilado
└── .env.production               En CapRover (no en git)
```

---

## Tips Avanzados

### Usar Redis para sesiones (en lugar de MemoryStore):

```bash
# En CapRover, agrega un servicio Redis
# Luego configura en server/index.ts
```

### Autoescalado:

CapRover puede escalar automáticamente si:
- Hay múltiples nodos en el cluster
- Configuras los límites de CPU/memoria

### Backup automático:

En CapRover → Logs & Monitoring → Backup:
- Habilita backups automáticos
- O usa `pg_dump` en cron

---

## Próximos Pasos

1. **Configurar CI/CD**: GitHub Actions para tests antes de deploy
2. **Monitoring**: Sentry para error tracking
3. **Emails transaccionales**: Resend ya configurado
4. **SMS**: Twilio ya configurado
5. **Analytics**: Agregrega tu herramienta de analytics

---

## Contacto / Ayuda

Si tienes problemas:
1. Revisa los logs en CapRover
2. Verifica las variables de entorno
3. Asegúrate que el Dockerfile y captain-definition.json están correctos
4. Prueba el build local: `docker build -t gruard-rd .`

¡Éxito en tu despliegue! 🚀
