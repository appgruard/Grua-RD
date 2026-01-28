# SAQ-D PCI DSS v4.0 - ASSANPOS SRL (Grua RD)
# Documento de Respuestas para Cuestionario de Autoevaluacion

**Fecha de Preparacion:** 21 de enero de 2026
**Version PCI DSS:** 4.0

---

## SECCION 1: INFORMACION DE LA EVALUACION

### Parte 1a. Comerciante Evaluado

| Campo | Valor |
|-------|-------|
| Nombre de la Compania | ASSANPOS SRL |
| DBA (actuando comercialmente como) | ASSANPOS / Grua RD |
| Direccion postal de la compania | CARRT. JUAN BOSCH C/ PRINCIPAL #106, CANCA LA REYNA, ESPAILLAT, Republica Dominicana |
| Sitio web principal de la compania | https://gruard.com |
| Nombre del contacto de la compania | Khristopher Tavarez |
| Titulo del contacto de la compania | Propietario / Socio Mayoritario |
| Numero de telefono del contacto | 829-351-9324 |
| Direccion de correo electronico del contacto | admin@fourone.com.do |

### Parte 1b. Evaluador

| Campo | Valor |
|-------|-------|
| Evaluador(es) de Seguridad Interna PCI SSC | N/A - Autoevaluacion interna |
| Nombre de la Compania QSA | No aplicable |

---

## Parte 2. Resumen Ejecutivo

### Parte 2a. Canales de Pago del Comerciante

| Canal | Incluido |
|-------|----------|
| Pedido por correo / por telefono (MOTO) | NO |
| **Comercio electronico** | **SI** |
| Presencial | NO |

**Hay algun canal de pago no incluido en esta evaluacion?** NO

---

### Parte 2b. Descripcion de la Funcion con Tarjetas de Pago

| Canal | Como la Empresa Almacena, Procesa y/o Transmite los Datos del Tarjetahabiente |
|-------|-------------------------------------------------------------------------------|
| Comercio electronico | La plataforma Grua RD es una aplicacion web progresiva (PWA) que permite a los usuarios solicitar servicios de grua en la Republica Dominicana. Los pagos se procesan a traves de la pasarela AZUL con tokenizacion. **Flujo completo:** 1) El cliente ingresa datos de tarjeta en el formulario de pago de la aplicacion web. 2) Los datos se transmiten via HTTPS/TLS 1.3 al servidor de aplicaciones. 3) El servidor envia los datos a la API de AZUL para tokenizacion (DataVault). 4) AZUL devuelve un token seguro que se almacena en la base de datos. 5) Para pagos recurrentes o futuros, solo se usa el token, nunca el PAN. **Datos almacenados localmente:** Solo tokens de AZUL DataVault, ultimos 4 digitos (para visualizacion), marca de tarjeta, fecha de expiracion. **Datos NO almacenados:** PAN completo, CVV/CVC, datos de banda magnetica. |

---

### Parte 2c. Descripcion del Entorno de las Tarjetas de Pago

**Descripcion de alto nivel del entorno cubierto por esta Evaluacion:**

**Arquitectura del Sistema:**
- **Frontend:** Aplicacion React 18 (TypeScript) con Vite, PWA con Capacitor para funcionalidades moviles nativas
- **Backend:** Express.js (Node.js) ejecutandose en contenedor Docker
- **Base de datos:** PostgreSQL (Neon) con Drizzle ORM
- **Hosting:** VPS en Hostinger con CapRover (orquestacion de contenedores Docker)
- **Dominio de produccion:** app.gruard.com (SSL/TLS)
- **Dominio publico:** gruard.com

**Conexiones desde y hacia el CDE:**
1. Cliente (navegador/app) <-> Cloudflare CDN <-> app.gruard.com (puerto 443/HTTPS)
2. app.gruard.com <-> AZUL API (pagos) via mTLS con certificados digitales
3. app.gruard.com <-> PostgreSQL (Neon) via conexion cifrada

**Componentes criticos del sistema dentro del CDE:**
- Servidor de aplicaciones Node.js/Express (contenedor Docker)
- Base de datos PostgreSQL (Neon - servicio gestionado)
- Modulo de pagos AZUL (server/services/azul-payment.ts)
- Almacenamiento de tokens DataVault en tabla client_payment_methods / operator_payment_methods

**Componentes que podrian afectar la seguridad:**
- CapRover (gestion de contenedores)
- Cloudflare (DNS y CDN)
- Certificados mTLS para AZUL (/opt/certificados/gruard/)

**El entorno incluye segmentacion?** SI
- La base de datos PostgreSQL esta en un servicio gestionado separado (Neon)
- El acceso a la API de AZUL requiere certificados mTLS especificos
- El CDE esta aislado en un contenedor Docker dedicado

---

### Parte 2d. Localidades e Instalaciones en el Ambito de Aplicacion

