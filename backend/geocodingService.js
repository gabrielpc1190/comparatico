
/**
 * Service to handle geocoding for establishments
 */
class GeocodingService {
    constructor(db, apiKey) {
        this.db = db;
        this.apiKey = apiKey;
    }

    /**
     * Geocode a store name and update/insert into the establecimientos table
     * @param {string} storeName 
     * @returns {Promise<{lat: number, lng: number, direccion: string}|null>}
     */
    async geocodeAndSync(storeName) {
        if (!this.apiKey) {
            console.warn(`[WARN] GeocodingService: No API Key provided for "${storeName}"`);
            return null;
        }

        try {
            // 1. Check if it already exists with coordinates
            const [rows] = await this.db.execute(
                'SELECT id, latitud, longitud FROM establecimientos WHERE nombre = ?',
                [storeName]
            );

            if (rows.length > 0 && rows[0].latitud && rows[0].longitud) {
                return {
                    lat: parseFloat(rows[0].latitud),
                    lng: parseFloat(rows[0].longitud)
                };
            }

            // 2. Not found or no coords, call Google Places API (New)
            console.log(`[GEO] Geocodificando nuevo establecimiento: ${storeName}`);
            const url = `https://places.googleapis.com/v1/places:searchText`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': this.apiKey,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
                },
                body: JSON.stringify({
                    textQuery: `${storeName}, Costa Rica`
                })
            });

            const data = await response.json();

            if (data.places && data.places.length > 0) {
                const place = data.places[0];
                const locationData = {
                    lat: place.location.latitude,
                    lng: place.location.longitude,
                    direccion: place.formattedAddress
                };

                // 3. Update or Insert in DB
                if (rows.length > 0) {
                    await this.db.execute(
                        'UPDATE establecimientos SET latitud = ?, longitud = ?, direccion = ? WHERE nombre = ?',
                        [locationData.lat, locationData.lng, locationData.direccion, storeName]
                    );
                } else {
                    await this.db.execute(
                        'INSERT INTO establecimientos (nombre, latitud, longitud, direccion) VALUES (?, ?, ?, ?)',
                        [storeName, locationData.lat, locationData.lng, locationData.direccion]
                    );
                }

                return locationData;
            } else {
                console.error(`[GEO ERROR] No se encontraron resultados para "${storeName}"`);
                return null;
            }
        } catch (error) {
            console.error(`[GEO EXCEPTION] Error geocodificando "${storeName}":`, error.message);
            return null;
        }
    }
}

module.exports = GeocodingService;
