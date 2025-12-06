# Plan de Implementacion: Sistema de Notificaciones por Correo

## Resumen Ejecutivo

Este documento describe el plan para implementar un sistema completo de notificaciones por correo electronico para GruaRD, cubriendo multiples casos de uso relacionados con tickets de soporte, registro de usuarios, socios y administradores.

---

## Estado Actual del Sistema

### Infraestructura de Email
- **Servicio**: Resend (ya configurado con secrets `RESEND_API_KEY` y `RESEND_FROM_EMAIL`)
- **Archivo principal**: `server/email-service.ts`
- **Direcciones de correo disponibles**:
  - `verification@gruard.com` - Para codigos OTP y verificaciones
  - `support@gruard.com` - Para tickets de soporte y respuestas del equipo
  - `info@gruard.com` - Para informaciones generales, bienvenidas y comunicaciones corporativas
- **Funciones existentes**:
  - `sendEmail()` - Envio general
  - `sendOTPEmail()` - Codigos de verificacion
  - `sendWelcomeEmail()` - Bienvenida basica
  - `sendServiceNotification()` - Notificaciones de servicio
  - `sendPasswordResetEmail()` - Recuperacion de contrasena
  - `sendDocumentApprovalEmail()` - Aprobacion de documentos

### Sistema de Tickets de Soporte
- **Ubicacion**: `client/src/pages/support.tsx`, `client/src/pages/admin/tickets.tsx`
- **Schema**: Tabla `tickets` con estados: `abierto`, `en_proceso`, `resuelto`, `cerrado`
- **Categorias**: problema_tecnico, consulta_servicio, queja, sugerencia, problema_pago, otro
- **Mensajes**: Tabla `mensajes_ticket` para conversaciones
- **Endpoints existentes**: `/api/tickets`, `/api/tickets/:id`, `/api/tickets/:id/mensaje`

### Sistema de Usuarios
- **Tipos de usuario**: `cliente`, `conductor` (operador), `admin`, `aseguradora`, `socio`, `empresa`
- **Registro**: A traves de onboarding wizard (`/auth/onboarding-wizard`)
- **Verificacion**: OTP por email

### Sistema de Socios
- **Ubicacion**: `client/src/pages/admin/socios.tsx`
- **Funcion existente**: Creacion de socios desde panel admin con email y contrasena
- **Falta**: Envio de email al crear socio

### Sistema de Administradores
- **Estado actual**: NO existe un sistema de usuarios de administracion con permisos granulares
- **Tipo actual**: Solo existe `userType: "admin"` sin permisos por modulo

---

## Casos de Uso a Implementar

### CASO 1: Notificaciones de Tickets de Soporte

#### 1.1 Email al crear un ticket
- **Trigger**: Cliente crea un nuevo ticket
- **Destinatario**: Cliente que creo el ticket
- **Remitente**: support@gruard.com
- **Contenido**:
  - Numero de ticket
  - Titulo y descripcion
  - Categoria y prioridad
  - Estado inicial (abierto)
  - Tiempo estimado de respuesta segun prioridad

#### 1.2 Email de cambio de estado del ticket
- **Trigger**: Estado del ticket cambia (abierto -> en_proceso -> resuelto -> cerrado)
- **Destinatario**: Cliente propietario del ticket
- **Remitente**: support@gruard.com
- **Contenido**:
  - Nuevo estado
  - Mensaje contextual segun el estado
  - Enlace para ver el ticket

#### 1.3 Email de respuesta del equipo de soporte
- **Trigger**: Staff responde al ticket
- **Destinatario**: Cliente propietario del ticket
- **Remitente**: support@gruard.com
- **Contenido**:
  - Numero de ticket
  - Mensaje del equipo de soporte
  - Enlace para responder

### CASO 2: Registro de Operadores (Conductores)

#### 2.1 Email de agradecimiento al registrarse
- **Trigger**: Operador completa el registro
- **Destinatario**: Nuevo operador
- **Remitente**: info@gruard.com
- **Contenido**:
  - Agradecimiento por unirse al equipo
  - Proximos pasos (verificacion de documentos)
  - Beneficios de ser operador GruaRD
  - Informacion sobre comisiones (80% operador / 20% empresa)
  - Canales de soporte
  - Tips para maximizar ingresos

