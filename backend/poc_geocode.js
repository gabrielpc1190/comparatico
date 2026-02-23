require('dotenv').config({ path: '../.env' }); // Load from root .env if running from backend
const db = require('./db');

async function geocodeStore(storeName, apiKey) {
    if (!apiKey) {
        console.log(`[SKIPPED] Geocoding para "${storeName}" - Falta de GOOGLE_MAPS_API_KEY en .env`);
        return null;
    }

    // Using Places API (New) v1 which requires a POST request and FieldMask
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
            const location = place.location;
            const fullAddress = place.formattedAddress;
            const displayName = place.displayName.text;

            console.log(`[SUCCESS] "${storeName}"`);
            console.log(`          -> Encontrado como: ${displayName}`);
            console.log(`          -> Lat: ${location.latitude}, Lng: ${location.longitude}`);
            console.log(`          -> Dirección: ${fullAddress}`);
            return location;
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

async function runPoC() {
    console.log('--- Iniciando PoC de Geocoding ---');

    // Test DB Connection
    let connection;
    try {
        connection = await db.getConnection();
    } catch (err) {
        console.error('Error conectando a la base de datos:', err.message);
        process.exit(1);
    }

    // Get unique establishments
    try {
        const [rows] = await connection.execute('SELECT DISTINCT establecimiento FROM recibos');
        console.log(`Se encontraron ${rows.length} establecimientos únicos en la base de datos.`);

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ ADVERTENCIA: No se encontró la variable GOOGLE_MAPS_API_KEY en el environment.');
            console.warn('⚠️ Se saltará la llamada real a la API, pero estos son los locales que se procesarían:');
        } else {
            console.log('✅ GOOGLE_MAPS_API_KEY encontrada. Iniciando consultas reales...');
        }

        for (const row of rows) {
            const storeName = row.establecimiento;
            console.log(`\nProcesando: ${storeName}`);
            await geocodeStore(storeName, apiKey);

            // Adding a small delay to avoid hitting rate limits if there are many API calls
            if (apiKey) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

    } catch (error) {
        console.error('Error obteniendo establecimientos:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

runPoC();
