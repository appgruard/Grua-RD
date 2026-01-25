#!/bin/bash

echo "=== GruaRD - Iniciando aplicación ==="

# Configurar variables de entorno para Replit
export NODE_ENV=production
export STORAGE_REPLIT=true

# Verificar si el build existe
if [ ! -f "dist/index.js" ]; then
    echo "Build no encontrado. Compilando aplicación..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "Error: Falló la compilación"
        exit 1
    fi
fi

# Verificar conexión a base de datos
echo "Verificando conexión a base de datos..."
if [ -z "$DATABASE_URL" ]; then
    echo "Advertencia: DATABASE_URL no está configurada"
fi

# Iniciar aplicación
echo "Iniciando servidor en puerto 5000..."
exec node dist/index.js
