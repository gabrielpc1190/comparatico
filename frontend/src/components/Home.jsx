import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ScanBarcode } from 'lucide-react';
export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('barcode') || '');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [location, setLocation] = useState({ lat: null, lng: null });

    const navigate = useNavigate();

    // Get location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.warn('Geolocation denied or failed:', err.message),
                { enableHighAccuracy: false, timeout: 5000 }
            );
        }
    }, []);

    // Auto-search if barcode is in URL
    useEffect(() => {
        const barcode = searchParams.get('barcode');
        if (barcode) {
            setQuery(barcode);
            handleSearch(barcode, location.lat, location.lng);
        }
    }, [searchParams, location.lat]); // Re-search if location becomes available

    const handleSearch = async (term, lat = location.lat, lng = location.lng) => {
        if (!term) return;

        setIsSearching(true);
        setError('');

        try {
            let url = `/api/products/search?q=${encodeURIComponent(term)}`;
            if (lat && lng) {
                url += `&lat=${lat}&lng=${lng}`;
            }
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                setResults(data);
                if (data.length === 0) {
                    setError('No se encontraron productos.');
                }
            } else {
                setError(data.error || 'Error buscando productos');
            }
        } catch (err) {
            setError('Error conectando al servidor.');
        } finally {
            setIsSearching(false);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        if (query) {
            setSearchParams({ barcode: query });
            handleSearch(query);
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ marginBottom: '1rem', color: '#002b7f' }}>Buscar Producto</h2>
                <p>Ingresa el nombre o escanea un código de barras para encontrar los mejores precios.</p>

                <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%' }}>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Ej: Arroz, Leche, Atún..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn-primary" disabled={isSearching} style={{ backgroundColor: '#ce1126', padding: '0.75rem', minWidth: '48px' }} title="Buscar">
                        {isSearching ? '...' : <Search size={20} />}
                    </button>
                    <button type="button" className="btn-primary" onClick={() => navigate('/scanner')} style={{ backgroundColor: '#002b7f', padding: '0.75rem', minWidth: '48px' }} title="Escanear Código">
                        <ScanBarcode size={20} />
                    </button>
                </form>

                {error && <p style={{ color: 'var(--error-color)', marginTop: '1rem' }}>{error}</p>}
            </div>

            {/* Guía de Inicio - Solo se muestra si no hay búsqueda activa y no hay resultados */}
            {results.length === 0 && !isSearching && !query && (
                <div className="glass-panel" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#002b7f' }}>¡Pura Vida! 🇨🇷</h2>
                    <p style={{ fontSize: '1.1rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                        Bienvenido a <strong>Comparatico</strong>, tu aliado para ahorrar en el súper.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🔎</span>
                            <h3 style={{ fontSize: '1.1rem', color: '#002b7f' }}>Busca y Compara</h3>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>Escribe el nombre de lo que ocupas y mira dónde está más barato.</p>
                        </div>
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📷</span>
                            <h3 style={{ fontSize: '1.1rem', color: '#002b7f' }}>En los pasillos</h3>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>Usa el ícono de código de barras abajo para escanear productos físicos en la pulpería.</p>
                        </div>
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📧</span>
                            <h3 style={{ fontSize: '1.1rem', color: '#002b7f' }}>Comparte facturas</h3>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>Envíalas a comparaticocr@gmail.com para actualizar los precios para todos.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Resultados de Búsqueda */}
            {results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {results.map((prod) => {
                        let tiendas = [];
                        try {
                            if (typeof prod.tiendas === 'string') {
                                tiendas = JSON.parse(prod.tiendas) || [];
                            } else if (Array.isArray(prod.tiendas)) {
                                tiendas = prod.tiendas;
                            }
                        } catch (e) {
                            console.error('Error parsing tiendas', e);
                        }

                        // Sort by price ascending
                        tiendas.sort((a, b) => parseFloat(a.precio) - parseFloat(b.precio));

                        return (
                            <div key={prod.id} className="glass-panel" style={{
                                padding: '1.25rem',
                            }}>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: '#002b7f' }}>{prod.nombre}</h3>
                                {prod.codigoBarras && <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>EAN: {prod.codigoBarras}</p>}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {tiendas.length > 0 ? tiendas.map((t, idx) => {
                                        const isOutdated = t.dias > 30;
                                        return (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.85rem',
                                                backgroundColor: idx === 0 && !isOutdated ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.6)',
                                                border: idx === 0 && !isOutdated ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(0,0,0,0.05)',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>
                                                        {t.establecimiento}
                                                        {t.distancia_km !== undefined && (
                                                            <span style={{
                                                                marginLeft: '0.5rem',
                                                                color: 'var(--accent-primary)',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                • {Number(t.distancia_km).toFixed(1)} km
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: isOutdated ? '#ef4444' : '#64748b' }}>
                                                        {isOutdated ? `⚠️ Desactualizado (Hace ${t.dias} días)` : (t.dias === 0 ? 'Actualizado Hoy' : `Hace ${t.dias} días`)}
                                                    </span>
                                                </div>
                                                <span style={{
                                                    fontWeight: '700',
                                                    fontSize: '1.15rem',
                                                    color: isOutdated ? '#94a3b8' : (idx === 0 ? '#16a34a' : '#0f172a'),
                                                    textDecoration: isOutdated ? 'line-through' : 'none',
                                                    opacity: isOutdated ? 0.7 : 1
                                                }}>
                                                    ₡{parseFloat(t.precio).toLocaleString('es-CR')}
                                                </span>
                                            </div>
                                        );
                                    }) : (
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No hay datos detallados de tiendas.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

