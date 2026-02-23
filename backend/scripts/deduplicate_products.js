const db = require('../db');
const NameCleaningService = require('../nameCleaningService');

async function runDeduplication() {
    console.log("=== INICIANDO DESDUPLICACIÓN MASIVA (DRY RUN) ===");
    console.log("Conectando a la base de datos...");

    const service = new NameCleaningService(db);

    try {
        // 1. Get all products without barcodes (these are the ones we want to clean)
        const [products] = await db.execute('SELECT id, nombre FROM productos WHERE codigoBarras IS NULL ORDER BY id ASC');
        console.log(`Se encontraron ${products.length} productos sin código de barras para analizar.`);

        const catalog = [];
        const mergesToPerform = [];

        // 2. Process each product
        for (const prod of products) {
            // Check if this new product matches anything already in our "clean" catalog
            const matchResult = await service.findBestMatch(prod.nombre, catalog);

            if (matchResult.action === 'MERGE') {
                console.log(`\n[+] SUGERENCIA FUSIÓN (${matchResult.method} - ${matchResult.confidence}%):`);
                console.log(`    ORIGINAL: [ID ${matchResult.targetId}] ${catalog.find(c => c.id === matchResult.targetId).nombre}`);
                console.log(`    NUEVO   : [ID ${prod.id}] ${prod.nombre}`);

                mergesToPerform.push({
                    keepId: matchResult.targetId,
                    deleteId: prod.id,
                    confidence: matchResult.confidence,
                    method: matchResult.method
                });
            } else {
                // If it's a new unique product, add it to our "clean" catalog for future comparisons
                catalog.push(prod);
            }
        }

        console.log(`\n--- RESUMEN ---`);
        console.log(`Productos originales: ${products.length}`);
        console.log(`Productos únicos detectados: ${catalog.length}`);
        console.log(`Fusiones sugeridas: ${mergesToPerform.length}`);

        console.log("\n=== APLICANDO FUSIONES A LA BASE DE DATOS ===");

        let successCount = 0;
        for (const merge of mergesToPerform) {
            try {
                // 1. Reassign prices to the target (keepId)
                await db.execute(
                    'UPDATE precios SET productoId = ? WHERE productoId = ?',
                    [merge.keepId, merge.deleteId]
                );

                // 2. Delete the redundant product (deleteId)
                await db.execute(
                    'DELETE FROM productos WHERE id = ?',
                    [merge.deleteId]
                );

                console.log(`[OK] Fusionado producto ID ${merge.deleteId} -> ID ${merge.keepId}`);
                successCount++;
            } catch (mergeError) {
                console.error(`[ERROR] Falló la fusión del producto ID ${merge.deleteId}:`, mergeError.message);
            }
        }

        console.log(`\nProceso completado. Se fusionaron ${successCount}/${mergesToPerform.length} productos.`);

    } catch (error) {
        console.error("Error durante la desduplicación:", error);
    } finally {
        // Close pool to exit script
        await db.end();
    }
}

runDeduplication();
