const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');
const { parseFacturaCR } = require('./xmlParser');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.post('/api/upload-xml', upload.single('factura'), async (req, res) => {
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

        // 3. Handle Products (Find or Create)
        // We still do this in a loop for safety with UNIQUE constraints, 
        // but we only do it for UNIQUE items in the XML.
        for (const item of uniqueItems) {
            let productoId;
            const codBarras = item.codigoBarras ? item.codigoBarras : null;

            if (codBarras) {
                const [prodRows] = await connection.execute('SELECT id FROM productos WHERE codigoBarras = ?', [codBarras]);
                if (prodRows.length > 0) {
                    productoId = prodRows[0].id;
                }
            } else {
                const [nameRows] = await connection.execute('SELECT id FROM productos WHERE nombre = ? AND codigoBarras IS NULL', [item.nombre]);
                if (nameRows.length > 0) {
                    productoId = nameRows[0].id;
                }
            }

            if (!productoId) {
                const [newProdResult] = await connection.execute('INSERT INTO productos (codigoBarras, nombre) VALUES (?, ?)', [codBarras, item.nombre]);
                productoId = newProdResult.insertId;
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

app.get('/api/test/nearby', async (req, res) => {
    const { lat, lng, radius } = req.query; // radius in km
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Faltan parámetros de latitud (lat) o longitud (lng).' });
    }

    const radKm = parseFloat(radius) || 5; // Default 5 km
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

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

        // Para enriquecer esto un poco, podríamos traer el último precio de cada tienda,
        // pero por ahora solo retornamos las tiendas más cercanas para la prueba de concepto.

        res.json({
            status: 'success',
            busqueda: { lat: userLat, lng: userLng, radio_km: radKm },
            resultados: stores
        });
    } catch (error) {
        console.error('Error calculando ubicaciones cercanas:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    }

    try {
        const queryTerm = `%${q}%`;
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
            DATEDIFF(CURRENT_TIMESTAMP, up.fecha_lectura) AS dias_antiguedad
        FROM UltimosPrecios up
        JOIN recibos r ON r.establecimiento = up.establecimiento AND r.fecha = up.fecha_lectura
        JOIN precios pr ON pr.reciboId = r.id AND pr.productoId = up.productoId
      )
      SELECT 
          p.id, 
          p.codigoBarras, 
          p.nombre, 
          MIN(pd.precio) as min_precio, 
          MAX(pd.precio) as max_precio, 
          COUNT(DISTINCT pd.establecimiento) as num_precios,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('establecimiento', pd2.establecimiento, 'precio', pd2.precio, 'dias', pd2.dias_antiguedad)) 
           FROM PreciosDetalle pd2 WHERE pd2.productoId = p.id) as tiendas
      FROM productos p
      LEFT JOIN PreciosDetalle pd ON p.id = pd.productoId
      WHERE p.nombre LIKE ? OR p.codigoBarras = ?
      GROUP BY p.id
      LIMIT 20
    `;
        const [products] = await db.execute(sql, [queryTerm, q, queryTerm, q]);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:identifier', async (req, res) => {
    const { identifier } = req.params;

    try {
        const [prodRows] = await db.execute('SELECT * FROM productos WHERE id = ? OR codigoBarras = ?', [identifier, identifier]);

        if (prodRows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const product = prodRows[0];
        const sqlPrices = `
      SELECT pr.precio, r.fecha as fecha_lectura, r.establecimiento, r.fecha as fecha_recibo
      FROM precios pr
      JOIN recibos r ON pr.reciboId = r.id
      WHERE pr.productoId = ?
      ORDER BY r.fecha DESC
    `;
        const [prices] = await db.execute(sqlPrices, [product.id]);

        res.json({ product, prices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server (MariaDB) is running on http://localhost:${PORT}`);
});
