# Diagrama de Arquitectura PCI DSS - Grua RD (ASSANPOS SRL)

## Diagrama de Red y Flujo de Datos de Tarjetahabiente

```
+-----------------------------------------------------------------------------------+
|                              INTERNET (Red Publica)                               |
+-----------------------------------------------------------------------------------+
                                        |
                                        | HTTPS/TLS 1.3
                                        v
+-----------------------------------------------------------------------------------+
|                              CLOUDFLARE (CDN/WAF)                                 |
|  - Proteccion DDoS                                                                |
|  - Web Application Firewall                                                       |
|  - Certificado SSL/TLS                                                            |
|  - Anti-spoofing                                                                  |
|  - Oculta IP real del servidor                                                    |
+-----------------------------------------------------------------------------------+
                                        |
                                        | HTTPS (Proxy Inverso)
                                        v
+-----------------------------------------------------------------------------------+
|                         VPS HOSTINGER (Servidor Dedicado)                         |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                         CAPROVER (Orquestacion Docker)                      |  |
|  |                                                                             |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                    CONTENEDOR: app.gruard.com                         |  |  |
|  |  |                    (Entorno de Datos de Tarjetahabiente - CDE)        |  |  |
|  |  |                                                                       |  |  |
|  |  |  +---------------------------+  +---------------------------+         |  |  |
|  |  |  |   FRONTEND (React/Vite)   |  |   BACKEND (Express.js)    |         |  |  |
|  |  |  |                           |  |                           |         |  |  |
|  |  |  |  - Formulario de pago     |  |  - API de pagos           |         |  |  |
|  |  |  |  - Ingreso de tarjeta     |  |  - azul-payment.ts        |         |  |  |
|  |  |  |  - Validacion de datos    |  |  - Tokenizacion           |         |  |  |
|  |  |  |  - 3DS Challenge UI       |  |  - 3D Secure 2.0          |         |  |  |
|  |  |  +---------------------------+  +---------------------------+         |  |  |
|  |  |               |                            |                          |  |  |
|  |  |               | Datos de tarjeta           | mTLS + HTTPS             |  |  |
|  |  |               | (en memoria)               |                          |  |  |
|  |  |               v                            v                          |  |  |
|  |  |  +---------------------------+  +---------------------------+         |  |  |
|  |  |  |  CERTIFICADOS AZUL mTLS   |  |   LOGS (Winston)          |         |  |  |
|  |  |  |  /etc/azul/certs/         |  |   - Registro de accesos   |         |  |  |
|  |  |  |  - app.gruard.com.crt     |  |   - Eventos de pago       |         |  |  |
|  |  |  |  - app.gruard.com.key     |  |   - Errores del sistema   |         |  |  |
|  |  |  +---------------------------+  +---------------------------+         |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
        |                                       |
        | mTLS (Mutual TLS)                     | TLS (Conexion Cifrada)
        v                                       v
+---------------------------+          +---------------------------+
|      AZUL PAYMENT API     |          |    NEON POSTGRESQL        |
|                           |          |                           |
|  - Procesamiento de pagos |          |  TABLAS EN ALCANCE:       |
|  - Tokenizacion DataVault |          |  - client_payment_methods |
|  - 3D Secure 2.0          |          |  - operator_payment_methods|
|  - Autorizacion de txn    |          |  - pagos                  |
|                           |          |                           |
|  DATOS RECIBIDOS:         |          |  DATOS ALMACENADOS:       |
|  - PAN (para tokenizar)   |          |  - azul_data_vault_token  |
|  - CVV (solo en memoria)  |          |  - last_four (4 digitos)  |
|  - Fecha expiracion       |          |  - card_brand             |
|  - Nombre tarjetahabiente |          |  - expiry_month/year      |
|                           |          |                           |
|  DATOS DEVUELTOS:         |          |  NO SE ALMACENA:          |
|  - DataVaultToken         |          |  - PAN completo           |
|  - Codigo autorizacion    |          |  - CVV/CVC                |
|  - Resultado 3DS          |          |  - Datos de pista         |
+---------------------------+          +---------------------------+
```

---

## Flujo de Datos de Tarjetahabiente (CHD Flow)

