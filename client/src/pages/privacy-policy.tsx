import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Database, Share2, Lock, UserCheck, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/login">
            <Button variant="ghost" size="sm" data-testid="button-back-to-login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" data-testid="text-privacy-title">
              Política de Privacidad
            </h1>
            <p className="text-muted-foreground" data-testid="text-privacy-subtitle">
              Grúa RD - Servicios de Grúa en República Dominicana
            </p>
            <p className="text-sm text-muted-foreground mt-2" data-testid="text-last-updated">
              Última actualización: Noviembre 2025
            </p>
          </div>

          <Card data-testid="card-introduction">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Introducción
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-introduction">
                En Grúa RD, nos comprometemos a proteger su privacidad y garantizar la seguridad 
                de sus datos personales. Esta política describe cómo recopilamos, usamos, almacenamos 
                y protegemos su información cuando utiliza nuestra plataforma de servicios de grúa 
                en la República Dominicana.
              </p>
              <p>
                Al utilizar nuestros servicios, usted acepta las prácticas descritas en esta 
                política de privacidad. Le recomendamos leer este documento detenidamente.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-data-collection">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Datos que Recopilamos
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <h4 className="font-semibold">Información de Identificación Personal</h4>
              <ul data-testid="list-personal-data">
                <li>Nombre completo y apellidos</li>
                <li>Correo electrónico</li>
                <li>Número de teléfono móvil</li>
                <li>Cédula de identidad dominicana (para verificación)</li>
                <li>Dirección de origen y destino del servicio</li>
              </ul>

              <h4 className="font-semibold mt-4">Información del Vehículo (para conductores)</h4>
              <ul data-testid="list-vehicle-data">
                <li>Número de licencia de conducir</li>
                <li>Placa del vehículo de grúa</li>
                <li>Marca y modelo del vehículo</li>
                <li>Documentos de registro vehicular</li>
              </ul>

              <h4 className="font-semibold mt-4">Datos de Ubicación</h4>
              <ul data-testid="list-location-data">
                <li>Ubicación GPS en tiempo real durante el servicio</li>
                <li>Historial de ubicaciones de servicios anteriores</li>
                <li>Direcciones de recogida y entrega</li>
              </ul>

              <h4 className="font-semibold mt-4">Información de Uso</h4>
              <ul data-testid="list-usage-data">
                <li>Historial de servicios solicitados</li>
                <li>Métodos de pago utilizados (sin datos sensibles de tarjetas)</li>
                <li>Comunicaciones con conductores y soporte</li>
                <li>Calificaciones y reseñas</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-data-usage">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Uso de sus Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-data-usage-intro">
                Utilizamos su información personal para los siguientes propósitos:
              </p>
              <ul data-testid="list-data-usage">
                <li><strong>Prestación del Servicio:</strong> Conectar clientes con conductores de grúa disponibles y facilitar el servicio de asistencia vehicular.</li>
                <li><strong>Verificación de Identidad:</strong> Validar la identidad de usuarios mediante cédula dominicana y número de teléfono para garantizar la seguridad de la plataforma.</li>
                <li><strong>Procesamiento de Pagos:</strong> Facilitar transacciones seguras entre clientes, conductores y aseguradoras.</li>
                <li><strong>Comunicaciones:</strong> Enviar notificaciones sobre el estado del servicio, actualizaciones de la aplicación y promociones relevantes.</li>
                <li><strong>Mejora del Servicio:</strong> Analizar patrones de uso para mejorar nuestra plataforma y experiencia de usuario.</li>
                <li><strong>Cumplimiento Legal:</strong> Cumplir con las leyes y regulaciones aplicables en la República Dominicana.</li>
                <li><strong>Seguridad:</strong> Detectar y prevenir fraudes, abusos o actividades ilegales.</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-data-sharing">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Compartir Información
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-data-sharing-intro">
                Podemos compartir su información en las siguientes circunstancias:
              </p>
              <ul data-testid="list-data-sharing">
                <li><strong>Con Conductores/Clientes:</strong> Información necesaria para completar el servicio (nombre, ubicación, número de teléfono).</li>
                <li><strong>Con Aseguradoras:</strong> Cuando el servicio es cubierto por una póliza de seguro, compartimos los detalles necesarios para la facturación.</li>
                <li><strong>Proveedores de Servicios:</strong> Terceros que nos ayudan a operar la plataforma (procesadores de pago, servicios de SMS, servicios de mapas).</li>
                <li><strong>Autoridades Legales:</strong> Cuando sea requerido por ley, orden judicial o para proteger derechos legales.</li>
              </ul>
              <p className="mt-4" data-testid="text-no-sell-data">
                <strong>No vendemos sus datos personales a terceros.</strong>
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-data-security">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Seguridad de los Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-security-intro">
                Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos:
              </p>
              <ul data-testid="list-security-measures">
                <li><strong>Encriptación:</strong> Todos los datos se transmiten usando conexiones seguras (HTTPS/TLS).</li>
                <li><strong>Almacenamiento Seguro:</strong> Las contraseñas se almacenan con hash seguro (bcrypt).</li>
                <li><strong>Control de Acceso:</strong> Acceso limitado a datos personales solo a personal autorizado.</li>
                <li><strong>Monitoreo:</strong> Sistemas de detección de intrusiones y monitoreo continuo.</li>
                <li><strong>Auditorías:</strong> Revisiones periódicas de seguridad y cumplimiento.</li>
              </ul>
              <p className="mt-4" data-testid="text-security-disclaimer">
                Aunque implementamos medidas robustas de seguridad, ningún sistema es 100% seguro. 
                Le recomendamos proteger sus credenciales de acceso y reportar cualquier actividad 
                sospechosa inmediatamente.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-user-rights">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Sus Derechos
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-rights-intro">
                De acuerdo con las leyes de protección de datos aplicables, usted tiene los siguientes derechos:
              </p>
              <ul data-testid="list-user-rights">
                <li><strong>Acceso:</strong> Solicitar una copia de los datos personales que tenemos sobre usted.</li>
                <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos.</li>
                <li><strong>Eliminación:</strong> Solicitar la eliminación de sus datos personales.</li>
                <li><strong>Portabilidad:</strong> Recibir sus datos en un formato estructurado y transferible.</li>
                <li><strong>Oposición:</strong> Oponerse al procesamiento de sus datos para ciertos fines.</li>
                <li><strong>Revocación:</strong> Retirar su consentimiento en cualquier momento.</li>
              </ul>
              <p className="mt-4" data-testid="text-rights-exercise">
                Para ejercer cualquiera de estos derechos, contáctenos a través de los canales 
                indicados al final de este documento.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-data-retention">
            <CardHeader>
              <CardTitle>Retención de Datos</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-retention">
                Conservamos sus datos personales mientras su cuenta esté activa o según sea necesario 
                para proporcionarle servicios. También podemos retener información según sea necesario 
                para cumplir con obligaciones legales, resolver disputas y hacer cumplir nuestros acuerdos.
              </p>
              <p className="mt-4">
                Los datos de servicios completados se mantienen por un período mínimo de 5 años 
                para fines fiscales y legales, según las regulaciones de la República Dominicana.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-cookies">
            <CardHeader>
              <CardTitle>Cookies y Tecnologías Similares</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-cookies">
                Utilizamos cookies y tecnologías similares para:
              </p>
              <ul>
                <li>Mantener su sesión activa</li>
                <li>Recordar sus preferencias</li>
                <li>Analizar el uso de la plataforma</li>
                <li>Mejorar la experiencia de usuario</li>
              </ul>
              <p className="mt-4">
                Puede configurar su navegador para rechazar cookies, aunque esto puede afectar 
                la funcionalidad de la aplicación.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-changes">
            <CardHeader>
              <CardTitle>Cambios a esta Política</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-policy-changes">
                Podemos actualizar esta política de privacidad periódicamente. Le notificaremos 
                sobre cambios significativos mediante un aviso en nuestra aplicación o por correo 
                electrónico. Le recomendamos revisar esta política regularmente.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-contact">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p data-testid="text-contact-intro">
                Si tiene preguntas sobre esta política de privacidad o desea ejercer sus derechos, 
                puede contactarnos a través de:
              </p>
              <ul data-testid="list-contact-info">
                <li><strong>Correo Electrónico:</strong> privacidad@gruard.do</li>
                <li><strong>Teléfono:</strong> +1 (809) 555-0100</li>
                <li><strong>Dirección:</strong> Santo Domingo, República Dominicana</li>
              </ul>
            </CardContent>
          </Card>

          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground" data-testid="text-footer">
              © 2025 Grúa RD. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