| Tipo de Instalacion | Numero total | Ubicacion(es) |
|---------------------|--------------|---------------|
| VPS (Servidor Virtual) | 1 | Hostinger Cloud, ubicacion del datacenter de Hostinger |
| Base de Datos Gestionada | 1 | Neon PostgreSQL (servicio en la nube) |
| Oficina Administrativa | 1 | CANCA LA REYNA, ESPAILLAT, Republica Dominicana |

---

### Parte 2e. Productos y Soluciones Validados por PCI SSC

| Utiliza productos validados por PCI SSC? | SI |
|------------------------------------------|-----|

| Nombre del Producto | Version | Estandar PCI SSC | Referencia | Fecha Expiracion |
|---------------------|---------|------------------|------------|------------------|
| AZUL Payment Gateway | API v1 | PCI DSS | Proveedor certificado AZUL | Verificar con AZUL |

---

### Parte 2f. Proveedores de Servicios Externos

**Almacenan, procesan o transmiten datos de tarjetahabientes?** SI

**Gestionan componentes del sistema en el ambito PCI DSS?** SI

**Podrian afectar la seguridad del CDE?** SI

| Nombre del Proveedor | Descripcion del Servicio |
|----------------------|--------------------------|
| AZUL (Grupo Financiero Banreservas) | Pasarela de pagos, procesamiento de transacciones con tarjeta, tokenizacion DataVault, autenticacion 3D Secure 2.0 |
| Hostinger | Proveedor de hosting VPS donde se ejecuta el servidor de aplicaciones |
| Neon | Proveedor de base de datos PostgreSQL gestionada |
| Cloudflare | CDN, proteccion DDoS, DNS, certificados SSL |
| Twilio | Servicio SMS para verificacion OTP (no maneja datos de tarjeta) |
| Resend | Servicio de correo electronico transaccional (no maneja datos de tarjeta) |

---

## SECCION 2: CUESTIONARIO DE AUTOEVALUACION

### Fecha de finalizacion de la autoevaluacion: 21-01-2026

---

## REQUISITO 1: Instalar y Mantener los Controles de Seguridad de la Red

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 1.1.1 | Politicas y procedimientos de seguridad de red documentados | **No Implementado** | Pendiente documentar formalmente. Fecha objetivo: 28-02-2026 |
| 1.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente documentar. Fecha objetivo: 28-02-2026 |
| 1.2.1 | Estandares de configuracion de NSC | **Implementado** | CapRover gestiona reglas de firewall del contenedor |
| 1.2.2 | Cambios en red aprobados segun proceso 6.5.1 | **No Implementado** | Pendiente proceso formal de control de cambios. Fecha objetivo: 28-02-2026 |
| 1.2.3 | Diagramas de red precisos | **No Implementado** | Pendiente crear diagrama formal. Fecha objetivo: 15-02-2026 |
| 1.2.4 | Diagramas de flujo de datos | **No Implementado** | Pendiente crear diagrama de flujo CHD. Fecha objetivo: 15-02-2026 |
| 1.2.5 | Servicios, protocolos y puertos identificados | **Implementado** | Solo puertos 443 (HTTPS) y 5432 (PostgreSQL cifrado) en uso |
| 1.2.6 | Configuraciones de seguridad para servicios inseguros | **No Aplicable** | No se utilizan servicios inseguros (HTTP, FTP, Telnet) |
| 1.2.7 | Revision de configuraciones NSC cada 6 meses | **No Implementado** | Pendiente establecer proceso. Fecha objetivo: 28-02-2026 |
| 1.2.8 | Archivos de configuracion NSC asegurados | **Implementado** | Configuraciones gestionadas por CapRover con acceso restringido |
| 1.3.1 | Trafico de entrada al CDE restringido | **Implementado** | Solo trafico HTTPS permitido, Cloudflare filtra el resto |
| 1.3.2 | Trafico de salida del CDE restringido | **Implementado** | Solo conexiones a AZUL API, Neon DB, y servicios autorizados |
| 1.3.3 | NSC entre redes inalambricas y CDE | **No Aplicable** | No se utilizan redes inalambricas para acceso al CDE |
| 1.4.1 | NSC entre redes confiables y no confiables | **Implementado** | Cloudflare y firewall de Hostinger separan redes |
| 1.4.2 | Trafico de entrada a CDE desde redes no confiables restringido | **Implementado** | Cloudflare WAF + firewall |
| 1.4.3 | Anti-spoofing implementado | **Implementado** | Cloudflare proporciona proteccion anti-spoofing |
| 1.4.4 | Datos de tarjetahabientes no almacenados fuera del CDE | **Implementado** | Solo tokens almacenados en DB dentro del CDE |
| 1.4.5 | Divulgacion de direcciones IP internas restringida | **Implementado** | Cloudflare oculta IP real del servidor |
| 1.5.1 | Controles de seguridad en dispositivos de usuarios | **No Aplicable** | No hay dispositivos de empleados conectando al CDE |

---