```
PASO 1: INGRESO DE DATOS
========================
Cliente (Navegador/App)
    |
    | [PAN, CVV, Expiracion, Nombre]
    | via HTTPS/TLS 1.3
    |
    v
Cloudflare WAF
    |
    | (Filtrado de trafico malicioso)
    |
    v
app.gruard.com (Frontend React)


PASO 2: TRANSMISION AL BACKEND
==============================
Frontend React
    |
    | POST /api/azul/3ds/initiate
    | [PAN, CVV, Expiracion, Nombre, BrowserInfo]
    | via HTTPS interno
    |
    v
Backend Express.js
    |
    | Datos en memoria (RAM)
    | NUNCA persistidos en disco/DB
    |
    v
Modulo azul-payment.ts


PASO 3: TOKENIZACION CON AZUL
=============================
azul-payment.ts
    |
    | mTLS con certificados
    | [PAN, CVV, Expiracion]
    |
    v
AZUL API (DataVault)
    |
    | Respuesta:
    | [DataVaultToken, AuthCode, 3DSResult]
    |
    v
azul-payment.ts


PASO 4: ALMACENAMIENTO DE TOKEN
===============================
azul-payment.ts
    |
    | Solo datos NO sensibles:
    | [Token, Last4, Brand, Expiry]
    |
    v
PostgreSQL (Neon)
    |
    | Tablas:
    | - client_payment_methods
    | - operator_payment_methods
    |
    v
[Datos persistidos seguros]


PASO 5: PAGOS RECURRENTES
=========================
Para pagos futuros:
    |
    | Solo se usa Token
    | (SIN PAN, SIN CVV)
    |
    v
AZUL API (processPaymentWithToken)
    |
    | Respuesta: AuthCode
    |
    v
Confirmacion al cliente
```

---

## Componentes del Sistema

| Componente | Funcion | Ubicacion | En Alcance PCI |
|------------|---------|-----------|----------------|
| Cloudflare | CDN, WAF, SSL | Nube (externo) | Si |
| VPS Hostinger | Servidor fisico | Datacenter Hostinger | Si |
| CapRover | Orquestacion Docker | VPS | Si |
| Contenedor app.gruard.com | Aplicacion web | VPS | Si (CDE) |
| Frontend React | Interfaz de usuario | Contenedor | Si |
| Backend Express | API de negocio | Contenedor | Si (CDE) |
| azul-payment.ts | Modulo de pagos | Contenedor | Si (CDE) |
| Certificados mTLS | Autenticacion AZUL | /etc/azul/certs/ | Si |
| PostgreSQL (Neon) | Base de datos | Nube (externo) | Si |
| AZUL API | Procesador de pagos | Externo (AZUL) | No (proveedor) |
| Twilio | SMS/OTP | Externo | No |
| Resend | Email | Externo | No |

---

## Puertos y Protocolos Autorizados

| Puerto | Protocolo | Servicio | Direccion | Justificacion |
|--------|-----------|----------|-----------|---------------|
| 443 | HTTPS/TLS 1.3 | Web/API | Entrada | Trafico de clientes |
| 443 | HTTPS/mTLS | AZUL API | Salida | Procesamiento de pagos |
| 5432 | PostgreSQL/TLS | Base de datos | Salida | Conexion a Neon |
| 22 | SSH | Administracion | Entrada (restringido) | Acceso administrativo |

---

## Segmentacion de Red

```
+------------------------------------------+
|           ZONA PUBLICA                   |
|  (Cloudflare - trafico de internet)      |
+------------------------------------------+
                    |
                    | HTTPS (puerto 443)
                    v
+------------------------------------------+
|           ZONA DE APLICACION (CDE)       |
|  - Contenedor app.gruard.com             |
|  - Frontend + Backend                    |
|  - Modulo de pagos                       |
+------------------------------------------+
        |                       |
        | mTLS                  | TLS
        v                       v
+------------------+  +--------------------+
| AZUL (Proveedor) |  | NEON PostgreSQL    |
| Tokenizacion     |  | (Base de datos)    |
| Procesamiento    |  | Tokens almacenados |
+------------------+  +--------------------+
```

---

## Datos Almacenados vs No Almacenados

### DATOS ALMACENADOS (en PostgreSQL):
- `azul_data_vault_token` - Token de AZUL (no es dato sensible)
- `last_four` - Ultimos 4 digitos (permitido por PCI DSS)
- `card_brand` - Marca de tarjeta (Visa, MC, etc.)
- `expiry_month` / `expiry_year` - Fecha de expiracion

### DATOS NUNCA ALMACENADOS:
- PAN completo (16 digitos)
- CVV/CVC/CAV2
- Datos de banda magnetica
- Datos de chip EMV
- PIN o bloque de PIN

---

*Documento preparado para cumplimiento PCI DSS v4.0*
*ASSANPOS SRL - Plataforma Grua RD*
*Fecha: 21 de enero de 2026*
