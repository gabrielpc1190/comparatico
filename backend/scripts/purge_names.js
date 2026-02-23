const db = require('../db');
const NameCleaningService = require('../nameCleaningService');

async function purgeClutteredNames() {
    console.log("=== INICIANDO PURGA DE NOMBRES SUCIOS ===");

    const service = new NameCleaningService(db);

    try {
        const [products] = await db.execute('SELECT id, nombre FROM productos');
        console.log(`Analizando ${products.length} productos...`);

        let updateCount = 0;

        for (const prod of products) {
            const cleanedName = service.sanitizeVisualName(prod.nombre);

            if (cleanedName !== prod.nombre) {
                console.log(`[LIMPIANDO] ID ${prod.id}: "${prod.nombre}" -> "${cleanedName}"`);

                await db.execute(
                    'UPDATE productos SET nombre = ? WHERE id = ?',
                    [cleanedName, prod.id]
                );
                updateCount++;
            }
        }

        console.log(`\nPurga completada. Se limpiaron ${updateCount} nombres de productos.`);

    } catch (error) {
        console.error("Error durante la purga:", error);
    } finally {
        await db.end();
    }
}

purgeClutteredNames();