### CASO 3: Registro de Clientes

#### 3.1 Email de bienvenida al registrarse
- **Trigger**: Cliente completa el registro
- **Destinatario**: Nuevo cliente
- **Remitente**: info@gruard.com
- **Contenido** (conciso):
  - Agradecimiento por usar GruaRD
  - Como solicitar un servicio
  - Metodos de pago disponibles
  - Numero de contacto para emergencias
  - Enlace a la app

### CASO 4: Creacion de Socios desde Panel Admin

#### 4.1 Verificar/Crear funcion de creacion de socios
- **Estado actual**: La funcion existe en `/api/admin/socios` (POST)
- **Accion**: Agregar envio de email automatico

#### 4.2 Email de bienvenida al socio
- **Trigger**: Admin crea un nuevo socio
- **Destinatario**: Nuevo socio
- **Remitente**: info@gruard.com
- **Contenido**:
  - Bienvenida como socio/inversor
  - Credenciales de acceso (usuario: su email)
  - Enlace para cambiar contrasena obligatorio
  - Informacion sobre su participacion
  - Acceso al dashboard de distribuciones

### CASO 5: Primer Inicio de Sesion de Socios

#### 5.1 Email de primer inicio de sesion
- **Trigger**: Socio inicia sesion por primera vez
- **Destinatario**: Socio
- **Remitente**: info@gruard.com
- **Contenido**:
  - Agradecimiento por ser parte del equipo inversor
  - Recordatorio de cambiar contrasena si no lo ha hecho
  - Informacion sobre el dashboard de socio
  - Calendario de distribuciones
  - Canales de comunicacion

#### 5.2 Implementacion tecnica
- **Nuevo campo requerido**: `primerInicioSesion: boolean` en tabla `socios`
- **Logica**: Detectar cuando `primerInicioSesion = true` al hacer login

### CASO 6: Sistema de Usuarios de Administracion con Permisos

#### 6.1 Crear tabla de administradores
```typescript
// Nuevo schema a crear
export const adminPermisosEnum = pgEnum("admin_permisos", [
  "dashboard",
  "usuarios",
  "operadores",
  "servicios",
  "tarifas",
  "documentos",
  "tickets",
  "socios",
  "aseguradoras",
  "empresas",
  "finanzas",
  "configuracion",
  "admin_usuarios"  // Permiso para gestionar otros admins
]);

export const administradores = pgTable("administradores", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  permisos: text("permisos").array(),  // Array de modulos permitidos
  activo: boolean("activo").default(true),
  creadoPor: varchar("creado_por").references(() => users.id),
  primerInicioSesion: boolean("primer_inicio_sesion").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```

#### 6.2 Crear pagina de gestion de administradores
- **Ubicacion**: `/admin/administradores`
- **Funcionalidad**:
  - Lista de administradores existentes
  - Crear nuevo administrador
  - Editar permisos por modulo
  - Activar/Desactivar administradores

#### 6.3 Email de bienvenida al administrador
- **Trigger**: Admin crea un nuevo usuario de administracion
- **Destinatario**: Nuevo administrador
- **Remitente**: info@gruard.com
- **Contenido**:
  - Bienvenida al equipo de GruaRD
  - Credenciales de acceso
  - Enlace para cambiar contrasena
  - Modulos a los que tiene acceso
  - Reglamento interno:
    - Confidencialidad de datos
    - Uso apropiado del sistema
    - Politicas de seguridad
    - Contacto de TI para soporte
  - Instrucciones basicas de uso

---

## Arquitectura Tecnica

### Nuevas Funciones en email-service.ts

```typescript
// Tickets
sendTicketCreatedEmail(email, ticket): Promise<boolean>
sendTicketStatusChangedEmail(email, ticket, oldStatus, newStatus): Promise<boolean>
sendTicketSupportResponseEmail(email, ticket, mensaje): Promise<boolean>

// Registro
sendOperatorWelcomeEmail(email, nombre): Promise<boolean>
sendClientWelcomeEmail(email, nombre): Promise<boolean>

// Socios
sendSocioCreatedEmail(email, nombre, tempPassword): Promise<boolean>
sendSocioFirstLoginEmail(email, nombre): Promise<boolean>

// Administradores
sendAdminCreatedEmail(email, nombre, permisos, tempPassword): Promise<boolean>
```

