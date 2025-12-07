import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY not found');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

interface UserInfo {
  email: string;
  nombre: string;
  porcentaje: string;
  permisos: string[];
  permisosTexto: string;
}

const users: UserInfo[] = [
  {
    email: 'admin@fourone.com.do',
    nombre: 'Administrador Four One',
    porcentaje: '30',
    permisos: ['dashboard', 'analytics', 'usuarios', 'operadores', 'billeteras', 'comisiones_pago', 'servicios', 'tarifas', 'monitoreo', 'verificaciones', 'documentos', 'tickets', 'socios', 'aseguradoras', 'empresas', 'configuracion', 'admin_usuarios'],
    permisosTexto: 'Acceso COMPLETO - Todos los módulos del sistema'
  },
  {
    email: 'khristopher@gruard.com',
    nombre: 'Khristopher',
    porcentaje: '60',
    permisos: ['dashboard', 'analytics', 'usuarios', 'operadores', 'billeteras', 'comisiones_pago', 'servicios', 'tarifas', 'monitoreo', 'verificaciones', 'documentos', 'tickets', 'socios', 'aseguradoras', 'empresas', 'configuracion', 'admin_usuarios'],
    permisosTexto: 'Acceso COMPLETO - Todos los módulos del sistema'
  },
  {
    email: 'verification@gruard.com',
    nombre: 'Equipo de Verificación',
    porcentaje: '10',
    permisos: ['dashboard', 'verificaciones', 'documentos'],
    permisosTexto: 'Acceso LIMITADO - Dashboard, Verificaciones y Documentos'
  }
];

const tempPassword = 'PSzorro99**';

async function sendPartnershipEmail(user: UserInfo): Promise<boolean> {
  const permisosLabels: Record<string, string> = {
    dashboard: "Dashboard",
    analytics: "Analytics",
    usuarios: "Usuarios",
    operadores: "Conductores",
    billeteras: "Billeteras",
    comisiones_pago: "Comisiones de Pago",
    servicios: "Servicios",
    tarifas: "Tarifas",
    monitoreo: "Monitoreo",
    verificaciones: "Verificaciones",
    documentos: "Documentos",
    tickets: "Tickets Soporte",
    socios: "Socios e Inversores",
    aseguradoras: "Aseguradoras",
    empresas: "Empresas",
    configuracion: "Configuración",
    admin_usuarios: "Gestionar Administradores",
  };

  const permisosList = user.permisos.map(p => `<li style="margin-bottom: 6px;">${permisosLabels[p] || p}</li>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Bienvenido a Grúa RD</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Portal de Socios e Inversores</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Estimado/a ${user.nombre},</p>
        
        <p style="font-size: 16px;">
          Es un placer darle la bienvenida como socio inversor de Grúa RD. Su cuenta ha sido creada exitosamente.
        </p>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Credenciales de Acceso:</h3>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 8px 0;"><strong>Contraseña:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;">
          <h4 style="color: #856404; margin: 0 0 10px 0;">Importante - Seguridad:</h4>
          <p style="margin: 0; font-size: 14px; color: #856404;">
            Por seguridad, le recomendamos cambiar su contraseña en su primer inicio de sesión.
          </p>
        </div>
        
        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px 20px; margin: 20px 0;">
          <h4 style="color: #155724; margin: 0 0 10px 0;">Su Participación en la Sociedad:</h4>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: #155724;">
            ${user.porcentaje}% de las utilidades de la empresa
          </p>
        </div>
        
        <div style="background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;">
          <h4 style="color: #1e3a5f; margin: 0 0 10px 0;">Distribución Total de la Sociedad:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px;">
            <li style="margin-bottom: 6px;">admin@fourone.com.do: <strong>30%</strong></li>
            <li style="margin-bottom: 6px;">khristopher@gruard.com: <strong>60%</strong></li>
            <li style="margin-bottom: 6px;">verification@gruard.com: <strong>10%</strong></li>
          </ul>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #1e3a5f; font-weight: bold;">
            Total: 100%
          </p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Acceso al Sistema (${user.permisosTexto}):</h3>
          <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 13px;">
            ${permisosList}
          </ul>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">En su Dashboard podrá:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #555;">
            <li style="margin-bottom: 8px;">Ver el resumen de sus distribuciones</li>
            <li style="margin-bottom: 8px;">Consultar el historial de pagos</li>
            <li style="margin-bottom: 8px;">Revisar los ingresos del periodo actual</li>
            <li style="margin-bottom: 8px;">Descargar reportes financieros</li>
          </ul>
        </div>
        
        <div style="background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;">
          <h4 style="color: #1e3a5f; margin: 0 0 10px 0;">Calendario de Distribuciones:</h4>
          <p style="margin: 0; font-size: 14px; color: #555;">
            Las distribuciones se calculan mensualmente y se procesan dentro de los primeros 15 días del mes siguiente.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gruard.com" style="background: #1e3a5f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Acceder al Portal</a>
        </div>
        
        <div style="background: #f0f4f8; border-radius: 8px; padding: 20px; margin: 30px 0 20px 0; text-align: center;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e3a5f; font-size: 14px;">Grúa RD</p>
          <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">Departamento de Relaciones con Inversores</p>
          <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">socios@gruard.com</p>
          <p style="margin: 0; color: #999; font-size: 12px;">Moca, Espaillat, República Dominicana</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
          Grúa RD - Gracias por su confianza e inversión
        </p>
        
        <p style="font-size: 10px; color: #bbb; text-align: center; margin-top: 15px;">
          con la tecnología de Four One Solutions
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Estimado/a ${user.nombre},

Bienvenido como socio inversor de Grúa RD.

CREDENCIALES DE ACCESO:
Email: ${user.email}
Contraseña: ${tempPassword}

IMPORTANTE: Cambie su contraseña en el primer inicio de sesión.

SU PARTICIPACIÓN: ${user.porcentaje}% de las utilidades

DISTRIBUCIÓN TOTAL DE LA SOCIEDAD:
- admin@fourone.com.do: 30%
- khristopher@gruard.com: 60%
- verification@gruard.com: 10%
Total: 100%

ACCESO AL SISTEMA: ${user.permisosTexto}

Las distribuciones se calculan mensualmente y se procesan dentro de los primeros 15 días del mes siguiente.

---
Grúa RD
Departamento de Relaciones con Inversores
socios@gruard.com
Moca, Espaillat, República Dominicana

con la tecnología de Four One Solutions`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Grúa RD <noreply@gruard.com>',
      to: [user.email],
      subject: 'Bienvenido al Portal de Socios Grúa RD - Credenciales y Participación',
      html,
      text,
    });

    if (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
      return false;
    }

    console.log(`Email sent successfully to ${user.email}: ${data?.id}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${user.email}:`, error);
    return false;
  }
}

async function main() {
  console.log('Starting to send partnership emails...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const user of users) {
    console.log(`Sending email to ${user.email}...`);
    const success = await sendPartnershipEmail(user);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n--- SUMMARY ---');
  console.log(`Emails sent successfully: ${successCount}`);
  console.log(`Emails failed: ${failCount}`);
}

main().catch(console.error);
