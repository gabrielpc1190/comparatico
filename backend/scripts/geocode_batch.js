require('dotenv').config({ path: '../.env' }); // Load from root .env if running from backend
const db = require('../db');

// This script finds existing store names in the database that are not yet in the 'establecimientos' table,
// fetches their location using Google Places API (New), and saves them.

async function geocodeStore(storeName, apiKey) {
    if (!apiKey) {
        console.log(`[SKIPPED] Geocoding para "${storeName}" - Falta de GOOGLE_MAPS_API_KEY en .env`);
        return null;
    }

    const url = `https://places.googleapis.com/v1/places:searchText`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
            },
            body: JSON.stringify({
                textQuery: `${storeName}, Costa Rica`
            })
        });

        const data = await response.json();

        if (data.places && data.places.length > 0) {
            const place = data.places[0];
            return {
                lat: place.location.latitude,
                lng: place.location.longitude,
                direccion: place.formattedAddress
            };
        } else {
            console.error(`[ERROR] Places API (New) no devolvió resultados para "${storeName}".`);
            if (data.error) console.error(`        Msg: ${data.error.message}`);
            return null;
        }
    } catch (error) {
        console.error(`[EXCEPTION] Error al consultar API para "${storeName}": ${error.message}`);
        return null;
    }
}

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

        // 1. Obtener nombres de establecimientos únicos de la tabla recibos
        const [rows] = await connection.execute('SELECT DISTINCT establecimiento FROM recibos');
        console.log(`Se encontraron ${rows.length} establecimientos únicos en los recibos.`);

        let storesProcessed = 0;
        let storesAdded = 0;

        for (const row of rows) {
            const storeName = row.establecimiento;

            // 2. Verificar si ya existe en la tabla establecimientos para no volver a consultar al API
            const [existing] = await connection.execute('SELECT id, latitud FROM establecimientos WHERE nombre = ?', [storeName]);

            if (existing.length === 0) {
                console.log(`\nProcesando nuevo local: ${storeName}`);
                const locationData = await geocodeStore(storeName, apiKey);

                if (locationData) {
                    await connection.execute(
                        'INSERT INTO establecimientos (nombre, latitud, longitud, direccion) VALUES (?, ?, ?, ?)',
                        [storeName, locationData.lat, locationData.lng, locationData.direccion]
                    );
                    storesAdded++;
                    console.log(`[EXITO] Insertado "${storeName}" en la base de datos.`);
                } else {
                    // Opcionalmente, insertarlo con lat/lng nulos para saber que falló y no re-intentar eternamente
                    // Por ahora, lo omitimos para que intente de nuevo luego.
                }

                // Evitar cuotas de rate limit del API de Google (500ms)
                await new Promise(resolve => setTimeout(resolve, 500));
            } else if (!existing[0].latitud) {
                // Existe pero sin coordenadas, podríamos reintentar
                console.log(`\nRe-procesando local sin coordenadas: ${storeName}`);
                const locationData = await geocodeStore(storeName, apiKey);
                if (locationData) {
                    await connection.execute(
                        'UPDATE establecimientos SET latitud = ?, longitud = ?, direccion = ? WHERE nombre = ?',
                        [locationData.lat, locationData.lng, locationData.direccion, storeName]
                    );
                    storesAdded++;
                    console.log(`[EXITO] Actualizado "${storeName}" en la base de datos.`);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            storesProcessed++;
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
