import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

export default function Scanner() {
    const [scanResult, setScanResult] = useState(null);
    const scannerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const scanner = new Html5QrcodeScanner('reader', {
            qrbox: { width: 250, height: 250 },
            fps: 5,
        });

        scannerRef.current = scanner;

        scanner.render(
            (result) => {
                scanner.clear();
                setScanResult(result);
                // Automatically navigate to search with barcode
                navigate(`/?barcode=${result}`);
            },
            (error) => {
                // Ignored, typical when not finding a barcode continuously
            }
        );

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error(err));
            }
        };
    }, [navigate]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem' }}>Escanear Código</h2>
            <p>Apunta la cámara al código de barras o QR de un producto para buscar su precio en la base de datos.</p>

            {scanResult ? (
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <h3>Código Detectado:</h3>
                    <p>{scanResult}</p>
                    <button className="btn-primary" onClick={() => navigate(`/?barcode=${scanResult}`)}>Buscar Precios</button>
                </div>
            ) : (
                <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', overflow: 'hidden', borderRadius: '12px' }}></div>
            )}
        </div>
    );
}
