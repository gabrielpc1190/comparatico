const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const { LRUCache } = require('lru-cache');
const db = require('./db');
const { parseFacturaCR } = require('./xmlParser');
const GeocodingService = require('./geocodingService');
const NameCleaningService = require('./nameCleaningService');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Global service instances
const geoService = new GeocodingService(db, GOOGLE_MAPS_API_KEY);
const nameService = new NameCleaningService(db);

// Trust Cloudflare/Proxy headers for accurate IP detection
app.set('trust proxy', 1);

// --- Security & Performance Config ---

// 1. Rate Limiters
const uploadLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    limit: 30, // Limit each IP to 30 uploads per day
    message: { error: 'Límite de subidas diarias alcanzado (30 por día). Intenta de nuevo mañana.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const nearbyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 100, // Limit each IP to 100 nearby searches per hour
    message: { error: 'Demasiadas consultas de ubicación. Intenta de nuevo en una hora.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. Spatial Cache (Grid-based LRU)
// Max 500 different grid cells, 1 hour TTL
const geoCache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 60,
});

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Comparatico API (MariaDB) is running' });
});

app.post('/api/upload-xml', uploadLimiter, upload.single('factura'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const connection = await db.getConnection();
    try {
        const xmlString = req.file.buffer.toString('utf8');
        const parsedData = parseFacturaCR(xmlString);

        await connection.beginTransaction();

        // Check if receipt already exists
        const [existingReceipt] = await connection.execute('SELECT id FROM recibos WHERE claveXml = ?', [parsedData.xmlHash]);
        if (existingReceipt.length > 0) {
            throw new Error('Este recibo ya ha sido procesado anteriormente.');
        }

        // 1. Insert Receipt
        const [recvResult] = await connection.execute(
            'INSERT INTO recibos (claveXml, fecha, establecimiento, total) VALUES (?, ?, ?, ?)',
            [parsedData.xmlHash, parsedData.fecha, parsedData.establecimiento, parsedData.total]
        );
        const reciboId = recvResult.insertId;

        let itemsAdded = 0;

        // 2. Prepare items and avoid duplicates in the same XML
        const uniqueItemsMap = new Map();
        for (const item of parsedData.items) {
            if (!item.nombre || !item.precio) continue;
            const key = item.codigoBarras ? `cb:${item.codigoBarras}` : `nm:${item.nombre}`;
            if (!uniqueItemsMap.has(key)) {
                uniqueItemsMap.set(key, item);
            }
        }

        const uniqueItems = Array.from(uniqueItemsMap.values());
        const priceEntries = [];

        // 3. Handle Products (Find, Match, or Create)
        for (const item of uniqueItems) {
            let productoId;
            const codBarras = item.codigoBarras ? item.codigoBarras : null;

            // --- PASO 3: LIMPIEZA INTELIGENTE DE NOMBRES ---
            // "PAN BM EIFFEL 520 G 520 00 G 0" -> "Pan BM Eiffel 520g"
            const cleanName = await nameService.beautifyName(item.nombre, item.cantidad, item.unidadMedida);

            if (codBarras) {
                const [prodRows] = await connection.execute('SELECT id FROM productos WHERE codigoBarras = ?', [codBarras]);
                if (prodRows.length > 0) {
                    productoId = prodRows[0].id;
                }
            } else {
                // Exact name match first (fastest) 
                // We match against the beautified name
                const [nameRows] = await connection.execute('SELECT id FROM productos WHERE nombre = ? AND codigoBarras IS NULL', [cleanName]);
                if (nameRows.length > 0) {
                    productoId = nameRows[0].id;
                } else {
                    // Smart Hybrid Name Cleaning (Fuzzy + LLM)
                    // Fetch current catalog of products without barcodes
                    const [catalog] = await connection.execute('SELECT id, nombre FROM productos WHERE codigoBarras IS NULL');
                    const matchResult = await nameService.findBestMatch(cleanName, catalog);

                    if (matchResult.action === 'MERGE') {
                        productoId = matchResult.targetId;
                        console.log(`[SMART CLEANING] Unificando "${cleanName}" con ID ${productoId} (Confianza: ${matchResult.confidence}%, Método: ${matchResult.method})`);
                    }
                }
            }

            // Create new product if no match found
            if (!productoId) {
                const [newProdResult] = await connection.execute('INSERT INTO productos (codigoBarras, nombre) VALUES (?, ?)', [codBarras, cleanName]);
                productoId = newProdResult.insertId;
                console.log(`[SMART CLEANING] Creando nuevo producto: "${cleanName}"`);
            }

            // Map this product ID back to all original occurrences in the XML (if any duplicates existed)
            // Actually uniqueItems handles unique keys, so we just add the price entry
            priceEntries.push([productoId, reciboId, item.precio]);
        }

        // 4. Bulk Insert Prices
        if (priceEntries.length > 0) {
            const sqlPrices = 'INSERT INTO precios (productoId, reciboId, precio) VALUES ?';
            await connection.query(sqlPrices, [priceEntries]);
        }

        await connection.commit();
        console.log(`--- Éxito: Se registraron ${priceEntries.length} productos de ${parsedData.establecimiento} (Bulk Insert) ---`);

        // 5. Trigger Geocoding in background (no await to avoid slowing down the response)
        geoService.geocodeAndSync(parsedData.establecimiento).catch(err => {
            console.error(`[BG GEO ERROR] Error geocodificando "${parsedData.establecimiento}":`, err.message);
        });

        res.json({
            success: true,
            message: `XML procesado con éxito. Se añadieron precios para ${priceEntries.length} productos mediante inserción masiva.`,
            establecimiento: parsedData.establecimiento
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error procesando el registro en DB:', error.message);
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.get('/api/test/nearby', nearbyLimiter, async (req, res) => {
    const { lat, lng, radius } = req.query; // radius in km
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Faltan parámetros de latitud (lat) o longitud (lng).' });
    }

    const radKm = parseFloat(radius) || 5; // Default 5 km
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    // Grid Caching Logic: Round to 2 decimal places (~1.1km precision)
    const gridKey = `${userLat.toFixed(2)}|${userLng.toFixed(2)}|${radKm}`;
    const cachedResults = geoCache.get(gridKey);

    if (cachedResults) {
        console.log(`[CACHE HIT] Sirviendo resultados para grid: ${gridKey}`);
        return res.json({
            status: 'success',
            busqueda: { lat: userLat, lng: userLng, radio_km: radKm, cached: true },
            resultados: cachedResults
        });
    }

    try {
        const sql = `
            SELECT 
                id, nombre, latitud, longitud, direccion,
                (6371 * acos(
                    cos(radians(?)) * cos(radians(latitud)) * 
                    cos(radians(longitud) - radians(?)) + 
                    sin(radians(?)) * sin(radians(latitud))
                )) AS distancia_km
            FROM establecimientos
            WHERE latitud IS NOT NULL AND longitud IS NOT NULL
            HAVING distancia_km <= ?
            ORDER BY distancia_km ASC
            LIMIT 20
        `;
        const [stores] = await db.execute(sql, [userLat, userLng, userLat, radKm]);

        // Save to cache before sending
        geoCache.set(gridKey, stores);

        res.json({
            status: 'success',
            busqueda: { lat: userLat, lng: userLng, radio_km: radKm, cached: false },
            resultados: stores
        });
    } catch (error) {
        console.error('Error calculando ubicaciones cercanas:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/search', async (req, res) => {
    const { q, lat, lng } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    }

    try {
        const queryTerm = `%${q}%`;
        const hasCoords = lat && lng;
        const userLat = hasCoords ? parseFloat(lat) : null;
        const userLng = hasCoords ? parseFloat(lng) : null;

        // If coordinates provided, we'll need to join with establecimientos to get distances
        const sql = `
      WITH UltimosPrecios AS (
        SELECT 
            p.id AS productoId,
            r.establecimiento,
            MAX(r.fecha) AS fecha_lectura
        FROM productos p
        JOIN precios pr ON p.id = pr.productoId
        JOIN recibos r ON pr.reciboId = r.id
        WHERE p.nombre LIKE ? OR p.codigoBarras = ?
        GROUP BY p.id, r.establecimiento
      ),
      PreciosDetalle AS (
        SELECT 
            up.productoId,
            up.establecimiento,
            up.fecha_lectura,
            pr.precio,
            DATEDIFF(CURRENT_TIMESTAMP, up.fecha_lectura) AS dias_antiguedad,
            e.latitud, e.longitud
            ${hasCoords ? `, (6371 * acos(
                        cos(radians(?)) * cos(radians(e.latitud)) * 
                        cos(radians(e.longitud) - radians(?)) + 
                        sin(radians(?)) * sin(radians(e.latitud))
                    )) AS distancia_km` : ''}
        FROM UltimosPrecios up
        JOIN recibos r ON r.establecimiento = up.establecimiento AND r.fecha = up.fecha_lectura
        JOIN precios pr ON pr.reciboId = r.id AND pr.productoId = up.productoId
        LEFT JOIN establecimientos e ON up.establecimiento = e.nombre
      )
      SELECT 
          p.id, 
          p.codigoBarras, 
          p.nombre, 
          MIN(pd.precio) as min_precio, 
          MAX(pd.precio) as max_precio, 
          COUNT(DISTINCT pd.establecimiento) as num_precios,
          (SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                  'establecimiento', pd2.establecimiento, 
                  'precio', pd2.precio, 
                  'dias', pd2.dias_antiguedad
                  ${hasCoords ? ", 'distancia_km', pd2.distancia_km" : ""}
              )
           ) 
           FROM PreciosDetalle pd2 WHERE pd2.productoId = p.id
           ${hasCoords ? "ORDER BY pd2.distancia_km ASC" : "ORDER BY pd2.precio ASC"}
          ) as tiendas
      FROM productos p
      LEFT JOIN PreciosDetalle pd ON p.id = pd.productoId
      WHERE p.nombre LIKE ? OR p.codigoBarras = ?
      GROUP BY p.id
      LIMIT 20
    `;

        let queryParams = [queryTerm, q];
        if (hasCoords) {
            queryParams.push(userLat, userLng, userLat);
        }
        queryParams.push(queryTerm, q);

        const [products] = await db.execute(sql, queryParams);
        res.json(products);
    } catch (error) {
        console.error('Error in product search:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:identifier', async (req, res) => {
    const { identifier } = req.params;
    const { lat, lng } = req.query;

    try {
        const [prodRows] = await db.execute('SELECT * FROM productos WHERE id = ? OR codigoBarras = ?', [identifier, identifier]);

        if (prodRows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const product = prodRows[0];

        // Enhance query if location is provided to include distance
        let sqlPrices;
        let queryParams = [product.id];

        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            sqlPrices = `
                SELECT 
                    pr.precio, 
                    r.fecha as fecha_lectura, 
                    r.establecimiento, 
                    r.fecha as fecha_recibo,
                    e.latitud, e.longitud, e.direccion,
                    (6371 * acos(
                        cos(radians(?)) * cos(radians(e.latitud)) * 
                        cos(radians(e.longitud) - radians(?)) + 
                        sin(radians(?)) * sin(radians(e.latitud))
                    )) AS distancia_km
                FROM precios pr
                JOIN recibos r ON pr.reciboId = r.id
                LEFT JOIN establecimientos e ON r.establecimiento = e.nombre
                WHERE pr.productoId = ?
                ORDER BY distancia_km ASC, r.fecha DESC
            `;
            queryParams = [userLat, userLng, userLat, product.id];
        } else {
            sqlPrices = `
                SELECT pr.precio, r.fecha as fecha_lectura, r.establecimiento, r.fecha as fecha_recibo
                FROM precios pr
                JOIN recibos r ON pr.reciboId = r.id
                WHERE pr.productoId = ?
                ORDER BY r.fecha DESC
            `;
        }

        const [prices] = await db.execute(sqlPrices, queryParams);

        res.json({ product, prices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server (MariaDB) is running on http://localhost:${PORT}`);
});
