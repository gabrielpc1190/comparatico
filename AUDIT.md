# Reporte de Auditoría de Código y Seguridad (Comparatico)
**Fecha:** Febrero 2026
**Objetivo:** Revisar el código fuente, la infraestructura y las integraciones del proyecto para identificar posibles vulnerabilidades, cuellos de botella de rendimiento y oportunidades de mejora a futuro.

---

## 1. Backend (Node.js & Express)

### ✅ Fortalezas
*   **Transacciones Seguras:** El endpoint `/api/upload-xml` en `server.js` utiliza correctamente transacciones de base de datos (`beginTransaction` y `commit/rollback`), garantizando que si el procesamiento falla a la mitad de una factura, no queden datos corruptos (huérfanos).
*   **Desduplicación Efectiva:** Funciona correctamente al buscar un registro existente mediante la `claveXml`, impidiendo que el mismo archivo se cargue dos veces.
*   **Consultas Parametrizadas:** Todas las interacciones con la base de datos utilizan consultas preparadas (`db.execute('... ?', [val])`), lo cual protege a la aplicación contra ataques de inyección SQL (SQLi).

### ⚠️ Áreas de Mejora
*   **Problema de Query N+1:** El ingreso de facturas hace una consulta SELECT/INSERT individual para cada ítem en el XML de forma secuencial (`for (const item of parsedData.items) { ... }`). Para facturas extremadamente grandes de supermercados mayoristas (ej. 150 items), esto puede ralentizar el servidor. *Recomendación*: Agrupar las consultas de ingreso usando inserciones en bloque (bulk inserts con sentencia `IN()`).
*   **Límites de Carga Ausentes:** El parser de `multer` (`storage: multer.memoryStorage()`) se usa sin restricciones de tamaño. Un cliente malicioso podría intentar enviar un archivo de texto gigantesco que terminaría saturando la memoria RAM del contenedor Node, colapsándolo. *Recomendación*: Añadir un límite estricto en el middleware (Ej. `limits: { fileSize: 5 * 1024 * 1024 }` / 5MB máximo).
*   **CORS Excesivamente Permisivo:** `app.use(cors())` acepta solicitudes de cualquier dominio. *Recomendación*: Una vez que se pase a producción madura, restringir el CORS a los dominios autorizados de acceso.

---

## 2. Frontend (React & Vite)

### ✅ Fortalezas
*   **Gestión de Rutas y Estado:** El archivo `Home.jsx` hace un uso excelente de `useSearchParams` para habilitar el enlazamiento profundo (Deep Linking). Al escanear un código, navega a `/?barcode=123`, lo que facilita compartir URLs o recargar la página directamente en los resultados.
*   **Manejo Fiable del Hardware:** En `Scanner.jsx` se corrigieron efectivamente los problemas de recarga forzada (Black-screen bug) mediante la administración explícita de `cameraId` y limpieza obligatoria del `Html5Qrcode` en el ciclo de vida `useEffect`.

### ⚠️ Áreas de Mejora
*   **Re-renderizados Múltiples:** Existen algunas actualizaciones de estado desencadenadas en serie que podrían consolidarse.
*   **Análisis JSON:** En la extracción de tiendas (`JSON.parse` en Home.jsx), si el backend envía algo deformado, el `try-catch` está logueando a consola en lugar de alertar al usuario formalmente. *Recomendación*: Mejorar la gestión del error e infundir una alerta en la UI.

---

## 3. Infraestructura y Seguridad de Red (Docker / Nginx / Cloudflare)

### ✅ Fortalezas
*   **Construcciones Multi-Stage:** `frontend/Dockerfile` usa construcción por etapas, compilando con Node y distribuyendo productivamente con Nginx-Alpine (muy ligero).
*   **Aislamiento y Hardening Zero Trust:** El archivo `docker-compose.yml` previene de manera absoluta accesos por fuerza bruta desde la red pública al enlazar los puertos exclusivamente a la interfaz local loopback (`"127.0.0.1:3306:3306"`). Todo el tráfico cruza un túnel cifrado gestionado por `cloudflared`.
*   **Credenciales Seguras:** El código fuente se desinfectó mediante control por medio de variables de entorno `.env` no incluidas en el repositorio.

### ⚠️ Áreas de Mejora
*   **Ejecución de Backend como Root:** La instrucción predeterminada en `backend/Dockerfile` levanta la inferfaz de Node.js en modo Superusuario. *Recomendación*: Finalizar la configuración del Dockerfile declarando la directiva `USER node` antes del `CMD` inicial, forzando y encapsulando a Node a operar con los privilegios subyacentes más bajos posibles en su Alpine Linux huésped.

---
**Conclusión General:**  
La base de código está en un estado sólido de Pruebas de Concepto (PoC) hasta un Minimum Viable Product (MVP). La infraestructura de red detrás del túnel compensa gran parte de los riesgos básicos, pero la introducción de validaciones de límites de subida (File Size Limits) y los Bulk Inserts acelerarán drásticamente un despliegue nacional con altas cargas de ingesta de XML.
