# Roadmap: Comparatico 🗺️

Este documento describe la hoja de ruta y las futuras expansiones planificadas para **Comparatico** tras completar su Prueba de Concepto (PoC) inicial.

## 🌱 Fase Actual: Prueba de Concepto (Completada)
- [x] Ingesta manual y automática de Facturas (XML de Costa Rica).
- [x] Extracción y desduplicación de datos mediante la Clave Única.
- [x] Interfaz de búsqueda y comparación de últimos precios.
- [x] Lector de códigos de barras en navegador móvil.
- [x] Despliegue seguro dockerizado con Cloudflare Tunnel.
- [x] **Geolocalización Automática**: Geocoding de tiendas e integración de distancias en los resultados.
- [x] **Seguridad Base**: Rate Limiting y caché espacial implementados.

---

## 🚀 Siguientes Pasos (A corto plazo)

### 1. Mejoras de UI/UX
- [x] **Modo Oscuro Integrado**: Temas dinámicos según las preferencias del sistema del usuario (Actualmente vía CSS).
- [ ] **PWA (Progressive Web App)**: Permitir la instalación de la web app en teléfonos móviles con un icono de inicio y modo offline básico.
- [ ] **Filtros Avanzados**: Filtrar búsquedas por establecimiento o por rango de fechas (ej: "precios de los últimos 30 días").
- [x] **Geolocalización y Cercanía**: Compartir ubicación del usuario para mostrar precios de productos en supermercados cercanos.

### 2. Análisis e Historial
- [ ] **Gráficos de Evolución**: Visualización de la curva de precios de un producto específico a lo largo del tiempo utilizando librerías como Recharts o Chart.js.
- [ ] **Detección de Ofertas**: Señalización visual cuando un producto tiene un precio significativamente más bajo que su promedio histórico.
- [ ] **Cálculo de Inflación Personal**: Mostrar el porcentaje de aumento/disminución de productos recurrentes en la cesta del usuario.

### 3. Gestión y Calidad de Datos
- [ ] **Limpieza Inteligente de Nombres**: Algoritmo para unificar nombres de productos que están escritos ligeramente diferentes en distintos supermercados (ej: "Arroz Tio Pelon 99" vs "ARROZ T PELON 99").
- [ ] **Agrupación Manual de Productos**: Panel de administración para fusionar dos registros o asignar un código de barras a un producto que no lo traía en la factura.

---

## 🌟 Visión a Largo Plazo (A futuro)

### 4. Inteligencia Artificial & Crowdsourcing
- [ ] **Clasificación por IA**: Usar Modelos de Lenguaje (LLMs) para categorizar automáticamente los productos (Lácteos, Limpieza, Carnes) según su nombre extraído de la factura.
- [ ] **Análisis de Opciones Alternativas**: Sugerencias automáticas de productos similiares más económicos ("Los usuarios que compraron Arroz de marca A en lugar de marca B ahorraron X").

### 5. Capacidades Multi-Usuario
- [ ] **Autenticación (Opcional)**: Cuentas de usuario para que cada persona tenga grupos de supermercados propios.
- [ ] **Listas de Compras Inteligentes**: El usuario crea una lista y el sistema le recomienda a cuál supermercado ir en base a la suma total de los precios más recientes.
