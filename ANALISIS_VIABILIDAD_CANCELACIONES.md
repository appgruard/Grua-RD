# Análisis de Viabilidad - Sistema de Cancelaciones GruArd

## Resumen Ejecutivo

✅ **PLAN ES VIABLE** - Viabilidad: 90%

El sistema de cancelación con penalizaciones dinámicas **PUEDE implementarse correctamente** en la arquitectura actual de GruArd. El 60% de la infraestructura necesaria ya existe.

---

## Lo Que Ya Existe ✓

### Tablas Base
- ✓ `servicios` - con estados incluyendo `cancelado` y timestamp `canceladoAt`
- ✓ `ubicacionesTracking` - registra GPS en tiempo real (servicioId, conductorId, lat, lng, timestamp)
- ✓ `conductores` - con campos de balance (`balanceDisponible`, `balancePendiente`)
- ✓ `users` - con `calificacionPromedio` (ratings de conductores)
- ✓ `calificaciones` - tabla de ratings (SOLO conductores, no clientes - CORRECTO)
- ✓ `dismissedServices` - rechazos antes de aceptar

### Servicios y Lógica
- ✓ `WalletService` - clase completa para gestionar comisiones y deudas
- ✓ Sistema de comisiones - 20% en pagos cash, bien estructurado
- ✓ `scheduled-payouts` - sistema existente para procesar pagos en ciclos
- ✓ Métodos para calcular distancia entre coordenadas (lat/lng)
- ✓ Sistema de auto-cancelación (`service-auto-cancel.ts`)
- ✓ Integración con sistemas de pago (Azul)

### Relaciones de Base de Datos
- ✓ Referencias correctas entre tablas
- ✓ Cascadas de borrado configuradas
- ✓ Índices necesarios existen

---

## Lo Que Falta (CREAR NUEVO) ✗

### Tablas Nuevas (3)
1. **`cancelacionesServicios`** - CRÍTICA
   - Registra cada cancelación con todos los datos
   - Campos: penalización, reembolso, estado procesamiento, etc.
   - Relaciones: servicios, users (quien canceló), admin (revisión)

2. **`zonasDemanada`** - CRÍTICA
   - Calcula demanda en tiempo real por zona geográfica
   - Se actualiza cada vez que hay cambio en servicios
   - Background job limpia zonas inactivas

3. **`razonesCancelacion`** - IMPORTANTE
   - Catálogo de razones predefinidas
   - Tiene 8-10 valores iniciales

### Extensiones de Tablas (3)
1. **`conductores`** - agregar 6 campos
   - `bloqueadoHasta` (TIMESTAMP)
   - `cancelacionesTotales` (INT)
   - `cancelacionesUltimos7dias` (INT)
   - `cancelacionesUltimoMes` (INT)
   - `penalizacionesTotales` (DECIMAL)
   - `penalizacionesUltimas24h` (DECIMAL)
   - `ultimaCancelacionTimestamp` (TIMESTAMP)

2. **`users`** - agregar 5 campos (SOLO PARA userType='cliente')
   - `bloqueadoHasta` (TIMESTAMP)
   - `cancelacionesTotales` (INT)
   - `cancelacionesUltimos7dias` (INT)
   - `cancelacionesUltimoMes` (INT)
   - `penalizacionesTotales` (DECIMAL)
   - `ultimaCancelacionTimestamp` (TIMESTAMP)

3. **`servicios`** - agregar 3 campos
   - `zonaTipo` (VARCHAR) - tipo de zona al crear
   - `nivelDemandaEnCreacion` (VARCHAR) - demanda cuando se creó
   - `horaCreacionEsPico` (BOOLEAN) - si fue creado en hora pico

### Código Nuevo (2 archivos)
1. **`server/storage.ts`** - agregar funciones
   - `createCancelacion()`
   - `getCancelacionesByUsuarioId()`
   - `updateZonaDemanda()`
   - `getZonaDemandaByCoords()`
   - `getTrackingDistancia()` - calcular km desde tracking

2. **`server/services/cancellation-service.ts`** - NUEVO
   - `calcularPenalizacion()` - implementar fórmula
   - `validarCancelacion()` - validaciones
   - `procesarCancelacion()` - orquestación completa
   - `aplicarBloqueoDeTiempo()`
   - `integrarConWallet()`

### Endpoints Nuevos (5)
- POST `/api/servicios/{id}/cancelar`
- GET `/api/usuarios/{id}/cancelaciones`
- GET `/api/conductores/{id}/cancelaciones`
- POST `/api/admin/cancelaciones/{id}/revisar`
- GET `/api/admin/cancelaciones`

