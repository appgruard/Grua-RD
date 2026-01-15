const https = require('https');
const fs = require('fs');

/**
 * SCRIPT PARA CREAR CERTIFICADO COMBINADO (BUNDLE)
 * Este script une tu CRT con el CA enviado por Azul para completar la cadena de confianza.
 */

const certPath = '/opt/certificados/gruard/app.gruard.com.crt';
const caPath = '/opt/certificados/gruard/azul_ca.crt'; // Ajusta el nombre según el archivo que te enviaron
const bundlePath = '/opt/certificados/gruard/app.gruard.com.bundle.crt';

try {
    if (!fs.existsSync(certPath)) {
        console.error('❌ No se encuentra tu certificado (.crt)');
        process.exit(1);
    }
    if (!fs.existsSync(caPath)) {
        console.error('❌ No se encuentra el archivo CA enviado por Azul (.crt/.pem)');
        console.log('Asegúrate de subir el archivo CA a /opt/certificados/gruard/ con el nombre azul_ca.crt');
        process.exit(1);
    }

    const cert = fs.readFileSync(certPath, 'utf8');
    const ca = fs.readFileSync(caPath, 'utf8');

    // El bundle debe tener tu certificado PRIMERO, luego el CA intermedio
    const bundle = cert.trim() + '\n' + ca.trim() + '\n';

    fs.writeFileSync(bundlePath, bundle);
    console.log(`✅ Bundle creado exitosamente en: ${bundlePath}`);
    console.log('Ahora debes actualizar tus scripts para usar este nuevo archivo .bundle.crt en lugar del .crt original.');

} catch (error) {
    console.error('❌ Error creando el bundle:', error.message);
}