## REQUISITO 2: Aplicar Configuraciones Seguras a Todos los Componentes del Sistema

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 2.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente documentar. Fecha objetivo: 28-02-2026 |
| 2.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 2.2.1 | Estandares de configuracion desarrollados | **Implementado** | Imagen Docker estandarizada con configuraciones seguras |
| 2.2.2 | Cuentas de proveedor por defecto gestionadas | **Implementado** | Credenciales por defecto cambiadas en todos los sistemas |
| 2.2.3 | Funciones primarias separadas | **Implementado** | Servidor web, DB y pagos en componentes separados |
| 2.2.4 | Solo servicios necesarios habilitados | **Implementado** | Contenedor minimalista solo con servicios requeridos |
| 2.2.5 | Servicios inseguros protegidos si es necesario | **No Aplicable** | No se usan servicios inseguros |
| 2.2.6 | Parametros del sistema configurados seguramente | **Implementado** | Variables de entorno seguras, sin credenciales en codigo |
| 2.2.7 | Acceso no-consola cifrado con criptografia robusta | **Implementado** | Solo SSH con llaves para acceso administrativo |
| 2.3.1 | Puntos de acceso inalambrico gestionados | **No Aplicable** | No hay puntos de acceso inalambrico en el CDE |
| 2.3.2 | Credenciales inalambricas cambiadas | **No Aplicable** | No hay redes inalambricas |

---

## REQUISITO 3: Proteger los Datos de Tarjetahabientes Almacenados

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 3.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente documentar. Fecha objetivo: 28-02-2026 |
| 3.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 3.2.1 | Almacenamiento de datos minimizado | **Implementado** | Solo tokens de AZUL, ultimos 4 digitos, marca y expiracion |
| 3.3.1 | SAD no almacenado despues de autorizacion | **Implementado** | CVV nunca se almacena, solo se transmite a AZUL |
| 3.3.1.1 | Datos de pista completos no almacenados | **No Aplicable** | No hay lectores de tarjeta fisica |
| 3.3.1.2 | CAV2/CVC2/CVV2/CID no almacenados | **Implementado** | CVV solo en memoria durante transaccion, nunca persistido |
| 3.3.1.3 | PIN/bloque de PIN no almacenados | **No Aplicable** | No se procesan transacciones con PIN |
| 3.3.2 | SAD cifrado antes de autorizacion | **Implementado** | Transmision via TLS 1.3 a AZUL, nunca en texto plano |
| 3.3.3 | SAD sensible almacenado solo cuando necesario | **Implementado** | SAD en memoria solo durante procesamiento inmediato |
| 3.4.1 | PAN ilegible donde sea almacenado | **Implementado** | PAN nunca almacenado, solo tokens de AZUL DataVault |
| 3.4.2 | Acceso a datos de claves criptograficas restringido | **Implementado** | Certificados AZUL solo accesibles por proceso de pago |
| 3.5.1 | PAN protegido con criptografia robusta | **No Aplicable** | No se almacena PAN, solo tokens |
| 3.5.1.1 | Hashes usados para hacer PAN ilegible | **No Aplicable** | No se usa hash de PAN, se usa tokenizacion AZUL |
| 3.5.1.2 | Cifrado a nivel de disco/particion | **Implementado** | Neon PostgreSQL usa cifrado en reposo |
| 3.5.1.3 | Cifrado a nivel de campo para proteger PAN | **No Aplicable** | No almacenamos PAN |
| 3.6.1 | Procedimientos de gestion de claves documentados | **No Implementado** | Pendiente documentar. Fecha objetivo: 28-02-2026 |
| 3.6.1.1 | Documentacion para proveedores de servicios | **No Aplicable** | No somos proveedor de servicios |
| 3.7.1-3.7.9 | Gestion de claves criptograficas | **Implementado** | Certificados mTLS gestionados, rotacion anual prevista |

---

## REQUISITO 4: Proteger los Datos con Criptografia Robusta Durante la Transmision

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 4.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente documentar. Fecha objetivo: 28-02-2026 |
| 4.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 4.2.1 | PAN protegido con criptografia robusta en transmision | **Implementado** | TLS 1.3 para todas las comunicaciones |
| 4.2.1.1 | Inventario de claves y certificados | **No Implementado** | Pendiente inventariar. Fecha objetivo: 15-02-2026 |
| 4.2.1.2 | Redes inalambricas que transmiten PAN cifradas | **No Aplicable** | No hay redes inalambricas |
| 4.2.2 | PAN protegido al enviar via mensajeria | **No Aplicable** | PAN nunca se envia via email, chat o SMS |

---

