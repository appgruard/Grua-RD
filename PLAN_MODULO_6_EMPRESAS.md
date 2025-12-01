# Plan de Implementación - Módulo 6: Empresas/Contratos Empresariales

## 📋 Estado Actual (Turn 1 - Completado)
- ✅ Schema actualizado con 9 nuevas tablas y enums para empresas
- ✅ Tipos TypeScript definidos para todas las entidades
- ✅ Migración SQL creada y ejecutada exitosamente
- ✅ Todas las tablas creadas con índices de optimización

## 🎯 Objetivo
Implementar un portal empresarial completo que permita a constructoras, ferreterías, empresas de logística, etc., gestionar servicios de grúa con:
- Panel administrativo por empresa
- Gestión de empleados y permisos
- Contratos por hora/día/mes/servicio
- Proyectos/obras con seguimiento de gastos
- Solicitudes de servicios programados
- Facturación mensual automática
- Conductores asignados por prioridad
- Reportes y estadísticas

## 📊 Tareas Pendientes (Turnos 2-3)

### Turn 2: Backend (Storage + Routes)
**Objetivo:** Implementar toda la lógica del servidor

#### Tarea 2.1: Extender `server/storage.ts` (200 líneas)
```typescript
Funciones CRUD para:
- Empresas (crear, actualizar, obtener, listar, verificar)
- Empleados (agregar, actualizar roles, listar por empresa)
- Contratos (crear, actualizar, listar, calcular utilización)
- Proyectos (crear, actualizar, obtener gasto)
- Servicios Programados (crear, actualizar estado, listar)
- Tarifas Especiales (crear, actualizar, listar)
- Conductores Asignados (asignar, desasignar)
- Facturas (crear, generar, actualizar estado)
```

#### Tarea 2.2: Agregar Rutas API en `server/routes.ts` (400 líneas)
```
POST/GET   /api/empresa/profile          - Gestión de perfil empresa
POST/GET   /api/empresa/empleados        - Gestión de empleados
POST/GET   /api/empresa/contratos        - Gestión de contratos
POST/GET   /api/empresa/proyectos        - Gestión de proyectos
POST/GET   /api/empresa/solicitudes      - Solicitudes programadas
POST/GET   /api/empresa/tarifas          - Tarifas especiales
POST/GET   /api/empresa/conductores      - Conductores asignados
POST/GET   /api/empresa/facturas         - Facturación
GET        /api/empresa/dashboard        - Dashboard con KPIs
GET        /api/empresa/reportes         - Reportes mensuales
```

### Turn 3: Frontend (Layout + Páginas)
**Objetivo:** Crear interfaz completa del portal empresarial

#### Tarea 3.1: EmpresaLayout (`client/src/components/layout/EmpresaLayout.tsx`)
- Sidebar con navegación a 9 secciones
- Header con nombre empresa y usuario actual
- Tema consistente con branding Grúa RD

#### Tarea 3.2: Páginas Empresariales (8-10 páginas)
```
client/src/pages/empresa/
├── dashboard.tsx              - KPIs, servicios activos, facturas pendientes
├── solicitudes.tsx            - Crear/ver solicitudes programadas
├── historial.tsx              - Historial de servicios completados
├── proyectos.tsx              - Listar/crear proyectos
├── contratos.tsx              - Gestión de contratos
├── facturacion.tsx            - Facturas, pagos, reportes
├── empleados.tsx              - Gestión de empleados y permisos
├── conductores.tsx            - Conductores asignados
└── perfil.tsx                 - Perfil empresa, datos, límite crédito
```

#### Tarea 3.3: Rutas en `App.tsx`
- Registrar nuevas rutas `/empresa/*`
- Agregar lógica de redirección para usuario tipo "empresa"
- Proteger rutas con ProtectedRoute

#### Tarea 3.4: Admin: Gestión de Empresas
- Nueva sección en `/admin/empresas`
- Listar todas las empresas
- Verificar/rechazar empresas
- Ver detalles y estadísticas
- Asignar conductores globales

## 🔄 Flujo de Trabajo Recomendado

### Turn 2 (Backend):
1. Leer `server/storage.ts` completo para entender estructura
2. Agregar interfaces de storage para Empresas (150 líneas)
3. Agregar 20+ funciones CRUD en storage.ts
4. Agregar ~15 rutas API en routes.ts
5. Importar nuevas tablas en storage.ts

### Turn 3 (Frontend):
1. Crear `EmpresaLayout.tsx` basado en `AdminLayout.tsx`
2. Crear carpeta `client/src/pages/empresa/` con dashboard principal
3. Crear páginas básicas (al menos dashboard + solicitudes + perfil)
4. Registrar rutas en `App.tsx`
5. Agregar `/admin/empresas` para gestión desde admin

## ✅ Criterios de Aceptación

### Funcionalidad Mínima Viable:
- ✅ Portal empresarial accesible para usuarios tipo "empresa"
- ✅ Crear/ver/editar empresa
- ✅ Panel de control con estadísticas básicas
- ✅ Crear solicitudes de servicios programados
- ✅ Ver historial de servicios
- ✅ Gestión básica de empleados
- ✅ Ver facturas generadas

### Opcional (si queda tiempo):
- Contratos avanzados con cálculo de utilización
- Proyectos con seguimiento de presupuesto
- Tarifas especiales por volumen
- Reportes mensuales automáticos
- Conductores asignados con prioridades

## 📱 Data Model
```
Empresa (1) ──── (N) Empleados
Empresa (1) ──── (N) Contratos
Empresa (1) ──── (N) Proyectos
Empresa (1) ──── (N) Servicios Programados
Empresa (1) ──── (N) Facturas
Empresa (1) ──── (N) Conductores Asignados
Empresa (1) ──── (N) Tarifas Especiales
```

## 🛠️ Stack Tecnológico
- Backend: Express.js + TypeScript + Drizzle ORM
- Frontend: React 18 + TypeScript + TanStack Query + Wouter
- Database: PostgreSQL (Neon)
- UI: shadcn/ui + Tailwind CSS

## 🚀 Implementación Rápida

### Turn 2 - Prioridad Alta:
1. Storage.ts: 200 líneas de CRUD básico
2. Routes.ts: 15-20 rutas API esenciales

### Turn 3 - Prioridad Alta:
1. EmpresaLayout.tsx (100 líneas)
2. DashboardEmpresa.tsx (200 líneas)
3. App.tsx actualizado con rutas empresa
4. AdminEmpresasDashboard.tsx (100 líneas)

## 📝 Notas Importantes
- Las tablas ya están creadas en la base de datos
- El schema TypeScript está listo
- Usar patrones existentes de Aseguradora/Socio como referencia
- Mantener consistencia visual con Grúa RD branding
- Implementar data-testid en todos los elementos interactivos

## 🎯 Finish Line
Después de Turn 3, el módulo debe tener:
- ✅ Backend completamente funcional
- ✅ Frontend con navegación principal
- ✅ Panel admin para gestionar empresas
- ✅ Al menos 3 páginas operacionales
- ✅ Flujo de usuario de principio a fin
- ✅ Aplicación lista para testing

## 📅 Estimación de Líneas de Código
- Storage.ts: +200 líneas
- Routes.ts: +400 líneas
- EmpresaLayout.tsx: +100 líneas
- Dashboard + Páginas: +800 líneas
- App.tsx + Admin: +50 líneas
- **Total: ~1,550 líneas de código nuevo**

**Con optimizaciones y parallelismo: Alcanzable en 2 turnos (Turn 2 backend, Turn 3 frontend)**
