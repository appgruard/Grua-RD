# Testing E2E con Playwright - Grúa RD

## 📋 Descripción

Este directorio contiene tests end-to-end (E2E) completos para la aplicación Grúa RD usando Playwright. Los tests cubren todos los flujos principales de la aplicación para Cliente, Conductor y Admin.

## 🗂️ Estructura de Tests

```
e2e/
├── helpers.ts                      # Funciones helper reutilizables
├── 01-client-flow.spec.ts         # Tests del flujo de Cliente
├── 02-driver-flow.spec.ts         # Tests del flujo de Conductor
├── 03-admin-flow.spec.ts          # Tests del flujo de Admin
├── 04-websocket.spec.ts           # Tests de WebSocket en tiempo real
├── 05-integration-full.spec.ts    # Tests de integración completos
└── README.md                       # Esta documentación
```

## 🚀 Ejecución de Tests

### Prerequisitos

1. Asegurarse de que Playwright está instalado:
```bash
npm install
```

2. Instalar los navegadores de Playwright (solo primera vez):
```bash
npx playwright install
```

### Comandos Disponibles

```bash
# Ejecutar todos los tests
npx playwright test

# Ejecutar tests en modo UI (interfaz interactiva)
npx playwright test --ui

# Ejecutar tests en modo debug
npx playwright test --debug

# Ejecutar un archivo específico
npx playwright test e2e/01-client-flow.spec.ts

# Ejecutar tests en modo headed (ver el navegador)
npx playwright test --headed

# Ejecutar tests y generar reporte HTML
npx playwright test --reporter=html
npx playwright show-report
```

## 📝 Cobertura de Tests

### 01-client-flow.spec.ts (Cliente)
- ✅ Registro de nuevo cliente
- ✅ Login de cliente
- ✅ Solicitud de servicio de grúa
- ✅ Visualización de historial
- ✅ Visualización de perfil
- ✅ Validación de errores de login
- ✅ Validación de campos requeridos

### 02-driver-flow.spec.ts (Conductor)
- ✅ Registro de conductor con datos de grúa
- ✅ Login de conductor
- ✅ Cambio de disponibilidad
- ✅ Visualización de solicitudes pendientes
- ✅ Historial de servicios
- ✅ Perfil con datos de grúa
- ✅ Validación de campos específicos del conductor

### 03-admin-flow.spec.ts (Admin)
- ✅ Registro y login de administrador
- ✅ Dashboard con estadísticas
- ✅ Gestión de usuarios
- ✅ Gestión de conductores
- ✅ Visualización de todos los servicios
- ✅ Creación de tarifas
- ✅ Monitoreo en tiempo real
- ✅ Filtrado de servicios por estado

### 04-websocket.spec.ts (WebSocket)
- ✅ Establecimiento de conexión WebSocket
- ✅ Notificaciones de nuevas solicitudes a conductores
- ✅ Actualizaciones de ubicación en tiempo real
- ✅ Reconexión automática
- ✅ Monitoreo de conductores activos por admin

### 05-integration-full.spec.ts (Integración)
- ✅ Flujo completo: Solicitud → Aceptación → Tracking → Completar
- ✅ Monitoreo por admin durante flujo completo
- ✅ Cancelación de servicio por cliente
- ✅ Validación de que conductor no puede aceptar múltiples servicios

## 🎯 Data-TestIDs Utilizados

Los tests utilizan `data-testid` para seleccionar elementos de forma confiable:

### Autenticación
- `link-register`, `link-login`, `button-logout`
- `input-email`, `input-password`, `input-nombre`, `input-apellido`
- `select-user-type`, `option-cliente`, `option-conductor`, `option-admin`
- `button-register`, `button-login`

### Cliente
- `button-new-request`
- `input-origin-address`, `input-destination-address`
- `button-calculate-route`, `button-confirm-request`
- `text-distance`, `text-price`
- `status-pending`, `status-aceptado`, `status-en_progreso`, `status-completado`
- `map-tracking`
- `button-cancel-service`, `button-rate-service`

### Conductor
- `toggle-availability`
- `section-pending-requests`
- `card-request`, `button-accept`
- `button-start-service`, `button-complete-service`
- `text-licencia`, `text-placa`, `text-marca`

### Admin
- `stat-total-users`, `stat-total-drivers`, `stat-total-services`, `stat-total-revenue`
- `table-users`, `table-drivers`, `table-services`
- `link-users`, `link-drivers`, `link-services`, `link-pricing`, `link-monitoring`
- `button-new-pricing`, `button-save-pricing`
- `map-monitoring`
- `filter-status`

## 🧪 Helpers Disponibles

El archivo `helpers.ts` proporciona funciones reutilizables:

- `registerUser(page, userData)` - Registrar un usuario
- `loginUser(page, email, password)` - Iniciar sesión
- `logoutUser(page)` - Cerrar sesión
- `waitForToast(page, message)` - Esperar toast/notificación
- `TEST_USERS` - Usuarios de prueba predefinidos

## 🔧 Configuración

La configuración de Playwright está en `playwright.config.ts`:

- **Puerto**: localhost:5000
- **Navegadores**: Chromium (Desktop Chrome)
- **Reintentos**: 2 en CI, 0 en local
- **Screenshots**: Solo en fallos
- **Traces**: En primer reintento
- **Reporter**: HTML

## 📊 Resultados

Después de ejecutar los tests:

```bash
# Ver reporte HTML
npx playwright show-report
```

El reporte incluye:
- Resumen de tests pasados/fallados
- Screenshots de fallos
- Traces interactivos
- Videos de tests (si están habilitados)

## 🐛 Debugging

### Ver tests ejecutándose
```bash
npx playwright test --headed --workers=1
```

### Modo debug interactivo
```bash
npx playwright test --debug
```

### Playwright Inspector
```bash
PWDEBUG=1 npx playwright test
```

### Generar código de test
```bash
npx playwright codegen http://localhost:5000
```

## ⚠️ Notas Importantes

1. **Base de Datos**: Los tests crean usuarios con emails únicos usando timestamps para evitar conflictos.

2. **WebSocket**: Los tests de WebSocket pueden tardar más debido a la naturaleza asíncrona de las conexiones en tiempo real.

3. **Google Maps**: Algunos tests requieren que la API de Google Maps esté configurada correctamente.

4. **Timeouts**: Los tests tienen timeouts generosos para permitir carga de mapas y cálculos de rutas.

5. **Paralelización**: Por defecto, Playwright ejecuta tests en paralelo. Use `--workers=1` para ejecución secuencial si hay conflictos.

## 🔄 CI/CD

Para integrar en CI/CD, agregar al pipeline:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 📈 Próximos Tests

Posibles adiciones futuras:
- Tests de performance
- Tests de accesibilidad (a11y)
- Tests de responsive design
- Tests de integración con Stripe
- Tests de carga (stress testing)
- Tests de seguridad básica

## 🤝 Contribuir

Al agregar nuevos tests:
1. Seguir el patrón de naming `XX-feature-name.spec.ts`
2. Agregar helpers reutilizables a `helpers.ts`
3. Documentar nuevos `data-testid` en este README
4. Incluir descripción clara de cada test
5. Agregar validaciones apropiadas con `expect()`