## REQUISITO 5: Proteger Todos los Sistemas y Redes de Software Malicioso

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 5.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 5.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 5.2.1 | Solucion anti-malware desplegada | **Implementado** | Contenedor Linux basado en imagen oficial segura |
| 5.2.2 | Componentes del sistema evaluados para riesgo de malware | **Implementado** | Evaluacion periodica de vulnerabilidades |
| 5.2.3 | Sistemas no comunmente afectados evaluados | **Implementado** | Servidor Linux minimalista, riesgo bajo |
| 5.2.3.1 | Frecuencia de evaluaciones definida | **No Implementado** | Pendiente documentar frecuencia. Fecha objetivo: 28-02-2026 |
| 5.3.1 | Solucion anti-malware actualizada | **Implementado** | Actualizaciones automaticas de dependencias |
| 5.3.2 | Anti-malware realiza escaneos periodicos | **Implementado** | Monitoreo de dependencias con alertas |
| 5.3.2.1 | Frecuencia de escaneos definida | **No Implementado** | Pendiente documentar. Fecha objetivo: 28-02-2026 |
| 5.3.3 | Anti-malware en medios removibles | **No Aplicable** | No se usan medios removibles en el CDE |
| 5.3.4 | Logs de anti-malware habilitados | **Implementado** | Logs de sistema capturan eventos de seguridad |
| 5.3.5 | Anti-malware no puede ser deshabilitado | **Implementado** | No hay interfaz para deshabilitar monitoreo |
| 5.4.1 | Mecanismos anti-phishing desplegados | **Implementado** | Cloudflare protege contra ataques de phishing |

---

## REQUISITO 6: Desarrollar y Mantener Sistemas y Softwares Seguros

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 6.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 6.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 6.2.1 | Software a medida desarrollado de forma segura | **Implementado** | Practicas de codigo seguro, validacion de entradas |
| 6.2.2 | Personal de desarrollo capacitado en seguridad | **No Implementado** | Pendiente capacitacion formal. Fecha objetivo: 31-03-2026 |
| 6.2.3 | Codigo revisado antes de produccion | **Implementado** | Revisiones de codigo en proceso de desarrollo |
| 6.2.3.1 | Revisiones de codigo documentadas | **No Implementado** | Pendiente documentar proceso. Fecha objetivo: 28-02-2026 |
| 6.2.4 | Tecnicas de ingenieria de software seguro | **Implementado** | Uso de ORM (Drizzle), validacion con Zod, sanitizacion |
| 6.3.1 | Vulnerabilidades de seguridad identificadas y gestionadas | **Implementado** | Monitoreo de CVEs en dependencias |
| 6.3.2 | Software de terceros inventariado | **Implementado** | package.json contiene inventario de dependencias |
| 6.3.3 | Software actualizado con parches de seguridad | **Implementado** | Actualizaciones regulares de dependencias npm |
| 6.4.1 | Aplicaciones web protegidas contra ataques | **Implementado** | Validacion de entradas, CSP, XSS proteccion |
| 6.4.2 | Aplicacion WAF para aplicaciones web publicas | **Implementado** | Cloudflare WAF activo |
| 6.4.3 | Scripts de pago gestionados con integridad | **Implementado** | Build de produccion con hashes de integridad |
| 6.5.1 | Cambios gestionados mediante proceso de control | **No Implementado** | Pendiente proceso formal. Fecha objetivo: 28-02-2026 |
| 6.5.2 | Cambios significativos con conformidad PCI DSS confirmada | **No Implementado** | Pendiente proceso. Fecha objetivo: 28-02-2026 |
| 6.5.3 | Entornos de preproduccion separados de produccion | **Implementado** | Entorno de desarrollo separado en Replit |
| 6.5.4 | Datos de produccion no usados en test/desarrollo | **Implementado** | Datos de prueba usados en desarrollo |
| 6.5.5 | Cuentas de prueba eliminadas antes de produccion | **Implementado** | Solo cuentas reales en produccion |
| 6.5.6 | Datos de prueba eliminados antes de produccion | **Implementado** | DB de produccion sin datos de prueba |

---

## REQUISITO 7: Restringir el Acceso a los Componentes del Sistema y Datos

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 7.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 7.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 7.2.1 | Modelo de control de acceso definido | **Implementado** | RBAC con roles: cliente, operador, admin, empresa |
| 7.2.2 | Acceso asignado segun clasificacion de trabajo | **Implementado** | Permisos basados en rol de usuario |
| 7.2.3 | Privilegios requeridos aprobados por personal autorizado | **No Implementado** | Pendiente proceso formal. Fecha objetivo: 28-02-2026 |
| 7.2.4 | Cuentas de usuario revisadas periodicamente | **No Implementado** | Pendiente proceso. Fecha objetivo: 28-02-2026 |
| 7.2.5 | Cuentas de aplicacion gestionadas apropiadamente | **Implementado** | Variables de entorno para credenciales de servicio |
| 7.2.5.1 | Acceso de cuentas de aplicacion revisado | **No Implementado** | Pendiente proceso. Fecha objetivo: 28-02-2026 |
| 7.2.6 | Acceso a repositorios de datos de tarjetahabientes restringido | **Implementado** | Solo proceso de pago accede a tokens |
| 7.3.1 | Sistema de control de acceso implementado | **Implementado** | Passport.js con autenticacion basada en sesion |
| 7.3.2 | Sistema de control de acceso configurado para denegar por defecto | **Implementado** | Rutas protegidas por defecto |
| 7.3.3 | Sistema de control de acceso basado en Rol | **Implementado** | Middleware de autorizacion por rol |

---