### Modificaciones en Backend (server/routes.ts)

1. **POST /api/tickets** - Agregar envio de email al crear ticket
2. **PUT /api/tickets/:id/estado** - Agregar envio de email al cambiar estado
3. **POST /api/tickets/:id/mensaje** - Agregar envio de email cuando responde staff
4. **POST /api/auth/register** - Modificar para enviar email segun tipo de usuario
5. **POST /api/admin/socios** - Agregar envio de email al crear socio
6. **POST /api/auth/login** - Detectar primer inicio de sesion de socios
7. **POST /api/admin/administradores** - Nueva ruta para crear admins
8. **GET /api/admin/administradores** - Nueva ruta para listar admins
9. **PUT /api/admin/administradores/:id** - Nueva ruta para editar permisos

### Nuevos Componentes Frontend

1. **client/src/pages/admin/administradores.tsx** - Gestion de administradores
2. Modificar **AdminLayout.tsx** - Respetar permisos por modulo

---

## Dependencias y Consideraciones

### Migracion de Base de Datos
1. Agregar campo `primerInicioSesion` a tabla `socios`
2. Crear tabla `administradores` con permisos
3. Migrar usuarios admin existentes a nueva tabla

### Seguridad
- Generacion de contrasenas temporales seguras
- Forzar cambio de contrasena en primer login para socios y admins
- Validacion de permisos en cada endpoint admin

### Rendimiento
- Las funciones de email son asincronas y no bloquean las respuestas
- Considerar implementar cola de emails para alto volumen

---

## Orden de Implementacion Sugerido

### Fase 1: Notificaciones de Tickets (Prioridad Alta) - COMPLETADA
1. ~~Crear funciones de email para tickets~~ - HECHO
   - `sendTicketCreatedEmail()` - Envia email al crear ticket
   - `sendTicketStatusChangedEmail()` - Envia email al cambiar estado
   - `sendTicketSupportResponseEmail()` - Envia email cuando staff responde
2. ~~Integrar en endpoints existentes de tickets~~ - HECHO
   - POST /api/tickets - Email al usuario al crear ticket
   - PUT /api/admin/tickets/:id/estado - Email al cambiar estado
   - POST /api/tickets/:id/mensaje - Email cuando staff responde
3. Probar flujo completo - Pendiente test manual

### Fase 2: Emails de Registro (Prioridad Alta) - COMPLETADA
1. ~~Mejorar email de bienvenida para clientes~~ - HECHO
   - `sendClientWelcomeEmail()` - Email detallado con instrucciones de uso, metodos de pago y linea de emergencia
2. ~~Crear email de bienvenida para operadores~~ - HECHO
   - `sendOperatorWelcomeEmail()` - Email con proximos pasos, beneficios (80% comision), tips para maximizar ingresos
3. ~~Integrar en flujo de registro~~ - HECHO
   - POST /api/auth/register - Envia email segun tipo de usuario (cliente o conductor)

### Fase 3: Sistema de Socios (Prioridad Media)
1. Agregar campo `primerInicioSesion`
2. Crear email de creacion de socio
3. Crear email de primer inicio de sesion
4. Integrar en flujos existentes

### Fase 4: Sistema de Administradores (Prioridad Media)
1. Crear schema de administradores
2. Crear endpoints CRUD
3. Crear pagina de gestion
4. Implementar control de permisos en frontend
5. Crear email de bienvenida a admins

---

## Estimacion de Esfuerzo

| Componente | Estimacion |
|------------|------------|
| Funciones de email (8 nuevas) | 2-3 horas |
| Integracion en tickets | 1-2 horas |
| Integracion en registro | 1 hora |
| Sistema de socios | 2 horas |
| Schema administradores | 1 hora |
| Backend administradores | 2-3 horas |
| Frontend administradores | 3-4 horas |
| Control de permisos | 2-3 horas |
| Testing | 2-3 horas |
| **Total estimado** | **16-22 horas** |

---

## Proximos Pasos

**Esperar instrucciones del usuario para:**
1. Confirmar alcance y prioridades
2. Aprobar diseno de permisos de administradores
3. Definir contenido exacto de emails si hay preferencias especificas
4. Comenzar implementacion por fases
