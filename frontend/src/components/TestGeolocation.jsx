import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const TestGeolocation = () => {
    const [location, setLocation] = rangeParams();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [radius, setRadius] = useState(25); // default 25km

    function rangeParams() {
        return useState({ lat: null, lng: null });
    }

    const getLocation = () => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocalización no es soportada por tu navegador');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                fetchNearbyStores(position.coords.latitude, position.coords.longitude, radius);
            },
            (err) => {
                console.error(err);
                setError('Error obteniendo la ubicación. Asegúrate de dar permisos.');
                setLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const fetchNearbyStores = async (lat, lng, rad) => {
        try {
            const response = await fetch(`${API_URL}/test/nearby?lat=${lat}&lng=${lng}&radius=${rad}`);
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            const data = await response.json();
            setStores(data.resultados || []);
        } catch (err) {
            console.error(err);
            setError('Error cargando las tiendas cercanas.');
        } finally {
            setLoading(false);
        }
    };

    const handleRadiusChange = (e) => {
        const newRadius = e.target.value;
        setRadius(newRadius);
        if (location.lat && location.lng) {
            setLoading(true);
            fetchNearbyStores(location.lat, location.lng, newRadius);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Prueba de Geolocalización (PoC)</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>Esta página oculta permite probar el motor de cercanía de supermercados.</p>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                        onClick={getLocation}
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ padding: '0.75rem 1.5rem' }}
                    >
                        {loading && !stores.length ? 'Cargando...' : '📍 Buscar Supermercados Cercanos'}
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label htmlFor="searchRadius" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Radio de búsqueda (KM)</label>
                        <input
                            id="searchRadius"
                            name="searchRadius"
                            type="number"
                            value={radius}
                            onChange={handleRadiusChange}
                            min="1"
                            max="100"
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }}
                        />
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginTop: '1rem' }}>
                        {error}
                    </div>
                )}

                {location.lat && (
                    <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Tu ubicación actual: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {loading && stores.length > 0 && <p>Actualizando resultados...</p>}
                {!loading && stores.length === 0 && location.lat && !error && (
                    <p style={{ color: 'var(--text-secondary)' }}>No se encontraron supermercados a menos de {radius}km de tu ubicación.</p>
                )}

                {stores.map((store) => (
                    <div key={store.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{store.nombre}</h3>
                                <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{store.direccion}</p>
                                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Geolocalizado: {Number(store.latitud).toFixed(5)}, {Number(store.longitud).toFixed(5)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '0.25rem 0.75rem',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    borderRadius: '20px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}>
                                    {Number(store.distancia_km).toFixed(1)} km
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TestGeolocation;
