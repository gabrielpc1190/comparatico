import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('barcode') || '');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');

    // Auto-search if barcode is in URL
    useEffect(() => {
        const barcode = searchParams.get('barcode');
        if (barcode) {
            setQuery(barcode);
            handleSearch(barcode);
        }
    }, [searchParams]);

    const handleSearch = async (term) => {
        if (!term) return;

        setIsSearching(true);
        setError('');

        try {
            const response = await fetch(`/api/products/search?q=${encodeURIComponent(term)}`);
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
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2>Buscar Producto</h2>
            <p>Busca por texto o escanea un código para comparar.</p>

            <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Arroz Tio Pelon..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={isSearching}>
                    {isSearching ? '...' : 'Buscar'}
                </button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}

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
                        <div key={prod.id} style={{
                            padding: '1rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{prod.nombre}</h3>
                            {prod.codigoBarras && <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>EAN: {prod.codigoBarras}</p>}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {tiendas.length > 0 ? tiendas.map((t, idx) => {
                                    const isOutdated = t.dias > 30;
                                    return (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            backgroundColor: idx === 0 && !isOutdated ? 'rgba(74, 222, 128, 0.1)' : 'var(--bg-primary)',
                                            border: idx === 0 && !isOutdated ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid var(--border-color)',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t.establecimiento}</span>
                                                <span style={{ fontSize: '0.75rem', color: isOutdated ? 'var(--error-color)' : 'var(--text-secondary)' }}>
                                                    {isOutdated ? `⚠️ Precio desactualizado (Hace ${t.dias} días)` : (t.dias === 0 ? 'Hoy' : `Hace ${t.dias} días`)}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontWeight: 'bold',
                                                fontSize: '1.1rem',
                                                color: isOutdated ? 'var(--text-secondary)' : (idx === 0 ? 'var(--success-color)' : 'var(--text-primary)'),
                                                textDecoration: isOutdated ? 'line-through' : 'none',
                                                opacity: isOutdated ? 0.6 : 1
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
        </div>
    );
}

