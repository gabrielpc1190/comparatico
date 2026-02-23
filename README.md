# Comparatico 🛒📊

**Comparatico** es una aplicación descentralizada y automatizada diseñada para ingerir facturas electrónicas de Costa Rica (XML) y construir una base de datos histórica de precios de supermercados, permitiendo a los usuarios comparar el costo de los productos y tomar decisiones informadas.

## 🚀 Características Principales

- **Ingesta Automatizada 🤖**: Las facturas enviadas a un correo específico son procesadas y cargadas automáticamente en la base de datos a través de Google Apps Script.
- **Geolocalización Inteligente 📍**: Extrae automáticamente las coordenadas de los supermercados usando Google Places API y te sugiere los precios más cercanos a ti.
- **Comparativa de Precios 💰**: Busca productos por nombre o código de barras y visualiza el último precio registrado, ordenado por proximidad si tienes el GPS activo.
- **Escáner Integrado 📸**: Usa la cámara de tu dispositivo móvil para escanear productos directamente en los pasillos del supermercado.
- **Historial de Precios 📈**: Mantiene un registro cronológico de cada compra, preparando el terreno para análisis de inflación y evolución de precios.
- **Seguridad y Rendimiento 🛡️**: Protegido contra abusos con Rate Limiting y optimizado con Caché Espacial. Despliegue seguro dockerizado con Nginx, MariaDB y Cloudflare Tunnels (Zero Trust).

## 🏗️ Arquitectura Técnica

- **Frontend**: React.js (Vite), Nginx
- **Backend**: Node.js, Express, Fast-XML-Parser
- **Base de Datos**: MariaDB
- **Automatización**: Google Apps Script (Webhook)
- **Infraestructura**: Docker Compose, Cloudflare `cloudflared`

## ⚙️ Despliegue Local

### Requisitos previos
- Docker y Docker Compose instalados.

### Pasos
1. Clona este repositorio:
   ```bash
   git clone https://github.com/gabrielpc1190/comparatico.git
   cd comparatico
   ```
2. Configura las variables de entorno basándote en el ejemplo:
   ```bash
   cp .env.example .env
   # Edita .env con tus credenciales
   ```
3. Inicia los servicios con Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. El sistema estará disponible en puertos locales (Frontend: 8080).

## 📧 Automatización por Email (Google Apps Script)

Para que las facturas enviadas a tu correo se procesen automáticamente, sigue estos pasos:

1. Ve a [script.google.com](https://script.google.com/) y crea un "Nuevo proyecto".
2. Copia el contenido de [automation/google-apps-script.js](automation/google-apps-script.js) en el editor.
3. Reemplaza la variable `API_URL` con la URL pública de tu túnel de Cloudflare.
4. Guarda el proyecto (Ctrl+S).
5. Configura el Activador (Trigger):
   - Haz clic en el ícono de **Reloj** (Activadores) en la barra lateral.
   - Haz clic en **+ Añadir activador**.
   - Función: `procesarCorreosNuevos`.
   - Fuente: `Según el tiempo`.
   - Tipo: `Temporizador por minutos`.
   - Intervalo: `Cada 5 minutos`.
6. Autoriza los permisos de Google cuando se te solicite (Configuración avanzada -> Ir al script).

## 🛡️ Seguridad
Este sistema está diseñado para correr detrás de un túnel Cloudflare. Por defecto, en producción, ningún puerto de la Base de Datos ni del Backend están expuestos directamente a redes externas ni a Internet.