## REQUISITO 8: Identificar a los Usuarios y Autenticar el Acceso

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 8.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 8.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 8.2.1 | Todos los usuarios tienen ID unico | **Implementado** | IDs unicos en base de datos |
| 8.2.2 | Cuentas compartidas no permitidas | **Implementado** | Cada usuario tiene cuenta individual |
| 8.2.3 | Cuentas de servicio gestionadas | **Implementado** | Credenciales de servicio en variables de entorno |
| 8.2.4 | Cuentas de usuario agregadas/eliminadas/modificadas apropiadamente | **Implementado** | Panel de administracion para gestion de usuarios |
| 8.2.5 | Cuentas terminadas cuando ya no necesarias | **No Implementado** | Pendiente proceso automatico. Fecha objetivo: 28-02-2026 |
| 8.2.6 | Cuentas inactivas deshabilitadas en 90 dias | **No Implementado** | Pendiente implementar. Fecha objetivo: 28-02-2026 |
| 8.2.7 | Cuentas de terceros gestionadas | **No Aplicable** | No hay acceso de terceros al CDE |
| 8.2.8 | Sesiones inactivas terminadas | **Implementado** | Timeout de sesion configurado |
| 8.3.1 | Autenticacion robusta para usuarios y administradores | **Implementado** | Contrasenas con bcrypt |
| 8.3.2 | Criptografia robusta para credenciales | **Implementado** | bcrypt para hash de contrasenas |
| 8.3.3 | Identidad verificada antes de modificar credenciales | **Implementado** | Verificacion de contrasena actual requerida |
| 8.3.4 | Intentos de autenticacion invalidos limitados | **No Implementado** | Pendiente implementar bloqueo. Fecha objetivo: 15-02-2026 |
| 8.3.5 | Contrasenas con minimo 12 caracteres | **No Implementado** | Actualmente 8 caracteres. Pendiente actualizar. Fecha objetivo: 15-02-2026 |
| 8.3.6 | Contrasenas con complejidad | **Implementado** | Requiere mayusculas, minusculas, numeros |
| 8.3.7 | Contrasenas nuevas no pueden ser iguales a las ultimas 4 | **No Implementado** | Pendiente implementar. Fecha objetivo: 28-02-2026 |
| 8.3.8 | Politicas de autenticacion documentadas | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 8.3.9 | Contrasenas de un solo uso usadas cuando corresponde | **Implementado** | OTP via SMS para verificacion de telefono |
| 8.3.10 | Servicio de autenticacion implementado correctamente | **Implementado** | Passport.js con sesiones seguras |
| 8.3.10.1 | Servicio de autenticacion configurado correctamente | **Implementado** | HTTP-only cookies, secure flag |
| 8.3.11 | Factor de autenticacion protegido fisicamente | **No Aplicable** | No se usan tokens fisicos |
| 8.4.1 | MFA para acceso no-consola al CDE | **No Implementado** | Pendiente implementar MFA. Fecha objetivo: 31-03-2026 |
| 8.4.2 | MFA para acceso remoto al CDE | **No Implementado** | Pendiente MFA para SSH. Fecha objetivo: 31-03-2026 |
| 8.4.3 | MFA resistente a replay | **No Aplicable** | MFA pendiente de implementacion |
| 8.5.1 | Sistemas MFA configurados correctamente | **No Aplicable** | MFA pendiente de implementacion |
| 8.6.1 | Cuentas de sistema interactivas gestionadas | **Implementado** | Credenciales de servicio protegidas |
| 8.6.2 | Contrasenas para cuentas de aplicacion cambiadas periodicamente | **No Implementado** | Pendiente proceso. Fecha objetivo: 28-02-2026 |
| 8.6.3 | Contrasenas para cuentas de aplicacion protegidas | **Implementado** | Almacenadas en variables de entorno seguras |

---

## REQUISITO 9: Restringir el Acceso Fisico a los Datos de Tarjetahabientes

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 9.1.1 | Politicas y procedimientos documentados | **No Probado** | Infraestructura en nube, Hostinger responsable |
| 9.1.2 | Roles y responsabilidades documentados | **No Probado** | Responsabilidad de Hostinger |
| 9.2.1-9.2.4 | Controles fisicos apropiados | **No Probado** | Datacenter de Hostinger - responsabilidad del proveedor |
| 9.3.1-9.3.4 | Acceso fisico autorizado | **No Probado** | Responsabilidad de Hostinger |
| 9.4.1-9.4.7 | Acceso de visitantes controlado | **No Probado** | Responsabilidad de Hostinger |
| 9.5.1 | Dispositivos POI protegidos | **No Aplicable** | No hay dispositivos POI fisicos |

---

