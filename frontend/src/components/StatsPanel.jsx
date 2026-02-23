import { useState, useEffect } from 'react';
import { Database, Receipt, ShoppingBasket, Store } from 'lucide-react';

export default function StatsPanel() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading || !stats) return null;

    const cards = [
        { label: 'Facturas', value: stats.total_recibos, icon: <Receipt size={18} />, color: '#38bdf8' },
        { label: 'Productos', value: stats.total_productos, icon: <ShoppingBasket size={18} />, color: '#fbbf24' },
        { label: 'Tiendas', value: stats.total_tiendas, icon: <Store size={18} />, color: '#10b981' },
        { label: 'Precios', value: stats.total_precios, icon: <Database size={18} />, color: '#f472b6' },
    ];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            padding: '0 1rem',
            marginBottom: '1.5rem'
        }}>
            {cards.map((card, i) => (
                <div key={i} className="glass-panel" style={{
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    <div style={{ color: card.color, marginBottom: '0.25rem' }}>{card.icon}</div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{card.value}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                </div>
            ))}
        </div>
    );
}
