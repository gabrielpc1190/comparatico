const GeocodingService = require('../geocodingService');

async function runGeocodeBatch() {
    console.log('--- Iniciando Sincronización de Establecimientos Geocodificados ---');

    let connection;
    try {
        connection = await db.getConnection();
    } catch (err) {
        console.error('Error conectando a la base de datos:', err.message);
        process.exit(1);
    }

    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error('❌ ERROR: No se encontró la variable GOOGLE_MAPS_API_KEY en el environment.');
            process.exit(1);
        }

        const geoService = new GeocodingService(connection, apiKey);

        // 1. Obtener nombres de establecimientos únicos de la tabla recibos
        const [rows] = await connection.execute('SELECT DISTINCT establecimiento FROM recibos');
        console.log(`Se encontraron ${rows.length} establecimientos únicos en los recibos.`);

        let storesProcessed = 0;
        let storesAdded = 0;

        for (const row of rows) {
            const storeName = row.establecimiento;
            const locationData = await geoService.geocodeAndSync(storeName);

            if (locationData) {
                storesAdded++;
            }
            storesProcessed++;

            // Avoid Google API rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`\n--- Resumen ---`);
        console.log(`Total Analizados: ${storesProcessed}`);
        console.log(`Nuevos Geocodificados: ${storesAdded}`);

    } catch (error) {
        console.error('Error durante la ejecución:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

runGeocodeBatch();