## REQUISITO 10: Registrar y Supervisar Todos los Accesos

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 10.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 10.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 10.2.1 | Logs de auditoria habilitados | **Implementado** | Winston logger con logs estructurados |
| 10.2.1.1 | Acceso de usuarios a datos de tarjetahabientes registrado | **Implementado** | Logs de acceso a modulo de pagos |
| 10.2.1.2 | Acciones de usuarios privilegiados registradas | **Implementado** | Acciones de admin logueadas |
| 10.2.1.3 | Acceso a logs de auditoria registrado | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 10.2.1.4 | Intentos de acceso invalidos registrados | **Implementado** | Logs de autenticacion fallida |
| 10.2.1.5 | Cambios en credenciales registrados | **Implementado** | Logs de cambios de contrasena |
| 10.2.1.6 | Nuevos logs detenidos/pausados registrados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 10.2.1.7 | Creacion/eliminacion de objetos registrada | **Implementado** | Logs de operaciones de base de datos |
| 10.2.2 | Logs contienen detalles requeridos | **Implementado** | Timestamp, usuario, tipo de evento, resultado |
| 10.3.1 | Logs protegidos contra modificacion | **Implementado** | Logs en almacenamiento separado |
| 10.3.2 | Logs de auditoria respaldados | **No Implementado** | Pendiente backup automatico. Fecha objetivo: 28-02-2026 |
| 10.3.3 | Logs disponibles para analisis | **Implementado** | Acceso a logs via panel de administracion |
| 10.3.4 | Sincronizacion de tiempo implementada | **Implementado** | Servidores sincronizados via NTP |
| 10.4.1 | Logs revisados diariamente | **No Implementado** | Pendiente proceso. Fecha objetivo: 28-02-2026 |
| 10.4.1.1 | Revisiones automatizadas implementadas | **Implementado** | Sistema de alertas automaticas |
| 10.4.2 | Logs de otros componentes revisados periodicamente | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 10.4.2.1 | Frecuencia de revisiones definida | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 10.4.3 | Excepciones y anomalias atendidas | **Implementado** | Sistema de alertas con tickets automaticos |
| 10.5.1 | Historial de logs retenido por 12 meses | **No Implementado** | Pendiente configurar retencion. Fecha objetivo: 28-02-2026 |
| 10.6.1 | Sincronizacion de tiempo implementada | **Implementado** | NTP configurado |
| 10.6.2 | Datos de tiempo protegidos | **Implementado** | Solo root puede modificar configuracion de tiempo |
| 10.6.3 | Tiempo sincronizado de fuentes confiables | **Implementado** | Servidores NTP publicos |
| 10.7.1 | Fallos de controles de seguridad detectados | **Implementado** | Monitoreo de errores y alertas |
| 10.7.2 | Fallos de controles atendidos rapidamente | **Implementado** | Sistema de tickets automatico |
| 10.7.3 | Fallos de controles documentados | **No Implementado** | Pendiente documentacion. Fecha objetivo: 28-02-2026 |

---

## REQUISITO 11: Poner a Prueba Regularmente la Seguridad

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 11.1.1 | Politicas y procedimientos documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 11.1.2 | Roles y responsabilidades documentados | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 11.2.1 | Puntos de acceso inalambrico detectados | **No Aplicable** | No hay redes inalambricas en el CDE |
| 11.2.2 | Puntos de acceso inalambrico no autorizados gestionados | **No Aplicable** | No hay redes inalambricas |
| 11.3.1 | Vulnerabilidades internas escaneadas trimestralmente | **No Implementado** | Pendiente contratar servicio. Fecha objetivo: 31-03-2026 |
| 11.3.1.1 | Vulnerabilidades de alto riesgo atendidas | **No Implementado** | Pendiente proceso. Fecha objetivo: 31-03-2026 |
| 11.3.1.2 | Escaneos autenticados realizados | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 11.3.1.3 | Escaneos internos despues de cambios | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 11.3.2 | Escaneos externos ASV trimestrales | **No Implementado** | Pendiente contratar ASV. Fecha objetivo: 31-03-2026 |
| 11.3.2.1 | Escaneos externos despues de cambios | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 11.4.1 | Pruebas de penetracion realizadas anualmente | **No Implementado** | Pendiente contratar servicio. Fecha objetivo: 30-06-2026 |
| 11.4.2 | Pruebas de penetracion internas realizadas | **No Implementado** | Pendiente. Fecha objetivo: 30-06-2026 |
| 11.4.3 | Pruebas de penetracion externas realizadas | **No Implementado** | Pendiente. Fecha objetivo: 30-06-2026 |
| 11.4.4 | Vulnerabilidades encontradas corregidas | **Implementado** | Proceso de correccion activo |
| 11.4.5 | Pruebas de segmentacion realizadas | **No Implementado** | Pendiente. Fecha objetivo: 30-06-2026 |
| 11.4.6 | Pruebas de segmentacion de proveedores | **No Aplicable** | No somos proveedor de servicios |
| 11.5.1 | Mecanismos de deteccion de cambios implementados | **Implementado** | Monitoreo de integridad de archivos via Git |
| 11.5.1.1 | Mecanismos de deteccion de cambios a archivos criticos | **Implementado** | Alertas de cambios en configuracion |
| 11.5.2 | Mecanismos de deteccion de intrusiones | **No Implementado** | Pendiente implementar IDS. Fecha objetivo: 30-06-2026 |
| 11.6.1 | Mecanismos de deteccion de cambios en paginas de pago | **Implementado** | SRI (Subresource Integrity) y CSP implementados |