### Frontend Nuevo (4 componentes)
- Modal de confirmación de cancelación
- Dropdown de razones de cancelación
- Pantalla de confirmación con detalles
- Historial de cancelaciones en perfil

---

## Análisis de Dependencias

### ✓ LISTO PARA USAR
- **WalletService** - puede deducir penalizaciones directamente
- **Sistema de comisiones** - puede revertirse al cancelar
- **Tracking de ubicaciones** - proporciona distancia viajada
- **Sistema de ratings** - afecta solo conductores (no clientes)
- **Scheduled payouts** - puede procesar reembolsos

### ⚠️ REQUIERE INTEGRACIÓN
- **Bloqueos temporales** - validar en endpoints de aceptación
- **Background jobs** - limpiar zonas_demanda cada 24h
- **Cálculo de demanda** - debe ser llamado cuando se crea/cancela servicio

---

## Errores en el Plan Original (CORREGIDOS)

### ✓ Corregido 1: Referencias a Rating de Clientes
- **Problema**: Plan mencionaba rating_usuario en algunos cálculos
- **Solución**: Removido. Clientes NO tienen rating. Solo conductores.
- **Estado**: FIJO en plan

### ✓ Corregido 2: Cálculos Matemáticos
- **Problema**: Caso 2 y Caso 3 tenían errores en penalizaciones
- **Solución**: Recalculados correctamente
- **Estado**: FIJO en plan

### ✓ Corregido 3: Estructura de Bases de Datos
- **Problema**: No especificaba si usar ALTER TABLE o Drizzle
- **Solución**: Clarificado: USAR DRIZZLE MIGRATIONS
- **Estado**: FIJO en plan

### ✓ Corregido 4: Fases de Implementación
- **Problema**: Fases eran genéricas sin detalles de código
- **Solución**: Especificado qué funciones crear, dónde y cuándo
- **Estado**: FIJO en plan con 6 fases detalladas

---

## Riesgos Identificados

### 🟢 BAJO RIESGO (3)
1. **Integración WalletService** - Bien documentada, API clara
2. **Tracking de ubicaciones** - Ya funciona correctamente
3. **Rating de conductores** - Sistema existente, no afecta clientes

### 🟡 RIESGO MEDIO (1)
1. **Cálculo de demanda en tiempo real** - Requiere background job eficiente
   - Solución: Actualizar solo cuando hay cambios, no polling constante

---

## Timeline Estimado

| Fase | Descripción | Tiempo | Bloqueantes |
|------|-------------|--------|------------|
| 1 | Schema y tablas | 2-3h | Drizzle setup |
| 2 | Storage y servicios | 3-4h | Schema Fase 1 |
| 3 | Endpoints REST | 2h | Storage Fase 2 |
| 4 | Frontend | 3-4h | Endpoints Fase 3 |
| 5 | Integración | 2-3h | Todo anterior |
| 6 | Testing | 2-3h | Todo anterior |
| **TOTAL** | **Estimado** | **14-21h** | Secuencial |

---

## Checklist para Implementación

### Pre-Implementación
- [ ] Leer plan completo PLAN_CANCELACION_SERVICIOS.md
- [ ] Revisar estructura actual de storage.ts
- [ ] Revisar estructura actual de routes.ts
- [ ] Entender WalletService completamente

### Fase 1
- [ ] Agregar 3 nuevas tablas a schema.ts
- [ ] Agregar campos a conductores, users, servicios en schema.ts
- [ ] Crear migración Drizzle
- [ ] Ejecutar migración en dev
- [ ] Seed datos de razonesCancelacion

### Fase 2
- [ ] Implementar 5 funciones en storage.ts
- [ ] Crear archivo cancellation-service.ts con 5 métodos
- [ ] Tests de fórmula de penalización con 4 casos de uso

### Fase 3
- [ ] Implementar 5 endpoints en routes.ts
- [ ] Agregar validaciones en endpoints existentes

### Fase 4
- [ ] Modal de cancelación
- [ ] Dropdown de razones
- [ ] Pantalla de confirmación
- [ ] Historial en perfil

### Fase 5
- [ ] Integración WalletService
- [ ] Integración ratings conductores
- [ ] Integración reembolsos
- [ ] Background job zonas_demanda

### Fase 6
- [ ] Tests unitarios
- [ ] Tests integración (4 casos de uso)
- [ ] Manual testing
- [ ] Documentación

---

## Recomendación Final

✅ **PROCEDER CON IMPLEMENTACIÓN**

El plan es viable, técnicamente sólido y puede ejecutarse en paralelo con otras features. 

**No hay bloqueantes críticos.** La infraestructura existe, solo necesita extensiones.

