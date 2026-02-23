import StatsPanel from './StatsPanel';

export default function Stats() {
    return (
        <div style={{ padding: '0 0.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>Resumen de Datos</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Estadísticas reales del catálogo de Comparatico.
                </p>
            </div>

            <StatsPanel />

            <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>¿Qué significan estos datos?</h3>
                <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    <li><b>Facturas:</b> Cantidad de recibos únicos procesados.</li>
                    <li><b>Productos:</b> Diferentes tipos de artículos encontrados.</li>
                    <li><b>Tiendas:</b> Establecimientos comerciales detectados.</li>
                    <li><b>Precios:</b> Total de registros históricos para comparar.</li>
                </ul>
            </div>
        </div>
    );
}
