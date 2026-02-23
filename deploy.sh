#!/bin/bash
echo "🚀 Iniciando despliegue de Comparatico Frontend..."

# Reconstruimos la imagen del frontend y la levantamos
docker compose up -d --build web

echo "✅ Despliegue completado."
echo "Puedes revisar los logs con: docker logs comparatico_web -f"
