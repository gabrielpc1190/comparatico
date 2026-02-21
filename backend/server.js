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

        // 2. Insert Products and Prices
        for (const item of parsedData.items) {
            if (!item.nombre || !item.precio) continue;

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

            await connection.execute('INSERT INTO precios (productoId, reciboId, precio) VALUES (?, ?, ?)', [productoId, reciboId, item.precio]);
            itemsAdded++;
        }

        await connection.commit();
        console.log(`--- Éxito: Se registraron ${itemsAdded} productos de ${parsedData.establecimiento} ---`);

        res.json({
            success: true,
            message: `XML procesado con éxito en MariaDB. Se añadieron precios para ${itemsAdded} productos.`,
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
