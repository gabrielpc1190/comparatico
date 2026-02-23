const db = require('../db');
const NameCleaningService = require('../nameCleaningService');

async function massBeautify() {
    console.log("=== INICIANDO EMBELLECIMIENTO MASIVO CON LLM ===");

    // El servicio necesita la instancia de DB si hiciera queries, pero aquí el script controla el loop
    const service = new NameCleaningService(db);

    try {
        const [products] = await db.execute('SELECT id, nombre FROM productos');
        console.log(`Procesando ${products.length} productos...`);

        let updateCount = 0;

        for (const prod of products) {
            process.stdout.write(`[*] Procesando ID ${prod.id}... `);
            const beautified = await service.beautifyName(prod.nombre);

            if (beautified !== prod.nombre) {
                process.stdout.write(`[OK] -> "${beautified}"\n`);
                await db.execute('UPDATE productos SET nombre = ? WHERE id = ?', [beautified, prod.id]);
                updateCount++;
            } else {
                process.stdout.write(`[SKIP]\n`);
            }
        }

        console.log(`\nFinalizado. Se actualizaron ${updateCount} productos.`);

    } catch (error) {
        console.error("Error en el embellecimiento masivo:", error);
    } finally {
        await db.end();
    }
}

massBeautify();
