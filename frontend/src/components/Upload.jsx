import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

export default function Upload() {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setMessage('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus('error');
            setMessage('Por favor selecciona un archivo XML primero.');
            return;
        }

        const formData = new FormData();
        formData.append('factura', file);

        setStatus('loading');

        try {
            const response = await fetch('/api/upload-xml', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Archivos subidos con éxito.');
            } else {
                setStatus('error');
                setMessage(data.error || 'Error procesando el archivo.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Error de conexión servidor. ' + err.message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* Sección Principal Primaria - Envío por Correo */}
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'rgba(206, 17, 38, 0.05)', border: '1px solid rgba(206, 17, 38, 0.2)' }}>
                <h2 style={{ marginBottom: '1rem', color: '#ce1126', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={28} /> Vía Correo
                </h2>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                    La forma más fácil de alimentar la base es reenviando tus facturas electrónicas (XML).
                </p>
                <div style={{
                    padding: '1.25rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '12px',
                    display: 'inline-block',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#002b7f' }}>
                        comparaticocr@gmail.com
                    </p>
                </div>
                <p style={{ mt: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '1rem' }}>
                    * El sistema procesa las facturas automáticamente cada 10 minutos.
                </p>
            </div>

            {/* Sección Secundaria - Subida Manual */}
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#002b7f' }}>Carga Manual</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Opcionalmente, selecciona el archivo desde tu dispositivo.</p>

                <div style={{
                    marginTop: '1.5rem',
                    padding: '1.5rem 1rem',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <UploadCloud size={40} color="#002b7f" />
                    <input
                        type="file"
                        accept=".xml"
                        onChange={handleFileChange}
                        style={{ width: '100%', maxWidth: '250px', fontSize: '0.85rem' }}
                    />

                    {file && <p style={{ margin: 0, fontWeight: '500', color: '#16a34a' }}>Listo: {file.name}</p>}

                    {status === 'loading' && <p>Procesando...</p>}
                    {status === 'success' && <p style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}><CheckCircle size={20} /> {message}</p>}
                    {status === 'error' && <p style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={20} /> {message}</p>}

                </div>

                <button
                    className="btn-primary"
                    style={{ marginTop: '1.5rem', width: '100%', backgroundColor: '#002b7f' }}
                    onClick={handleUpload}
                    disabled={status === 'loading' || !file}
                >
                    Subir XML Manualmente
                </button>
            </div>
        </div>
    );
}
