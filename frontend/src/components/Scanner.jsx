import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Camera, RefreshCw, XCircle } from 'lucide-react';

export default function Scanner() {
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const qrCodeRef = useRef(null);
    const navigate = useNavigate();

    const startScanner = async () => {
        setCameraError('');
        setIsScanning(true);

        // Prevent double instantiations
        if (qrCodeRef.current) {
            await stopScanner();
        }

        try {
            // Explicitly request cameras first to ensure permissions are handled
            // This prevents the black-screen bug when permissions are cached
            const devices = await Html5Qrcode.getCameras();
            if (!devices || devices.length === 0) {
                throw new Error("No se encontraron cámaras de video.");
            }

            // Prefer back camera if available, else use the first one
            let cameraId = devices[0].id;
            const backCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('trasera'));
            if (backCamera) {
                cameraId = backCamera.id;
            }

            const html5QrCode = new Html5Qrcode('reader');
            qrCodeRef.current = html5QrCode;

            const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

            await html5QrCode.start(
                cameraId, // Use specific ID instead of facingMode object
                config,
                (result) => {
                    stopScanner();
                    navigate(`/?barcode=${result}`);
                }
            );
        } catch (err) {
            console.error("Error iniciando cámara:", err);
            setCameraError(err.message || "No se pudo acceder a la cámara o el navegador no la soporta.");
            setIsScanning(false);
            if (qrCodeRef.current) {
                qrCodeRef.current.clear();
                qrCodeRef.current = null;
            }
        }
    };

    const stopScanner = async () => {
        if (qrCodeRef.current) {
            try {
                if (qrCodeRef.current.isScanning) {
                    await qrCodeRef.current.stop();
                }
                qrCodeRef.current.clear();
            } catch (err) {
                console.error("Error deteniendo cámara:", err);
            }
            qrCodeRef.current = null;
        }
        setIsScanning(false);
    };

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem' }}>Escanear Producto</h2>
            <p style={{ marginBottom: '2rem' }}>Usa la cámara para buscar precios al instante.</p>

            <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                <div id="reader" style={{
                    width: '100%',
                    minHeight: isScanning ? '300px' : '0',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '2px solid var(--border-color)'
                }}>
                    {!isScanning && (
                        <div style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <Camera size={64} color="var(--text-secondary)" opacity={0.5} />
                            <button className="btn-primary" onClick={startScanner}>
                                Activar Cámara
                            </button>
                        </div>
                    )}
                </div>

                {isScanning && (
                    <button
                        onClick={stopScanner}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.5)',
                            border: 'none',
                            borderRadius: '50%',
                            color: 'white',
                            padding: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            zIndex: 100
                        }}>
                        <XCircle size={24} />
                    </button>
                )}
            </div>

            {cameraError && (
                <div style={{ marginTop: '1rem', color: 'var(--error-color)', fontSize: '0.9rem' }}>
                    {cameraError}
                </div>
            )}

            <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <p>💡 Consejo: Asegúrate de tener buena iluminación y enfocar bien el código de barras.</p>
            </div>
        </div>
    );
}