---

## REQUISITO 12: Respaldar la Seguridad de la Informacion con Politicas

| Req | Descripcion | Respuesta | Justificacion |
|-----|-------------|-----------|---------------|
| 12.1.1 | Politica de seguridad de la informacion establecida | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 12.1.2 | Politica revisada anualmente | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 12.1.3 | Politica define roles de seguridad | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 12.1.4 | Responsabilidad de seguridad asignada a CISO | **No Implementado** | Pendiente asignar rol. Fecha objetivo: 28-02-2026 |
| 12.2.1 | Politicas de uso aceptable documentadas | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 12.3.1 | Analisis de riesgo documentado | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 12.3.2 | Analisis de riesgo revisado anualmente | **No Implementado** | Pendiente. Fecha objetivo: anual |
| 12.3.3 | Criptografia revisada anualmente | **No Implementado** | Pendiente. Fecha objetivo: anual |
| 12.3.4 | Revision de hardware y software anual | **No Implementado** | Pendiente. Fecha objetivo: anual |
| 12.4.1 | Cumplimiento PCI DSS confirmado trimestralmente | **No Implementado** | Pendiente proceso. Fecha objetivo: trimestral |
| 12.4.2 | Revisiones documentadas | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 12.4.2.1 | Revisiones de proveedores de servicios documentadas | **No Aplicable** | No somos proveedor de servicios |
| 12.5.1 | Inventario de datos de tarjetahabientes mantenido | **Implementado** | Solo tokens en tablas payment_methods |
| 12.5.2 | Alcance PCI DSS documentado | **Implementado** | Documentado en este SAQ |
| 12.5.2.1 | Alcance revisado anualmente | **No Implementado** | Pendiente. Fecha objetivo: anual |
| 12.5.3 | Cambios significativos revisados para impacto PCI | **No Implementado** | Pendiente proceso. Fecha objetivo: 28-02-2026 |
| 12.6.1 | Programa de concientizacion de seguridad establecido | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 12.6.2 | Programa revisado anualmente | **No Implementado** | Pendiente. Fecha objetivo: anual |
| 12.6.3 | Personal entrenado en seguridad | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 12.6.3.1 | Entrenamiento incluye amenazas relevantes | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 12.6.3.2 | Personal reconoce politica | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 12.7.1 | Personal potencial investigado | **No Implementado** | Pendiente proceso. Fecha objetivo: 28-02-2026 |
| 12.8.1 | Lista de proveedores de servicios mantenida | **Implementado** | Documentado en Parte 2f |
| 12.8.2 | Acuerdo escrito con proveedores | **No Implementado** | Pendiente formalizar. Fecha objetivo: 28-02-2026 |
| 12.8.3 | Proceso de involucramiento de proveedores | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 12.8.4 | Estado PCI DSS de proveedores monitoreado | **No Implementado** | Pendiente verificar AOC de AZUL. Fecha objetivo: 28-02-2026 |
| 12.8.5 | Responsabilidades PCI DSS de proveedores documentadas | **No Implementado** | Pendiente. Fecha objetivo: 28-02-2026 |
| 12.9.1 | Proveedores reconocen responsabilidades | **No Aplicable** | No somos proveedor de servicios |
| 12.9.2 | Proveedores de servicios apoyan investigaciones | **No Aplicable** | No somos proveedor de servicios |
| 12.10.1 | Plan de respuesta a incidentes documentado | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 12.10.2 | Plan de respuesta revisado anualmente | **No Implementado** | Pendiente. Fecha objetivo: anual |
| 12.10.3 | Personal designado disponible 24/7 | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 12.10.4 | Personal entrenado en respuesta a incidentes | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 12.10.4.1 | Frecuencia de entrenamiento definida | **No Implementado** | Pendiente. Fecha objetivo: 31-03-2026 |
| 12.10.5 | Plan de respuesta incluye alertas de monitoreo | **Implementado** | Sistema de alertas automatico |
| 12.10.6 | Plan de respuesta modificado basado en lecciones | **No Implementado** | Pendiente. Fecha objetivo: continuo |
| 12.10.7 | Procedimientos de respuesta para deteccion de PAN | **Implementado** | Proceso para eliminar PAN si se detecta almacenamiento |

---

## ANEXO A: REQUISITOS ADICIONALES DE PCI DSS

### Anexo A1: Proveedores de Servicios Multiusuario
**Respuesta:** No Aplicable
**Justificacion:** ASSANPOS SRL no es un proveedor de servicios multiusuario.

### Anexo A2: Entidades que Utilizan SSL/Primeras Versiones de TLS para POS POI
**Respuesta:** No Aplicable
**Justificacion:** No hay terminales POS POI fisicos. Solo comercio electronico via API.

