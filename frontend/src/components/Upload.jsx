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
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem' }}>Sube tu Factura</h2>
            <p>Ayuda a alimentar la base de precios subiendo el XML de una Factura Electrónica de Costa Rica.</p>

            <div style={{
                marginTop: '2rem',
                padding: '2rem 1rem',
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
            }}>
                <UploadCloud size={48} color="var(--accent-primary)" />
                <input
                    type="file"
                    accept=".xml"
                    onChange={handleFileChange}
                    style={{ width: '100%', maxWidth: '250px' }}
                />

                {file && <p style={{ margin: 0, fontWeight: '500' }}>Archivo: {file.name}</p>}

                {status === 'loading' && <p>Procesando...</p>}
                {status === 'success' && <p style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} /> {message}</p>}
                {status === 'error' && <p style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={20} /> {message}</p>}

            </div>

            <button
                className="btn-primary"
                style={{ marginTop: '1.5rem', width: '100%' }}
                onClick={handleUpload}
                disabled={status === 'loading'}
            >
                Procesar Factura
            </button>
        </div>
    );
}