### Anexo A3: Validacion Complementaria de Entidades Designadas (DESV)
**Respuesta:** No Aplicable
**Justificacion:** No somos una entidad designada por marcas de pago.

---

## ANEXO D: EXPLICACION DE REQUISITOS NO APLICABLES

| Requisito | Justificacion |
|-----------|---------------|
| 1.2.6 | No se utilizan servicios, protocolos o puertos inseguros |
| 1.3.3 | No hay redes inalambricas en el CDE |
| 1.5.1 | No hay dispositivos de empleados conectando directamente al CDE |
| 2.2.5 | No se usan servicios inseguros |
| 2.3.1 | No hay puntos de acceso inalambrico |
| 2.3.2 | No hay redes inalambricas |
| 3.3.1.1 | No hay lectores de tarjeta fisica, no se procesan datos de pista |
| 3.3.1.3 | No se procesan transacciones con PIN |
| 3.5.1 | No se almacena PAN, solo tokens de AZUL DataVault |
| 3.5.1.1 | No se usa hash de PAN |
| 3.5.1.3 | No almacenamos PAN |
| 3.6.1.1 | No somos proveedor de servicios |
| 4.2.1.2 | No hay redes inalambricas que transmitan datos de tarjetahabiente |
| 4.2.2 | PAN nunca se envia via email, mensajeria o SMS |
| 8.2.7 | No hay acceso de terceros al CDE |
| 8.3.11 | No se utilizan tokens de autenticacion fisicos |
| 8.4.3 | MFA pendiente de implementacion |
| 8.5.1 | MFA pendiente de implementacion |
| 9.5.1 | No hay dispositivos POI fisicos |
| 11.2.1 | No hay redes inalambricas en el CDE |
| 11.2.2 | No hay redes inalambricas |
| 11.4.6 | No somos proveedor de servicios |
| 12.4.2.1 | No somos proveedor de servicios |
| 12.9.1 | No somos proveedor de servicios |
| 12.9.2 | No somos proveedor de servicios |
| Anexo A1 | No somos proveedor de servicios multiusuario |
| Anexo A2 | No hay terminales POS POI fisicos |
| Anexo A3 | No somos entidad designada |

---

## ANEXO E: EXPLICACION DE REQUISITOS NO PROBADOS

| Requisito | Justificacion |
|-----------|---------------|
| 9.1.1 - 9.4.7 | Controles fisicos son responsabilidad del proveedor de hosting (Hostinger). Se recomienda solicitar AOC o evidencia de cumplimiento PCI DSS de Hostinger. |

---

## SECCION 3: DETALLES DE VALIDACION Y CERTIFICACION

### Parte 3. Validacion PCI DSS

**Tipo de Evaluacion:**
- [X] Cuestionario de Autoevaluacion (SAQ D)

**Estado de Conformidad:**
- [ ] Conforme - Todos los requisitos implementados
- [X] No Conforme - Requisitos pendientes de implementacion

**Requisitos con fecha de remediacion:**
- Documentacion de politicas y procedimientos: 28-02-2026
- Diagramas de red y flujo de datos: 15-02-2026
- Implementacion MFA: 31-03-2026
- Escaneos de vulnerabilidades ASV: 31-03-2026
- Pruebas de penetracion: 30-06-2026

### Parte 3a. Certificacion del Comerciante

ASSANPOS SRL, identificado como comerciante, declara que el estado de conformidad PCI DSS del comerciante es el indicado arriba y se determino en la fecha indicada.

**Firma del Funcionario Ejecutivo del Comerciante:** ________________________

**Nombre del Funcionario Ejecutivo:** Khristopher Tavarez

**Cargo:** Propietario / Socio Mayoritario

**Fecha:** 21-01-2026

**Sello de la Empresa:** ________________________

---

## PARTE 4: PLAN DE ACCION PARA REQUISITOS NO CONFORMES

| Requisito | Descripcion | Fecha Objetivo | Responsable |
|-----------|-------------|----------------|-------------|
| 1.1.1, 1.1.2 | Documentar politicas de seguridad de red | 28-02-2026 | Admin |
| 1.2.3, 1.2.4 | Crear diagramas de red y flujo de datos | 15-02-2026 | Admin |
| 8.3.4 | Implementar bloqueo por intentos fallidos | 15-02-2026 | Desarrollo |
| 8.3.5 | Actualizar requisito de contrasena a 12 caracteres | 15-02-2026 | Desarrollo |
| 8.4.1, 8.4.2 | Implementar MFA | 31-03-2026 | Desarrollo |
| 11.3.1, 11.3.2 | Contratar servicio de escaneo ASV | 31-03-2026 | Admin |
| 11.4.1-11.4.5 | Contratar pruebas de penetracion | 30-06-2026 | Admin |
| 12.1.1 | Establecer politica de seguridad de informacion | 28-02-2026 | Admin |
| 12.10.1 | Documentar plan de respuesta a incidentes | 31-03-2026 | Admin |

---

*Documento preparado para ASSANPOS SRL - Plataforma Grua RD*
*Fecha de generacion: 21 de enero de 2026*
